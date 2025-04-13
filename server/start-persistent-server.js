/**
 * Simple persistent server script designed to keep the 
 * server running indefinitely in a Replit environment
 */

// Import required modules
import express from 'express';
import http from 'http';
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import cors from 'cors';
import * as schema from '../shared/schema.js';
import ws from 'ws';

// Don't let the process crash on unhandled errors
process.on('uncaughtException', (err) => {
  console.error('CRITICAL ERROR: Uncaught exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('CRITICAL ERROR: Unhandled rejection at:', promise, 'reason:', reason);
});

// Setup database connection
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL not set. Please configure the database connection.');
  process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/postgres';
}

// Configure neon for WebSocket support
import { neonConfig } from '@neondatabase/serverless';
neonConfig.webSocketConstructor = ws;

// Create a persistent connection pool
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

// Simple logging function
const log = (message) => {
  console.log(`[${new Date().toISOString()}] ${message}`);
};

// Basic route handler function
const handleRequest = (req, res) => {
  res.json({
    status: 'running',
    server: 'persistent',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
};

// Create and configure Express app
const app = express();
app.use(express.json());
app.use(cors());

// Basic routes
app.get('/', (req, res) => {
  res.send('Recurrer API server is running');
});

app.get('/api/status', handleRequest);

app.get('/api/health', async (req, res) => {
  try {
    // Test database connection
    const result = await pool.query('SELECT NOW() as now');
    res.json({
      status: 'healthy',
      database: {
        connected: true,
        timestamp: result.rows[0].now
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      database: {
        connected: false,
        error: error.message
      }
    });
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error('API Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start the server
const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

server.listen(PORT, '0.0.0.0', () => {
  log(`Persistent server running on port ${PORT}`);
});

// Handle server errors
server.on('error', (error) => {
  console.error('Server error:', error);
});

// Keep the process alive with multiple intervals
setInterval(() => {
  log('Primary server heartbeat');
}, 30000);

setInterval(() => {
  log('Secondary server heartbeat');
}, 45000);

// Perform actual health checks periodically
setInterval(async () => {
  try {
    log('Performing database health check...');
    const result = await pool.query('SELECT NOW() as now');
    log(`Database health check successful: ${result.rows[0].now}`);
  } catch (error) {
    console.error('Database health check failed:', error);
  }
}, 60000);