/**
 * Supervisor script for simple server
 */

const { spawn } = require('child_process');
const http = require('http');

// Configuration
const SERVER_SCRIPT = './server.js';
const HEALTH_CHECK_URL = 'http://localhost:5000/health';
const HEALTH_CHECK_INTERVAL = 15000; // 15 seconds

// State tracking
let serverProcess = null;
let restartCount = 0;
let isRestarting = false;

// Start the server process
function startServer() {
  if (isRestarting) {
    console.log('Already restarting, ignoring duplicate request');
    return;
  }
  
  isRestarting = true;
  
  // Kill any existing process first
  if (serverProcess) {
    try {
      console.log('Terminating existing server process...');
      serverProcess.kill();
    } catch (err) {
      console.error(`Error terminating process: ${err.message}`);
    }
  }
  
  restartCount++;
  console.log(`Starting server process (restart #${restartCount})...`);
  
  // Start the server
  serverProcess = spawn('node', [SERVER_SCRIPT], {
    stdio: 'inherit'
  });
  
  console.log(`Server process started with PID: ${serverProcess.pid}`);
  
  // Handle process exit
  serverProcess.on('exit', (code, signal) => {
    console.log(`Server process exited with code ${code} and signal ${signal}`);
    serverProcess = null;
    
    // Schedule a restart
    console.log(`Will restart server in 3 seconds...`);
    setTimeout(() => {
      isRestarting = false;
      startServer();
    }, 3000);
  });
  
  // Handle process errors
  serverProcess.on('error', (err) => {
    console.error(`Error in server process: ${err.message}`);
    serverProcess = null;
    
    // Schedule a restart
    console.log(`Will restart server in 3 seconds...`);
    setTimeout(() => {
      isRestarting = false;
      startServer();
    }, 3000);
  });
  
  // Clear the restarting flag after a short delay
  setTimeout(() => {
    isRestarting = false;
  }, 5000);
}

// Check if the server is responding to HTTP health checks
function checkServerHealth() {
  if (isRestarting) {
    console.log('Skipping health check during restart');
    return;
  }
  
  console.log('Performing health check...');
  
  const request = http.get(HEALTH_CHECK_URL, (res) => {
    console.log(`Health check status: ${res.statusCode}`);
    
    if (res.statusCode === 200) {
      console.log('Server is healthy');
    } else {
      console.log(`Server returned unhealthy status code: ${res.statusCode}`);
      startServer();
    }
  });
  
  // Set a timeout for the request
  request.setTimeout(5000, () => {
    console.log('Health check timed out after 5 seconds');
    request.destroy();
    startServer();
  });
  
  // Handle request errors
  request.on('error', (err) => {
    console.log(`Health check failed: ${err.message}`);
    startServer();
  });
}

// Setup signal handlers
process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down supervisor...');
  if (serverProcess) {
    serverProcess.kill();
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down supervisor...');
  if (serverProcess) {
    serverProcess.kill();
  }
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error(`Uncaught exception in supervisor: ${err.message}`);
  console.error(err.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection in supervisor:');
  console.error(`Promise: ${promise}, Reason: ${reason}`);
});

// Start the server
startServer();

// Schedule regular health checks
setInterval(checkServerHealth, HEALTH_CHECK_INTERVAL);

console.log('Supervisor running. Press Ctrl+C to exit.');