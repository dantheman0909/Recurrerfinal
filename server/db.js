/**
 * Database connection module for the Recurrer platform
 * Provides a persistent database connection pool
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from '../shared/schema.js';

// Configure neon to use WebSocket
neonConfig.webSocketConstructor = ws;

// Get database URL from environment variables
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set.');
}

// Create a connection pool
export const pool = new Pool({ 
  connectionString: DATABASE_URL,
  max: 20,               // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 5000, // Max time to wait for connection
});

// Test database connection
export async function testDatabaseConnection() {
  let client;
  try {
    client = await pool.connect();
    const result = await client.query('SELECT NOW() as now');
    console.log('Database connection successful:', result.rows[0]);
    return result.rows[0];
  } catch (error) {
    console.error('Database connection failed:', error.message);
    throw error;
  } finally {
    if (client) client.release();
  }
}

// Create drizzle ORM instance
export const db = drizzle(pool, { schema });

// Initialize database - can be called during server startup
export async function initDatabase() {
  try {
    await testDatabaseConnection();
    console.log('Database initialized successfully');
    // Add any additional initialization logic here
    
    return true;
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
}

// Handle termination properly
process.on('SIGINT', async () => {
  console.log('Closing database pool...');
  await pool.end();
  console.log('Database pool closed');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Closing database pool...');
  await pool.end();
  console.log('Database pool closed');
  process.exit(0);
});