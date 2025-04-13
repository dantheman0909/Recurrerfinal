/**
 * Runner script for the Recurrer reliable server
 * This script provides a wrapper to start and monitor the reliable server
 */

const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

// Configuration
const SERVER_PATH = './server/reliable-server.js';
const LOG_FILE = 'reliable-server-runner.log';
const HEALTH_CHECK_URL = 'http://localhost:5000/health';
const HEALTH_CHECK_INTERVAL = 10000; // 10 seconds
const RESTART_DELAY = 5000; // 5 seconds
const MAX_CONSECUTIVE_FAILURES = 3;

// State tracking
let serverProcess = null;
let restartCount = 0;
let consecutiveHealthCheckFailures = 0;
let isRestarting = false;
let healthCheckTimer = null;

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
  Recurrer Reliable Server Runner - Started ${new Date().toISOString()}
==========================================================
`;
  
  fs.writeFileSync(LOG_FILE, header);
  log('Runner initialized');
}

// Start the server process
function startServer() {
  if (isRestarting) {
    log('Already in the process of restarting the server, ignoring duplicate request');
    return;
  }
  
  isRestarting = true;
  
  // Kill any existing process first
  if (serverProcess) {
    try {
      log('Terminating existing server process...');
      serverProcess.kill();
    } catch (err) {
      log(`Error terminating process: ${err.message}`);
    }
  }
  
  restartCount++;
  log(`Starting server process (restart #${restartCount})...`);
  
  // Set environment variables for the child process
  const env = {
    ...process.env,
    NODE_ENV: 'development',
    RUNNER_RESTART_COUNT: restartCount.toString()
  };
  
  // Use a try-catch block in case spawn itself fails
  try {
    serverProcess = spawn('node', [SERVER_PATH], {
      env,
      stdio: 'inherit',
      detached: false
    });
    
    log(`Server process started with PID: ${serverProcess.pid}`);
    
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
    
    // Start health checks after a short delay
    setTimeout(() => {
      isRestarting = false;
      checkServerHealth();
    }, 10000);
    
  } catch (error) {
    log(`Failed to start server process: ${error.message}`);
    
    // Schedule a restart
    log(`Will retry starting server in ${RESTART_DELAY / 1000} seconds...`);
    setTimeout(() => {
      isRestarting = false;
      startServer();
    }, RESTART_DELAY);
  }
}

// Check if the server is responding to HTTP health checks
function checkServerHealth() {
  if (isRestarting) {
    log('Skipping health check during restart');
    return;
  }
  
  log('Performing health check...');
  
  const request = http.get(HEALTH_CHECK_URL, (res) => {
    log(`Health check status: ${res.statusCode}`);
    
    if (res.statusCode === 200) {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const healthData = JSON.parse(data);
          log(`Server uptime: ${healthData.uptime}s, Requests: ${healthData.requests}`);
          consecutiveHealthCheckFailures = 0;
        } catch (e) {
          log(`Error parsing health check response: ${e.message}`);
        }
      });
    } else {
      log(`Unhealthy status code: ${res.statusCode}`);
      handleHealthCheckFailure();
    }
  });
  
  // Set a timeout for the request
  request.setTimeout(5000, () => {
    log('Health check timed out after 5 seconds');
    request.destroy();
    handleHealthCheckFailure();
  });
  
  // Handle request errors
  request.on('error', (err) => {
    log(`Health check failed: ${err.message}`);
    handleHealthCheckFailure();
  });
  
  // Schedule next health check
  healthCheckTimer = setTimeout(checkServerHealth, HEALTH_CHECK_INTERVAL);
}

// Handle a failed health check
function handleHealthCheckFailure() {
  consecutiveHealthCheckFailures++;
  
  log(`Consecutive health check failures: ${consecutiveHealthCheckFailures}`);
  
  if (consecutiveHealthCheckFailures >= MAX_CONSECUTIVE_FAILURES) {
    log(`Maximum consecutive failures (${MAX_CONSECUTIVE_FAILURES}) reached, restarting server`);
    consecutiveHealthCheckFailures = 0;
    startServer();
  }
}

// Handle process signals
process.on('SIGINT', () => {
  log('Received SIGINT signal, shutting down...');
  
  if (healthCheckTimer) {
    clearTimeout(healthCheckTimer);
  }
  
  if (serverProcess) {
    serverProcess.kill();
  }
  
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('Received SIGTERM signal, shutting down...');
  
  if (healthCheckTimer) {
    clearTimeout(healthCheckTimer);
  }
  
  if (serverProcess) {
    serverProcess.kill();
  }
  
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  log(`Uncaught exception in runner: ${err.message}`);
  log(err.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  log('Unhandled rejection in runner:');
  log(`Promise: ${promise}, Reason: ${reason}`);
});

// Initialize and start the server
initLog();
startServer();