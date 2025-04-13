/**
 * Supervisor script for the Recurrer platform
 * Monitors and automatically restarts the server if it crashes
 */

const { spawn } = require('child_process');
const path = require('path');

// Configuration
const MAX_RESTARTS = 100; // Maximum number of restarts before giving up
const RESTART_DELAY = 3000; // Delay between restarts in milliseconds
const SERVER_SCRIPT = './server/standalone-server.js'; // Path to the server script

// Counter for restarts
let restartCount = 0;

// Function to get timestamp for logs
function getTimestamp() {
  return new Date().toISOString();
}

// Function to log with timestamp
function log(message) {
  console.log(`[${getTimestamp()}] SUPERVISOR: ${message}`);
}

// Function to start the server
function startServer() {
  if (restartCount >= MAX_RESTARTS) {
    log(`Maximum number of restarts (${MAX_RESTARTS}) reached. Giving up.`);
    process.exit(1);
  }

  restartCount++;
  
  log(`Starting server (attempt ${restartCount}/${MAX_RESTARTS})...`);
  
  // Set environment variables
  const env = { 
    ...process.env, 
    NODE_ENV: 'development',
    SUPERVISOR_RESTART_COUNT: restartCount.toString()
  };
  
  // Start the server process
  const server = spawn('node', [SERVER_SCRIPT], {
    env,
    stdio: 'inherit' // Pipe the output to the supervisor's output
  });
  
  log(`Server started with PID: ${server.pid}`);
  
  // Handle server exit
  server.on('exit', (code, signal) => {
    log(`Server exited with code ${code} and signal ${signal}.`);
    
    // Schedule restart after delay
    log(`Restarting server in ${RESTART_DELAY / 1000} seconds...`);
    setTimeout(startServer, RESTART_DELAY);
  });
  
  // Handle errors
  server.on('error', (err) => {
    log(`Error starting server: ${err.message}`);
    
    // Schedule restart after delay
    log(`Retrying in ${RESTART_DELAY / 1000} seconds...`);
    setTimeout(startServer, RESTART_DELAY);
  });
}

// Handle supervisor signals
process.on('SIGINT', () => {
  log('Supervisor received SIGINT signal. Shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('Supervisor received SIGTERM signal. Shutting down...');
  process.exit(0);
});

// Handle uncaught exceptions in the supervisor
process.on('uncaughtException', (err) => {
  log(`Supervisor encountered an uncaught exception: ${err.message}`);
  log(err.stack);
  log('Supervisor will continue running.');
});

// Keep the supervisor running
setInterval(() => {
  // This interval keeps the event loop active
  if (restartCount > 0) {
    log(`Supervisor heartbeat - server has been restarted ${restartCount} times.`);
  }
}, 60000);

// Start the server
log('Supervisor started.');
startServer();