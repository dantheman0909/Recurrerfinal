import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import http from "http";
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

// Main async function to handle server startup
async function startServer() {
  try {
    console.log("Starting robust server implementation...");
    
    // Initialize Express app
    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));

    // Add a health check endpoint
    app.get('/api/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });
    
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
    
    // Create HTTP server early to make sure port binding happens
    const server = http.createServer(app);
    
    // Run migrations safely - catch errors but continue if they fail
    try {
      console.log("Running database migrations...");
      await runMigrationsOnStartup();
      console.log("Migrations completed successfully");
    } catch (migrationError) {
      console.error("Error running migrations, but continuing server startup:", migrationError);
    }
    
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
    
    console.log("Registering routes...");
    // Register the rest of the routes, but catch any errors
    try {
      await registerRoutes(app);
      console.log("Routes registered successfully");
    } catch (routeError) {
      console.error("Error registering routes, but continuing server startup:", routeError);
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
      if (app.get("env") === "development") {
        await setupVite(app, server);
        console.log("Vite setup complete");
      } else {
        serveStatic(app);
        console.log("Static file serving setup complete");
      }
    } catch (viteError) {
      console.error("Error setting up Vite or static file serving:", viteError);
    }
    
    // Start the server
    const port = 6767; // Use a different port for testing
    console.log(`Attempting to start server on port ${port}...`);
    
    server.listen(port, "0.0.0.0", () => {
      console.log(`Server is now running on http://0.0.0.0:${port}`);
      log(`Serving on port ${port}`);
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