import express from "express";
import type { Request, Response, NextFunction } from "express";
import http from "http";
import cors from "cors";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { db, testDatabaseConnection } from "./db-fixed";
import { FixedDatabaseStorage } from "./fixed-storage";
import { Pool } from "@neondatabase/serverless";

// Main entry point
(async () => {
  try {
    console.log("Starting enhanced application server...");
    
    // Create express app and HTTP server
    const app = express();
    const server = http.createServer(app);

    // Setup middleware
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    app.use(cors());

    // Request logging middleware
    app.use((req, res, next) => {
      const start = Date.now();
      const path = req.path;
      let capturedJsonResponse: Record<string, any> | undefined = undefined;

      const originalResJson = res.json;
      res.json = function (bodyJson, ...args) {
        capturedJsonResponse = bodyJson;
        return originalResJson.apply(res, [bodyJson, ...args]);
      };

      res.on("finish", () => {
        const duration = Date.now() - start;
        if (path.startsWith("/api")) {
          let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
          if (capturedJsonResponse) {
            logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
          }

          if (logLine.length > 80) {
            logLine = logLine.slice(0, 79) + "…";
          }

          log(logLine);
        }
      });

      next();
    });

    // Database initialization
    try {
      console.log("Initializing database connection...");
      // Test database connection
      await testDatabaseConnection();
      console.log("Database connection successful!");
      
      // Initialize the fixed database storage
      console.log("Initializing FixedDatabaseStorage...");
      const storage = new FixedDatabaseStorage();
      global.appStorage = storage;
      console.log("FixedDatabaseStorage initialized successfully");
      
      // Run migrations
      console.log("Running database migrations...");
      await addPlaybookTaskConditionField();
      console.log("Migrations completed successfully.");
    } catch (dbError) {
      console.error("Database setup error:", dbError);
      throw new Error("Database initialization failed: " + (dbError as Error).message);
    }

    // Setup routes
    console.log("Registering API routes...");
    await registerRoutes(app);
    console.log("API routes registered successfully.");

    // Setup error handler
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || 500;
      const message = err.message || "Internal Server Error";
      console.error("Server error:", err);
      res.status(status).json({ message });
    });

    // Setup Vite or static file serving
    try {
      console.log("Setting up Vite or static file serving...");
      if (app.get("env") === "development") {
        await setupVite(app, server);
        console.log("Vite setup completed successfully.");
      } else {
        serveStatic(app);
        console.log("Static file serving setup completed.");
      }

      // Start the server
      const port = parseInt(process.env.PORT || "5000");
      console.log(`Starting server on port ${port}...`);
      
      server.listen(port, "0.0.0.0", () => {
        console.log(`Server is now running on http://0.0.0.0:${port}`);
        log(`serving on port ${port}`);
      });
      
      // Set up error handler
      server.on("error", (error: any) => {
        console.error(`Server error: ${error.message}`);
        console.error(`Full error details:`, error);
        if (error.code === "EADDRINUSE") {
          console.error(`Port ${port} is already in use`);
        }
      });

      // Keep the process alive
      process.on('SIGINT', () => {
        console.log('Gracefully shutting down server...');
        server.close(() => {
          console.log('Server closed');
          process.exit(0);
        });
      });
    } catch (error) {
      console.error("Critical error during server setup:", error);
      process.exit(1);
    }
  } catch (error) {
    console.error("Fatal error during application startup:", error);
    process.exit(1);
  }
})();

// Migration to add condition_field to playbook_tasks if it doesn't exist
async function addPlaybookTaskConditionField() {
  try {
    console.log("Adding condition_field column to playbook_tasks table...");
    const client = await db.$client.connect();
    
    try {
      // Check if column exists
      const checkResult = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'playbook_tasks' 
        AND column_name = 'condition_field'
      `);
      
      if (checkResult.rows.length === 0) {
        // Add the column if it doesn't exist
        await client.query(`
          ALTER TABLE playbook_tasks 
          ADD COLUMN condition_field TEXT
        `);
        console.log("Added condition_field column to playbook_tasks table.");
      } else {
        console.log("Column 'condition_field' already exists in playbook_tasks table.");
      }
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error during migration:", error);
    throw error;
  }
}