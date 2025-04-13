import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

/**
 * Creates the notifications and user_achievements tables
 */
async function createAchievementTables() {
  neonConfig.webSocketConstructor = ws;

  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL must be set. Did you forget to provision a database?",
    );
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    console.log("Creating notifications and user_achievements tables...");
    
    // Create notification_type enum if it doesn't exist
    await pool.query(`
      DO $$ BEGIN
        CREATE TYPE "notification_type" AS ENUM (
          'task_assigned', 
          'task_due_soon', 
          'task_overdue', 
          'red_zone_alert', 
          'customer_renewal', 
          'system_notification', 
          'achievement_earned'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    
    // Create achievement_type enum if it doesn't exist
    await pool.query(`
      DO $$ BEGIN
        CREATE TYPE "achievement_type" AS ENUM (
          'tasks_completed', 
          'customer_health_improved', 
          'feedback_collected', 
          'playbooks_executed', 
          'red_zone_resolved', 
          'login_streak'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    
    // Create notifications table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "notifications" (
        "id" serial PRIMARY KEY,
        "user_id" integer NOT NULL,
        "type" notification_type NOT NULL,
        "title" text NOT NULL,
        "message" text NOT NULL,
        "link" text,
        "is_read" boolean DEFAULT false,
        "created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
        "related_id" integer,
        "related_type" text
      );
    `);
    
    // Create user_achievements table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "user_achievements" (
        "id" serial PRIMARY KEY,
        "user_id" integer NOT NULL,
        "achievement_type" achievement_type NOT NULL,
        "achievement_title" text NOT NULL,
        "achievement_description" text NOT NULL,
        "badge_icon" text NOT NULL,
        "xp_earned" integer DEFAULT 0,
        "level_unlocked" integer,
        "earned_at" timestamp DEFAULT CURRENT_TIMESTAMP,
        "is_viewed" boolean DEFAULT false
      );
    `);
    
    console.log("Notifications and user achievements tables created successfully!");
    return { success: true };
  } catch (error) {
    console.error("Error creating achievement tables:", error);
    return { success: false, error };
  } finally {
    await pool.end();
  }
}

export default createAchievementTables;