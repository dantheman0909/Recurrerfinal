import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
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

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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

(async () => {
  try {
    // Run database table alterations to ensure schema is up-to-date
    if (process.env.DATABASE_URL) {
      try {
        // Run Chargebee table alterations
        const { alterChargebeeTables } = await import('./alter-chargebee-table');
        const chargebeeResult = await alterChargebeeTables();
        if (chargebeeResult.success) {
          log('Chargebee tables updated successfully');
        } else {
          console.warn('Chargebee tables update warning:', chargebeeResult.error);
        }
      } catch (error) {
        console.error('Error updating Chargebee tables:', error);
      }
      
      try {
        // Run MySQL table alterations
        const { alterMySQLTables } = await import('./alter-mysql-tables');
        const mysqlResult = await alterMySQLTables();
        if (mysqlResult.success) {
          log('MySQL tables updated successfully');
        } else {
          console.warn('MySQL tables update warning:', mysqlResult.error);
        }
      } catch (error) {
        console.error('Error updating MySQL tables:', error);
      }
    }
  } catch (error) {
    console.error('Error during database initialization:', error);
  }
  
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
