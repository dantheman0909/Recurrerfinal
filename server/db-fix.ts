import { pool, db } from './db';
import { sql } from 'drizzle-orm';

async function fixDatabase() {
  try {
    console.log('Starting database fix...');
    
    // Check if the target_segments column exists in the playbooks table
    const checkColumnQuery = `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'playbooks' AND column_name = 'target_segments';
    `;

    const result = await db.execute(sql.raw(checkColumnQuery));
    const columnExists = result.length > 0;

    if (!columnExists) {
      console.log('Adding target_segments column to playbooks table...');
      
      // Add the target_segments column to the playbooks table
      await db.execute(sql.raw(`
        ALTER TABLE playbooks 
        ADD COLUMN target_segments text[] DEFAULT '{}'::text[];
      `));
      
      console.log('Column added successfully!');
    } else {
      console.log('target_segments column already exists.');
    }

    console.log('Database fix completed successfully!');
  } catch (error) {
    console.error('Error fixing database:', error);
  } finally {
    await pool.end();
  }
}

fixDatabase();