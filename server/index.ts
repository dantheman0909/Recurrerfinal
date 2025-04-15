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
import { upload, importCSV, downloadSampleCSV, exportCustomersCSV } from "./import";

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

// Data synchronization endpoints (direct route to avoid Vite middleware interference)
app.post('/api/admin/mysql-sync', async (req, res) => {
  try {
    const { mysqlSyncService } = await import('./mysql-sync-service');
    const result = await mysqlSyncService.synchronizeData();
    
    // Ensure correct content type and response
    res.setHeader('Content-Type', 'application/json');
    res.json(result);
  } catch (error) {
    console.error('MySQL sync error:', error);
    
    // Ensure correct content type and response
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ 
      success: false, 
      message: `Error synchronizing MySQL data: ${error instanceof Error ? error.message : String(error)}` 
    });
  }
});

app.post('/api/admin/chargebee-sync', async (req, res) => {
  try {
    const { chargebeeSyncService } = await import('./chargebee-sync-service');
    const result = await chargebeeSyncService.synchronizeData();
    
    // Ensure correct content type and response
    res.setHeader('Content-Type', 'application/json');
    res.json(result);
  } catch (error) {
    console.error('Chargebee sync error:', error);
    
    // Ensure correct content type and response
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ 
      success: false, 
      message: `Error synchronizing Chargebee data: ${error instanceof Error ? error.message : String(error)}` 
    });
  }
});

// Customer external data integration routes
app.post('/api/customers/import-mysql-data', importMySQLDataToCustomer);

// CSV Import/Export routes
app.post('/api/import/csv', upload.single('file'), importCSV);
app.get('/api/admin/csv/sample', downloadSampleCSV);
app.get('/api/export/customers', exportCustomersCSV);
app.get('/api/chargebee/customers/:id', getChargebeeCustomer);
app.get('/api/chargebee/invoices', getChargebeeInvoices);
app.get('/api/chargebee/invoices/:id', getChargebeeInvoice);
app.get('/api/chargebee/subscriptions/:id/invoices', getInvoicesForSubscription);
app.get('/api/mysql/companies', getMySQLCompanies);
app.get('/api/mysql/companies/:id', getMySQLCompany);

// Scheduler control endpoints (direct routes to avoid Vite middleware interference)
app.post('/api/admin/mysql-scheduler/:action', async (req, res) => {
  try {
    const { action } = req.params;
    const { mysqlScheduler } = await import('./mysql-scheduler');
    
    let result: { success: boolean; message: string; status?: string };
    
    switch (action) {
      case 'start':
        mysqlScheduler.start();
        result = { success: true, message: 'MySQL scheduler started', status: 'running' };
        break;
      
      case 'stop':
        mysqlScheduler.stop();
        result = { success: true, message: 'MySQL scheduler stopped', status: 'stopped' };
        break;
      
      case 'status':
        const isRunning = mysqlScheduler.isRunning();
        result = { 
          success: true, 
          message: `MySQL scheduler is ${isRunning ? 'running' : 'stopped'}`,
          status: isRunning ? 'running' : 'stopped' 
        };
        break;
      
      default:
        result = { success: false, message: `Unknown action: ${action}`, status: 'unknown' };
    }
    
    // Ensure correct content type and response
    res.setHeader('Content-Type', 'application/json');
    res.json(result);
  } catch (error) {
    console.error('MySQL scheduler control error:', error);
    
    // Ensure correct content type and response
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ 
      success: false, 
      message: `Error controlling MySQL scheduler: ${error instanceof Error ? error.message : String(error)}`,
      status: 'error'
    });
  }
});

app.post('/api/admin/chargebee-scheduler/:action', async (req, res) => {
  try {
    const { action } = req.params;
    const { chargebeeScheduler } = await import('./chargebee-scheduler');
    
    let result: { success: boolean; message: string; status?: string };
    
    switch (action) {
      case 'start':
        chargebeeScheduler.start();
        result = { success: true, message: 'Chargebee scheduler started', status: 'running' };
        break;
      
      case 'stop':
        chargebeeScheduler.stop();
        result = { success: true, message: 'Chargebee scheduler stopped', status: 'stopped' };
        break;
      
      case 'status':
        const isRunning = chargebeeScheduler.isRunning();
        result = { 
          success: true, 
          message: `Chargebee scheduler is ${isRunning ? 'running' : 'stopped'}`,
          status: isRunning ? 'running' : 'stopped'
        };
        break;
      
      default:
        result = { success: false, message: `Unknown action: ${action}`, status: 'unknown' };
    }
    
    // Ensure correct content type and response
    res.setHeader('Content-Type', 'application/json');
    res.json(result);
  } catch (error) {
    console.error('Chargebee scheduler control error:', error);
    
    // Ensure correct content type and response
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ 
      success: false, 
      message: `Error controlling Chargebee scheduler: ${error instanceof Error ? error.message : String(error)}`,
      status: 'error'
    });
  }
});

// Customer-specific external data route
app.get('/api/customers/:id/external-data', getCustomerExternalData);

// Health check endpoint for deployment
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Service is healthy' });
});

// Root health check endpoint for deployment
app.get('/', (req, res, next) => {
  if (req.headers['user-agent']?.includes('health-check') || req.query.health === 'check') {
    return res.status(200).json({ status: 'ok', message: 'Service is healthy' });
  }
  next();
});

(async () => {
  try {
    // Run database table alterations to ensure schema is up-to-date
    if (process.env.DATABASE_URL) {
      try {
        // Run Chargebee table migrations
        const { migrateChargebeeTables } = await import('./migrate-chargebee-config');
        const chargebeeResult = await migrateChargebeeTables();
        if (chargebeeResult.success) {
          log('Chargebee tables updated successfully');
        } else {
          console.warn('Chargebee tables update warning:', chargebeeResult.error);
        }
      } catch (error) {
        console.error('Error updating Chargebee tables:', error);
      }
      
      try {
        // Run MySQL table migrations
        const { migrateMySQLTables } = await import('./migrate-mysql-config');
        const mysqlResult = await migrateMySQLTables();
        if (mysqlResult.success) {
          log('MySQL tables updated successfully');
        } else {
          console.warn('MySQL tables update warning:', mysqlResult.error);
        }
      } catch (error) {
        console.error('Error updating MySQL tables:', error);
      }
      
      try {
        // Update RedZone rules schema
        const updateRedZoneRulesSchema = (await import('./update-redzone-rules-schema')).default;
        const redZoneResult = await updateRedZoneRulesSchema();
        if (redZoneResult.success) {
          log('RedZone rules schema updated successfully');
        } else {
          console.warn('RedZone rules schema update warning:', redZoneResult.error);
        }
      } catch (error) {
        console.error('Error updating RedZone rules schema:', error);
      }
      
      try {
        // Create notifications and achievements tables
        const createAchievementTables = (await import('./create-achievement-tables')).default;
        const achievementResult = await createAchievementTables();
        if (achievementResult.success) {
          log('Notifications and achievements tables created successfully');
          
          // Seed achievements after table creation is successful
          try {
            const seedAchievements = (await import('./seed-achievements')).default;
            const seedResult = await seedAchievements();
            if (seedResult.success) {
              log('Sample achievements seeded successfully');
            } else {
              console.warn('Achievement seeding warning:', seedResult.message || seedResult.error);
            }
          } catch (seedError) {
            console.error('Error seeding achievements:', seedError);
          }
        } else {
          console.warn('Notifications and achievements tables warning:', achievementResult.error);
        }
      } catch (error) {
        console.error('Error creating notifications and achievements tables:', error);
      }
      
      try {
        // Create Google OAuth tables for Gmail and Calendar integration
        const createGoogleOAuthTables = (await import('./create-google-oauth-tables')).default;
        const googleOAuthResult = await createGoogleOAuthTables();
        if (googleOAuthResult.success) {
          log('Google OAuth tables created successfully');
        } else {
          console.warn('Google OAuth tables warning:', googleOAuthResult.error);
        }
      } catch (error) {
        console.error('Error creating Google OAuth tables:', error);
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
    
    // Start the MySQL scheduler
    try {
      // Start MySQL scheduler
      import('./mysql-scheduler').then(({ mysqlScheduler }) => {
        mysqlScheduler.start();
        log('MySQL scheduler started');
      }).catch(error => {
        console.error('Error starting MySQL scheduler:', error);
      });
      
      // Start Chargebee scheduler
      import('./chargebee-scheduler').then(({ chargebeeScheduler }) => {
        chargebeeScheduler.start();
        log('Chargebee scheduler started');
      }).catch(error => {
        console.error('Error starting Chargebee scheduler:', error);
      });
    } catch (error) {
      console.error('Error importing schedulers:', error);
    }
  });
})();
