import express from "express";
import type { Request, Response, NextFunction } from "express";
import http from "http";
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from "@shared/schema";
import ws from 'ws';
import { neonConfig } from '@neondatabase/serverless';
import path from "path";
import { createServer as createViteServer } from "vite";

// Configure the WebSocket implementation
neonConfig.webSocketConstructor = ws;

async function main() {
  try {
    // Create express app with HTTP server
    const app = express();
    const server = http.createServer(app);

    // Basic middleware
    app.use(express.json());

    // Check if database URL is available
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
    }

    console.log("Initializing database connection...");

    // Create connection pool
    const pool = new Pool({ 
      connectionString: process.env.DATABASE_URL 
    });

    // Test database connection
    console.log("Testing database connection...");
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT NOW()');
      console.log("Database connection successful:", result.rows[0]);
    } finally {
      client.release();
    }

    // Create Drizzle ORM instance
    const db = drizzle(pool, { schema });
    console.log("Drizzle ORM initialized successfully");

    // Basic API route that uses the database
    app.get("/api/healthcheck", async (_req, res) => {
      try {
        const result = await db.select().from(schema.users).limit(1);
        res.status(200).json({ status: "ok", time: new Date().toISOString(), users: result.length });
      } catch (error) {
        console.error("Database error in health check:", error);
        res.status(500).json({ status: "error", message: "Database error" });
      }
    });

    // Setup Vite in development mode
    try {
      console.log("Setting up Vite...");
      const vite = await createViteServer({
        server: { middlewareMode: true, hmr: { server } },
        appType: 'custom'
      });
      
      app.use(vite.middlewares);
      console.log("Vite setup completed successfully");
      
      // Handle SPA routes
      app.use('*', async (req, res, next) => {
        try {
          const url = req.originalUrl;
          const indexPath = path.resolve(process.cwd(), 'client/index.html');
          
          console.log("Serving client for URL:", url);
          console.log("Using index path:", indexPath);
          
          // Send a simple response for testing
          res.status(200).send(`<!DOCTYPE html>
<html>
<head>
  <title>Test Vite Server</title>
</head>
<body>
  <h1>Test Vite Server</h1>
  <p>This is a test of the Vite server integration.</p>
  <p>URL: ${url}</p>
</body>
</html>`);
        } catch (e) {
          next(e);
        }
      });
    } catch (error) {
      console.error("Error setting up Vite:", error);
      throw error;
    }

    // Basic error handling
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      console.error("Server error:", err);
      const status = err.status || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
    });

    // Start the server
    const port = parseInt(process.env.PORT || "5000");
    console.log(`Starting Vite test server on port ${port}...`);

    server.listen(port, "0.0.0.0", () => {
      console.log(`Vite test server is running on http://0.0.0.0:${port}`);
    });

    server.on("error", (error: any) => {
      console.error(`Server error: ${error.message}`);
      console.error("Full error details:", error);
    });
  } catch (error) {
    console.error("Fatal error during server startup:", error);
    process.exit(1);
  }
}

main();