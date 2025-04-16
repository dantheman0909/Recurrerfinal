import { Request, Response } from "express";
import { chargebeeService } from "./chargebee";
import { db } from "./db";
import { customers } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

/**
 * Endpoint to manually sync non-recurring invoices from Chargebee
 * Can sync for a specific customer if customer_id is provided, or for all customers
 */
export const syncNonRecurringInvoices = async (req: Request, res: Response) => {
  try {
    if (!chargebeeService) {
      return res.status(500).json({ error: "Chargebee service not initialized" });
    }
    
    console.log('Starting manual sync of non-recurring invoices');
    
    // Check if we're syncing for a specific customer
    const customerId = req.query.customer_id as string;
    
    if (customerId) {
      console.log(`Starting manual sync of non-recurring invoices for customer ${customerId}`);
      
      // Get all non-recurring invoices for this customer
      const invoices = await chargebeeService.getNonRecurringInvoicesForCustomer(customerId);
      console.log(`Found ${invoices.length} non-recurring invoices for customer ${customerId}`);
      
      // Process the invoices manually 
      let savedCount = 0;
      
      if (invoices.length > 0) {
        try {
          // Ensure the target table exists
          await ensureInvoicesTableExists();
          
          // Process each invoice
          for (const invoice of invoices) {
            await storeInvoice(invoice);
            savedCount++;
          }
          
          // Update the customer record to reflect the sync
          if (req.query.customer_db_id) {
            const customerDbId = parseInt(req.query.customer_db_id as string);
            await db.update(customers)
              .set({ updated_from_chargebee_at: new Date() })
              .where(eq(customers.id, customerDbId));
          }
        } catch (error) {
          console.error('Error storing non-recurring invoices:', error);
        }
      }
      
      return res.json({
        success: true,
        message: `Synced ${savedCount} non-recurring invoices for customer ${customerId}`,
        invoices_found: invoices.length,
        invoices_synced: savedCount
      });
    } else {
      // Sync all non-recurring invoices for all customers
      // This is a potentially expensive operation, so we'll limit it
      console.log(`Starting manual sync of non-recurring invoices for all customers`);
      
      // Get all customers
      const customers = await chargebeeService.getAllCustomers();
      console.log(`Found ${customers.length} customers to check for non-recurring invoices`);
      
      // Limit to 20 customers for manual sync to avoid overloading the API
      const BATCH_SIZE = 20;
      const customersToSync = customers.slice(0, BATCH_SIZE);
      
      let totalFound = 0;
      let totalSynced = 0;
      
      // Ensure the target table exists
      await ensureInvoicesTableExists();
      
      // Process each customer
      for (const customer of customersToSync) {
        console.log(`Processing customer ${customer.id}`);
        try {
          const invoices = await chargebeeService.getNonRecurringInvoicesForCustomer(customer.id);
          console.log(`Found ${invoices.length} non-recurring invoices for customer ${customer.id}`);
          totalFound += invoices.length;
          
          // Process each invoice
          for (const invoice of invoices) {
            try {
              await storeInvoice(invoice);
              totalSynced++;
            } catch (error) {
              console.error(`Error storing invoice ${invoice.id}:`, error);
            }
          }
          
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`Error syncing non-recurring invoices for customer ${customer.id}:`, error);
          // Continue with next customer
        }
      }
      
      return res.json({
        success: true,
        message: `Synced ${totalSynced} non-recurring invoices from ${customersToSync.length} customers (out of ${customers.length} total)`,
        customers_processed: customersToSync.length,
        total_customers: customers.length,
        invoices_found: totalFound,
        invoices_synced: totalSynced
      });
    }
  } catch (error) {
    console.error('Error syncing non-recurring invoices:', error);
    return res.status(500).json({ 
      error: "Failed to sync non-recurring invoices", 
      details: error instanceof Error ? error.message : String(error) 
    });
  }
};

/**
 * Ensures that the chargebee_invoices table exists with all required columns
 */
export async function ensureInvoicesTableExists(): Promise<void> {
  try {
    // Check if table exists
    const tableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = 'chargebee_invoices'
      );
    `);
    
    if (!tableExists.rows[0]?.exists) {
      // Create table if it doesn't exist
      await db.execute(sql`
        CREATE TABLE chargebee_invoices (
          id VARCHAR(255) PRIMARY KEY,
          subscription_id VARCHAR(255),
          customer_id VARCHAR(255),
          amount DECIMAL(10, 2),
          amount_paid DECIMAL(10, 2),
          amount_due DECIMAL(10, 2),
          status VARCHAR(50),
          date BIGINT,
          due_date BIGINT,
          paid_at BIGINT,
          total DECIMAL(10, 2),
          recurring BOOLEAN DEFAULT FALSE,
          line_items JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('Created chargebee_invoices table');
    }
    
    // Check for recurring column and add if it doesn't exist
    const hasRecurringColumn = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'chargebee_invoices'
        AND column_name = 'recurring'
      );
    `);
    
    if (!hasRecurringColumn.rows[0]?.exists) {
      await db.execute(sql`
        ALTER TABLE chargebee_invoices
        ADD COLUMN recurring BOOLEAN DEFAULT FALSE;
      `);
      console.log('Added recurring column to chargebee_invoices table');
    }
  } catch (error) {
    console.error('Error ensuring invoices table exists:', error);
    throw error;
  }
}

/**
 * Stores or updates an invoice in the database
 */
export async function storeInvoice(invoice: any): Promise<void> {
  try {
    // Log at start for debugging
    console.log(`Processing invoice: ${invoice.id} (${invoice.recurring ? 'recurring' : 'non-recurring'})`);
    
    // Get a direct connection from the pool for parameterized queries
    const { pool } = await import('./db');
    
    // Format the invoice data, safely handling undefined values
    const invoiceData = {
      id: invoice.id,
      subscription_id: invoice.subscription_id || null,
      customer_id: invoice.customer_id || null,
      // Convert undefined numeric values to 0 to avoid database errors
      amount: typeof invoice.amount === 'number' ? invoice.amount : 0,
      amount_paid: typeof invoice.amount_paid === 'number' ? invoice.amount_paid : 0,
      amount_due: typeof invoice.amount_due === 'number' ? invoice.amount_due : 0,
      status: invoice.status || 'unknown',
      date: invoice.date || null,
      due_date: invoice.due_date || null,
      paid_at: invoice.paid_at || null,
      total: typeof invoice.total === 'number' ? invoice.total : 0,
      recurring: invoice.recurring === true,
      line_items: invoice.line_items ? JSON.stringify(invoice.line_items) : null
    };
    
    // Debug log the data we're trying to store
    console.log(`Invoice data prepared for ${invoice.id}`);
    
    // Check if invoice already exists
    const checkResult = await pool.query(
      'SELECT id FROM chargebee_invoices WHERE id = $1',
      [invoice.id]
    );
    
    if (checkResult.rows.length > 0) {
      // Update existing invoice with parameterized query
      console.log(`Invoice ${invoice.id} exists, updating with parameterized query...`);
      await pool.query(
        `UPDATE chargebee_invoices 
         SET subscription_id = $1, customer_id = $2, amount = $3, amount_paid = $4,
             amount_due = $5, status = $6, date = $7, due_date = $8, paid_at = $9,
             total = $10, recurring = $11, line_items = $12, updated_at = NOW()
         WHERE id = $13`,
        [
          invoiceData.subscription_id,
          invoiceData.customer_id,
          invoiceData.amount,
          invoiceData.amount_paid,
          invoiceData.amount_due,
          invoiceData.status,
          invoiceData.date,
          invoiceData.due_date,
          invoiceData.paid_at,
          invoiceData.total,
          invoiceData.recurring,
          invoiceData.line_items,
          invoiceData.id
        ]
      );
      console.log(`Successfully updated invoice ${invoice.id}`);
    } else {
      // Insert new invoice with parameterized query
      console.log(`Invoice ${invoice.id} is new, inserting with parameterized query...`);
      await pool.query(
        `INSERT INTO chargebee_invoices (
          id, subscription_id, customer_id, amount, amount_paid, amount_due,
          status, date, due_date, paid_at, total, recurring, line_items, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())`,
        [
          invoiceData.id,
          invoiceData.subscription_id,
          invoiceData.customer_id,
          invoiceData.amount,
          invoiceData.amount_paid,
          invoiceData.amount_due,
          invoiceData.status,
          invoiceData.date,
          invoiceData.due_date,
          invoiceData.paid_at,
          invoiceData.total, 
          invoiceData.recurring,
          invoiceData.line_items
        ]
      );
      console.log(`Successfully inserted invoice ${invoice.id}`);
    }
    
    // Verify the invoice was stored
    const verifyResult = await pool.query(
      'SELECT id FROM chargebee_invoices WHERE id = $1',
      [invoice.id]
    );
    
    if (verifyResult.rows.length > 0) {
      console.log(`Verified invoice ${invoice.id} exists in database`);
    } else {
      console.error(`WARNING: Invoice ${invoice.id} was not found after insert/update!`);
    }
  } catch (error) {
    // Enhanced error logging for debugging
    console.error(`Error storing invoice ${invoice.id}:`, error);
    console.error(`Error details: ${error instanceof Error ? error.message : String(error)}`);
    console.error(`Error stack: ${error instanceof Error ? error.stack : 'No stack trace'}`);
    
    // Rethrow to let caller handle the error
    throw error;
  }
}