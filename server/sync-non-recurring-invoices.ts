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
    // Format the invoice data
    const invoiceData = {
      id: invoice.id,
      subscription_id: invoice.subscription_id,
      customer_id: invoice.customer_id,
      amount: invoice.amount,
      amount_paid: invoice.amount_paid,
      amount_due: invoice.amount_due,
      status: invoice.status,
      date: invoice.date,
      due_date: invoice.due_date,
      paid_at: invoice.paid_at || null,
      total: invoice.total,
      recurring: invoice.recurring === true,
      line_items: invoice.line_items ? JSON.stringify(invoice.line_items) : null,
      updated_at: new Date()
    };
    
    // Check if invoice already exists
    const existingInvoice = await db.execute(sql`
      SELECT id FROM chargebee_invoices WHERE id = ${invoice.id}
    `);
    
    if (existingInvoice.rows.length > 0) {
      // Update existing invoice
      const updateColumns = Object.entries(invoiceData)
        .filter(([key]) => key !== 'id') // Skip the id field in the SET clause
        .map(([key, value]) => {
          if (value === null) {
            return `${key} = NULL`;
          } else if (typeof value === 'boolean') {
            return `${key} = ${value}`;
          } else if (typeof value === 'number') {
            return `${key} = ${value}`;
          } else {
            return `${key} = '${String(value).replace(/'/g, "''")}'`; // Escape single quotes
          }
        })
        .join(', ');
      
      await db.execute(sql.raw(`
        UPDATE chargebee_invoices 
        SET ${updateColumns}
        WHERE id = '${invoice.id}'
      `));
    } else {
      // Insert new invoice
      const columns = Object.keys(invoiceData).join(', ');
      const values = Object.values(invoiceData).map(value => {
        if (value === null) {
          return 'NULL';
        } else if (typeof value === 'boolean') {
          return value;
        } else if (typeof value === 'number') {
          return value;
        } else {
          return `'${String(value).replace(/'/g, "''")}'`; // Escape single quotes
        }
      }).join(', ');
      
      await db.execute(sql.raw(`
        INSERT INTO chargebee_invoices (${columns})
        VALUES (${values})
      `));
    }
  } catch (error) {
    console.error(`Error storing invoice ${invoice.id}:`, error);
    throw error;
  }
}