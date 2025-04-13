import { db } from './db';
import { sql } from 'drizzle-orm';
import { storage } from './storage';
import { mysqlConfig, mysqlFieldMappings } from '@shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Service responsible for MySQL data synchronization
 */
export class MySQLSyncService {
  /**
   * Synchronizes data from MySQL to local database
   * Uses update+add mode instead of append, so existing records are updated
   */
  async synchronizeData(): Promise<{ success: boolean; message: string; records?: number }> {
    try {
      // Get MySQL config and field mappings
      const config = await storage.getMySQLConfig();
      if (!config) {
        return { success: false, message: 'MySQL configuration not found' };
      }

      // Update last_synced_at 
      await db.update(mysqlConfig)
        .set({ last_synced_at: new Date() })
        .where(eq(mysqlConfig.id, config.id));

      // Get field mappings
      const fieldMappings = await storage.getMySQLFieldMappings();
      if (!fieldMappings || fieldMappings.length === 0) {
        return { success: false, message: 'No field mappings configured' };
      }

      // Group mappings by MySQL table
      const tableGroups = new Map<string, typeof fieldMappings>();
      for (const mapping of fieldMappings) {
        if (!tableGroups.has(mapping.mysql_table)) {
          tableGroups.set(mapping.mysql_table, []);
        }
        tableGroups.get(mapping.mysql_table)?.push(mapping);
      }

      // For each table, synchronize data
      const mysql = await import('mysql2/promise');
      const pool = mysql.createPool({
        host: config.host,
        port: config.port,
        user: config.username,
        password: config.password,
        database: config.database,
        waitForConnections: true,
        connectionLimit: 2,
        queueLimit: 0
      });

      let totalRecords = 0;

      // Process each table
      for (const [tableName, mappings] of tableGroups.entries()) {
        // Get key fields for mapping
        const keyFieldMappings = mappings.filter(m => m.is_key_field);
        if (keyFieldMappings.length === 0) {
          console.warn(`No key fields defined for table ${tableName}, skipping`);
          continue;
        }

        // Group mappings by local table
        const localTableGroups = new Map<string, typeof mappings>();
        for (const mapping of mappings) {
          if (!localTableGroups.has(mapping.local_table)) {
            localTableGroups.set(mapping.local_table, []);
          }
          localTableGroups.get(mapping.local_table)?.push(mapping);
        }

        // Build MySQL query - select only mapped fields
        const mysqlFields = mappings.map(m => m.mysql_field);
        const selectQuery = `SELECT ${mysqlFields.join(', ')} FROM ${tableName}`;
        
        // Fetch data from MySQL
        const [rows] = await pool.query(selectQuery);
        if (!Array.isArray(rows) || rows.length === 0) {
          console.log(`No data found in table ${tableName}`);
          continue;
        }

        console.log(`Fetched ${rows.length} rows from MySQL table ${tableName}`);
        totalRecords += rows.length;

        // Process each local table
        for (const [localTable, localMappings] of localTableGroups.entries()) {
          await this.syncToLocalTable(localTable, localMappings, rows);
        }
      }

      // Only close the MySQL pool, not the PostgreSQL pool
      try {
        await pool.end();
      } catch (error) {
        console.warn('Warning while closing MySQL pool:', error);
      }

      return { 
        success: true, 
        message: `Successfully synchronized ${totalRecords} records from MySQL`, 
        records: totalRecords 
      };
    } catch (error) {
      console.error('MySQL synchronization error:', error);
      return { 
        success: false, 
        message: `Error synchronizing MySQL data: ${error instanceof Error ? error.message : String(error)}` 
      };
    }
  }

  /**
   * Synchronize data to a local table
   */
  private async syncToLocalTable(
    localTableName: string,
    mappings: { mysql_field: string; local_field: string; field_type: string; is_key_field: boolean }[],
    sourceData: any[]
  ): Promise<void> {
    // Ensure all required columns exist in the local table
    await this.ensureColumnsExist(localTableName, mappings);

    // Map data from MySQL format to local format
    const transformedData = sourceData.map(row => {
      const result: Record<string, any> = {};
      for (const mapping of mappings) {
        // Check if MySQL field exists in the row
        if (row[mapping.mysql_field] !== undefined) {
          result[mapping.local_field] = row[mapping.mysql_field];
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
            INSERT INTO ${localTableName} (${fields.join(', ')}, updated_from_mysql_at) 
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
            SET ${setClause}, updated_from_mysql_at = NOW() 
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
   */
  private async ensureColumnsExist(
    tableName: string,
    mappings: { local_field: string; field_type: string }[]
  ): Promise<void> {
    try {
      // Get existing columns in the table
      const columnsQuery = `
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = '${tableName}'
      `;
      
      const columns = await db.execute(sql.raw(columnsQuery));
      const existingColumns = Array.isArray(columns) 
        ? columns.map((col: any) => col.column_name?.toLowerCase())
        : [];
      
      // Make sure the updated_from_mysql_at column exists
      if (!existingColumns.includes('updated_from_mysql_at')) {
        const alterQuery = `
          ALTER TABLE ${tableName} 
          ADD COLUMN updated_from_mysql_at TIMESTAMP NULL
        `;
        await db.execute(sql.raw(alterQuery));
        console.log(`Added updated_from_mysql_at column to ${tableName}`);
      }
      
      // Check each mapped field and create if missing
      for (const mapping of mappings) {
        const fieldName = mapping.local_field.toLowerCase();
        if (!existingColumns.includes(fieldName)) {
          // Convert field_type to a PostgreSQL type
          const pgType = this.convertToPgType(mapping.field_type);
          
          const alterQuery = `
            ALTER TABLE ${tableName} 
            ADD COLUMN ${fieldName} ${pgType} NULL
          `;
          
          await db.execute(sql.raw(alterQuery));
          console.log(`Added column ${fieldName} to ${tableName}`);
        }
      }
    } catch (error) {
      console.error(`Error ensuring columns for ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Convert a field type to a PostgreSQL type
   */
  private convertToPgType(fieldType: string): string {
    const type = fieldType.toLowerCase();
    
    switch (type) {
      case 'text':
      case 'string':
      case 'varchar':
        return 'TEXT';
      case 'integer':
      case 'int':
      case 'number':
        return 'INTEGER';
      case 'float':
      case 'double':
      case 'decimal':
        return 'DECIMAL';
      case 'boolean':
      case 'bool':
        return 'BOOLEAN';
      case 'date':
        return 'DATE';
      case 'datetime':
      case 'timestamp':
        return 'TIMESTAMP';
      case 'json':
      case 'object':
        return 'JSONB';
      default:
        return 'TEXT';
    }
  }
}

// Export a singleton instance
export const mysqlSyncService = new MySQLSyncService();