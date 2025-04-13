import express, { type Request, Response, NextFunction } from "express";
import http from "http";
import { storage } from "./storage";
import { setupVite, serveStatic, log } from "./vite";
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
    console.log("Starting fixed-server implementation...");
    
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
    
    // Run migrations safely - catch errors but continue if they fail
    try {
      console.log("Running database migrations...");
      await runMigrationsOnStartup();
      console.log("Migrations completed successfully");
    } catch (migrationError) {
      console.error("Error running migrations, but continuing server startup:", migrationError);
    }
    
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
    
    // Add more API routes
    app.get('/api/customers', async (req, res) => {
      try {
        const customers = await storage.getCustomers();
        res.json(customers);
      } catch (error) {
        console.error("Error fetching customers:", error);
        res.status(500).json({ 
          message: "Failed to fetch customers", 
          error: String(error)
        });
      }
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
    
    // Setup vite or static file serving
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }
    
    // Start the server
    const port = 6060;
    server.listen(port, '0.0.0.0', () => {
      console.log(`Fixed server running on http://0.0.0.0:${port}`);
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