import express from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { MetricTimeframe } from "@shared/types";
import { addConditionFieldColumn } from './migrations/add-condition-field-column';
import { db } from './db';
import { playbooks, playbookTasks, customers } from "@shared/schema";

async function main() {
  try {
    console.log("Starting test server...");
    
    // Run migrations
    console.log("Running migrations...");
    await addConditionFieldColumn();
    console.log("Migrations completed");
    
    // Test database connection
    try {
      console.log("Testing database connection...");
      const playbookResult = await db.select().from(playbooks).limit(1);
      console.log("Database connection successful. First playbook:", playbookResult[0] || "No playbooks found");
      
      const customerResult = await db.select().from(customers).limit(1);
      console.log("First customer:", customerResult[0] || "No customers found");
    } catch (dbError) {
      console.error("Database connection error:", dbError);
    }
    
    const app = express();
    app.use(express.json());
    
    // Add a simple test route
    app.get('/api/test', (req, res) => {
      res.json({ message: 'Test server running successfully!' });
    });
    
    // Add a simple dashboard route
    app.get('/api/dashboard', async (req, res) => {
      try {
        const timeframe = (req.query.timeframe as MetricTimeframe) || 'monthly';
        const stats = await storage.getDashboardStats(timeframe);
        res.json(stats);
      } catch (error) {
        console.error("Dashboard error:", error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });
    
    // Test MySQL connection validation
    app.post('/api/test/mysql-validation', express.json(), (req, res) => {
      try {
        console.log("Testing MySQL validation with:", JSON.stringify(req.body));
        
        // Basic validation
        const { host, port, username, password, database } = req.body;
        
        if (!host || typeof host !== 'string') {
          return res.status(400).json({ error: 'Host must be a valid string' });
        }
        
        if (!port || typeof port !== 'number' || port <= 0 || port >= 65536) {
          return res.status(400).json({ error: 'Port must be a valid number between 1 and 65535' });
        }
        
        if (!username || typeof username !== 'string') {
          return res.status(400).json({ error: 'Username must be a valid string' });
        }
        
        if (!password || typeof password !== 'string') {
          return res.status(400).json({ error: 'Password must be a valid string' });
        }
        
        if (!database || typeof database !== 'string') {
          return res.status(400).json({ error: 'Database must be a valid string' });
        }
        
        // All validations passed
        res.json({ 
          message: 'MySQL configuration validation passed',
          config: { host, port, username, database }
        });
      } catch (error) {
        console.error("MySQL validation error:", error);
        res.status(500).json({ error: 'Internal server error', details: String(error) });
      }
    });
    
    // Test Chargebee configuration
    app.post('/api/test/chargebee-validation', express.json(), (req, res) => {
      try {
        console.log("Testing Chargebee validation with:", JSON.stringify(req.body));
        
        const { site, apiKey } = req.body;
        
        if (!site || typeof site !== 'string' || !/^[a-zA-Z0-9-]+$/.test(site)) {
          return res.status(400).json({ 
            error: 'Site must be a valid string containing only letters, numbers, and hyphens' 
          });
        }
        
        if (!apiKey || typeof apiKey !== 'string') {
          return res.status(400).json({ error: 'API key must be a valid string' });
        }
        
        // All validations passed
        res.json({ 
          message: 'Chargebee configuration validation passed',
          config: { site }
        });
      } catch (error) {
        console.error("Chargebee validation error:", error);
        res.status(500).json({ error: 'Internal server error', details: String(error) });
      }
    });
    
    const server = createServer(app);
    const port = 5000;
    
    server.listen(port, "0.0.0.0", () => {
      console.log(`Test server running on port ${port}`);
    });
  } catch (error) {
    console.error("Fatal error:", error);
  }
}

main();