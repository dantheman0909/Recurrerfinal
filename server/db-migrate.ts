import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "../shared/schema";

async function main() {
  neonConfig.webSocketConstructor = ws;

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL must be set. Did you forget to provision a database?");
    return { success: false, error: "DATABASE_URL environment variable is not set" };
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  console.log("Starting database migration...");

  try {
    console.log("Dropping existing tables if they exist...");
    // Drop existing tables and types to avoid conflicts
    await pool.query(`
      DROP TABLE IF EXISTS "report_metrics" CASCADE;
      DROP TABLE IF EXISTS "mysql_field_mappings" CASCADE;
      DROP TABLE IF EXISTS "mysql_config" CASCADE;
      DROP TABLE IF EXISTS "integration_tokens" CASCADE;
      DROP TABLE IF EXISTS "email_threads" CASCADE;
      DROP TABLE IF EXISTS "calendar_events" CASCADE;
      DROP TABLE IF EXISTS "red_zone_accounts" CASCADE;
      DROP TABLE IF EXISTS "playbook_tasks" CASCADE;
      DROP TABLE IF EXISTS "task_comments" CASCADE;
      DROP TABLE IF EXISTS "tasks" CASCADE;
      DROP TABLE IF EXISTS "playbooks" CASCADE;
      DROP TABLE IF EXISTS "customers" CASCADE;
      DROP TABLE IF EXISTS "users" CASCADE;
      
      DROP TYPE IF EXISTS "red_zone_reason" CASCADE;
      DROP TYPE IF EXISTS "task_recurrence" CASCADE;
      DROP TYPE IF EXISTS "task_status" CASCADE;
      DROP TYPE IF EXISTS "user_role" CASCADE;
    `);
    
    console.log("Creating new schema...");
    // Execute SQL statement directly to create the schema
    await pool.query(`
      -- Create enums
      DO $$ BEGIN
          CREATE TYPE "user_role" AS ENUM ('admin', 'team_lead', 'csm');
      EXCEPTION
          WHEN duplicate_object THEN null;
      END $$;
      
      DO $$ BEGIN
          CREATE TYPE "task_status" AS ENUM ('not_started', 'in_progress', 'completed', 'blocked');
      EXCEPTION
          WHEN duplicate_object THEN null;
      END $$;
      
      DO $$ BEGIN
          CREATE TYPE "task_recurrence" AS ENUM ('none', 'daily', 'weekly', 'bi_weekly', 'monthly', 'quarterly');
      EXCEPTION
          WHEN duplicate_object THEN null;
      END $$;
      
      DO $$ BEGIN
          CREATE TYPE "red_zone_reason" AS ENUM ('delayed_onboarding', 'no_qr_loyalty_setup', 'no_campaign_60_days', 'no_monthly_campaigns', 'no_review_meetings', 'low_nps', 'low_data_tagging', 'revenue_drop');
      EXCEPTION
          WHEN duplicate_object THEN null;
      END $$;
      
      -- Create tables
      CREATE TABLE IF NOT EXISTS "users" (
        "id" text PRIMARY KEY,
        "email" text NOT NULL UNIQUE,
        "full_name" text,
        "avatar_url" text,
        "role" "user_role" NOT NULL DEFAULT 'csm',
        "created_at" timestamp DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS "customers" (
        "id" serial PRIMARY KEY,
        "name" text NOT NULL,
        "industry" text,
        "website" text,
        "status" text DEFAULT 'active',
        "arr" real DEFAULT 0,
        "mrr" real DEFAULT 0,
        "onboarding_start_date" date,
        "onboarding_completion_date" date,
        "renewal_date" date,
        "campaign_stats" jsonb,
        "last_review_meeting" date,
        "nps_score" integer,
        "data_tagging_percentage" real,
        "add_on_revenue" real DEFAULT 0,
        "created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
        "assigned_to_user_id" text REFERENCES "users"("id"),
        "external_ids" jsonb,
        "in_red_zone" boolean DEFAULT false
      );
      
      CREATE TABLE IF NOT EXISTS "playbooks" (
        "id" serial PRIMARY KEY,
        "name" text NOT NULL,
        "description" text,
        "trigger_config" jsonb,
        "is_active" boolean DEFAULT true,
        "created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
        "created_by_user_id" text REFERENCES "users"("id")
      );
      
      CREATE TABLE IF NOT EXISTS "tasks" (
        "id" serial PRIMARY KEY,
        "title" text NOT NULL,
        "description" text,
        "status" "task_status" DEFAULT 'not_started',
        "due_date" date,
        "relative_due_days" integer,
        "recurrence" "task_recurrence" DEFAULT 'none',
        "assigned_to_user_id" text REFERENCES "users"("id"),
        "customer_id" integer REFERENCES "customers"("id"),
        "playbook_id" integer REFERENCES "playbooks"("id"),
        "created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
        "created_by_user_id" text REFERENCES "users"("id")
      );
      
      CREATE TABLE IF NOT EXISTS "task_comments" (
        "id" serial PRIMARY KEY,
        "task_id" integer NOT NULL REFERENCES "tasks"("id"),
        "comment" text NOT NULL,
        "created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
        "user_id" text REFERENCES "users"("id")
      );
      
      CREATE TABLE IF NOT EXISTS "playbook_tasks" (
        "id" serial PRIMARY KEY,
        "playbook_id" integer NOT NULL REFERENCES "playbooks"("id"),
        "title" text NOT NULL,
        "description" text,
        "relative_due_days" integer,
        "recurrence" "task_recurrence" DEFAULT 'none',
        "sort_order" integer DEFAULT 0
      );
      
      CREATE TABLE IF NOT EXISTS "red_zone_accounts" (
        "id" serial PRIMARY KEY,
        "customer_id" integer NOT NULL UNIQUE REFERENCES "customers"("id"),
        "reasons" jsonb,
        "created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
        "resolved_at" timestamp
      );
      
      CREATE TABLE IF NOT EXISTS "calendar_events" (
        "id" serial PRIMARY KEY,
        "customer_id" integer REFERENCES "customers"("id"),
        "title" text NOT NULL,
        "start_time" timestamp NOT NULL,
        "end_time" timestamp NOT NULL,
        "location" text,
        "notes" text,
        "created_by_user_id" text REFERENCES "users"("id"),
        "attendees" jsonb,
        "google_event_id" text
      );
      
      CREATE TABLE IF NOT EXISTS "email_threads" (
        "id" serial PRIMARY KEY,
        "customer_id" integer REFERENCES "customers"("id"),
        "subject" text NOT NULL,
        "last_message_date" timestamp NOT NULL,
        "snippet" text,
        "thread_id" text UNIQUE,
        "labels" jsonb
      );
      
      CREATE TABLE IF NOT EXISTS "integration_tokens" (
        "id" serial PRIMARY KEY,
        "user_id" text NOT NULL REFERENCES "users"("id"),
        "provider" text NOT NULL,
        "access_token" text,
        "refresh_token" text,
        "token_type" text,
        "expires_at" timestamp,
        "scopes" jsonb,
        "created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
        "provider_id" text
      );
      
      CREATE TABLE IF NOT EXISTS "mysql_config" (
        "id" serial PRIMARY KEY,
        "host" text NOT NULL,
        "port" integer NOT NULL,
        "username" text NOT NULL,
        "password" text NOT NULL,
        "database" text NOT NULL,
        "is_active" boolean DEFAULT false,
        "last_sync_at" timestamp,
        "created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS "mysql_field_mappings" (
        "id" serial PRIMARY KEY,
        "mysql_field" text NOT NULL,
        "platform_field" text NOT NULL,
        "mysql_table" text NOT NULL,
        "transformation_type" text,
        "transformation_rule" jsonb,
        "is_active" boolean DEFAULT true
      );
      
      CREATE TABLE IF NOT EXISTS "report_metrics" (
        "id" serial PRIMARY KEY,
        "metric_name" text NOT NULL,
        "metric_value" real,
        "metric_date" date NOT NULL,
        "customer_id" integer REFERENCES "customers"("id"),
        "metadata" jsonb,
        "created_at" timestamp DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log("Database schema created successfully!");
    return { success: true };
  } catch (error) {
    console.error("Migration failed:", error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  } finally {
    try {
      await pool.end();
    } catch (err) {
      console.error("Error closing database pool:", err);
    }
  }
}

// Run the migration function but don't terminate the process 
// regardless of success or failure
main().then(result => {
  if (result.success) {
    console.log("Database migration completed successfully");
  } else {
    console.error("Database migration encountered errors:", result.error);
  }
}).catch(error => {
  console.error("Failed to run database migration:", error);
});