import { db } from './db';
import { storage } from './storage';
import { sql } from 'drizzle-orm';
import { eq, or, and } from 'drizzle-orm';
import * as schema from '@shared/schema';
import { chargebeeConfig, chargebeeFieldMappings } from '@shared/schema';

/**
 * Service responsible for Chargebee data synchronization
 */
export class ChargebeeSyncService {
  /**
   * Synchronizes data from Chargebee to local database
   * Uses update+add mode instead of append, so existing records are updated
   * Now with support for incremental synchronization based on timestamps
   */
  async synchronizeData(): Promise<{ success: boolean; message: string; records?: number; syncStats?: any }> {
    try {
      console.log('Starting Chargebee data synchronization...');
      
      const startTime = Date.now();
      
      // Track number of records synced per entity type with detailed metrics
      const syncStats = {
        customers: { total: 0, new: 0, updated: 0, skipped: 0 },
        subscriptions: { total: 0, new: 0, updated: 0, skipped: 0 },
        invoices: { total: 0, new: 0, updated: 0, skipped: 0 },
        startTime: new Date().toISOString(),
        endTime: '',
        durationSeconds: 0
      };

      // Get Chargebee config and field mappings
      const config = await storage.getChargebeeConfig();
      if (!config) {
        return { success: false, message: 'Chargebee configuration not found' };
      }
      
      // Check if this is initial sync or incremental
      const isIncrementalSync = !!config.last_synced_at;
      const lastSyncedAt = config.last_synced_at 
        ? new Date(config.last_synced_at) 
        : new Date(0); // Use epoch if first sync
      
      console.log(`${isIncrementalSync ? 'Incremental' : 'Full'} sync mode. ${isIncrementalSync ? `Last sync: ${lastSyncedAt.toISOString()}` : 'First sync'}`);

      // Get field mappings
      const fieldMappings = await storage.getChargebeeFieldMappings();
      if (!fieldMappings || fieldMappings.length === 0) {
        return { success: false, message: 'No field mappings configured' };
      }

      // Group mappings by Chargebee entity
      const entityGroups = new Map<string, typeof fieldMappings>();
      for (const mapping of fieldMappings) {
        if (!entityGroups.has(mapping.chargebee_entity)) {
          entityGroups.set(mapping.chargebee_entity, []);
        }
        entityGroups.get(mapping.chargebee_entity)?.push(mapping);
      }

      // Initialize Chargebee service
      const { chargebeeService } = await import('./chargebee');
      if (!chargebeeService) {
        return { success: false, message: 'Failed to initialize Chargebee service' };
      }

      let totalRecords = 0;

      // Process each entity type
      for (const [entityType, mappings] of Array.from(entityGroups.entries())) {
        console.log(`Processing Chargebee entity type: ${entityType}`);

        // Group mappings by local table
        const localTableGroups = new Map<string, typeof mappings>();
        for (const mapping of mappings) {
          if (!localTableGroups.has(mapping.local_table)) {
            localTableGroups.set(mapping.local_table, []);
          }
          localTableGroups.get(mapping.local_table)?.push(mapping);
        }

        // Get data from Chargebee based on entity type
        let entityData: any[] = [];
        let filteredData: any[] = [];
        
        switch (entityType) {
          case 'customer':
            console.log('Fetching customers from Chargebee...');
            entityData = await chargebeeService.getAllCustomers();
            
            // Filter records by updated_at for incremental sync
            if (isIncrementalSync) {
              const lastSyncTimestamp = Math.floor(lastSyncedAt.getTime() / 1000); // Convert to seconds for Chargebee
              filteredData = entityData.filter(customer => 
                customer.updated_at > lastSyncTimestamp || !customer.updated_at
              );
              console.log(`Filtered ${entityData.length} customers to ${filteredData.length} based on last sync time`);
            } else {
              filteredData = entityData; // Use all for initial sync
            }
            
            syncStats.customers.total = entityData.length;
            syncStats.customers.skipped = entityData.length - filteredData.length;
            entityData = filteredData; // Replace with filtered data for processing
            break;
            
          case 'subscription':
            console.log('Fetching subscriptions from Chargebee...');
            entityData = await chargebeeService.getAllSubscriptions();
            
            // Filter records by updated_at for incremental sync
            if (isIncrementalSync) {
              const lastSyncTimestamp = Math.floor(lastSyncedAt.getTime() / 1000); // Convert to seconds for Chargebee
              filteredData = entityData.filter(subscription => 
                subscription.updated_at > lastSyncTimestamp || !subscription.updated_at
              );
              console.log(`Filtered ${entityData.length} subscriptions to ${filteredData.length} based on last sync time`);
            } else {
              filteredData = entityData; // Use all for initial sync
            }
            
            syncStats.subscriptions.total = entityData.length;
            syncStats.subscriptions.skipped = entityData.length - filteredData.length;
            entityData = filteredData; // Replace with filtered data for processing
            break;
            
          case 'invoice':
            console.log('Fetching invoices from Chargebee...');
            entityData = await chargebeeService.getAllInvoices();
            
            // For invoices, we typically don't have updated_at field, so we use date field
            // But we should always sync new invoices
            if (isIncrementalSync) {
              const lastSyncTimestamp = Math.floor(lastSyncedAt.getTime() / 1000); // Convert to seconds for Chargebee
              filteredData = entityData.filter(invoice => {
                // Include if invoice was updated since last sync
                // For invoices, "updated_at" might not exist, so we check multiple date fields
                return (
                  (invoice.updated_at && invoice.updated_at > lastSyncTimestamp) || 
                  (invoice.date && invoice.date > lastSyncTimestamp) ||
                  (invoice.due_date && invoice.due_date > lastSyncTimestamp) ||
                  (invoice.paid_at && invoice.paid_at > lastSyncTimestamp) ||
                  !invoice.updated_at // Always include if no updated_at (can't determine age)
                );
              });
              console.log(`Filtered ${entityData.length} invoices to ${filteredData.length} based on last sync time and updates`);
            } else {
              filteredData = entityData; // Use all for initial sync
            }
            
            syncStats.invoices.total = entityData.length;
            syncStats.invoices.skipped = entityData.length - filteredData.length;
            entityData = filteredData; // Replace with filtered data for processing
            break;
            
          default:
            console.warn(`Unknown Chargebee entity type: ${entityType}`);
            continue;
        }

        if (!entityData || entityData.length === 0) {
          console.log(`No data found for Chargebee entity: ${entityType}`);
          continue;
        }

        console.log(`Fetched ${entityData.length} records from Chargebee entity: ${entityType}`);
        totalRecords += entityData.length;

        // Process each local table
        for (const [localTable, localMappings] of Array.from(localTableGroups.entries())) {
          await this.syncToLocalTable(localTable, localMappings, entityData);
        }
      }

      // Store sync stats in the database
      await db.update(chargebeeConfig)
        .set({ 
          last_synced_at: new Date(),
          last_sync_stats: JSON.stringify(syncStats)
        })
        .where(eq(chargebeeConfig.id, config.id));

      return { 
        success: true, 
        message: `Successfully synchronized ${totalRecords} records from Chargebee`, 
        records: totalRecords,
        syncStats 
      };
    } catch (error) {
      console.error('Chargebee synchronization error:', error);
      return { 
        success: false, 
        message: `Error synchronizing Chargebee data: ${error instanceof Error ? error.message : String(error)}` 
      };
    }
  }

  /**
   * Synchronize data to a local table - Simplified approach
   */
  private async syncToLocalTable(
    localTableName: string,
    mappings: { chargebee_field: string; local_field: string; is_key_field: boolean }[],
    sourceData: any[]
  ): Promise<void> {
    try {
      // Ensure all required columns exist in the local table
      await this.ensureColumnsExist(localTableName, mappings);
  
      // Map data from Chargebee format to local format
      const transformedData = sourceData.map(row => {
        const result: Record<string, any> = {};
        
        // Special handling for subscription data
        const isSubscription = row.object === 'subscription';
        const isCustomer = row.object === 'customer';
        
        for (const mapping of mappings) {
          // Check if Chargebee field exists in the row
          if (row[mapping.chargebee_field] !== undefined) {
            result[mapping.local_field] = row[mapping.chargebee_field];
          }
        }
        
        // Special case: If this is subscription data and we're updating customers table,
        // make sure to include subscription status and plan data
        if (isSubscription && localTableName === 'customers') {
          if (row.status !== undefined) {
            result.subscription_status = row.status;
          }
          if (row.plan_id !== undefined) {
            result.plan_id = row.plan_id;
          }
        }
        
        // If customer record has a subscription ID but we don't have subscription status,
        // set a default for data consistency
        if (isCustomer && localTableName === 'customers' && 
            result.chargebee_subscription_id && !result.subscription_status) {
          result.subscription_status = 'unknown';
        }
        
        return result;
      });
  
      // Get key fields for this table
      const keyFields = mappings.filter(m => m.is_key_field).map(m => m.local_field);
      
      console.log(`Processing ${transformedData.length} records for table ${localTableName}`);
      
      // For each record, update if it exists (based on key fields) or insert if it doesn't
      for (const record of transformedData) {
        try {
          if (Object.keys(record).length === 0) {
            console.warn('Empty record, skipping');
            continue;
          }
          
          // Build conditions to find existing records based on key fields
          let keyConditions: Record<string, any> = {};
          let hasKeyField = false;
          
          // Add key fields to conditions
          for (const keyField of keyFields) {
            if (record[keyField] !== undefined) {
              keyConditions[keyField] = record[keyField];
              hasKeyField = true;
            }
          }
          
          // Special handling for subscription data going to customers table
          if (Object.keys(keyConditions).length === 0 && 
              localTableName === 'customers' && 
              record['chargebee_subscription_id']) {
            keyConditions['chargebee_subscription_id'] = record['chargebee_subscription_id'];
            hasKeyField = true;
          }
          
          if (!hasKeyField) {
            console.log(`No key fields found for record in ${localTableName}, skipping`);
            continue;
          }
          
          // Use a safer approach - check if the record exists first
          // Do this with a simple query based on key fields
          let existingRecords;
          
          if (localTableName === 'customers') {
            // Build dynamic where conditions
            const whereConditions = [];
            
            if (keyConditions['recurrer_id']) {
              whereConditions.push(eq(schema.customers.recurrer_id, keyConditions['recurrer_id']));
            }
            
            if (keyConditions['chargebee_customer_id']) {
              whereConditions.push(eq(schema.customers.chargebee_customer_id, keyConditions['chargebee_customer_id']));
            }
            
            if (keyConditions['chargebee_subscription_id']) {
              whereConditions.push(eq(schema.customers.chargebee_subscription_id, keyConditions['chargebee_subscription_id']));
            }
            
            // Use a fallback if no conditions were generated
            if (whereConditions.length === 0) {
              if (keyConditions['id']) {
                whereConditions.push(eq(schema.customers.id, Number(keyConditions['id'])));
              } else {
                // Use a condition that will return no results
                whereConditions.push(eq(schema.customers.id, -1));
              }
            }
            
            // Execute the query with combined OR conditions
            const query = db.select()
              .from(schema.customers)
              .where(or(...whereConditions))
              .limit(1);
              
            existingRecords = await query;
          } else {
            // For tables other than customers, use a more generic approach
            // Build a simple query string for other tables
            const conditions = Object.entries(keyConditions)
              .map(([field, value]) => `"${field}" = $${field}`)
              .join(' AND ');
              
            const params = Object.entries(keyConditions).reduce((acc, [field, value]) => {
              acc[`$${field}`] = value;
              return acc;
            }, {} as Record<string, any>);
            
            try {
              const checkQuery = `SELECT id FROM "${localTableName}" WHERE ${conditions} LIMIT 1`;
              existingRecords = await db.execute(sql.raw(checkQuery, Object.values(keyConditions)));
            } catch (queryError) {
              console.error(`Error querying ${localTableName}:`, queryError);
              console.error(`Key conditions:`, keyConditions);
              continue; // Skip this record if query fails
            }
          }
          
          const recordExists = Array.isArray(existingRecords) && existingRecords.length > 0;
          
          // Add timestamp for when this record was updated from Chargebee
          record.updated_from_chargebee_at = new Date();
          
          if (!recordExists) {
            // Record doesn't exist, insert it
            try {
              if (localTableName === 'customers') {
                await db.insert(schema.customers).values(record as any);
              } else {
                // Generate a simplified generic insert for other tables
                const columns = Object.keys(record).join(', ');
                const values = Object.values(record);
                const placeholders = values.map((_, i) => `$${i+1}`).join(', ');
                
                await db.execute(
                  sql.raw(`INSERT INTO "${localTableName}" (${columns}) VALUES (${placeholders})`, 
                  values)
                );
              }
              console.log(`Inserted new record into ${localTableName}`);
            } catch (insertError) {
              console.error(`Error inserting into ${localTableName}:`, insertError);
              console.error(`Record:`, record);
              continue; // Skip to next record
            }
          } else {
            // Record exists, update it
            // Filter out key fields from the update
            const updateData = { ...record };
            keyFields.forEach(field => {
              delete updateData[field];
            });
            
            if (Object.keys(updateData).length === 0) {
              console.log(`No non-key fields to update in ${localTableName}, skipping update`);
              continue;
            }
            
            try {
              if (localTableName === 'customers') {
                // Build dynamic where conditions again for update
                const whereConditions = [];
                
                if (keyConditions['recurrer_id']) {
                  whereConditions.push(eq(schema.customers.recurrer_id, keyConditions['recurrer_id']));
                }
                
                if (keyConditions['chargebee_customer_id']) {
                  whereConditions.push(eq(schema.customers.chargebee_customer_id, keyConditions['chargebee_customer_id']));
                }
                
                if (keyConditions['chargebee_subscription_id']) {
                  whereConditions.push(eq(schema.customers.chargebee_subscription_id, keyConditions['chargebee_subscription_id']));
                }
                
                // Use a fallback if no conditions were generated
                if (whereConditions.length === 0) {
                  if (keyConditions['id']) {
                    whereConditions.push(eq(schema.customers.id, Number(keyConditions['id'])));
                  } else {
                    // Use a condition that will return no results
                    whereConditions.push(eq(schema.customers.id, -1));
                  }
                }
                
                await db.update(schema.customers)
                  .set(updateData as any)
                  .where(or(...whereConditions));
              } else {
                // For tables other than customers, use a more generic approach
                // Build set clause
                const setClause = Object.keys(updateData)
                  .map((key, i) => `"${key}" = $${i+1}`)
                  .join(', ');
                  
                // Build where clause based on key conditions
                const whereClause = Object.entries(keyConditions)
                  .map(([key, _], i) => `"${key}" = $${Object.keys(updateData).length + i + 1}`)
                  .join(' AND ');
                
                const updateQuery = `
                  UPDATE "${localTableName}" 
                  SET ${setClause}
                  WHERE ${whereClause}
                `;
                
                await db.execute(
                  sql.raw(updateQuery, 
                  [...Object.values(updateData), ...Object.values(keyConditions)])
                );
              }
              console.log(`Updated existing record in ${localTableName}`);
            } catch (updateError) {
              console.error(`Error updating ${localTableName}:`, updateError);
              console.error(`Update data:`, updateData);
              console.error(`Key conditions:`, keyConditions);
              continue; // Skip to next record
            }
          }
        } catch (recordError) {
          console.error(`Error processing record for ${localTableName}:`, recordError);
          // Continue with next record
          continue;
        }
      }
      
      console.log(`Completed processing for table ${localTableName}`);
    } catch (error) {
      console.error(`Error in syncToLocalTable for ${localTableName}:`, error);
    }
  }

  /**
   * Check if all required columns exist in the local table, and create them if not
   * Improved to safely handle existing columns and prevent errors
   */
  private async ensureColumnsExist(
    tableName: string,
    mappings: { local_field: string }[]
  ): Promise<void> {
    try {
      // Get existing columns in the table with a more reliable method
      const columnsQuery = `
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = '${tableName}'
        AND table_schema = 'public'
      `;
      
      const columns = await db.execute(sql.raw(columnsQuery));
      const existingColumns = Array.isArray(columns) 
        ? columns.map((col: any) => col.column_name?.toLowerCase())
        : [];
      
      // Make sure the updated_from_chargebee_at column exists
      // Check if the column already exists (case-insensitive)
      if (!existingColumns.includes('updated_from_chargebee_at'.toLowerCase())) {
        try {
          const alterQuery = `
            ALTER TABLE ${tableName} 
            ADD COLUMN IF NOT EXISTS updated_from_chargebee_at TIMESTAMP NULL
          `;
          await db.execute(sql.raw(alterQuery));
          console.log(`Added updated_from_chargebee_at column to ${tableName}`);
        } catch (columnError) {
          // Log but continue if there's an error (likely column already exists)
          console.log(`Note: Could not add updated_from_chargebee_at column to ${tableName}: ${columnError}`);
          // Don't throw here - continue with other columns
        }
      } else {
        console.log(`Column updated_from_chargebee_at already exists in ${tableName}`);
      }
      
      // If this is the customers table, make sure subscription_status and plan_id columns exist
      if (tableName === 'customers') {
        // Check for subscription_status
        if (!existingColumns.includes('subscription_status'.toLowerCase())) {
          try {
            await db.execute(sql.raw(`
              ALTER TABLE customers 
              ADD COLUMN IF NOT EXISTS subscription_status TEXT NULL
            `));
            console.log(`Added subscription_status column to customers table`);
          } catch (columnError) {
            console.log(`Note: Could not add subscription_status column: ${columnError}`);
          }
        }
        
        // Check for plan_id
        if (!existingColumns.includes('plan_id'.toLowerCase())) {
          try {
            await db.execute(sql.raw(`
              ALTER TABLE customers 
              ADD COLUMN IF NOT EXISTS plan_id TEXT NULL
            `));
            console.log(`Added plan_id column to customers table`);
          } catch (columnError) {
            console.log(`Note: Could not add plan_id column: ${columnError}`);
          }
        }
      }
      
      // Check each mapped field and create if missing
      for (const mapping of mappings) {
        const fieldName = mapping.local_field.toLowerCase();
        // Check if the column already exists (case-insensitive)
        if (!existingColumns.includes(fieldName)) {
          try {
            // Default to TEXT for Chargebee fields since we don't have field type information
            // Use IF NOT EXISTS to ensure we don't get an error if the column already exists
            const alterQuery = `
              ALTER TABLE ${tableName} 
              ADD COLUMN IF NOT EXISTS ${fieldName} TEXT NULL
            `;
            
            await db.execute(sql.raw(alterQuery));
            console.log(`Added column ${fieldName} to ${tableName}`);
          } catch (columnError) {
            // Log but continue - don't fail the whole sync for one column
            console.log(`Note: Could not add column ${fieldName} to ${tableName}: ${columnError}`);
          }
        } else {
          console.log(`Column ${fieldName} already exists in ${tableName}`);
        }
      }
    } catch (error) {
      console.error(`Error ensuring columns for ${tableName}:`, error);
      // Don't re-throw the error here - this allows the sync to continue even if column checks fail
      // Return instead of throw to allow the process to continue
      return;
    }
  }
}

// Export a singleton instance
export const chargebeeSyncService = new ChargebeeSyncService();