// Health endpoint implementation for the main server
import { Request, Response } from 'express';
import { db, testDatabaseConnection } from './db-fixed';

// Server start time
const startTime = Date.now();

// Track request counts
let totalRequests = 0;
let apiRequests = 0;

// Track database status
let lastDbCheck: number | null = null;
let lastDbCheckResult: { 
  success: boolean; 
  message?: string; 
  timestamp?: Date; 
  error?: string;
} = { success: false, message: 'Not checked yet' };

// Increment request counters
export function incrementRequestCounters(isApiRequest: boolean) {
  totalRequests++;
  if (isApiRequest) {
    apiRequests++;
  }
}

// Health check endpoint handler
export async function healthCheckHandler(req: Request, res: Response) {
  try {
    // Check database connection
    let dbStatus;
    try {
      // Only check database every 30 seconds to avoid overloading
      const now = Date.now();
      if (!lastDbCheck || now - lastDbCheck > 30000) {
        const result = await testDatabaseConnection();
        lastDbCheck = now;
        lastDbCheckResult = { 
          success: true, 
          message: 'Database connection successful'
        };
      }
      dbStatus = lastDbCheckResult;
    } catch (err: any) {
      dbStatus = { success: false, error: err.message };
      lastDbCheck = Date.now();
      lastDbCheckResult = dbStatus;
    }

    // Calculate uptime
    const uptime = Math.floor((Date.now() - startTime) / 1000);

    // Return health status
    res.json({
      status: 'ok',
      time: new Date().toISOString(),
      uptime: uptime,
      memory: process.memoryUsage(),
      requests: {
        total: totalRequests,
        api: apiRequests
      },
      database: dbStatus
    });
  } catch (err: any) {
    console.error('Health check failed:', err);
    res.status(500).json({
      status: 'error',
      message: err.message,
      time: new Date().toISOString()
    });
  }
}