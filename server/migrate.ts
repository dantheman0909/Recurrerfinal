import { db } from "./db";
import { sql } from "drizzle-orm";
import { log } from "./vite";

async function migrateTables() {
  try {
    log('Starting database migration...', 'migration');
    
    // Add external ID columns to customers table
    await db.execute(sql`
      ALTER TABLE IF EXISTS customers
      ADD COLUMN IF NOT EXISTS chargebee_customer_id TEXT,
      ADD COLUMN IF NOT EXISTS chargebee_subscription_id TEXT,
      ADD COLUMN IF NOT EXISTS mysql_company_id TEXT;
    `);
    
    log('Migration completed successfully!', 'migration');
  } catch (error) {
    log(`Migration failed: ${error}`, 'migration');
    throw error;
  }
}

// Run the migration
migrateTables()
  .then(() => {
    log('Exiting migration script', 'migration');
    process.exit(0);
  })
  .catch(error => {
    log(`Migration error: ${error}`, 'migration');
    process.exit(1);
  });