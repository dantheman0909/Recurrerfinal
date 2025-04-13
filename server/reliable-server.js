/**
 * Reliable server for the Recurrer platform
 * This server is designed to have maximum uptime with automatic recovery
 */

const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const http = require('http');
const PgSession = require('connect-pg-simple')(session);
const { Pool } = require('@neondatabase/serverless');

// Import the persistent database connection manager
const dbManager = require('./persistent-db');

// Configuration
const PORT = process.env.PORT || 5000;
const SESSION_SECRET = process.env.SESSION_SECRET || 'recurrer-secret-key';
const NODE_ENV = process.env.NODE_ENV || 'development';
const LOG_FILE = 'server-reliable.log';

// State tracking
let server = null;
let requestCount = 0;
let lastRequestTime = Date.now();
let isShuttingDown = false;
let startTime = Date.now();

// Setup logging
function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}`;
  
  console.log(logMessage);
  
  // Also append to log file
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
  Recurrer Reliable Server - Started ${new Date().toISOString()}
==========================================================
`;
    fs.writeFileSync(LOG_FILE, header);
    log('Server initialization started');
  } catch (err) {
    console.error(`Failed to initialize log file: ${err.message}`);
  }
}

// Setup application middleware
function setupMiddleware(app) {
  // CORS setup
  app.use(cors());
  
  // Body parsing
  app.use(express.json());

  // Request logging
  app.use((req, res, next) => {
    requestCount++;
    lastRequestTime = Date.now();
    log(`${req.method} ${req.url}`);
    next();
  });
  
  // Error handling
  app.use((err, req, res, next) => {
    log(`Error in request: ${err.message}`, 'error');
    log(err.stack, 'error');
    res.status(500).json({ error: 'Internal server error', message: err.message });
  });
}

// Setup session with PostgreSQL
async function setupSession(app) {
  try {
    const { pool } = await dbManager.getDatabaseConnection();
    
    // Setup session store with PostgreSQL
    const sessionMiddleware = session({
      store: new PgSession({
        pool,
        tableName: 'sessions',
        createTableIfMissing: true
      }),
      secret: SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      }
    });
    
    app.use(sessionMiddleware);
    log('Session middleware configured with PostgreSQL store');
    
  } catch (err) {
    log(`Failed to setup session store: ${err.message}`, 'error');
    log('Falling back to memory session store');
    
    // Fallback to memory store
    const MemoryStore = require('memorystore')(session);
    
    const sessionMiddleware = session({
      store: new MemoryStore({
        checkPeriod: 86400000 // Prune expired entries every 24h
      }),
      secret: SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      }
    });
    
    app.use(sessionMiddleware);
  }
}

// Setup static file serving
function setupStaticServing(app) {
  // Serve static files from the client/public directory
  const staticPath = path.join(__dirname, '../client/public');
  if (fs.existsSync(staticPath)) {
    app.use(express.static(staticPath));
    log(`Serving static files from ${staticPath}`);
  }
  
  // Serve index.html for all non-API routes in development mode
  if (NODE_ENV === 'development') {
    app.get(/^(?!\/api\/).+/, (req, res) => {
      const indexPath = path.join(staticPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(200).send('Recurrer platform is running. Frontend not built yet.');
      }
    });
  }
}

// Setup health check routes
function setupHealthRoutes(app) {
  // Basic health check endpoint
  app.get('/health', async (req, res) => {
    try {
      const dbStatus = await dbManager.testConnection();
      const uptime = Math.floor((Date.now() - startTime) / 1000);
      
      res.status(200).json({
        status: 'ok',
        time: new Date().toISOString(),
        uptime: uptime,
        requests: requestCount,
        lastRequest: new Date(lastRequestTime).toISOString(),
        database: dbStatus
      });
    } catch (err) {
      res.status(500).json({
        status: 'error',
        error: err.message,
        time: new Date().toISOString()
      });
    }
  });
  
  // Database health check
  app.get('/health/db', async (req, res) => {
    try {
      const dbStatus = await dbManager.testConnection();
      res.status(dbStatus.success ? 200 : 500).json(dbStatus);
    } catch (err) {
      res.status(500).json({
        status: 'error',
        error: err.message
      });
    }
  });
}

// Start the HTTP server
function startServer() {
  return new Promise(async (resolve, reject) => {
    try {
      // Initialize the app
      const app = express();
      
      // Setup middleware
      setupMiddleware(app);
      
      // Setup session
      await setupSession(app);
      
      // Setup static file serving
      setupStaticServing(app);
      
      // Setup health check routes
      setupHealthRoutes(app);
      
      // Setup API routes
      const apiRoutes = require('./api-routes');
      app.use(apiRoutes);
      
      // Create HTTP server
      server = http.createServer(app);
      
      // Start listening
      server.listen(PORT, '0.0.0.0', () => {
        log(`Server listening on port ${PORT}`);
        resolve(server);
      });
      
      // Handle server errors
      server.on('error', (err) => {
        log(`Server error: ${err.message}`, 'error');
        reject(err);
      });
      
    } catch (err) {
      log(`Failed to start server: ${err.message}`, 'error');
      reject(err);
    }
  });
}

// Gracefully shutdown the server
function shutdown() {
  if (isShuttingDown) return;
  isShuttingDown = true;
  
  log('Shutting down server gracefully...');
  
  // Close the server first, stop accepting new connections
  if (server) {
    server.close(() => {
      log('HTTP server closed');
      
      // Cleanup database connections
      dbManager.cleanup();
      
      log('Shutdown complete');
      process.exit(0);
    });
    
    // Force close after timeout
    setTimeout(() => {
      log('Forcing shutdown after timeout', 'warn');
      process.exit(1);
    }, 30000);
  } else {
    log('No server to shutdown');
    process.exit(0);
  }
}

// Setup signal handlers
process.on('SIGINT', () => {
  log('Received SIGINT signal');
  shutdown();
});

process.on('SIGTERM', () => {
  log('Received SIGTERM signal');
  shutdown();
});

process.on('uncaughtException', (err) => {
  log(`Uncaught exception: ${err.message}`, 'error');
  log(err.stack, 'error');
});

process.on('unhandledRejection', (reason, promise) => {
  log('Unhandled promise rejection:', 'error');
  log(`Promise: ${promise}, Reason: ${reason}`, 'error');
});

// Initialize and start the server
async function init() {
  initLog();
  
  try {
    // Initialize database connection
    await dbManager.initDatabaseConnection();
    
    // Start the HTTP server
    await startServer();
    
  } catch (err) {
    log(`Failed to initialize: ${err.message}`, 'error');
    
    // Try again after a delay
    log('Retrying initialization in 5 seconds...');
    setTimeout(init, 5000);
  }
}

// Start the application
init();