import { db } from './db';
import { sql } from 'drizzle-orm';

/**
 * Alters the chargebee_config table to add the last_sync_stats column
 * This column will store statistics about the last synchronization run
 */
async function alterChargebeeConfig() {
  try {
    console.log('Altering chargebee_config table to add last_sync_stats column...');
    
    // Check if the column already exists
    const columnsQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'chargebee_config'
      AND column_name = 'last_sync_stats'
    `;
    
    const columns = await db.execute(sql.raw(columnsQuery));
    const columnExists = Array.isArray(columns) && columns.length > 0;
    
    if (!columnExists) {
      // Add the last_sync_stats column as JSONB
      await db.execute(sql.raw(`
        ALTER TABLE chargebee_config 
        ADD COLUMN IF NOT EXISTS last_sync_stats JSONB NULL
      `));
      console.log('Added last_sync_stats column to chargebee_config table');
    } else {
      console.log('last_sync_stats column already exists in chargebee_config table');
    }
    
    return { success: true, message: 'Chargebee config table altered successfully' };
  } catch (error) {
    console.error('Error altering chargebee_config table:', error);
    return { 
      success: false, 
      error: String(error),
      message: 'Failed to alter chargebee_config table' 
    };
  }
}

export default alterChargebeeConfig;