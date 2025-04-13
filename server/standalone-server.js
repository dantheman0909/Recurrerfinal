/**
 * Standalone server for the Recurrer platform
 * This server is designed to be run directly with Node.js
 * and provides basic API endpoints for health checks and system status
 */

import express from 'express';
import cors from 'cors';
import { pool, testDatabaseConnection, db } from './db.js';

// Create Express application
const app = express();

// Apply middleware
app.use(express.json());
app.use(cors());

// Basic routes
app.get('/', (req, res) => {
  res.send('Recurrer API Server - Standalone Mode');
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const dbStatus = await testDatabaseConnection();
    res.json({
      status: 'healthy',
      server: 'standalone',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: {
        connected: true,
        timestamp: dbStatus.now
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      server: 'standalone',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: {
        connected: false,
        error: error.message
      }
    });
  }
});

// Status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    status: 'running',
    server: 'standalone',
    mode: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

// Start server
const PORT = process.env.PORT || 5001;
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`Standalone server running on port ${PORT}`);
  
  try {
    // Test database connection on startup
    await testDatabaseConnection();
  } catch (error) {
    console.error('Failed to connect to database:', error.message);
  }
});

// Keep the server alive with heartbeat
setInterval(() => {
  console.log(`Heartbeat check at ${new Date().toISOString()} - Server uptime: ${process.uptime()}s`);
}, 30000);

// Periodically test database connection
setInterval(async () => {
  try {
    await testDatabaseConnection();
  } catch (error) {
    console.error('Database connection check failed:', error.message);
  }
}, 60000);

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
});