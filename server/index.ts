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

// Start the application
(async () => {
  try {
    console.log("Starting application...");
    
    // Test database connection
    console.log("Initializing database connection...");
    await testDatabaseConnection();
    console.log("Database connection successful");
    
    // Initialize the fixed database storage
    console.log("Initializing FixedDatabaseStorage...");
    const storage = new FixedDatabaseStorage();
    global.appStorage = storage;
    console.log("FixedDatabaseStorage initialized successfully");
    
    // Run migrations before starting the server
    await runMigrationsOnStartup();

    console.log("Registering routes...");
    // We're not using the server returned from registerRoutes as we created our own
    await registerRoutes(app);

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
    process.exit(1);
  }
})();