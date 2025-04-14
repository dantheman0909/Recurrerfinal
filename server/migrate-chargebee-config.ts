import { pool, db } from './db';
import { sql } from 'drizzle-orm';

/**
 * Migrates Chargebee config and field mappings tables to the latest schema
 * - Adds is_key_field column to chargebee_field_mappings table
 * - Adds status, sync_frequency, and last_synced_at columns to chargebee_config table
 */
async function migrateChargebeeTables() {
  try {
    console.log('Starting Chargebee tables migration...');
    
    // First check if chargebee_config table exists, if not create it
    const checkConfigTable = await db.execute(sql.raw(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'chargebee_config'
      )
    `));
    
    if (!checkConfigTable[0]?.exists) {
      try {
        console.log('Creating chargebee_config table...');
        await db.execute(sql.raw(`
          CREATE TABLE chargebee_config (
            id SERIAL PRIMARY KEY,
            created_at TIMESTAMP DEFAULT NOW(),
            created_by INTEGER,
            site TEXT NOT NULL,
            apiKey TEXT NOT NULL,
            status TEXT DEFAULT 'active',
            sync_frequency INTEGER DEFAULT 24,
            last_synced_at TIMESTAMP
          )
        `));
        console.log('chargebee_config table created successfully');
      } catch (error) {
        // If table creation fails, it might be because the table was created in a parallel process
        console.log('Table chargebee_config might already exist, proceeding with column checks');
      }
    }
    
    // Whether table was created or already existed, check for columns
    {
      // Check if status column exists
      const checkStatusColumn = await db.execute(sql.raw(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'chargebee_config' AND column_name = 'status'
        )
      `));
      
      if (!checkStatusColumn[0]?.exists) {
        try {
          console.log('Adding status column to chargebee_config table...');
          await db.execute(sql.raw(`
            ALTER TABLE chargebee_config
            ADD COLUMN status TEXT DEFAULT 'active'
          `));
        } catch (error) {
          console.log('Status column may already exist in chargebee_config');
        }
      }
      
      // Check if sync_frequency column exists
      const checkSyncFrequencyColumn = await db.execute(sql.raw(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'chargebee_config' AND column_name = 'sync_frequency'
        )
      `));
      
      if (!checkSyncFrequencyColumn[0]?.exists) {
        try {
          console.log('Adding sync_frequency column to chargebee_config table...');
          await db.execute(sql.raw(`
            ALTER TABLE chargebee_config
            ADD COLUMN sync_frequency INTEGER DEFAULT 24
          `));
        } catch (error) {
          console.log('sync_frequency column may already exist in chargebee_config');
        }
      }
      
      // Check if last_synced_at column exists
      const checkLastSyncedColumn = await db.execute(sql.raw(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'chargebee_config' AND column_name = 'last_synced_at'
        )
      `));
      
      if (!checkLastSyncedColumn[0]?.exists) {
        try {
          console.log('Adding last_synced_at column to chargebee_config table...');
          await db.execute(sql.raw(`
            ALTER TABLE chargebee_config
            ADD COLUMN last_synced_at TIMESTAMP
          `));
        } catch (error) {
          console.log('last_synced_at column may already exist in chargebee_config');
        }
      }
    }
    
    // Now check if chargebee_field_mappings table exists, if not create it
    const checkMappingsTable = await db.execute(sql.raw(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'chargebee_field_mappings'
      )
    `));
    
    if (!checkMappingsTable[0]?.exists) {
      try {
        console.log('Creating chargebee_field_mappings table...');
        await db.execute(sql.raw(`
          CREATE TABLE chargebee_field_mappings (
            id SERIAL PRIMARY KEY,
            created_at TIMESTAMP DEFAULT NOW(),
            created_by INTEGER,
            chargebee_entity TEXT NOT NULL,
            chargebee_field TEXT NOT NULL,
            local_table TEXT NOT NULL,
            local_field TEXT NOT NULL,
            is_key_field BOOLEAN DEFAULT false
          )
        `));
        console.log('chargebee_field_mappings table created successfully');
      } catch (error) {
        // If table creation fails, it might be because the table was created in a parallel process
        console.log('Table chargebee_field_mappings might already exist, proceeding with column checks');
      }
    }
    
    // Whether table was created or already existed, check for columns
    {
      // Check if is_key_field column exists
      const checkIsKeyFieldColumn = await db.execute(sql.raw(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'chargebee_field_mappings' AND column_name = 'is_key_field'
        )
      `));
      
      if (!checkIsKeyFieldColumn[0]?.exists) {
        try {
          console.log('Adding is_key_field column to chargebee_field_mappings table...');
          await db.execute(sql.raw(`
            ALTER TABLE chargebee_field_mappings
            ADD COLUMN is_key_field BOOLEAN DEFAULT false
          `));
        } catch (error) {
          console.log('is_key_field column may already exist in chargebee_field_mappings');
        }
      }
    }
    
    // Check if updated_from_chargebee_at column exists in customers table
    const checkUpdatedFromChargebeeColumn = await db.execute(sql.raw(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'updated_from_chargebee_at'
      )
    `));
    
    if (!checkUpdatedFromChargebeeColumn[0]?.exists) {
      try {
        console.log('Adding updated_from_chargebee_at column to customers table...');
        await db.execute(sql.raw(`
          ALTER TABLE customers
          ADD COLUMN updated_from_chargebee_at TIMESTAMP
        `));
      } catch (error) {
        console.log('updated_from_chargebee_at column may already exist in customers table');
      }
    }
    
    console.log('Chargebee tables migration completed successfully');
    return { success: true };
  } catch (error) {
    console.error('Error during Chargebee tables migration:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    };
  }
}

// Export for use in server/index.ts
export { migrateChargebeeTables };