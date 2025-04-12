import { pool } from "./db";
import { drizzle } from "drizzle-orm/neon-serverless";
import { migrate } from "drizzle-orm/neon-serverless/migrator";
import * as schema from "@shared/schema";

// This script will initialize the database with our schema
async function runMigration() {
  console.log("🔄 Running database migrations...");
  const db = drizzle(pool, { schema });
  
  try {
    // Push the schema to the database
    await migrate(db, { migrationsFolder: "drizzle" });
    console.log("✅ Database migrations completed successfully");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Only run migration if this file is executed directly
if (require.main === module) {
  runMigration();
}

export default runMigration;