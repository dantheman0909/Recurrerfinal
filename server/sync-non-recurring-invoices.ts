import { Request, Response } from "express";
import { chargebeeService } from "./chargebee";
import { chargebeeSyncService } from "./chargebee-sync-service";

/**
 * Endpoint to manually sync non-recurring invoices from Chargebee
 * Can sync for a specific customer if customer_id is provided, or for all customers
 */
export const syncNonRecurringInvoices = async (req: Request, res: Response) => {
  try {
    if (!chargebeeService) {
      return res.status(500).json({ error: "Chargebee service not initialized" });
    }
    
    // For specific customer if ID is provided
    const customerId = req.query.customer_id as string;
    
    if (customerId) {
      console.log(`Starting manual sync of non-recurring invoices for customer ${customerId}`);
      
      // Get all non-recurring invoices for this customer
      const invoices = await chargebeeService.getNonRecurringInvoicesForCustomer(customerId);
      console.log(`Found ${invoices.length} non-recurring invoices for customer ${customerId}`);
      
      // Store them in our database
      let savedCount = 0;
      if (invoices.length > 0) {
        // Use the main synchronization method to sync the invoices data
        const result = await chargebeeSyncService.synchronizeData();
        savedCount = result?.records || 0;
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
      
      // Process each customer
      for (const customer of customersToSync) {
        console.log(`Processing customer ${customer.id}`);
        try {
          const invoices = await chargebeeService.getNonRecurringInvoicesForCustomer(customer.id);
          console.log(`Found ${invoices.length} non-recurring invoices for customer ${customer.id}`);
          totalFound += invoices.length;
          
          if (invoices.length > 0) {
            const result = await chargebeeSyncService.synchronizeData();
            totalSynced += result?.records || 0;
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