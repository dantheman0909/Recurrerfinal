/**
 * Simple HTTP server to monitor the main application
 * This server runs on a different port and provides status information
 */

const http = require('http');
const https = require('https');
const { spawn } = require('child_process');
const os = require('os');

// Configuration
const MONITOR_PORT = 5099;
const APP_URL = 'http://localhost:5000';
const CHECK_INTERVAL = 30000; // 30 seconds
const RESTART_COMMAND = 'npm';
const RESTART_ARGS = ['run', 'dev'];
const MAX_RESTART_ATTEMPTS = 5;

// Status tracking
let serverStatus = {
  lastCheck: null,
  isRunning: false,
  checkCount: 0,
  restartAttempts: 0,
  logs: [],
  startTime: new Date()
};

// Add a log entry
function addLog(message) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}`;
  
  console.log(logEntry);
  
  // Keep only the last 100 log entries
  serverStatus.logs.unshift(logEntry);
  if (serverStatus.logs.length > 100) {
    serverStatus.logs.pop();
  }
}

// Function to check if the main server is running
function checkServer() {
  serverStatus.lastCheck = new Date();
  serverStatus.checkCount++;
  
  addLog(`Performing server check #${serverStatus.checkCount}...`);
  
  // Make a request to the main application
  const req = http.get(APP_URL, (res) => {
    if (res.statusCode === 200) {
      serverStatus.isRunning = true;
      addLog('Server is running normally.');
    } else {
      serverStatus.isRunning = false;
      addLog(`Server responded with status code: ${res.statusCode}`);
      maybeRestartServer();
    }
  });
  
  req.on('error', (err) => {
    serverStatus.isRunning = false;
    addLog(`Failed to connect to server: ${err.message}`);
    maybeRestartServer();
  });
  
  req.setTimeout(5000, () => {
    req.abort();
    serverStatus.isRunning = false;
    addLog('Connection to server timed out.');
    maybeRestartServer();
  });
}

// Function to attempt server restart
function maybeRestartServer() {
  if (serverStatus.restartAttempts >= MAX_RESTART_ATTEMPTS) {
    addLog(`Maximum restart attempts (${MAX_RESTART_ATTEMPTS}) reached. Not attempting restart.`);
    return;
  }
  
  serverStatus.restartAttempts++;
  
  addLog(`Attempting to restart server (attempt ${serverStatus.restartAttempts}/${MAX_RESTART_ATTEMPTS})...`);
  
  const restartProcess = spawn(RESTART_COMMAND, RESTART_ARGS, {
    detached: true,
    stdio: 'ignore'
  });
  
  // Detach the process so it runs independently
  restartProcess.unref();
  
  addLog('Restart command sent. Will check server again on next cycle.');
}

// Create the monitor server
const server = http.createServer((req, res) => {
  if (req.url === '/') {
    // Serve HTML status page
    res.writeHead(200, { 'Content-Type': 'text/html' });
    
    const uptime = Math.floor((new Date() - serverStatus.startTime) / 1000);
    const uptimeStr = `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${uptime % 60}s`;
    
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Recurrer Server Monitor</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; }
          h1 { color: #2c3e50; }
          .status { padding: 10px; border-radius: 4px; margin-bottom: 20px; }
          .status.running { background-color: #d5f5e3; color: #1e8449; }
          .status.stopped { background-color: #f5b7b1; color: #922b21; }
          .info { margin-bottom: 20px; }
          .info-item { margin-bottom: 8px; }
          .logs { background-color: #f9f9f9; padding: 10px; border-radius: 4px; height: 300px; overflow-y: auto; }
          .log-entry { margin-bottom: 5px; font-family: monospace; font-size: 0.9em; }
          .actions { margin-top: 20px; }
          button { padding: 8px 16px; background-color: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer; }
          button:hover { background-color: #2980b9; }
        </style>
        <script>
          function refreshPage() {
            location.reload();
          }
          
          // Auto-refresh every 10 seconds
          setTimeout(refreshPage, 10000);
        </script>
      </head>
      <body>
        <h1>Recurrer Server Monitor</h1>
        
        <div class="status ${serverStatus.isRunning ? 'running' : 'stopped'}">
          Server is currently <strong>${serverStatus.isRunning ? 'RUNNING' : 'NOT RESPONDING'}</strong>
        </div>
        
        <div class="info">
          <div class="info-item"><strong>Monitor Uptime:</strong> ${uptimeStr}</div>
          <div class="info-item"><strong>Last Check:</strong> ${serverStatus.lastCheck ? serverStatus.lastCheck.toISOString() : 'Never'}</div>
          <div class="info-item"><strong>Check Count:</strong> ${serverStatus.checkCount}</div>
          <div class="info-item"><strong>Restart Attempts:</strong> ${serverStatus.restartAttempts}</div>
          <div class="info-item"><strong>System Memory:</strong> ${Math.round(os.freemem() / 1024 / 1024)}MB free of ${Math.round(os.totalmem() / 1024 / 1024)}MB</div>
          <div class="info-item"><strong>System Uptime:</strong> ${Math.floor(os.uptime() / 3600)} hours</div>
        </div>
        
        <h2>Monitor Logs</h2>
        <div class="logs">
          ${serverStatus.logs.map(log => `<div class="log-entry">${log}</div>`).join('')}
        </div>
        
        <div class="actions">
          <button onclick="refreshPage()">Refresh Now</button>
        </div>
      </body>
      </html>
    `;
    
    res.end(html);
  } else if (req.url === '/api/status') {
    // Serve JSON status
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      monitor: {
        uptime: Math.floor((new Date() - serverStatus.startTime) / 1000),
        startTime: serverStatus.startTime,
        checkCount: serverStatus.checkCount,
        lastCheck: serverStatus.lastCheck,
        restartAttempts: serverStatus.restartAttempts
      },
      server: {
        isRunning: serverStatus.isRunning,
        url: APP_URL
      },
      system: {
        platform: os.platform(),
        arch: os.arch(),
        totalMemory: os.totalmem(),
        freeMemory: os.freemem(),
        uptime: os.uptime()
      },
      recentLogs: serverStatus.logs.slice(0, 10)
    }));
  } else {
    // Not found
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

// Start the monitor server
server.listen(MONITOR_PORT, '0.0.0.0', () => {
  addLog(`Monitor server started on port ${MONITOR_PORT}`);
  
  // Perform initial server check
  checkServer();
  
  // Schedule regular checks
  setInterval(checkServer, CHECK_INTERVAL);
});

// Handle errors
server.on('error', (err) => {
  console.error(`Monitor server error: ${err.message}`);
});

// Keep process running
process.on('uncaughtException', (err) => {
  addLog(`Uncaught exception: ${err.message}`);
});

process.on('unhandledRejection', (reason, promise) => {
  addLog(`Unhandled rejection at ${promise}. Reason: ${reason}`);
});