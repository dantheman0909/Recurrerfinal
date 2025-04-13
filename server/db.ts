import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure the neon client to use websockets
neonConfig.webSocketConstructor = ws;

// Validate database URL
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Initialize the pool and Drizzle instance
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });

// Apply user self-reference fix with proper error handling
try {
  schema.updateUserReferences();
  console.log("User references set up successfully.");
} catch (error) {
  console.error("Error setting up user references:", error);
}