import { pool, db } from './db';
import { sql } from 'drizzle-orm';
import { createMySQLSavedQueriesTable } from './create-mysql-saved-queries-table';

/**
 * Migrates MySQL config and field mappings tables to the latest schema
 * - Adds field_type and is_key_field columns to mysql_field_mappings table
 * - Adds status, sync_frequency, and last_synced_at columns to mysql_config table
 */
async function migrateMySQLTables() {
  try {
    console.log('Starting MySQL tables migration...');
    
    // First check if mysql_config table exists, if not create it
    const checkConfigTable = await db.execute(sql.raw(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'mysql_config'
      )
    `));
    
    if (!checkConfigTable[0]?.exists) {
      try {
        console.log('Creating mysql_config table...');
        await db.execute(sql.raw(`
          CREATE TABLE mysql_config (
            id SERIAL PRIMARY KEY,
            created_at TIMESTAMP DEFAULT NOW(),
            created_by INTEGER,
            host TEXT NOT NULL,
            port INTEGER NOT NULL,
            username TEXT NOT NULL,
            password TEXT NOT NULL,
            database TEXT NOT NULL,
            status TEXT DEFAULT 'active',
            sync_frequency INTEGER DEFAULT 24,
            last_synced_at TIMESTAMP
          )
        `));
        console.log('mysql_config table created successfully');
      } catch (error) {
        // If table creation fails, it might be because the table was created in a parallel process
        console.log('Table mysql_config might already exist, proceeding with column checks');
      }
    }
    
    // Whether table was created or already existed, check for columns
    {
      // Check if status column exists
      const checkStatusColumn = await db.execute(sql.raw(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'mysql_config' AND column_name = 'status'
        )
      `));
      
      if (!checkStatusColumn[0]?.exists) {
        try {
          console.log('Adding status column to mysql_config table...');
          await db.execute(sql.raw(`
            ALTER TABLE mysql_config
            ADD COLUMN status TEXT DEFAULT 'active'
          `));
        } catch (error) {
          console.log('Status column may already exist in mysql_config');
        }
      }
      
      // Check if sync_frequency column exists
      const checkSyncFrequencyColumn = await db.execute(sql.raw(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'mysql_config' AND column_name = 'sync_frequency'
        )
      `));
      
      if (!checkSyncFrequencyColumn[0]?.exists) {
        try {
          console.log('Adding sync_frequency column to mysql_config table...');
          await db.execute(sql.raw(`
            ALTER TABLE mysql_config
            ADD COLUMN sync_frequency INTEGER DEFAULT 24
          `));
        } catch (error) {
          console.log('sync_frequency column may already exist in mysql_config');
        }
      }
      
      // Check if last_synced_at column exists
      const checkLastSyncedColumn = await db.execute(sql.raw(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'mysql_config' AND column_name = 'last_synced_at'
        )
      `));
      
      if (!checkLastSyncedColumn[0]?.exists) {
        try {
          console.log('Adding last_synced_at column to mysql_config table...');
          await db.execute(sql.raw(`
            ALTER TABLE mysql_config
            ADD COLUMN last_synced_at TIMESTAMP
          `));
        } catch (error) {
          console.log('last_synced_at column may already exist in mysql_config');
        }
      }
    }
    
    // Now check if mysql_field_mappings table exists, if not create it
    const checkMappingsTable = await db.execute(sql.raw(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'mysql_field_mappings'
      )
    `));
    
    if (!checkMappingsTable[0]?.exists) {
      try {
        console.log('Creating mysql_field_mappings table...');
        await db.execute(sql.raw(`
          CREATE TABLE mysql_field_mappings (
            id SERIAL PRIMARY KEY,
            created_at TIMESTAMP DEFAULT NOW(),
            created_by INTEGER,
            mysql_table TEXT NOT NULL,
            mysql_field TEXT NOT NULL,
            local_table TEXT NOT NULL,
            local_field TEXT NOT NULL,
            field_type TEXT DEFAULT 'text',
            is_key_field BOOLEAN DEFAULT false
          )
        `));
        console.log('mysql_field_mappings table created successfully');
      } catch (error) {
        // If table creation fails, it might be because the table was created in a parallel process
        console.log('Table mysql_field_mappings might already exist, proceeding with column checks');
      }
    }
    
    // Whether table was created or already existed, check for columns
    {
      // Check if field_type column exists
      const checkFieldTypeColumn = await db.execute(sql.raw(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'mysql_field_mappings' AND column_name = 'field_type'
        )
      `));
      
      if (!checkFieldTypeColumn[0]?.exists) {
        try {
          console.log('Adding field_type column to mysql_field_mappings table...');
          await db.execute(sql.raw(`
            ALTER TABLE mysql_field_mappings
            ADD COLUMN field_type TEXT DEFAULT 'text'
          `));
        } catch (error) {
          console.log('field_type column may already exist in mysql_field_mappings');
        }
      }
      
      // Check if is_key_field column exists
      const checkIsKeyFieldColumn = await db.execute(sql.raw(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'mysql_field_mappings' AND column_name = 'is_key_field'
        )
      `));
      
      if (!checkIsKeyFieldColumn[0]?.exists) {
        try {
          console.log('Adding is_key_field column to mysql_field_mappings table...');
          await db.execute(sql.raw(`
            ALTER TABLE mysql_field_mappings
            ADD COLUMN is_key_field BOOLEAN DEFAULT false
          `));
        } catch (error) {
          console.log('is_key_field column may already exist in mysql_field_mappings');
        }
      }
    }
    
    // Check if updated_from_mysql_at column exists in customers table
    const checkUpdatedFromMySQLColumn = await db.execute(sql.raw(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'updated_from_mysql_at'
      )
    `));
    
    if (!checkUpdatedFromMySQLColumn[0]?.exists) {
      try {
        console.log('Adding updated_from_mysql_at column to customers table...');
        await db.execute(sql.raw(`
          ALTER TABLE customers
          ADD COLUMN updated_from_mysql_at TIMESTAMP
        `));
      } catch (error) {
        console.log('updated_from_mysql_at column may already exist in customers table');
      }
    }

    // Create MySQL saved queries table
    const checkMySQLSavedQueriesTable = await db.execute(sql.raw(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'mysql_saved_queries'
      )
    `));

    if (!checkMySQLSavedQueriesTable[0]?.exists) {
      await createMySQLSavedQueriesTable();
    }
    
    console.log('MySQL tables migration completed successfully');
    return { success: true };
  } catch (error) {
    console.error('Error during MySQL tables migration:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    };
  }
}

// Export for use in server/index.ts
export { migrateMySQLTables };