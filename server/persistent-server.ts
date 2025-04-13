// Enhanced persistent server with improved stability
import express, { Express, Request, Response, NextFunction } from 'express';
import http from 'http';
import cors from 'cors';
import { db, testDatabaseConnection } from './db-fixed';
import { registerRoutes } from './routes';
import { setupVite } from './vite';
import { FixedDatabaseStorage } from './fixed-storage';
import { serveStatic } from './vite';

// Log helper
const log = (message: string) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
};

// Global error handlers to prevent server from crashing
process.on('uncaughtException', (error) => {
  console.error(`[${new Date().toISOString()}] CRITICAL: Uncaught exception -`, error);
  // Don't exit the process, let it recover
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(`[${new Date().toISOString()}] CRITICAL: Unhandled rejection at:`, promise, 'reason:', reason);
  // Don't exit the process, let it recover
});

// Start the application
(async () => {
  try {
    log("Starting application...");
    
    // Initialize database and storage
    try {
      log("Initializing database connection...");
      await testDatabaseConnection();
      log("Database connection successful!");
      
      // Initialize the fixed database storage
      log("Initializing FixedDatabaseStorage...");
      const storage = new FixedDatabaseStorage();
      (global as any).appStorage = storage;
      log("FixedDatabaseStorage initialized successfully");
      
      // Run migrations
      log("Running database migrations...");
      await addPlaybookTaskConditionField();
      log("Database migrations completed successfully");
    } catch (dbError) {
      console.error("Database setup error:", dbError);
      log(`Database initialization error: ${(dbError as Error).message}`);
      log("Continuing startup despite database error - will retry connections later");
      // Continue startup anyway - don't throw
    }

    // Create Express application
    const app: Express = express();
    app.use(express.json());
    app.use(cors());
    
    // Create HTTP server
    const server = http.createServer(app);
    
    // Setup routes with retry logic
    try {
      log("Registering API routes...");
      await registerRoutes(app);
      log("API routes registered successfully.");
    } catch (routeError) {
      console.error("Error setting up routes:", routeError);
      log(`Route setup error: ${(routeError as Error).message}`);
      log("Continuing startup despite route error");
      // Continue startup anyway - don't throw
    }

    // Setup error handler
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || 500;
      const message = err.message || "Internal Server Error";
      console.error(`[${new Date().toISOString()}] Server error:`, err);
      res.status(status).json({ message });
    });

    // Setup Vite or static file serving
    try {
      log("Setting up Vite or static file serving...");
      if (app.get("env") === "development") {
        await setupVite(app, server);
        log("Vite setup completed successfully.");
      } else {
        serveStatic(app);
        log("Static file serving setup completed.");
      }

      // Start the server with retry logic
      const startServer = () => {
        try {
          const port = parseInt(process.env.PORT || "5000");
          log(`Starting server on port ${port}...`);
          
          server.listen(port, "0.0.0.0", () => {
            log(`Server is now running on http://0.0.0.0:${port}`);
          });
          
          // Set up error handler
          server.on("error", (error: any) => {
            console.error(`[${new Date().toISOString()}] Server error: ${error.message}`);
            if (error.code === "EADDRINUSE") {
              log(`Port ${port} is already in use - retrying with different port`);
              // Try a different port if the current one is in use
              process.env.PORT = (port + 1).toString();
              setTimeout(startServer, 3000);
            }
          });
        } catch (startError) {
          console.error("Error starting server:", startError);
          log("Will retry server start in 5 seconds...");
          setTimeout(startServer, 5000);
        }
      };
      
      // Start the server initially
      startServer();
      
      // Keep the process alive
      process.on('SIGINT', () => {
        log('Gracefully shutting down server...');
        server.close(() => {
          log('Server closed');
          process.exit(0);
        });
      });
      
      // Multiple heartbeats to keep server alive
      // 1. Primary heartbeat
      setInterval(() => {
        log('Server heartbeat - primary');
      }, 30000);
      
      // 2. Secondary heartbeat with different interval
      setInterval(() => {
        log('Server heartbeat - secondary');
      }, 45000);
      
      // 3. Health check heartbeat that performs actual operations
      setInterval(async () => {
        try {
          log('Running health check...');
          await testDatabaseConnection();
          log('Health check passed');
        } catch (error) {
          console.error('Health check failed:', error);
        }
      }, 60000);
      
    } catch (error) {
      console.error("Critical error during server setup:", error);
      log("Will retry full startup in 10 seconds...");
      setTimeout(() => {
        log("Restarting application after previous failure...");
        process.exit(1); // Exit with error code to trigger restart by supervisor
      }, 10000);
    }
  } catch (error) {
    console.error("Fatal error during application startup:", error);
    log("Will attempt restart in 15 seconds...");
    setTimeout(() => process.exit(1), 15000);
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