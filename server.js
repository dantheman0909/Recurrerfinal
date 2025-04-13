/**
 * Simple Express server with database connection for Recurrer platform
 */

import express from 'express';
import { Pool } from '@neondatabase/serverless';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import http from 'http';
import { fileURLToPath } from 'url';

// ES Module compatibility fixes
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Setup database connection
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: true
});

// Initialize Express app
const app = express();
app.use(express.json());
app.use(cors());

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as now');
    res.json({
      status: 'ok',
      database: {
        connected: true,
        timestamp: result.rows[0].now
      },
      server: {
        uptime: process.uptime()
      }
    });
  } catch (err) {
    console.error('Health check failed:', err);
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
});

// Basic API routes
app.get('/api/customers', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM customers ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching customers:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/tasks', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tasks ORDER BY due_date ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching tasks:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/playbooks', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM playbooks ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching playbooks:', err);
    res.status(500).json({ error: err.message });
  }
});

// Serve static files
const staticPath = path.join(__dirname, 'client/public');
if (fs.existsSync(staticPath)) {
  app.use(express.static(staticPath));
  console.log(`Serving static files from ${staticPath}`);
}

// Serve index.html for non-API routes
app.get(/^(?!\/api\/).+/, (req, res) => {
  const indexPath = path.join(staticPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(200).send('Recurrer platform is running. Frontend not built yet.');
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// Start the server
const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

// Handle server errors
server.on('error', (err) => {
  console.error('Server error:', err);
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use`);
    process.exit(1);
  }
});

// Handle process signals
process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    pool.end().then(() => {
      console.log('Database pool closed');
      process.exit(0);
    });
  });
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    pool.end().then(() => {
      console.log('Database pool closed');
      process.exit(0);
    });
  });
});

// Handle unhandled errors
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  // Keep the server running
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
  // Keep the server running
});

// Heartbeat to keep the process alive
setInterval(() => {
  console.log(`Server heartbeat - running on port ${PORT}`);
}, 30000);