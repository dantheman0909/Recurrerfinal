import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from "@shared/schema";
import ws from 'ws';
import { neonConfig } from '@neondatabase/serverless';

// Configure the WebSocket implementation
neonConfig.webSocketConstructor = ws;

// Check if database URL is available
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

console.log("Initializing database connection...");

// Create connection pool
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL 
});

// Test database connection
export async function testDatabaseConnection() {
  try {
    console.log("Testing database connection...");
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT NOW()');
      console.log("Database connection successful:", result.rows[0]);
      return true;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Database connection test failed:", error);
    return false;
  }
}

// Create Drizzle ORM instance
export const db = drizzle(pool, { schema });

// Export a function to explicitly initialize the database
export async function initDatabase() {
  const connectionSuccess = await testDatabaseConnection();
  
  if (!connectionSuccess) {
    console.error("Failed to connect to the database. Please check your credentials and network connection.");
    throw new Error("Database connection failed");
  }
  
  console.log("Database initialized successfully");
  return db;
}