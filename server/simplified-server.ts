import express from 'express';
import * as http from 'http';

// Simple express app
const app = express();

// Basic middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add a test route
app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from simplified server!' });
});

// Create http server
const server = http.createServer(app);

// Start the server
const port = 4567;
console.log(`Starting simplified server on port ${port}...`);

server.listen(port, '0.0.0.0', () => {
  console.log(`Simplified server is running on http://0.0.0.0:${port}`);
});

// Error handling
server.on('error', (error) => {
  console.error('Server error occurred:', error);
});