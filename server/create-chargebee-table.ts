import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "../shared/schema";
import ws from "ws";

// Configure neon to use ws
neonConfig.webSocketConstructor = ws;

async function createChargebeeTable() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not defined");
  }

  console.log("Connecting to database...");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  try {
    console.log("Creating chargebee_config table...");
    // Create an integration_status enum if it doesn't exist
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'integration_status') THEN
          CREATE TYPE integration_status AS ENUM ('active', 'pending', 'error');
        END IF;
      END
      $$;
    `);

    // Create chargebee_config table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS chargebee_config (
        id SERIAL PRIMARY KEY,
        site TEXT NOT NULL,
        "apiKey" TEXT NOT NULL,
        status integration_status DEFAULT 'active',
        last_synced_at TIMESTAMP,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    console.log("Table created successfully!");
  } catch (error) {
    console.error("Error creating table:", error);
  } finally {
    await pool.end();
  }
}

createChargebeeTable()
  .then(() => console.log("Done!"))
  .catch((err) => console.error("Error:", err));