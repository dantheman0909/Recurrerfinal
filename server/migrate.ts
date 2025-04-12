import { db } from "./db";
import { sql } from "drizzle-orm";
import { log } from "./vite";

async function migrateTables() {
  try {
    log('Starting database migration...', 'migration');
    
    // Add team lead reference to users table
    await db.execute(sql`
      ALTER TABLE IF EXISTS users
      ADD COLUMN IF NOT EXISTS team_lead_id INTEGER REFERENCES users(id);
    `);
    
    log('Added team lead reference to users table', 'migration');
    
    // Add all the new fields to customers table
    await db.execute(sql`
      ALTER TABLE IF EXISTS customers
      ADD COLUMN IF NOT EXISTS recurrer_id TEXT UNIQUE,
      ADD COLUMN IF NOT EXISTS currency_code TEXT DEFAULT 'INR',
      ADD COLUMN IF NOT EXISTS assigned_csm INTEGER REFERENCES users(id),
      ADD COLUMN IF NOT EXISTS chargebee_customer_id TEXT,
      ADD COLUMN IF NOT EXISTS chargebee_subscription_id TEXT,
      ADD COLUMN IF NOT EXISTS mysql_company_id TEXT,
      ADD COLUMN IF NOT EXISTS active_stores INTEGER,
      ADD COLUMN IF NOT EXISTS growth_subscription_count INTEGER,
      ADD COLUMN IF NOT EXISTS loyalty_active_store_count INTEGER,
      ADD COLUMN IF NOT EXISTS loyalty_inactive_store_count INTEGER,
      ADD COLUMN IF NOT EXISTS loyalty_active_channels TEXT,
      ADD COLUMN IF NOT EXISTS loyalty_channel_credits INTEGER,
      ADD COLUMN IF NOT EXISTS negative_feedback_alert_inactive INTEGER,
      ADD COLUMN IF NOT EXISTS less_than_300_bills INTEGER,
      ADD COLUMN IF NOT EXISTS active_auto_campaigns_count INTEGER,
      ADD COLUMN IF NOT EXISTS unique_customers_captured INTEGER,
      ADD COLUMN IF NOT EXISTS revenue_1_year INTEGER,
      ADD COLUMN IF NOT EXISTS customers_with_min_one_visit INTEGER,
      ADD COLUMN IF NOT EXISTS customers_with_min_two_visit INTEGER,
      ADD COLUMN IF NOT EXISTS customers_without_min_visits INTEGER,
      ADD COLUMN IF NOT EXISTS percentage_of_inactive_customers INTEGER,
      ADD COLUMN IF NOT EXISTS negative_feedbacks_count INTEGER,
      ADD COLUMN IF NOT EXISTS campaigns_sent_last_90_days INTEGER,
      ADD COLUMN IF NOT EXISTS bills_received_last_30_days INTEGER,
      ADD COLUMN IF NOT EXISTS customers_acquired_last_30_days INTEGER,
      ADD COLUMN IF NOT EXISTS loyalty_type TEXT,
      ADD COLUMN IF NOT EXISTS loyalty_reward TEXT,
      ADD COLUMN IF NOT EXISTS updated_from_mysql_at TIMESTAMP;
    `);
    
    log('Added all new fields to customers table', 'migration');
    
    // Generate recurrer_id for existing customers
    await db.execute(sql`
      UPDATE customers 
      SET recurrer_id = 'rec_' || md5(random()::text || clock_timestamp()::text)::text
      WHERE recurrer_id IS NULL;
    `);
    
    log('Generated recurrer_id for existing customers', 'migration');
    
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