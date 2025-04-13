// Supervisor script for ensuring the persistent server stays running
// This is designed to be run with Node.js directly: node server/run-persistent-server.js

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get the directory of the current file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('Starting supervisor for persistent server...');

// Function to get timestamp for logs
function getTimestamp() {
  return new Date().toISOString();
}

// Function to log with timestamp
function log(message) {
  console.log(`[${getTimestamp()}] SUPERVISOR: ${message}`);
}

// Counter for restarts
let restartCount = 0;
const MAX_RAPID_RESTARTS = 5;
const RAPID_RESTART_WINDOW = 60000; // 1 minute
let recentRestarts = [];

// Function to start the server
function startServer() {
  // Check if we've had too many rapid restarts
  const now = Date.now();
  recentRestarts = recentRestarts.filter(time => now - time < RAPID_RESTART_WINDOW);
  
  if (recentRestarts.length >= MAX_RAPID_RESTARTS) {
    log(`Too many rapid restarts (${recentRestarts.length} in the last minute). Waiting 30 seconds before trying again.`);
    setTimeout(startServer, 30000);
    return;
  }
  
  recentRestarts.push(now);
  restartCount++;
  
  // Set environment variables
  const env = { 
    ...process.env, 
    NODE_ENV: 'development',
    RESTART_COUNT: restartCount.toString(),
    SUPERVISOR_STARTED: getTimestamp()
  };
  
  log(`Starting server process (restart #${restartCount})...`);
  
  // Use tsx to run the TypeScript server file
  const serverProcess = spawn('npx', ['tsx', join(__dirname, 'persistent-server.ts')], {
    env,
    stdio: 'inherit' // Inherit stdio to see server logs directly
  });
  
  log(`Server process started with PID: ${serverProcess.pid}`);
  
  // Handle server process exit
  serverProcess.on('exit', (code, signal) => {
    log(`Server process exited with code ${code} and signal ${signal}`);
    log('Will restart server in 3 seconds...');
    setTimeout(startServer, 3000);
  });
  
  // Handle unexpected errors
  serverProcess.on('error', (err) => {
    log(`Failed to start server process: ${err.message}`);
    log('Will attempt to restart server in 5 seconds...');
    setTimeout(startServer, 5000);
  });
}

// Handle supervisor process signals
process.on('SIGINT', () => {
  log('Supervisor received SIGINT, shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('Supervisor received SIGTERM, shutting down...');
  process.exit(0);
});

// Handle uncaught exceptions in the supervisor itself
process.on('uncaughtException', (err) => {
  log(`Supervisor uncaught exception: ${err.message}`);
  log(err.stack);
  log('Supervisor will continue running...');
});

process.on('unhandledRejection', (reason, promise) => {
  log('Supervisor unhandled rejection at:');
  console.dir(promise);
  log(`Reason: ${reason}`);
  log('Supervisor will continue running...');
});

// Start the server initially
startServer();

// Keep the supervisor process alive
setInterval(() => {
  log(`Supervisor heartbeat - ensuring server is running (total restarts: ${restartCount})`);
}, 60000);