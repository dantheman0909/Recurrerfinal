import express, { type Request, Response, NextFunction } from "express";
import http from "http";
import cors from "cors";
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from '../shared/schema';
import { addPlaybookTaskConditionField } from "./migrate-playbooks";

// Initialize Express app
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());

// Create HTTP server
const server = http.createServer(app);

// Basic database connection setup
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    time: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    server: {
      platform: process.platform,
      nodeVersion: process.version,
      environment: process.env.NODE_ENV
    }
  });
});

// Database test endpoint
app.get('/api/db-status', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as now');
    res.json({
      status: 'ok',
      database: {
        connected: true,
        time: result.rows[0].now
      }
    });
  } catch (error) {
    console.error('Database query error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Database connection failed',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Basic API routes
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    time: new Date().toISOString(),
    server: 'fixed-server'
  });
});

// Error handling middleware
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  console.error("Server error:", err);
  res.status(status).json({ message });
});

// Run migrations
async function runMigrations() {
  try {
    console.log('Running database migrations...');
    await addPlaybookTaskConditionField();
    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Migration error:', error);
    console.log('Continuing despite migration error');
  }
}

// Start the application
async function startServer() {
  try {
    console.log("Starting fixed server...");
    
    // Test database connection
    try {
      console.log("Testing database connection...");
      const result = await pool.query('SELECT NOW() as now');
      console.log("Database connection successful:", result.rows[0]);
    } catch (error) {
      console.error("Database connection error:", error);
      console.log("Proceeding with server startup despite database error");
    }
    
    // Run migrations
    await runMigrations();
    
    // Start the server
    const port = parseInt(process.env.PORT || "5001");
    
    server.listen(port, "0.0.0.0", () => {
      console.log(`Fixed server is now running on http://0.0.0.0:${port}`);
    });
    
    // Heartbeat to keep the process alive
    setInterval(() => {
      console.log(`Fixed server heartbeat - running on port ${port}`);
    }, 30000);
    
    // Server error handler
    server.on("error", (error: any) => {
      console.error(`Server error: ${error.message}`);
      if (error.code === "EADDRINUSE") {
        console.error(`Port ${port} is already in use`);
      }
    });
  } catch (error) {
    console.error("Fatal error during server startup:", error);
    
    // Instead of crashing, recover
    console.log("Attempting to run basic server without database...");
    
    const port = parseInt(process.env.PORT || "5002");
    server.listen(port, "0.0.0.0", () => {
      console.log(`Recovery server running on http://0.0.0.0:${port}`);
    });
  }
}

// Handle process signals
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    pool.end();
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    pool.end();
    process.exit(0);
  });
});

// Handle unhandled errors
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  // Don't exit
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
  // Don't exit
});

// Start the server
startServer();