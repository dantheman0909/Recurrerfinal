import express from 'express';
import http from 'http';

const app = express();
app.use(express.json());

// Add our Chargebee-related routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Simple data endpoint
app.get('/api/test-customers', (req, res) => {
  res.json([
    { id: 1, name: 'Test Customer 1' },
    { id: 2, name: 'Test Customer 2' }
  ]);
});

// Create server
const server = http.createServer(app);

// Start server
const port = 8765;
server.listen(port, '0.0.0.0', () => {
  console.log(`Basic server running on http://0.0.0.0:${port}`);
});

// Error handling
server.on('error', (err) => {
  console.error('Server error:', err);
});