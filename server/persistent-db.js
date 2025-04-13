/**
 * Persistent database connection manager for Recurrer platform
 * This module handles database connections with automatic reconnection
 */

const { Pool } = require('@neondatabase/serverless');
const { drizzle } = require('drizzle-orm/neon-serverless');
const ws = require('ws');
const fs = require('fs');
const path = require('path');

// Configuration
const MAX_RETRIES = 10;
const INITIAL_RETRY_DELAY = 1000; // 1 second
const MAX_RETRY_DELAY = 30000; // 30 seconds
const CONNECTION_TIMEOUT = 10000; // 10 seconds
const LOG_FILE = 'database-connection.log';

// Global state
let pool = null;
let db = null;
let connectionAttempts = 0;
let isConnecting = false;
let connectionPromise = null;
let lastError = null;
let reconnectTimer = null;
let healthCheckInterval = null;

// Setup logging
function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}`;
  
  console.log(logMessage);
  
  // Append to log file
  try {
    fs.appendFileSync(LOG_FILE, logMessage + '\n');
  } catch (err) {
    console.error(`Failed to write to log file: ${err.message}`);
  }
}

// Initialize log file
function initLog() {
  try {
    const header = `
==========================================================
  Recurrer Database Connection Manager - Started ${new Date().toISOString()}
==========================================================
`;
    fs.writeFileSync(LOG_FILE, header);
    log('Database connection manager initialized');
  } catch (err) {
    console.error(`Failed to initialize log file: ${err.message}`);
  }
}

// Calculate exponential backoff time
function getRetryDelay() {
  const exponentialDelay = Math.min(
    MAX_RETRY_DELAY,
    INITIAL_RETRY_DELAY * Math.pow(2, connectionAttempts)
  );
  
  // Add some jitter to prevent thundering herd problem
  const jitter = Math.random() * 0.3 * exponentialDelay;
  return Math.floor(exponentialDelay + jitter);
}

// Close the existing database connection
function closeConnection() {
  if (pool) {
    log('Closing existing database connection');
    try {
      pool.end().catch(err => {
        log(`Error closing database connection: ${err.message}`, 'error');
      });
    } catch (err) {
      log(`Error during pool.end(): ${err.message}`, 'error');
    }
    pool = null;
    db = null;
  }

  // Clear any pending reconnect timer
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

// Test the database connection
async function testConnection() {
  if (!pool) {
    return { success: false, error: 'No database connection pool' };
  }

  try {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT NOW() as now');
      return { 
        success: true, 
        result: result.rows[0],
        connectionAttempts,
        lastError: lastError ? lastError.message : null
      };
    } finally {
      client.release();
    }
  } catch (err) {
    lastError = err;
    log(`Database test failed: ${err.message}`, 'error');
    return { success: false, error: err.message };
  }
}

// Setup health check interval
function setupHealthCheck() {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
  }

  healthCheckInterval = setInterval(async () => {
    log('Performing database health check');
    const testResult = await testConnection();
    
    if (testResult.success) {
      log('Database health check passed');
    } else {
      log(`Database health check failed: ${testResult.error}`, 'error');
      // Trigger reconnect
      initDatabaseConnection();
    }
  }, 30000); // Check every 30 seconds
}

// Create a new database connection
async function createConnection() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL must be set. Did you forget to provision a database?');
  }

  connectionAttempts++;
  log(`Attempting database connection (attempt ${connectionAttempts})`);

  // Configure Neon WebSocket
  try {
    const { neonConfig } = require('@neondatabase/serverless');
    neonConfig.webSocketConstructor = ws;
  } catch (err) {
    log(`Error configuring Neon WebSocket: ${err.message}`, 'error');
    // Continue anyway, might work without it
  }

  try {
    // Create a new connection pool with improved settings
    closeConnection();
    
    const poolConfig = {
      connectionString: process.env.DATABASE_URL,
      max: 20, // Maximum number of clients
      idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
      connectionTimeoutMillis: CONNECTION_TIMEOUT,
      allowExitOnIdle: false
    };

    pool = new Pool(poolConfig);
    
    // Set up event handlers for the pool
    pool.on('error', (err) => {
      log(`Unexpected error on idle database client: ${err.message}`, 'error');
      if (!isConnecting) {
        // Only trigger reconnect if we're not already connecting
        initDatabaseConnection();
      }
    });
    
    // Test the connection
    const testResult = await testConnection();
    if (!testResult.success) {
      throw new Error(`Connection test failed: ${testResult.error}`);
    }
    
    // Initialize Drizzle
    const schema = require('../shared/schema');
    db = drizzle({ client: pool, schema });
    
    // Reset connection attempts on success
    connectionAttempts = 0;
    lastError = null;
    log('Database connection established successfully');
    
    // Setup health check interval
    setupHealthCheck();
    
    return { pool, db };
  } catch (err) {
    lastError = err;
    log(`Failed to connect to database: ${err.message}`, 'error');
    
    // Schedule reconnect with exponential backoff if we haven't exceeded max attempts
    if (connectionAttempts < MAX_RETRIES) {
      const delay = getRetryDelay();
      log(`Will retry database connection in ${delay / 1000} seconds`);
      
      return new Promise((resolve, reject) => {
        reconnectTimer = setTimeout(async () => {
          try {
            const result = await createConnection();
            resolve(result);
          } catch (error) {
            reject(error);
          }
        }, delay);
      });
    } else {
      log(`Exceeded maximum connection attempts (${MAX_RETRIES})`, 'error');
      throw err;
    }
  }
}

// Initialize database connection (with connection deduplication)
function initDatabaseConnection() {
  if (isConnecting) {
    log('Connection attempt already in progress, returning existing promise');
    return connectionPromise;
  }
  
  isConnecting = true;
  connectionPromise = createConnection()
    .then(result => {
      isConnecting = false;
      return result;
    })
    .catch(err => {
      isConnecting = false;
      throw err;
    });
  
  return connectionPromise;
}

// Get the current database connection (or create a new one if it doesn't exist)
async function getDatabaseConnection() {
  if (db) return { pool, db };
  return initDatabaseConnection();
}

// Execute a database query with automatic reconnect on failure
async function executeQuery(queryFn) {
  try {
    const { db } = await getDatabaseConnection();
    return await queryFn(db);
  } catch (err) {
    log(`Error executing database query: ${err.message}`, 'error');
    
    // If it's a connection error, try to reconnect once
    if (err.code === 'ECONNREFUSED' || 
        err.code === 'ETIMEDOUT' || 
        err.code === '57P01' || // Admin shutdown
        err.code === '57P02' || // Crash shutdown
        err.code === '57P03' || // Cannot connect now
        err.message.includes('connection') || 
        err.message.includes('timeout')) {
      
      log('Attempting to reconnect to database after connection error');
      await initDatabaseConnection();
      
      // Try once more after reconnection
      const { db } = await getDatabaseConnection();
      return await queryFn(db);
    }
    
    // For other types of errors, just rethrow
    throw err;
  }
}

// Cleanup function to be called when the application exits
function cleanup() {
  log('Database connection manager shutting down');
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
  }
  closeConnection();
}

// Initialize everything
initLog();

// Register cleanup handlers
process.on('exit', cleanup);
process.on('SIGINT', () => {
  log('Received SIGINT signal');
  cleanup();
  process.exit(0);
});
process.on('SIGTERM', () => {
  log('Received SIGTERM signal');
  cleanup();
  process.exit(0);
});

// Handle uncaught exceptions and unhandled promise rejections
process.on('uncaughtException', (err) => {
  log(`Uncaught exception: ${err.message}`, 'error');
  log(err.stack, 'error');
});

process.on('unhandledRejection', (reason, promise) => {
  log('Unhandled promise rejection:', 'error');
  log(`Promise: ${promise}, Reason: ${reason}`, 'error');
});

module.exports = {
  initDatabaseConnection,
  getDatabaseConnection,
  executeQuery,
  testConnection,
  cleanup
};