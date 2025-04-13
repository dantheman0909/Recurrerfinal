import express, { type Request, Response, NextFunction } from "express";
import http from "http";
import { FixedDatabaseStorage } from "./fixed-storage";
import { testDatabaseConnection } from "./db-fixed";

// Main async function to handle server startup
async function startServer() {
  try {
    console.log("Starting fully fixed server implementation...");
    
    // Test database connection first
    const dbConnected = await testDatabaseConnection();
    if (!dbConnected) {
      console.error("Database connection failed, cannot proceed with server startup");
      return;
    }
    
    // Create the fixed storage instance
    const storage = new FixedDatabaseStorage();
    
    // Initialize Express app
    const app = express();
    app.use(express.json());
    
    // Add a health check endpoint
    app.get('/api/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        database_connected: dbConnected
      });
    });
    
    // Add basic API routes
    app.get('/api/customers', async (req, res) => {
      try {
        console.log("Fetching customers...");
        const customers = await storage.getCustomers();
        console.log(`Customers fetched: ${customers.length}`);
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
    
    // Add endpoint for a single customer
    app.get('/api/customers/:id', async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
          return res.status(400).json({ message: "Invalid customer ID" });
        }
        
        console.log(`Fetching customer with ID: ${id}`);
        const customer = await storage.getCustomer(id);
        
        if (!customer) {
          return res.status(404).json({ message: "Customer not found" });
        }
        
        console.log("Customer found:", customer.name);
        res.json(customer);
      } catch (error) {
        console.error("Error fetching customer:", error);
        res.status(500).json({ 
          message: "Failed to fetch customer", 
          error: String(error),
          stack: error instanceof Error ? error.stack : "No stack trace available"
        });
      }
    });
    
    // Add tasks endpoint
    app.get('/api/tasks', async (req, res) => {
      try {
        console.log("Fetching all tasks...");
        const tasks = await storage.getTasks();
        console.log(`Tasks fetched: ${tasks.length}`);
        res.json(tasks);
      } catch (error) {
        console.error("Error fetching tasks:", error);
        res.status(500).json({ 
          message: "Failed to fetch tasks", 
          error: String(error),
          stack: error instanceof Error ? error.stack : "No stack trace available"
        });
      }
    });
    
    // Add tasks by customer endpoint
    app.get('/api/customers/:id/tasks', async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
          return res.status(400).json({ message: "Invalid customer ID" });
        }
        
        console.log(`Fetching tasks for customer ID: ${id}`);
        const tasks = await storage.getTasksByCustomer(id);
        console.log(`Tasks fetched for customer: ${tasks.length}`);
        res.json(tasks);
      } catch (error) {
        console.error("Error fetching customer tasks:", error);
        res.status(500).json({ 
          message: "Failed to fetch customer tasks", 
          error: String(error),
          stack: error instanceof Error ? error.stack : "No stack trace available"
        });
      }
    });
    
    // Add a test endpoint
    app.get('/api/test', (req, res) => {
      res.json({ 
        message: "Test endpoint working", 
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'unknown',
        database_connected: dbConnected
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
    
    // Start the server on port 9999
    const port = 9999;
    server.listen(port, "0.0.0.0", () => {
      console.log(`Fixed server running on http://0.0.0.0:${port}`);
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