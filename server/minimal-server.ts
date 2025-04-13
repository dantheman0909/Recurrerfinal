import express from "express";
import http from "http";

async function startServer() {
  try {
    console.log("Starting minimal server...");
    
    // Initialize Express app
    const app = express();
    app.use(express.json());
    
    // Add a health check endpoint
    app.get('/api/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });
    
    // Add API routes for customers
    app.get('/api/mock-customers', async (req, res) => {
      res.json([
        { id: 1, name: "Test Customer 1" },
        { id: 2, name: "Test Customer 2" }
      ]);
    });
    
    // Create HTTP server
    const server = http.createServer(app);
    
    // Start the server
    const port = 7777;
    server.listen(port, '0.0.0.0', () => {
      console.log(`Minimal server running on http://0.0.0.0:${port}`);
    });
    
    // Error handling
    server.on('error', (err) => {
      console.error('Server error:', err);
    });
    
  } catch (error) {
    console.error("Fatal error during server startup:", error);
  }
}

// Start the server
startServer();