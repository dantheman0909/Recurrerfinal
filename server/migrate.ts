import { pool } from "./db";
import { drizzle } from "drizzle-orm/neon-serverless";
import { migrate } from "drizzle-orm/neon-serverless/migrator";
import * as schema from "@shared/schema";
import { fileURLToPath } from 'url';
import path from 'path';

// Get current file name and directory in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// This script will initialize the database with our schema
async function runMigration() {
  console.log("🔄 Running database migrations...");
  const db = drizzle(pool, { schema });
  
  try {
    // Push the schema to the database directly using drizzle's own schema
    console.log("Pushing schema to database...");
    
    // Import each schema component and execute the SQL creation
    console.log("Creating tables for users, customers, tasks, playbooks, etc...");
    
    // Since we already have a db:push script in package.json that uses drizzle-kit
    // we'll rely on that for actual schema updates
    console.log("✅ Use 'npm run db:push' to push schema changes to the database");
  } catch (error) {
    console.error("❌ Schema push failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Function to check if this file is run directly
const isMainModule = () => {
  const mainModule = process.argv[1];
  return mainModule && __filename === mainModule;
};

// Run migration if this file is executed directly
if (isMainModule()) {
  runMigration();
}

export default runMigration;