import { db } from './db';
import { sql } from 'drizzle-orm';

async function alterMySQLTables() {
  try {
    console.log('Starting MySQL tables alteration...');

    // First, check if field_type and is_key_field columns exist in mysql_field_mappings
    const fieldTypeExists = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'mysql_field_mappings' 
      AND column_name = 'field_type'
    `);

    if (!Array.isArray(fieldTypeExists) || fieldTypeExists.length === 0) {
      console.log('Adding field_type column to mysql_field_mappings...');
      await db.execute(sql`
        ALTER TABLE mysql_field_mappings 
        ADD COLUMN field_type TEXT DEFAULT 'text'
      `);
    } else {
      console.log('field_type column already exists in mysql_field_mappings');
    }

    const isKeyFieldExists = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'mysql_field_mappings' 
      AND column_name = 'is_key_field'
    `);

    if (!Array.isArray(isKeyFieldExists) || isKeyFieldExists.length === 0) {
      console.log('Adding is_key_field column to mysql_field_mappings...');
      await db.execute(sql`
        ALTER TABLE mysql_field_mappings 
        ADD COLUMN is_key_field BOOLEAN DEFAULT FALSE
      `);
    } else {
      console.log('is_key_field column already exists in mysql_field_mappings');
    }

    // Now check for MySQL config changes
    const statusExists = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'mysql_config' 
      AND column_name = 'status'
    `);

    if (!Array.isArray(statusExists) || statusExists.length === 0) {
      console.log('Adding status column to mysql_config...');
      await db.execute(sql`
        ALTER TABLE mysql_config 
        ADD COLUMN status TEXT DEFAULT 'active'
      `);
    } else {
      console.log('status column already exists in mysql_config');
    }

    const lastSyncedAtExists = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'mysql_config' 
      AND column_name = 'last_synced_at'
    `);

    if (!Array.isArray(lastSyncedAtExists) || lastSyncedAtExists.length === 0) {
      console.log('Adding last_synced_at column to mysql_config...');
      await db.execute(sql`
        ALTER TABLE mysql_config 
        ADD COLUMN last_synced_at TIMESTAMP
      `);
    } else {
      console.log('last_synced_at column already exists in mysql_config');
    }

    const syncFrequencyExists = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'mysql_config' 
      AND column_name = 'sync_frequency'
    `);

    if (!Array.isArray(syncFrequencyExists) || syncFrequencyExists.length === 0) {
      console.log('Adding sync_frequency column to mysql_config...');
      await db.execute(sql`
        ALTER TABLE mysql_config 
        ADD COLUMN sync_frequency INTEGER DEFAULT 24
      `);
    } else {
      console.log('sync_frequency column already exists in mysql_config');
    }

    console.log('MySQL tables alteration completed successfully');
  } catch (error) {
    console.error('Error altering MySQL tables:', error);
  }
}

// Run the migration
alterMySQLTables()
  .then(() => {
    console.log('MySQL tables alteration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('MySQL tables alteration script failed:', error);
    process.exit(1);
  });