// Simple monitor script to check if the server is running
import http from 'http';
import { spawn } from 'child_process';

// Configuration
const PORT = 5000;
const CHECK_INTERVAL = 30000; // 30 seconds
let lastCheck = null;
let serverUp = false;
let checkCount = 0;
let restartAttempts = 0;

// Check if the server is running
function checkServer() {
  console.log(`[${new Date().toISOString()}] Checking server status...`);
  lastCheck = new Date();
  checkCount++;
  
  const request = http.get(`http://localhost:${PORT}/health`, (res) => {
    if (res.statusCode === 200) {
      console.log(`[${new Date().toISOString()}] Server is UP (status: ${res.statusCode})`);
      serverUp = true;
      
      // Reset restart attempts on successful check
      restartAttempts = 0;
    } else {
      console.log(`[${new Date().toISOString()}] Server returned non-200 status: ${res.statusCode}`);
      serverUp = false;
      maybeRestartServer();
    }
  });
  
  request.on('error', (err) => {
    console.error(`[${new Date().toISOString()}] Server check failed: ${err.message}`);
    serverUp = false;
    maybeRestartServer();
  });
  
  request.setTimeout(5000, () => {
    console.error(`[${new Date().toISOString()}] Server check timed out`);
    request.destroy();
    serverUp = false;
    maybeRestartServer();
  });
}

// Maybe restart the server if it's down
function maybeRestartServer() {
  restartAttempts++;
  
  console.log(`[${new Date().toISOString()}] Server appears to be down (restart attempt: ${restartAttempts})`);
  
  if (restartAttempts <= 3) {
    console.log(`[${new Date().toISOString()}] Attempting restart via workflow...`);
    
    // Run the server restart command
    const restart = spawn('curl', ['-X', 'POST', 'https://replit.com/@$REPL_OWNER/$REPL_SLUG/api/v1/workflows/restarts/Start%20application'], {
      stdio: 'inherit'
    });
    
    restart.on('exit', (code) => {
      console.log(`[${new Date().toISOString()}] Restart command exited with code ${code}`);
    });
  } else {
    console.error(`[${new Date().toISOString()}] Too many restart attempts (${restartAttempts}), skipping auto-restart`);
  }
}

// Print monitor status
function printStatus() {
  console.log(`\n--- Server Monitor Status ---`);
  console.log(`Server Status: ${serverUp ? 'UP' : 'DOWN'}`);
  console.log(`Last Check: ${lastCheck ? lastCheck.toISOString() : 'Never'}`);
  console.log(`Check Count: ${checkCount}`);
  console.log(`Restart Attempts: ${restartAttempts}`);
  console.log(`----------------------------\n`);
}

// Main monitor loop
function startMonitor() {
  console.log(`[${new Date().toISOString()}] Server monitor started (checking every ${CHECK_INTERVAL/1000} seconds)`);
  
  // Initial check
  checkServer();
  
  // Setup regular checks
  setInterval(checkServer, CHECK_INTERVAL);
  
  // Print status every 5 minutes
  setInterval(printStatus, 5 * 60 * 1000);
}

// Start the monitor
startMonitor();