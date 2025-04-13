import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import http from "http";
import cors from "cors";
// Chargebee and MySQL routes
import {
  getChargebeeSubscriptions,
  getChargebeeSubscription,
  getChargebeeCustomers,
  getChargebeeCustomer,
  getChargebeeInvoices,
  getChargebeeInvoice,
  getInvoicesForSubscription,
  getMySQLCompanies,
  getMySQLCompany,
  getCustomerExternalData,
  importMySQLDataToCustomer
} from "./external-data";
import { runMigrationsOnStartup } from "./run-migrations-startup";
import { db, testDatabaseConnection } from "./db-fixed";
import { FixedDatabaseStorage } from "./fixed-storage";
import { healthCheckHandler, incrementRequestCounters } from "./health-endpoint";

// Initialize Express app
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());

// Create HTTP server early
const server = http.createServer(app);

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  // Track API requests for health monitoring
  if (path.startsWith("/api")) {
    incrementRequestCounters(true);
  } else {
    incrementRequestCounters(false);
  }

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

// Setup direct API routes first to avoid interference from catch-all vite middleware
// External data API routes
app.get('/api/chargebee/subscriptions', getChargebeeSubscriptions);
app.get('/api/chargebee/subscriptions/:id', getChargebeeSubscription);
app.get('/api/chargebee/customers', getChargebeeCustomers);

// Customer external data integration routes
app.post('/api/customers/import-mysql-data', importMySQLDataToCustomer);
app.get('/api/chargebee/customers/:id', getChargebeeCustomer);
app.get('/api/chargebee/invoices', getChargebeeInvoices);
app.get('/api/chargebee/invoices/:id', getChargebeeInvoice);
app.get('/api/chargebee/subscriptions/:id/invoices', getInvoicesForSubscription);
app.get('/api/mysql/companies', getMySQLCompanies);
app.get('/api/mysql/companies/:id', getMySQLCompany);

// Customer-specific external data route
app.get('/api/customers/:id/external-data', getCustomerExternalData);

// Health check endpoint
app.get('/health', healthCheckHandler);

// Add global error handlers to prevent process exit
process.on('uncaughtException', (err) => {
  console.error('CRITICAL ERROR: Uncaught exception:', err);
  // Don't exit the process - try to keep running
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('CRITICAL ERROR: Unhandled rejection at:', promise, 'reason:', reason);
  // Don't exit the process - try to keep running
});

// Start the application
(async () => {
  try {
    console.log("Starting application...");
    
    // Test database connection with retry logic
    console.log("Initializing database connection...");
    let connected = false;
    let attempts = 0;
    const maxAttempts = 5;
    
    while (!connected && attempts < maxAttempts) {
      try {
        attempts++;
        console.log(`Database connection attempt ${attempts}/${maxAttempts}...`);
        await testDatabaseConnection();
        console.log("Database connection successful");
        connected = true;
      } catch (error) {
        console.error(`Database connection attempt ${attempts} failed:`, error);
        
        if (attempts < maxAttempts) {
          const delay = 2000 * attempts; // Exponential backoff
          console.log(`Retrying in ${delay/1000} seconds...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          throw new Error(`Failed to connect to database after ${maxAttempts} attempts`);
        }
      }
    }
    
    // Initialize the fixed database storage with retry logic
    console.log("Initializing FixedDatabaseStorage...");
    
    try {
      const storage = new FixedDatabaseStorage();
      global.appStorage = storage;
      console.log("FixedDatabaseStorage initialized successfully");
    } catch (error) {
      console.error("Error initializing FixedDatabaseStorage:", error);
      
      // Attempt recovery by reconnecting
      console.log("Attempting to recover database storage initialization...");
      try {
        await new Promise(resolve => setTimeout(resolve, 3000));
        const storage = new FixedDatabaseStorage();
        global.appStorage = storage;
        console.log("FixedDatabaseStorage recovery successful");
      } catch (recoveryError) {
        console.error("Failed to recover database storage:", recoveryError);
        throw new Error("Fatal database storage initialization error");
      }
    }
    
    // Run migrations before starting the server
    try {
      await runMigrationsOnStartup();
    } catch (error) {
      console.error("Migration error:", error);
      console.log("Continuing despite migration error");
    }

    console.log("Registering routes...");
    // We're not using the server returned from registerRoutes as we created our own
    try {
      await registerRoutes(app);
    } catch (error) {
      console.error("Error registering routes:", error);
      console.log("Some routes may not be available");
    }

    // Error handling middleware
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      console.error("Server error:", err);
      res.status(status).json({ message });
    });

    // Setup vite or static file serving
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
      console.log(`Attempting to start server on port ${port}...`);
      
      // Start server
      server.listen(port, "0.0.0.0", () => {
        console.log(`Server is now running on http://0.0.0.0:${port}`);
        log(`serving on port ${port}`);
      });
      
      // Prevent Node.js from exiting when event loop is empty
      // Multiple heartbeats at different intervals for redundancy
      setInterval(() => {
        console.log('Primary server heartbeat - still running on port ' + port);
      }, 30000); // Log every 30 seconds
      
      setInterval(() => {
        console.log('Secondary server heartbeat - still running on port ' + port);
      }, 45000); // Log every 45 seconds
      
      // Active health check that actually tests database connectivity
      setInterval(async () => {
        try {
          await testDatabaseConnection();
          console.log('Database health check passed');
        } catch (error) {
          console.error('Database health check failed:', error);
        }
      }, 60000); // Check database every minute
      
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
    }
  } catch (error) {
    console.error("Fatal error during application startup:", error);
    
    // Instead of exiting, retry after a delay
    console.log("Attempting to restart application in 10 seconds...");
    setTimeout(() => {
      console.log("Restarting application after previous failure...");
      
      // Start a new instance of the startup function
      (async () => {
        try {
          console.log("Recovery attempt starting...");
          
          // Simplified restart logic
          await testDatabaseConnection();
          const storage = new FixedDatabaseStorage();
          global.appStorage = storage;
          await runMigrationsOnStartup();
          await registerRoutes(app);
          
          console.log("Recovery successful!");
        } catch (recoveryError) {
          console.error("Recovery attempt failed:", recoveryError);
          console.log("Server will continue running but may have limited functionality");
        }
      })();
    }, 10000);
    
    // Don't exit - keep the process alive with heartbeats
    setInterval(() => {
      console.log("Recovery heartbeat - keeping process alive despite startup failure");
    }, 15000);
  }
})();