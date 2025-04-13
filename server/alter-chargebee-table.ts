import { pool, db } from './db';
import { sql } from 'drizzle-orm';

async function alterChargebeeTable() {
  try {
    console.log('Altering chargebee_config table to add sync_frequency column...');
    
    // Check if column exists first to avoid errors
    const checkResult = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'chargebee_config' AND column_name = 'sync_frequency'
    `);
    
    if (checkResult.length === 0) {
      // Add the sync_frequency column if it doesn't exist
      await db.execute(sql`
        ALTER TABLE chargebee_config
        ADD COLUMN sync_frequency INTEGER DEFAULT 24
      `);
      console.log('Successfully added sync_frequency column to chargebee_config table');
    } else {
      console.log('sync_frequency column already exists in chargebee_config table');
    }
    
    console.log('Table structure update completed');
  } catch (error) {
    console.error('Error altering chargebee_config table:', error);
  } finally {
    // Close the pool connection
    await pool.end();
  }
}

// Run the function
alterChargebeeTable();