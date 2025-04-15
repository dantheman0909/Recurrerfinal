import { db } from './db';
import { storage } from './storage';
import { sql } from 'drizzle-orm';
import { eq } from 'drizzle-orm';
import { chargebeeConfig, chargebeeFieldMappings } from '@shared/schema';

/**
 * Service responsible for Chargebee data synchronization
 */
export class ChargebeeSyncService {
  /**
   * Synchronizes data from Chargebee to local database
   * Uses update+add mode instead of append, so existing records are updated
   */
  async synchronizeData(): Promise<{ success: boolean; message: string; records?: number }> {
    try {
      // Get Chargebee config and field mappings
      const config = await storage.getChargebeeConfig();
      if (!config) {
        return { success: false, message: 'Chargebee configuration not found' };
      }

      // Update last_synced_at timestamp
      await db.update(chargebeeConfig)
        .set({ last_synced_at: new Date() })
        .where(eq(chargebeeConfig.id, config.id));

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
      for (const [entityType, mappings] of entityGroups.entries()) {
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
        
        switch (entityType) {
          case 'customer':
            entityData = await chargebeeService.getCustomers(100);
            break;
          case 'subscription':
            entityData = await chargebeeService.getSubscriptions(100);
            break;
          case 'invoice':
            entityData = await chargebeeService.getInvoices(100);
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
        for (const [localTable, localMappings] of localTableGroups.entries()) {
          await this.syncToLocalTable(localTable, localMappings, entityData);
        }
      }

      return { 
        success: true, 
        message: `Successfully synchronized ${totalRecords} records from Chargebee`, 
        records: totalRecords 
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
   * Synchronize data to a local table
   */
  private async syncToLocalTable(
    localTableName: string,
    mappings: { chargebee_field: string; local_field: string; is_key_field: boolean }[],
    sourceData: any[]
  ): Promise<void> {
    // Ensure all required columns exist in the local table
    await this.ensureColumnsExist(localTableName, mappings);

    // Map data from Chargebee format to local format
    const transformedData = sourceData.map(row => {
      const result: Record<string, any> = {};
      for (const mapping of mappings) {
        // Check if Chargebee field exists in the row
        if (row[mapping.chargebee_field] !== undefined) {
          result[mapping.local_field] = row[mapping.chargebee_field];
        }
      }
      return result;
    });

    // Get key fields for this table
    const keyFields = mappings.filter(m => m.is_key_field).map(m => m.local_field);
    
    // For each record, update if it exists (based on key fields) or insert if it doesn't
    for (const record of transformedData) {
      try {
        // Build a condition to find existing records based on key fields
        const conditions: string[] = [];
        const params: any[] = [];
        
        for (const keyField of keyFields) {
          if (record[keyField] !== undefined) {
            conditions.push(`${keyField} = ?`);
            params.push(record[keyField]);
          }
        }
        
        if (conditions.length === 0) {
          console.warn('No valid key fields found in record, skipping');
          continue;
        }
        
        const whereClause = conditions.join(' AND ');
        
        // Check if record exists
        const checkQuery = `SELECT id FROM ${localTableName} WHERE ${whereClause} LIMIT 1`;
        const result = await db.execute(sql.raw(checkQuery, params));
        
        // If the record doesn't exist, perform an INSERT
        // Otherwise, perform an UPDATE
        if (!Array.isArray(result) || result.length === 0) {
          // Build INSERT query
          const fields = Object.keys(record);
          const values = Object.values(record);
          const placeholders = fields.map(() => '?').join(', ');
          
          const insertQuery = `
            INSERT INTO ${localTableName} (${fields.join(', ')}, updated_from_chargebee_at) 
            VALUES (${placeholders}, NOW())
          `;
          
          await db.execute(sql.raw(insertQuery, values));
          console.log(`Inserted new record into ${localTableName}`);
        } else {
          // Build UPDATE query
          const setClause = Object.keys(record)
            .filter(field => !keyFields.includes(field)) // Don't update key fields
            .map(field => `${field} = ?`)
            .join(', ');
          
          const updateValues = Object.entries(record)
            .filter(([field]) => !keyFields.includes(field))
            .map(([_, value]) => value);
          
          // If there's nothing to update (only key fields), skip
          if (setClause.length === 0) {
            continue;
          }
          
          const updateQuery = `
            UPDATE ${localTableName} 
            SET ${setClause}, updated_from_chargebee_at = NOW() 
            WHERE ${whereClause}
          `;
          
          await db.execute(sql.raw(updateQuery, [...updateValues, ...params]));
          console.log(`Updated existing record in ${localTableName}`);
        }
      } catch (error) {
        console.error(`Error processing record for ${localTableName}:`, error);
      }
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
        WHERE table_name = $1
        AND table_schema = 'public'
      `;
      
      const columns = await db.execute(sql.raw(columnsQuery, [tableName]));
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