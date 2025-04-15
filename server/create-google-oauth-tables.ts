import { db } from "./db";
import { googleOAuthConfig, userOAuthTokens, emailMessages, calendarEvents, oauthProviderEnum, oauthScopeEnum } from "@shared/schema";

/**
 * Creates Google OAuth related tables for integration with Gmail and Google Calendar
 * @returns {Promise<{success: boolean, error?: string, message?: string}>} Result of the operation
 */
async function createGoogleOAuthTables() {
  try {
    // Create enum types first if they don't exist
    try {
      console.log("Creating oauth_provider enum type if it doesn't exist...");
      await db.execute(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'oauth_provider') THEN
            CREATE TYPE "oauth_provider" AS ENUM ('google');
          END IF;
        END
        $$;
      `);

      console.log("Creating oauth_scope enum type if it doesn't exist...");
      await db.execute(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'oauth_scope') THEN
            CREATE TYPE "oauth_scope" AS ENUM ('email', 'profile', 'gmail', 'calendar');
          END IF;
        END
        $$;
      `);
    } catch (enumError) {
      console.error("Error creating enum types:", enumError);
    }

    // Check if tables exist first to avoid errors
    const existingTables = await db.execute(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_schema = 'public' 
       AND table_name IN ('google_oauth_config', 'user_oauth_tokens', 'email_messages', 'calendar_events')`
    );

    const tableNames = existingTables.rows.map(row => row.table_name);
    
    console.log("Existing tables:", tableNames);

    // Create google_oauth_config table if it doesn't exist
    if (!tableNames.includes("google_oauth_config")) {
      console.log("Creating google_oauth_config table...");
      await db.execute(`
        CREATE TABLE "google_oauth_config" (
          "id" SERIAL PRIMARY KEY,
          "client_id" TEXT NOT NULL,
          "client_secret" TEXT NOT NULL,
          "redirect_uri" TEXT NOT NULL,
          "scopes" "oauth_scope"[] DEFAULT ARRAY[]::"oauth_scope"[],
          "enabled" BOOLEAN DEFAULT true,
          "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          "updated_at" TIMESTAMP WITH TIME ZONE
        )
      `);
    }

    // Create user_oauth_tokens table if it doesn't exist
    if (!tableNames.includes("user_oauth_tokens")) {
      console.log("Creating user_oauth_tokens table...");
      await db.execute(`
        CREATE TABLE "user_oauth_tokens" (
          "id" SERIAL PRIMARY KEY,
          "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
          "provider" "oauth_provider" NOT NULL,
          "access_token" TEXT NOT NULL,
          "refresh_token" TEXT,
          "token_type" TEXT DEFAULT 'Bearer',
          "scopes" "oauth_scope"[] DEFAULT ARRAY[]::"oauth_scope"[],
          "expires_at" TIMESTAMP WITH TIME ZONE,
          "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          "updated_at" TIMESTAMP WITH TIME ZONE
        )
      `);
    }

    // Create email_messages table if it doesn't exist
    if (!tableNames.includes("email_messages")) {
      console.log("Creating email_messages table...");
      await db.execute(`
        CREATE TABLE "email_messages" (
          "id" SERIAL PRIMARY KEY,
          "gmail_id" TEXT UNIQUE,
          "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
          "customer_id" INTEGER REFERENCES "customers"("id") ON DELETE SET NULL,
          "thread_id" TEXT,
          "from_email" TEXT NOT NULL,
          "from_name" TEXT,
          "to_emails" TEXT[],
          "cc_emails" TEXT[],
          "subject" TEXT,
          "body_text" TEXT,
          "body_html" TEXT,
          "received_at" TIMESTAMP WITH TIME ZONE,
          "is_read" BOOLEAN DEFAULT false,
          "is_sent" BOOLEAN DEFAULT false,
          "is_archived" BOOLEAN DEFAULT false,
          "labels" TEXT[],
          "attachments_count" INTEGER DEFAULT 0,
          "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);
    }

    // Create calendar_events table if it doesn't exist
    if (!tableNames.includes("calendar_events")) {
      console.log("Creating calendar_events table...");
      await db.execute(`
        CREATE TABLE "calendar_events" (
          "id" SERIAL PRIMARY KEY,
          "google_event_id" TEXT UNIQUE,
          "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
          "customer_id" INTEGER REFERENCES "customers"("id") ON DELETE SET NULL,
          "title" TEXT NOT NULL,
          "description" TEXT,
          "location" TEXT,
          "start_time" TIMESTAMP WITH TIME ZONE NOT NULL,
          "end_time" TIMESTAMP WITH TIME ZONE NOT NULL,
          "is_all_day" BOOLEAN DEFAULT false,
          "attendees" JSONB,
          "google_calendar_id" TEXT,
          "google_meet_link" TEXT,
          "is_recurring" BOOLEAN DEFAULT false,
          "recurrence_rule" TEXT,
          "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          "updated_at" TIMESTAMP WITH TIME ZONE
        )
      `);
    }

    console.log("Google OAuth tables created successfully");
    return { success: true, message: "Google OAuth tables created successfully" };
  } catch (error) {
    console.error("Error creating Google OAuth tables:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error),
      message: "Failed to create Google OAuth tables"
    };
  }
}

export default createGoogleOAuthTables;