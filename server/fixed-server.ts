import express from "express";
import type { Request, Response, NextFunction } from "express";
import http from "http";
import cors from "cors";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { FixedDatabaseStorage } from "./fixed-storage";
import { db, testDatabaseConnection } from "./db-fixed";
import * as schema from "@shared/schema";

const useDatabase = true; // Set this to false to use in-memory storage

// Main entry point
(async () => {
  try {
    console.log("Starting application...");
    
    // Create express app and HTTP server
    const app = express();
    const server = http.createServer(app);

    // Setup middleware
    app.use(express.json());
    app.use(cors());

    // Database initialization
    let storage;
    if (useDatabase) {
      try {
        // Test database connection
        await testDatabaseConnection();
        
        // Run migrations
        console.log("Running database migrations...");
        await runMigrations();

        // Initialize storage
        storage = new FixedDatabaseStorage();
        console.log("Using Database storage for application data.");
      } catch (dbError) {
        console.error("Database setup error:", dbError);
        throw new Error("Database initialization failed: " + (dbError as Error).message);
      }
    } else {
      console.log("Using in-memory storage for application data.");
      // Imports done inside else to avoid load errors if DB not available
      const { MemStorage } = await import("./storage");
      storage = new MemStorage();
    }

    // Setup API routes
    await registerRoutes(app);

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
    } catch (error) {
      console.error("Critical error during server setup:", error);
      process.exit(1);
    }
  } catch (error) {
    console.error("Fatal error during application startup:", error);
    process.exit(1);
  }
})();

// Function to add missing columns if needed
async function runMigrations() {
  try {
    await addPlaybookTaskConditionField();
  } catch (error) {
    console.error("Migration error:", error);
    throw error;
  }
}

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
      
      console.log("Migration completed successfully.");
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error during migration:", error);
    throw error;
  }
}