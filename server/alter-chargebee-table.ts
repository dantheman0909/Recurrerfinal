import { db } from './db';
import { sql } from 'drizzle-orm';

/**
 * Alters Chargebee-related tables to add new columns for improved functionality:
 * - chargebee_config: Add sync_frequency column for scheduling
 */
async function alterChargebeeTables() {
  try {
    console.log('Altering chargebee_config table to add sync_frequency column...');
    
    // Check if column exists first to avoid errors
    const checkResult = await db.execute(sql.raw(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'chargebee_config' AND column_name = 'sync_frequency'
      )
    `));
    
    if (!checkResult[0]?.exists) {
      // Add the sync_frequency column if it doesn't exist
      await db.execute(sql.raw(`
        ALTER TABLE chargebee_config
        ADD COLUMN sync_frequency INTEGER DEFAULT 24
      `));
      console.log('Successfully added sync_frequency column to chargebee_config table');
    } else {
      console.log('sync_frequency column already exists in chargebee_config table');
    }
    
    // Check if status column exists
    const statusCheck = await db.execute(sql.raw(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'chargebee_config' AND column_name = 'status'
      )
    `));
    
    if (!statusCheck[0]?.exists) {
      // Add status column
      await db.execute(sql.raw(`
        ALTER TABLE chargebee_config 
        ADD COLUMN status TEXT DEFAULT 'active'
      `));
      console.log('Added status column to chargebee_config table');
    }
    
    // Check if last_synced_at column exists
    const lastSyncedCheck = await db.execute(sql.raw(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'chargebee_config' AND column_name = 'last_synced_at'
      )
    `));
    
    if (!lastSyncedCheck[0]?.exists) {
      // Add last_synced_at column
      await db.execute(sql.raw(`
        ALTER TABLE chargebee_config 
        ADD COLUMN last_synced_at TIMESTAMP
      `));
      console.log('Added last_synced_at column to chargebee_config table');
    }
    
    console.log('Chargebee table structure update completed');
    return { success: true };
  } catch (error) {
    console.error('Error altering chargebee_config table:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    };
  }
}

// Export for import in server/index.ts
export { alterChargebeeTables };