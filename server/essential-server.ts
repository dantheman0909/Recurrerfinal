import express, { type Request, Response, NextFunction } from "express";
import http from "http";
import { storage } from "./storage";

// Main async function to handle server startup
async function startServer() {
  try {
    console.log("Starting essential server implementation...");
    
    // Initialize Express app
    const app = express();
    app.use(express.json());
    
    // Add a health check endpoint
    app.get('/api/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });
    
    // Add basic API routes
    app.get('/api/customers', async (req, res) => {
      try {
        console.log("Fetching customers...");
        const customers = await storage.getCustomers();
        console.log("Customers fetched:", customers);
        res.json(customers);
      } catch (error) {
        console.error("Error fetching customers:", error);
        // Send detailed error to help debugging
        res.status(500).json({ 
          message: "Failed to fetch customers", 
          error: String(error),
          stack: error instanceof Error ? error.stack : "No stack trace available"
        });
      }
    });
    
    // Add a test endpoint that doesn't use the database
    app.get('/api/test', (req, res) => {
      res.json({ 
        message: "Test endpoint working", 
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'unknown'
      });
    });
    
    // Error handling middleware
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      console.error("Server error:", err);
      res.status(status).json({ message });
    });
    
    // Create HTTP server
    const server = http.createServer(app);
    
    // Start the server on port 7777
    const port = 7777;
    server.listen(port, "0.0.0.0", () => {
      console.log(`Essential server running on http://0.0.0.0:${port}`);
    });
    
    // Set up error handler
    server.on("error", (error: any) => {
      console.error(`Server error: ${error.message}`);
      if (error.code === "EADDRINUSE") {
        console.error(`Port ${port} is already in use`);
      }
    });
    
  } catch (error) {
    console.error("Fatal error during application startup:", error);
  }
}

// Start the server
startServer();