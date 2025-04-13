import { drizzle } from "drizzle-orm/neon-serverless";
import { migrate } from "drizzle-orm/neon-serverless/migrator";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { sql } from "drizzle-orm";
import ws from "ws";

// Required for Neon serverless connection
neonConfig.webSocketConstructor = ws;

// This migration adds additional customer fields that were missing
export async function migrateAdditionalCustomerFields() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  console.log("Adding additional customer fields...");

  try {
    // Add the new columns
    await db.execute(sql`
      ALTER TABLE customers
      ADD COLUMN IF NOT EXISTS csm_name TEXT,
      ADD COLUMN IF NOT EXISTS pod_name TEXT,
      ADD COLUMN IF NOT EXISTS reelo_id TEXT,
      ADD COLUMN IF NOT EXISTS hubspot_id TEXT,
      ADD COLUMN IF NOT EXISTS onboarding_start_date TIMESTAMP,
      ADD COLUMN IF NOT EXISTS onboarding_completed_date TIMESTAMP,
      ADD COLUMN IF NOT EXISTS days_to_complete_onboarding INTEGER,
      ADD COLUMN IF NOT EXISTS referral_status TEXT,
      ADD COLUMN IF NOT EXISTS whatsapp_header_status TEXT,
      ADD COLUMN IF NOT EXISTS whatsapp_marketing_credits INTEGER,
      ADD COLUMN IF NOT EXISTS campaigns_sent_total INTEGER,
      ADD COLUMN IF NOT EXISTS campaigns_sent_last_30_days INTEGER;
    `);

    console.log("Additional customer fields added successfully!");
    return true;
  } catch (error) {
    console.error("Error adding additional customer fields:", error);
    throw error;
  } finally {
    await pool.end();
  }
}