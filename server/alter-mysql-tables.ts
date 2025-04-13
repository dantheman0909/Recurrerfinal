import { db } from './db';
import { sql } from 'drizzle-orm';

/**
 * Alters MySQL-related tables to add new columns for improved functionality:
 * - mysql_config: Add status, sync_frequency, and last_synced_at columns
 * - mysql_field_mappings: Add field_type and is_key_field columns
 */
async function alterMySQLTables() {
  try {
    console.log('Altering MySQL tables...');
    
    // Check if mysql_config table exists
    const configTableCheck = await db.execute(sql.raw(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'mysql_config'
      )
    `));
    
    const configTableExists = configTableCheck[0]?.exists;
    if (configTableExists) {
      // Check if status column exists in mysql_config
      const statusCheck = await db.execute(sql.raw(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'mysql_config' AND column_name = 'status'
        )
      `));
      
      if (!statusCheck[0]?.exists) {
        // Add status column
        await db.execute(sql.raw(`
          ALTER TABLE mysql_config 
          ADD COLUMN status TEXT DEFAULT 'active'
        `));
        console.log('Added status column to mysql_config table');
      }
      
      // Check if sync_frequency column exists
      const syncFrequencyCheck = await db.execute(sql.raw(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'mysql_config' AND column_name = 'sync_frequency'
        )
      `));
      
      if (!syncFrequencyCheck[0]?.exists) {
        // Add sync_frequency column (hours)
        await db.execute(sql.raw(`
          ALTER TABLE mysql_config 
          ADD COLUMN sync_frequency INTEGER DEFAULT 24
        `));
        console.log('Added sync_frequency column to mysql_config table');
      }
      
      // Check if last_synced_at column exists
      const lastSyncedCheck = await db.execute(sql.raw(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'mysql_config' AND column_name = 'last_synced_at'
        )
      `));
      
      if (!lastSyncedCheck[0]?.exists) {
        // Add last_synced_at column
        await db.execute(sql.raw(`
          ALTER TABLE mysql_config 
          ADD COLUMN last_synced_at TIMESTAMP
        `));
        console.log('Added last_synced_at column to mysql_config table');
      }
    }
    
    // Check if mysql_field_mappings table exists
    const mappingsTableCheck = await db.execute(sql.raw(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'mysql_field_mappings'
      )
    `));
    
    const mappingsTableExists = mappingsTableCheck[0]?.exists;
    if (mappingsTableExists) {
      // Check if field_type column exists
      const fieldTypeCheck = await db.execute(sql.raw(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'mysql_field_mappings' AND column_name = 'field_type'
        )
      `));
      
      if (!fieldTypeCheck[0]?.exists) {
        // Add field_type column
        await db.execute(sql.raw(`
          ALTER TABLE mysql_field_mappings 
          ADD COLUMN field_type TEXT DEFAULT 'text'
        `));
        console.log('Added field_type column to mysql_field_mappings table');
      }
      
      // Check if is_key_field column exists
      const isKeyFieldCheck = await db.execute(sql.raw(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'mysql_field_mappings' AND column_name = 'is_key_field'
        )
      `));
      
      if (!isKeyFieldCheck[0]?.exists) {
        // Add is_key_field column
        await db.execute(sql.raw(`
          ALTER TABLE mysql_field_mappings 
          ADD COLUMN is_key_field BOOLEAN DEFAULT FALSE
        `));
        console.log('Added is_key_field column to mysql_field_mappings table');
      }
    }
    
    // Add updated_from_mysql_at column to customers table if it doesn't exist
    const customerUpdatedColumnCheck = await db.execute(sql.raw(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'updated_from_mysql_at'
      )
    `));
    
    if (!customerUpdatedColumnCheck[0]?.exists) {
      await db.execute(sql.raw(`
        ALTER TABLE customers 
        ADD COLUMN updated_from_mysql_at TIMESTAMP
      `));
      console.log('Added updated_from_mysql_at column to customers table');
    }
    
    console.log('MySQL table alterations completed successfully');
    return { success: true };
  } catch (error) {
    console.error('Error altering MySQL tables:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    };
  }
}

// Export for import in server/index.ts
export { alterMySQLTables };

// No direct run in ESM modules