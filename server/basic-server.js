/**
 * Basic Express server for the Recurrer platform
 * Absolutely minimal dependencies for reliability
 */

import express from 'express';

const app = express();
const PORT = process.env.PORT || 7000;

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    time: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0'
  });
});

// Basic status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    server: 'Basic Standalone',
    time: new Date().toISOString()
  });
});

// Simple HTML root
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Recurrer Basic Server</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          h1 { color: #333; }
        </style>
      </head>
      <body>
        <h1>Recurrer Basic Server</h1>
        <p>The basic server is running successfully.</p>
        <p>Server time: ${new Date().toISOString()}</p>
        <p>Check <a href="/health">/health</a> for server status.</p>
      </body>
    </html>
  `);
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Server error' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Basic server running on port ${PORT}`);
});

// Keep alive
setInterval(() => {
  console.log(`Basic server heartbeat - ${new Date().toISOString()}`);
}, 30000);

// Handle process signals
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Error handling to prevent crashes
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection:', reason);
});