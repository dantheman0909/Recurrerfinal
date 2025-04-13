/**
 * Standalone Express server for the Recurrer platform
 * Simple, minimal dependencies, focused on reliability
 */

import express from 'express';
import http from 'http';
import { fileURLToPath } from 'url';
import path from 'path';
import cors from 'cors';

// ES Module compatibility fixes
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Express app
const app = express();

// Basic middleware
app.use(express.json());
app.use(cors());

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Basic API routes
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    time: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    time: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    server: {
      platform: process.platform,
      nodeVersion: process.version
    }
  });
});

// Serve static files if available
const staticPath = path.join(__dirname, '..', 'client/public');
app.use(express.static(staticPath));

// Catch-all route
app.get('*', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Recurrer Platform</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          .header { background-color: #f0f0f0; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
          .endpoint { background-color: #f9f9f9; padding: 10px; border-radius: 5px; margin-bottom: 10px; }
          h1 { color: #333; }
          h2 { color: #666; }
          code { background-color: #eee; padding: 2px 4px; border-radius: 3px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Recurrer Platform - Standalone Server</h1>
          <p>The standalone server is running successfully.</p>
        </div>
        
        <h2>Available Endpoints:</h2>
        <div class="endpoint">
          <h3><code>GET /health</code></h3>
          <p>Health check endpoint</p>
        </div>
        
        <div class="endpoint">
          <h3><code>GET /api/status</code></h3>
          <p>Server status information</p>
        </div>
        
        <h2>Server Information:</h2>
        <ul>
          <li>Time: ${new Date().toISOString()}</li>
          <li>Uptime: ${process.uptime()} seconds</li>
          <li>Node.js: ${process.version}</li>
          <li>Platform: ${process.platform}</li>
        </ul>
      </body>
    </html>
  `);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// Start the server
const PORT = process.env.PORT || 7000;
const server = http.createServer(app);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Standalone server running on http://0.0.0.0:${PORT}`);
});

// Heartbeat to keep the process alive
setInterval(() => {
  console.log(`Standalone server heartbeat - running on port ${PORT}`);
}, 30000);

// Handle unhandled errors
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  // Keep the server running
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
  // Keep the server running
});