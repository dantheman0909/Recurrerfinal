/**
 * Supervisor script for keeping the Recurrer server alive
 * This script will continuously monitor and restart the server process if needed
 * 
 * Run with: node keep-alive.js
 */

const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Configuration
const LOG_FILE = 'server-supervisor.log';
const SERVER_COMMAND = 'tsx';
const SERVER_SCRIPT = 'server/index.ts';
const HEALTH_CHECK_URL = 'http://localhost:5000/index.html';
const HEALTH_CHECK_INTERVAL = 15000; // 15 seconds
const RESTART_DELAY = 3000; // 3 seconds
const MAX_RAPID_RESTARTS = 10;
const RAPID_RESTART_WINDOW = 60000; // 1 minute

// State tracking
let serverProcess = null;
let restartCount = 0;
let recentRestarts = [];
let isRestarting = false;
let server = null;
let lastOutput = "";

// Setup logging
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  
  console.log(logMessage);
  
  // Also append to log file
  fs.appendFileSync(LOG_FILE, logMessage + '\n');
}

// Initialize log file
function initLog() {
  const header = `
==========================================================
  Recurrer Server Supervisor - Started ${new Date().toISOString()}
==========================================================
`;
  
  fs.writeFileSync(LOG_FILE, header);
  log('Supervisor initialized');
}

// Start the server process
function startServer() {
  if (isRestarting) {
    log('Already in the process of restarting the server, ignoring duplicate request');
    return;
  }
  
  isRestarting = true;
  
  // Check for too many rapid restarts
  const now = Date.now();
  recentRestarts = recentRestarts.filter(time => now - time < RAPID_RESTART_WINDOW);
  
  if (recentRestarts.length >= MAX_RAPID_RESTARTS) {
    log(`Too many rapid restarts (${recentRestarts.length}) in the last minute. Waiting longer before retry.`);
    setTimeout(() => {
      isRestarting = false;
      startServer();
    }, 30000);
    return;
  }
  
  // Kill any existing process first
  if (serverProcess) {
    try {
      log('Terminating existing server process...');
      serverProcess.kill('SIGTERM');
    } catch (err) {
      log(`Error terminating process: ${err.message}`);
    }
  }
  
  restartCount++;
  recentRestarts.push(now);
  
  log(`Starting server process (restart #${restartCount})...`);
  
  // Set environment variables for the child process
  const env = {
    ...process.env,
    NODE_ENV: 'development',
    SUPERVISOR_RESTART_COUNT: restartCount.toString(),
    SUPERVISOR_PID: process.pid.toString()
  };
  
  // Use a try-catch block in case spawn itself fails
  try {
    serverProcess = spawn(SERVER_COMMAND, [SERVER_SCRIPT], {
      env,
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: true
    });
    
    log(`Server process started with PID: ${serverProcess.pid}`);
    
    // Capture stdout
    serverProcess.stdout.on('data', (data) => {
      const outputStr = data.toString();
      lastOutput = outputStr;
      process.stdout.write(outputStr);
    });
    
    // Capture stderr
    serverProcess.stderr.on('data', (data) => {
      const errorStr = data.toString();
      lastOutput = errorStr;
      process.stderr.write(errorStr);
    });
    
    // Handle process exit
    serverProcess.on('exit', (code, signal) => {
      log(`Server process exited with code ${code} and signal ${signal}`);
      serverProcess = null;
      
      // Schedule a restart
      log(`Will restart server in ${RESTART_DELAY / 1000} seconds...`);
      setTimeout(() => {
        isRestarting = false;
        startServer();
      }, RESTART_DELAY);
    });
    
    // Handle process errors
    serverProcess.on('error', (err) => {
      log(`Error in server process: ${err.message}`);
      serverProcess = null;
      
      // Schedule a restart
      log(`Will restart server in ${RESTART_DELAY / 1000} seconds...`);
      setTimeout(() => {
        isRestarting = false;
        startServer();
      }, RESTART_DELAY);
    });
    
  } catch (error) {
    log(`Failed to start server process: ${error.message}`);
    serverProcess = null;
    
    // Schedule a restart
    log(`Will retry starting server in ${RESTART_DELAY / 1000} seconds...`);
    setTimeout(() => {
      isRestarting = false;
      startServer();
    }, RESTART_DELAY);
  }
  
  // Clear the restarting flag after a short delay
  setTimeout(() => {
    isRestarting = false;
  }, 5000);
}

// Check if the server is responding to HTTP requests
function checkServerHealth() {
  if (isRestarting) {
    log('Skipping health check during restart');
    return;
  }
  
  log('Performing health check...');
  
  const request = http.get(HEALTH_CHECK_URL, (res) => {
    log(`Health check status: ${res.statusCode}`);
    
    // Consider any 2xx response as healthy
    if (res.statusCode >= 200 && res.statusCode < 300) {
      log('Server is healthy');
    } else {
      log(`Server returned unhealthy status code: ${res.statusCode}`);
      startServer();
    }
  });
  
  // Set a timeout for the request
  request.setTimeout(5000, () => {
    log('Health check timed out after 5 seconds');
    request.destroy();
    startServer();
  });
  
  // Handle request errors
  request.on('error', (err) => {
    log(`Health check failed: ${err.message}`);
    startServer();
  });
}

// Create a simple status server
function startStatusServer() {
  const statusServer = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    
    const uptime = process.uptime();
    const formattedUptime = `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`;
    
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Recurrer Server Supervisor</title>
        <meta http-equiv="refresh" content="10">
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
          h1 { color: #333; }
          .info { margin: 20px 0; }
          .status { padding: 10px; margin: 10px 0; border-radius: 4px; }
          .running { background-color: #d4edda; color: #155724; }
          .stopped { background-color: #f8d7da; color: #721c24; }
          .output { background-color: #f8f9fa; border: 1px solid #ddd; padding: 10px; height: 300px; overflow: auto; font-family: monospace; }
          .restart-button { padding: 8px 16px; background-color: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; }
        </style>
      </head>
      <body>
        <h1>Recurrer Server Supervisor</h1>
        
        <div class="status ${serverProcess ? 'running' : 'stopped'}">
          Server process status: <strong>${serverProcess ? 'RUNNING' : 'STOPPED'}</strong>
          ${serverProcess ? `(PID: ${serverProcess.pid})` : ''}
        </div>
        
        <div class="info">
          <p><strong>Supervisor uptime:</strong> ${formattedUptime}</p>
          <p><strong>Server restart count:</strong> ${restartCount}</p>
          <p><strong>Recent restarts:</strong> ${recentRestarts.length} in the last minute</p>
          <p><strong>Last health check:</strong> ${new Date().toISOString()}</p>
        </div>
        
        <h2>Server output</h2>
        <div class="output">${lastOutput.replace(/\\n/g, '<br>').replace(/ /g, '&nbsp;')}</div>
        
        <div style="margin-top: 20px;">
          <button class="restart-button" onclick="window.location.href='?restart=true'">Restart Server</button>
        </div>
      </body>
      </html>
    `;
    
    res.end(html);
    
    // Handle restart requests
    if (req.url.includes('restart=true')) {
      log('Restart requested from status page');
      startServer();
    }
  });
  
  // Start the status server on a different port
  const STATUS_PORT = 5050;
  statusServer.listen(STATUS_PORT, '0.0.0.0', () => {
    log(`Status server running at http://localhost:${STATUS_PORT}`);
  });
  
  statusServer.on('error', (err) => {
    log(`Error in status server: ${err.message}`);
  });
}

// Set up process signal handlers
process.on('SIGINT', () => {
  log('Received SIGINT, shutting down supervisor...');
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('Received SIGTERM, shutting down supervisor...');
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
  }
  process.exit(0);
});

// Handle unexpected errors in the supervisor
process.on('uncaughtException', (err) => {
  log(`Uncaught exception in supervisor: ${err.message}`);
  log(err.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  log('Unhandled rejection in supervisor:');
  log(`Promise: ${promise}, Reason: ${reason}`);
});

// Initialize and start everything
initLog();
startServer();
startStatusServer();

// Schedule regular health checks
setInterval(checkServerHealth, HEALTH_CHECK_INTERVAL);

// Keep the supervisor alive
setInterval(() => {
  log(`Supervisor heartbeat - server has been restarted ${restartCount} times`);
}, 60000);