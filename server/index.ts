import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
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
  getNonRecurringInvoicesForCustomer,
  getCurrentMonthNonRecurringInvoices,
  getMySQLCompanies,
  getMySQLCompany,
  getCustomerExternalData,
  importMySQLDataToCustomer
} from "./external-data";
import { upload, importCSV, downloadSampleCSV, exportCustomersCSV } from "./import";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Configure session middleware with PostgreSQL session store for production
// This is required for Replit deployments
import connectPgSimple from 'connect-pg-simple';
import { pool } from './db';

const PgSessionStore = connectPgSimple(session);

app.use(session({
  store: process.env.NODE_ENV === 'production' 
    ? new PgSessionStore({
        pool: pool,
        tableName: 'session', // Default table name
        createTableIfMissing: true // Auto-create table if missing
      })
    : undefined, // Use memory store in development for simplicity
  secret: process.env.SESSION_SECRET || 'recurrer-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

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

// Load and configure Google OAuth routes
import googleOAuthRoutes from './routes/google-oauth';
app.use('/api/oauth/google', googleOAuthRoutes);

// Load and configure User Management routes
import userManagementRoutes from './routes/user-management';
app.use('/api/users', userManagementRoutes);

// Load and configure Role Management routes
import rolesRoutes from './routes/roles';
app.use('/api/roles', rolesRoutes);

// Load and configure Authentication routes
import authRoutes from './routes/auth';
app.use('/api/auth', authRoutes);

// Load and configure current user routes
import meRoutes from './routes/me';
app.use('/api/me', meRoutes);

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

// Dedicated endpoint for non-recurring invoices sync
app.post('/api/admin/chargebee-sync/non-recurring', async (req, res) => {
  try {
    // Import our sync service
    const { syncNonRecurringInvoices } = await import('./sync-non-recurring-invoices');
    
    // Forward the request to our handler
    await syncNonRecurringInvoices(req, res);
  } catch (error) {
    console.error('Non-recurring invoices sync error:', error);
    
    // Ensure correct content type and response
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ 
      success: false, 
      message: `Error synchronizing non-recurring invoices: ${error instanceof Error ? error.message : String(error)}` 
    });
  }
});

// Dedicated endpoint for full invoices sync
app.post('/api/admin/invoices-sync', async (req, res) => {
  try {
    // First ensure the invoices table exists with proper structure
    const { ensureInvoicesTableExists, storeInvoice } = await import('./sync-non-recurring-invoices');
    
    console.log('Ensuring chargebee_invoices table exists...');
    await ensureInvoicesTableExists();
    console.log('Table verification complete');
    
    // Get all invoices from Chargebee
    const { chargebeeService } = await import('./chargebee');
    if (!chargebeeService) {
      return res.status(500).json({ error: 'Chargebee service not initialized' });
    }
    
    console.log('Starting complete invoice sync...');
    const invoices = await chargebeeService.getAllInvoices();
    console.log(`Found ${invoices.length} total invoices to sync`);
    
    // Process all invoices
    let savedCount = 0;
    let errorCount = 0;
    const startTime = Date.now();
    
    // Process invoices in batches to avoid memory issues
    const BATCH_SIZE = 50; // Batch size of 50 which has been tested to work well
    
    for (let i = 0; i < invoices.length; i += BATCH_SIZE) {
      const batch = invoices.slice(i, i + BATCH_SIZE);
      console.log(`Processing batch ${Math.floor(i/BATCH_SIZE) + 1} of ${Math.ceil(invoices.length/BATCH_SIZE)}`);
      
      // Process each invoice in the batch
      for (const invoice of batch) {
        try {
          // Set recurring flag based on subscription_id presence
          invoice.recurring = !!invoice.subscription_id;
          
          // Use the improved storeInvoice function for all invoices
          await storeInvoice(invoice);
          
          savedCount++;
          
          // Log progress every 50 invoices
          if (savedCount % 50 === 0) {
            const elapsedSeconds = Math.round((Date.now() - startTime) / 1000);
            const rate = Math.round((savedCount / elapsedSeconds) * 60);
            console.log(`Saved ${savedCount}/${invoices.length} invoices (${rate} per minute)`);
            
            // Check current count in database
            const dbPool = (await import('./db')).pool;
            const countResult = await dbPool.query('SELECT COUNT(*) FROM chargebee_invoices');
            console.log(`Current invoice count in database: ${countResult.rows[0].count}`);
          }
        } catch (error) {
          console.error(`Error storing invoice ${invoice.id}:`, error);
          errorCount++;
        }
      }
    }
    
    // Get final count from database
    const dbPool = (await import('./db')).pool;
    const finalCountResult = await dbPool.query('SELECT COUNT(*) FROM chargebee_invoices');
    const dbCount = parseInt(finalCountResult.rows[0].count);
    
    // Calculate statistics
    const endTime = Date.now();
    const totalSeconds = Math.round((endTime - startTime) / 1000);
    const invoicesPerMinute = totalSeconds > 0 ? Math.round((savedCount / totalSeconds) * 60) : 0;
    
    // Update chargebee_config with last sync stats
    try {
      const syncStats = {
        invoices_found: invoices.length,
        invoices_synced: savedCount,
        errors: errorCount,
        time_taken_seconds: totalSeconds,
        invoices_per_minute: invoicesPerMinute,
        completed_at: new Date().toISOString()
      };
      
      await dbPool.query(
        `UPDATE chargebee_config 
         SET last_sync_stats = $1, 
             last_synced_at = NOW() 
         WHERE id = 1`,
        [JSON.stringify(syncStats)]
      );
      
      console.log('Updated chargebee_config with sync stats');
    } catch (statsError) {
      console.error('Failed to update sync stats:', statsError);
    }
    
    return res.json({
      success: true,
      message: `Completed invoice sync in ${totalSeconds} seconds`,
      invoices_found: invoices.length,
      invoices_synced: savedCount,
      errors: errorCount,
      db_count: dbCount,
      processing_time_seconds: totalSeconds,
      invoices_per_minute: invoicesPerMinute
    });
  } catch (error) {
    console.error('Error during complete invoice sync:', error);
    return res.status(500).json({ 
      error: "Failed to sync invoices", 
      details: error instanceof Error ? error.message : String(error) 
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
app.get('/api/chargebee/customers/:id/non-recurring-invoices', getNonRecurringInvoicesForCustomer);
app.get('/api/chargebee/customers/:id/current-month-non-recurring-invoices', getCurrentMonthNonRecurringInvoices);
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

// Health check endpoints for deployment
// Multiple health check routes to ensure Replit deployment can access at least one
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Service is healthy', timestamp: new Date().toISOString() });
});

app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Service is healthy', timestamp: new Date().toISOString() });
});

app.get('/ready', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Service is ready', timestamp: new Date().toISOString() });
});

// Root health check endpoint for deployment
// This is a critical route for Replit deployments
app.get('/', (req, res, next) => {
  // Always return health check response for root path
  if (req.path === '/' && (
    req.headers['user-agent']?.includes('health-check') || 
    req.query.health === 'check' ||
    req.headers['accept']?.includes('application/json')
  )) {
    return res.status(200)
      .header('Content-Type', 'application/json')
      .json({ 
        status: 'ok', 
        message: 'Service is healthy', 
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
      });
  }
  
  // For normal browser requests, continue to next middleware (which will serve the frontend app)
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
          
          // Initialize Google OAuth configuration from environment variables
          try {
            const initializeGoogleOAuthConfig = (await import('./google-oauth-env-config')).default;
            await initializeGoogleOAuthConfig();
            log('Google OAuth configured with environment credentials');
          } catch (configError) {
            console.error('Error initializing Google OAuth config:', configError);
          }
        } else {
          console.warn('Google OAuth tables warning:', googleOAuthResult.error);
        }
      } catch (error) {
        console.error('Error creating Google OAuth tables:', error);
      }
      
      try {
        // Create roles and permissions tables for role-based access control
        const createPermissionsTable = (await import('./create-permissions-table')).default;
        const permissionsResult = await createPermissionsTable();
        if (permissionsResult.success) {
          log('Permissions table created/updated successfully');
        } else {
          console.warn('Permissions table warning:', permissionsResult.error);
        }
      } catch (error) {
        console.error('Error creating permissions table:', error);
      }
    }
  } catch (error) {
    console.error('Error during database initialization:', error);
  }
  
  const server = await registerRoutes(app);

  // Error handler middleware - provides consistent error responses
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    
    // Log the error but don't throw (which would crash the server)
    console.error('Server error:', err);
    
    // Only send the response if it hasn't been sent already
    if (!res.headersSent) {
      res.status(status).json({ 
        status: 'error', 
        message,
        timestamp: new Date().toISOString()
      });
    }
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
