/**
 * Health monitoring server for the Recurrer platform
 * This provides a separate web interface for monitoring and managing the app
 */

import express from 'express';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

// ES Module compatibility fixes
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const MONITOR_PORT = 5050;
const MAIN_APP_PORT = 5000;
const MAIN_APP_HEALTH_URL = `http://localhost:${MAIN_APP_PORT}/health`;
const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
const LOG_DIR = path.join(__dirname, '..', 'logs');
const MAX_LOG_LINES = 1000;

// State tracking
let serverStatus = {
  lastCheck: null,
  isUp: false,
  statusCode: null,
  responseTime: null,
  lastResponse: null,
  databaseStatus: null,
  restartAttempts: 0,
  checkCount: 0
};

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Log levels
const LOG_LEVELS = {
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  DEBUG: 'debug'
};

// Log file paths
const LOG_FILES = {
  INFO: path.join(LOG_DIR, 'monitor-info.log'),
  ERROR: path.join(LOG_DIR, 'monitor-error.log'),
  DEBUG: path.join(LOG_DIR, 'monitor-debug.log')
};

// Initialize log files
function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
  
  // Log to console
  if (level === LOG_LEVELS.ERROR) {
    console.error(logMessage);
  } else {
    console.log(logMessage);
  }
  
  // Log to file
  try {
    if (level === LOG_LEVELS.ERROR) {
      fs.appendFileSync(LOG_FILES.ERROR, logMessage);
    } else if (level === LOG_LEVELS.DEBUG) {
      fs.appendFileSync(LOG_FILES.DEBUG, logMessage);
    } else {
      fs.appendFileSync(LOG_FILES.INFO, logMessage);
    }
  } catch (err) {
    console.error(`Failed to write to log file: ${err.message}`);
  }
}

// Initialize log files
function initLog() {
  try {
    // Ensure all log files exist
    for (const logFile of Object.values(LOG_FILES)) {
      if (!fs.existsSync(logFile)) {
        fs.writeFileSync(logFile, '');
      }
    }
    log('Log system initialized');
  } catch (err) {
    console.error(`Failed to initialize log system: ${err.message}`);
  }
}

// Check main app health
async function checkMainAppHealth() {
  const startTime = Date.now();
  serverStatus.checkCount++;
  
  log(`Performing health check #${serverStatus.checkCount}...`, LOG_LEVELS.DEBUG);
  
  try {
    const res = await fetch(MAIN_APP_HEALTH_URL, { timeout: 5000 });
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    serverStatus.lastCheck = new Date();
    serverStatus.responseTime = responseTime;
    serverStatus.statusCode = res.status;
    
    if (res.status === 200) {
      const data = await res.json();
      serverStatus.isUp = true;
      serverStatus.lastResponse = data;
      serverStatus.databaseStatus = data.database;
      
      log(`Health check successful: ${res.status} in ${responseTime}ms`);
      
      // Reset restart attempts on successful check
      serverStatus.restartAttempts = 0;
    } else {
      serverStatus.isUp = false;
      log(`Unhealthy status from main app: ${res.status}`, LOG_LEVELS.WARN);
      
      // Consider restarting the server
      if (serverStatus.restartAttempts < 3) {
        restartMainApp();
      } else {
        log('Too many restart attempts, skipping auto-restart', LOG_LEVELS.ERROR);
      }
    }
  } catch (err) {
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    serverStatus.lastCheck = new Date();
    serverStatus.isUp = false;
    serverStatus.responseTime = responseTime;
    serverStatus.statusCode = null;
    
    log(`Health check failed: ${err.message}`, LOG_LEVELS.ERROR);
    
    // Consider restarting the server
    if (serverStatus.restartAttempts < 3) {
      restartMainApp();
    } else {
      log('Too many restart attempts, skipping auto-restart', LOG_LEVELS.ERROR);
    }
  }
}

// Restart the main app via workflow
function restartMainApp() {
  serverStatus.restartAttempts++;
  
  log(`Attempting to restart main app (attempt #${serverStatus.restartAttempts})...`, LOG_LEVELS.WARN);
  
  try {
    // Using curl to trigger Replit workflow restart
    const restart = spawn('curl', [
      '-X', 'POST', 
      'https://replit.com/@$REPL_OWNER/$REPL_SLUG/api/v1/workflows/restarts/Start%20application'
    ]);
    
    restart.stdout.on('data', (data) => {
      log(`Restart stdout: ${data.toString().trim()}`, LOG_LEVELS.DEBUG);
    });
    
    restart.stderr.on('data', (data) => {
      log(`Restart stderr: ${data.toString().trim()}`, LOG_LEVELS.DEBUG);
    });
    
    restart.on('exit', (code) => {
      log(`Restart command exited with code ${code}`, code === 0 ? LOG_LEVELS.INFO : LOG_LEVELS.ERROR);
    });
    
    log('Restart command sent successfully');
  } catch (err) {
    log(`Failed to restart main app: ${err.message}`, LOG_LEVELS.ERROR);
  }
}

// Read log file and return the latest lines
function readLogFile(filename, maxLines = MAX_LOG_LINES) {
  try {
    if (!fs.existsSync(filename)) {
      return [];
    }
    
    const content = fs.readFileSync(filename, 'utf8');
    const lines = content.split('\n').filter(Boolean);
    
    // Return the last N lines
    return lines.slice(-maxLines);
  } catch (err) {
    log(`Error reading log file ${filename}: ${err.message}`, LOG_LEVELS.ERROR);
    return [];
  }
}

// Setup Express server for the monitoring dashboard
function setupServer() {
  const app = express();
  
  // Basic middlewares
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  
  // Request logging
  app.use((req, res, next) => {
    log(`${req.method} ${req.url}`, LOG_LEVELS.DEBUG);
    next();
  });
  
  // API endpoint to get server status
  app.get('/api/status', (req, res) => {
    res.json({
      ...serverStatus,
      monitorUptime: process.uptime(),
      time: new Date().toISOString()
    });
  });
  
  // API endpoint to get logs
  app.get('/api/logs', (req, res) => {
    const logType = req.query.type || 'info';
    let logFile;
    
    switch (logType.toLowerCase()) {
      case 'error':
        logFile = LOG_FILES.ERROR;
        break;
      case 'debug':
        logFile = LOG_FILES.DEBUG;
        break;
      default:
        logFile = LOG_FILES.INFO;
    }
    
    const lines = readLogFile(logFile);
    res.json({ logs: lines });
  });
  
  // API endpoint to trigger a restart of the main app
  app.post('/api/restart', (req, res) => {
    restartMainApp();
    res.json({ success: true, message: 'Restart initiated' });
  });
  
  // API endpoint to force a health check
  app.post('/api/check', async (req, res) => {
    await checkMainAppHealth();
    res.json({ success: true, status: serverStatus });
  });
  
  // HTML dashboard
  app.get('/', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Recurrer Health Monitor</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', sans-serif; margin: 0; padding: 20px; line-height: 1.6; color: #333; }
          .container { max-width: 1200px; margin: 0 auto; }
          .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 10px; }
          .server-status { display: flex; align-items: center; }
          .status-indicator { width: 20px; height: 20px; border-radius: 50%; margin-right: 10px; }
          .status-up { background-color: #4CAF50; }
          .status-down { background-color: #F44336; }
          .status-unknown { background-color: #9E9E9E; }
          .section { margin-bottom: 30px; border: 1px solid #ddd; border-radius: 4px; padding: 15px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          .section-title { margin-top: 0; border-bottom: 1px solid #eee; padding-bottom: 10px; }
          .button { background-color: #2196F3; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; }
          .button:hover { background-color: #0b7dda; }
          .button.danger { background-color: #F44336; }
          .button.danger:hover { background-color: #d32f2f; }
          .button.secondary { background-color: #757575; }
          .button.secondary:hover { background-color: #616161; }
          .log-container { max-height: 400px; overflow-y: auto; background-color: #f5f5f5; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 14px; }
          .log-line { margin: 0; white-space: pre-wrap; }
          .data-table { width: 100%; border-collapse: collapse; }
          .data-table th, .data-table td { text-align: left; padding: 8px; border-bottom: 1px solid #ddd; }
          .data-table th { background-color: #f5f5f5; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Recurrer Health Monitor</h1>
            <div class="server-status">
              <div id="status-indicator" class="status-indicator status-unknown"></div>
              <div id="status-text">Unknown</div>
            </div>
          </div>
          
          <div class="section">
            <h2 class="section-title">Server Status</h2>
            <table class="data-table">
              <tbody id="status-table">
                <tr><td>Loading...</td></tr>
              </tbody>
            </table>
            <div style="margin-top: 15px;">
              <button id="refresh-status" class="button">Refresh Status</button>
              <button id="force-check" class="button secondary">Force Check</button>
              <button id="restart-server" class="button danger">Restart Server</button>
            </div>
          </div>
          
          <div class="section">
            <h2 class="section-title">Logs</h2>
            <div>
              <button class="button" data-log-type="info">Info Logs</button>
              <button class="button" data-log-type="error">Error Logs</button>
              <button class="button" data-log-type="debug">Debug Logs</button>
            </div>
            <div id="log-container" class="log-container">
              <p>Loading logs...</p>
            </div>
          </div>
        </div>
        
        <script>
          // Helper function to format date
          function formatDate(dateString) {
            return new Date(dateString).toLocaleString();
          }
          
          // Update status display
          function updateStatusDisplay(status) {
            const indicator = document.getElementById('status-indicator');
            const statusText = document.getElementById('status-text');
            const statusTable = document.getElementById('status-table');
            
            // Update status indicator
            indicator.className = 'status-indicator ' + (status.isUp ? 'status-up' : 'status-down');
            statusText.textContent = status.isUp ? 'Online' : 'Offline';
            
            // Update status table
            let tableHtml = '';
            
            tableHtml += '<tr><th>Last Check</th><td>' + (status.lastCheck ? formatDate(status.lastCheck) : 'Never') + '</td></tr>';
            tableHtml += '<tr><th>Status</th><td>' + (status.isUp ? 'Online' : 'Offline') + '</td></tr>';
            tableHtml += '<tr><th>Response Time</th><td>' + (status.responseTime ? status.responseTime + 'ms' : 'N/A') + '</td></tr>';
            tableHtml += '<tr><th>HTTP Status</th><td>' + (status.statusCode || 'N/A') + '</td></tr>';
            tableHtml += '<tr><th>Check Count</th><td>' + status.checkCount + '</td></tr>';
            tableHtml += '<tr><th>Restart Attempts</th><td>' + status.restartAttempts + '</td></tr>';
            
            if (status.databaseStatus) {
              tableHtml += '<tr><th>Database Status</th><td>' + (status.databaseStatus.success ? 'Connected' : 'Disconnected') + '</td></tr>';
              if (status.databaseStatus.message) {
                tableHtml += '<tr><th>Database Message</th><td>' + status.databaseStatus.message + '</td></tr>';
              }
            }
            
            if (status.lastResponse && status.lastResponse.uptime) {
              const uptime = status.lastResponse.uptime;
              const days = Math.floor(uptime / 86400);
              const hours = Math.floor((uptime % 86400) / 3600);
              const minutes = Math.floor((uptime % 3600) / 60);
              const seconds = uptime % 60;
              
              let uptimeString = '';
              if (days > 0) uptimeString += days + 'd ';
              if (hours > 0) uptimeString += hours + 'h ';
              if (minutes > 0) uptimeString += minutes + 'm ';
              uptimeString += seconds + 's';
              
              tableHtml += '<tr><th>Server Uptime</th><td>' + uptimeString + '</td></tr>';
            }
            
            if (status.lastResponse && status.lastResponse.memory) {
              const memory = status.lastResponse.memory;
              tableHtml += '<tr><th>RSS Memory</th><td>' + Math.round(memory.rss / 1024 / 1024) + ' MB</td></tr>';
              tableHtml += '<tr><th>Heap Total</th><td>' + Math.round(memory.heapTotal / 1024 / 1024) + ' MB</td></tr>';
              tableHtml += '<tr><th>Heap Used</th><td>' + Math.round(memory.heapUsed / 1024 / 1024) + ' MB</td></tr>';
            }
            
            if (status.lastResponse && status.lastResponse.requests) {
              tableHtml += '<tr><th>Total Requests</th><td>' + status.lastResponse.requests.total + '</td></tr>';
              tableHtml += '<tr><th>API Requests</th><td>' + status.lastResponse.requests.api + '</td></tr>';
            }
            
            statusTable.innerHTML = tableHtml;
          }
          
          // Fetch server status
          async function fetchStatus() {
            try {
              const response = await fetch('/api/status');
              const data = await response.json();
              updateStatusDisplay(data);
            } catch (error) {
              console.error('Error fetching status:', error);
              document.getElementById('status-text').textContent = 'Error: ' + error.message;
            }
          }
          
          // Fetch logs
          async function fetchLogs(type = 'info') {
            try {
              const response = await fetch('/api/logs?type=' + type);
              const data = await response.json();
              
              const logContainer = document.getElementById('log-container');
              logContainer.innerHTML = '';
              
              if (data.logs.length === 0) {
                logContainer.innerHTML = '<p>No logs available</p>';
                return;
              }
              
              data.logs.forEach(line => {
                const logLine = document.createElement('pre');
                logLine.className = 'log-line';
                logLine.textContent = line;
                logContainer.appendChild(logLine);
              });
              
              // Scroll to bottom
              logContainer.scrollTop = logContainer.scrollHeight;
            } catch (error) {
              console.error('Error fetching logs:', error);
              document.getElementById('log-container').innerHTML = '<p>Error loading logs: ' + error.message + '</p>';
            }
          }
          
          // Force health check
          async function forceCheck() {
            try {
              const button = document.getElementById('force-check');
              button.textContent = 'Checking...';
              button.disabled = true;
              
              const response = await fetch('/api/check', { method: 'POST' });
              const data = await response.json();
              
              updateStatusDisplay(data.status);
              
              button.textContent = 'Force Check';
              button.disabled = false;
            } catch (error) {
              console.error('Error forcing check:', error);
              document.getElementById('force-check').textContent = 'Force Check';
              document.getElementById('force-check').disabled = false;
            }
          }
          
          // Restart server
          async function restartServer() {
            if (!confirm('Are you sure you want to restart the server?')) {
              return;
            }
            
            try {
              const button = document.getElementById('restart-server');
              button.textContent = 'Restarting...';
              button.disabled = true;
              
              const response = await fetch('/api/restart', { method: 'POST' });
              const data = await response.json();
              
              alert(data.message || 'Restart initiated successfully');
              
              // Refresh status after a short delay
              setTimeout(fetchStatus, 5000);
              
              button.textContent = 'Restart Server';
              button.disabled = false;
            } catch (error) {
              console.error('Error restarting server:', error);
              document.getElementById('restart-server').textContent = 'Restart Server';
              document.getElementById('restart-server').disabled = false;
            }
          }
          
          // Initialize
          document.addEventListener('DOMContentLoaded', () => {
            // Initial data load
            fetchStatus();
            fetchLogs();
            
            // Setup refresh button
            document.getElementById('refresh-status').addEventListener('click', fetchStatus);
            
            // Setup force check button
            document.getElementById('force-check').addEventListener('click', forceCheck);
            
            // Setup restart button
            document.getElementById('restart-server').addEventListener('click', restartServer);
            
            // Setup log type buttons
            document.querySelectorAll('button[data-log-type]').forEach(button => {
              button.addEventListener('click', () => {
                const logType = button.getAttribute('data-log-type');
                fetchLogs(logType);
              });
            });
            
            // Auto-refresh status every 30 seconds
            setInterval(fetchStatus, 30000);
          });
        </script>
      </body>
      </html>
    `);
  });
  
  // Start HTTP server
  const server = http.createServer(app);
  server.listen(MONITOR_PORT, '0.0.0.0', () => {
    log(`Health monitor server running on http://0.0.0.0:${MONITOR_PORT}`);
  });
  
  // Handle server errors
  server.on('error', (err) => {
    log(`Server error: ${err.message}`, LOG_LEVELS.ERROR);
    if (err.code === 'EADDRINUSE') {
      log(`Port ${MONITOR_PORT} is already in use`, LOG_LEVELS.ERROR);
    }
  });
}

// Schedule health checks
function scheduleHealthChecks() {
  log(`Scheduling health checks every ${HEALTH_CHECK_INTERVAL / 1000} seconds`);
  
  // Initial check
  checkMainAppHealth();
  
  // Regular checks
  setInterval(checkMainAppHealth, HEALTH_CHECK_INTERVAL);
}

// Init function
function init() {
  initLog();
  setupServer();
  scheduleHealthChecks();
  
  // Handle process signals
  process.on('SIGINT', () => {
    log('Received SIGINT, shutting down...', LOG_LEVELS.INFO);
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    log('Received SIGTERM, shutting down...', LOG_LEVELS.INFO);
    process.exit(0);
  });
  
  // Global error handlers
  process.on('uncaughtException', (err) => {
    log(`Uncaught exception: ${err.message}`, LOG_LEVELS.ERROR);
    log(err.stack, LOG_LEVELS.ERROR);
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    log('Unhandled rejection: ' + reason, LOG_LEVELS.ERROR);
  });
}

// Start everything
init();