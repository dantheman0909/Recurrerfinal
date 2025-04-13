import { db } from './db';
import { mysqlSavedQueries } from '../shared/schema';
import { sql } from 'drizzle-orm';

export async function createMySQLSavedQueriesTable() {
  console.log('Creating mysql_saved_queries table...');
  
  try {
    // Create the table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS mysql_saved_queries (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        query TEXT NOT NULL,
        last_run_at TIMESTAMP,
        is_scheduled BOOLEAN DEFAULT FALSE,
        schedule_frequency INTEGER DEFAULT 0,
        enabled BOOLEAN DEFAULT TRUE,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    console.log('MySQL saved queries table created successfully');
    return true;
  } catch (error) {
    console.error('Error creating MySQL saved queries table:', error);
    return false;
  }
}