/**
 * Health monitoring server for the Recurrer platform
 * This provides a separate web interface for monitoring and managing the app
 */

const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

// Configuration
const PORT = 5050;
const MAIN_APP_PORT = 5000;
const MAIN_HEALTH_CHECK_URL = `http://localhost:${MAIN_APP_PORT}/health`;
const LOG_FILE = 'health-monitor.log';
const APP_LOG_FILES = [
  'server-supervisor.log',
  'server-reliable.log',
  'database-connection.log',
  'data-sync.log'
];
const MAX_LOG_LINES = 500;

// State tracking
let lastHealthCheck = null;
let healthCheckStatus = null;
let isRestarting = false;

// Setup logging
function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}`;
  
  console.log(logMessage);
  
  // Also append to log file
  try {
    fs.appendFileSync(LOG_FILE, logMessage + '\n');
  } catch (err) {
    console.error(`Failed to write to log file: ${err.message}`);
  }
}

// Initialize log file
function initLog() {
  try {
    const header = `
==========================================================
  Recurrer Health Monitor - Started ${new Date().toISOString()}
==========================================================
`;
    fs.writeFileSync(LOG_FILE, header);
    log('Health monitor initialized');
  } catch (err) {
    console.error(`Failed to initialize log file: ${err.message}`);
  }
}

// Check the health of the main application
async function checkMainAppHealth() {
  return new Promise((resolve) => {
    const request = http.get(MAIN_HEALTH_CHECK_URL, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const status = res.statusCode === 200 ? 'healthy' : 'unhealthy';
          let details = {};
          
          try {
            details = JSON.parse(data);
          } catch (err) {
            log(`Failed to parse health check response: ${err.message}`, 'warn');
          }
          
          lastHealthCheck = new Date();
          healthCheckStatus = {
            status,
            statusCode: res.statusCode,
            details,
            timestamp: lastHealthCheck
          };
          
          resolve(healthCheckStatus);
        } catch (err) {
          log(`Error processing health check response: ${err.message}`, 'error');
          healthCheckStatus = {
            status: 'error',
            error: err.message,
            timestamp: new Date()
          };
          resolve(healthCheckStatus);
        }
      });
    });
    
    request.setTimeout(5000, () => {
      log('Health check request timed out', 'warn');
      request.destroy();
      
      lastHealthCheck = new Date();
      healthCheckStatus = {
        status: 'timeout',
        error: 'Request timed out after 5 seconds',
        timestamp: lastHealthCheck
      };
      
      resolve(healthCheckStatus);
    });
    
    request.on('error', (err) => {
      log(`Health check request failed: ${err.message}`, 'error');
      
      lastHealthCheck = new Date();
      healthCheckStatus = {
        status: 'error',
        error: err.message,
        timestamp: lastHealthCheck
      };
      
      resolve(healthCheckStatus);
    });
  });
}

// Restart the main application
function restartMainApp() {
  if (isRestarting) {
    log('Already restarting, ignoring duplicate request');
    return Promise.resolve(false);
  }
  
  isRestarting = true;
  log('Restarting main application...');
  
  return new Promise((resolve) => {
    exec('killall node || true', (error, stdout, stderr) => {
      if (error) {
        log(`Error killing existing processes: ${error.message}`, 'error');
      }
      
      log('Starting main application...');
      
      // This command is intentionally run in the background
      exec('nohup node run-reliable-server.js > run-reliable-server.log 2>&1 &', (error, stdout, stderr) => {
        if (error) {
          log(`Error starting main application: ${error.message}`, 'error');
          isRestarting = false;
          resolve(false);
          return;
        }
        
        log('Main application restart initiated');
        
        // Give it some time to start up
        setTimeout(() => {
          checkMainAppHealth().then(() => {
            isRestarting = false;
            resolve(true);
          });
        }, 5000);
      });
    });
  });
}

// Read log files
function readLogFile(filename, maxLines = MAX_LOG_LINES) {
  try {
    if (!fs.existsSync(filename)) {
      return `Log file ${filename} does not exist`;
    }
    
    const content = fs.readFileSync(filename, 'utf8');
    const lines = content.split('\n');
    
    // Return only the last N lines
    return lines.slice(-maxLines).join('\n');
  } catch (err) {
    return `Error reading log file: ${err.message}`;
  }
}

// Setup the HTTP server for the health monitor
function setupServer() {
  const app = express();
  
  // Serve static files from a 'monitor' directory if it exists
  const staticDir = path.join(__dirname, '../monitor');
  if (fs.existsSync(staticDir)) {
    app.use(express.static(staticDir));
  }
  
  // API routes
  app.get('/api/health', async (req, res) => {
    const mainAppHealth = await checkMainAppHealth();
    
    res.json({
      monitor: {
        status: 'running',
        uptime: process.uptime(),
        startTime: new Date(Date.now() - process.uptime() * 1000).toISOString()
      },
      mainApp: mainAppHealth
    });
  });
  
  app.post('/api/restart', async (req, res) => {
    const result = await restartMainApp();
    res.json({ success: result });
  });
  
  app.get('/api/logs/:filename', (req, res) => {
    const filename = req.params.filename;
    
    // Security check - only allow specific log files
    if (!APP_LOG_FILES.includes(filename) && filename !== LOG_FILE) {
      return res.status(404).send('Log file not found');
    }
    
    const content = readLogFile(filename);
    res.set('Content-Type', 'text/plain');
    res.send(content);
  });
  
  app.get('/api/logs', (req, res) => {
    const logFiles = {};
    
    // Add this monitor's log file
    logFiles[LOG_FILE] = readLogFile(LOG_FILE);
    
    // Add all app log files that exist
    for (const filename of APP_LOG_FILES) {
      if (fs.existsSync(filename)) {
        logFiles[filename] = readLogFile(filename);
      }
    }
    
    res.json({ logFiles });
  });
  
  // HTML interface for the health monitor
  app.get('/', (req, res) => {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recurrer Health Monitor</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      margin: 0;
      padding: 20px;
      color: #333;
    }
    header {
      background-color: #f4f4f4;
      padding: 10px 20px;
      margin-bottom: 20px;
      border-radius: 5px;
    }
    h1 {
      margin: 0;
      color: #444;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    .status-card {
      background-color: #fff;
      border-radius: 5px;
      padding: 15px;
      margin-bottom: 20px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    .status-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #eee;
      padding-bottom: 10px;
      margin-bottom: 15px;
    }
    .status-title {
      margin: 0;
      font-size: 18px;
      color: #333;
    }
    .status-indicator {
      display: inline-block;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      margin-right: 5px;
    }
    .status-healthy {
      background-color: #28a745;
    }
    .status-unhealthy {
      background-color: #dc3545;
    }
    .status-warning {
      background-color: #ffc107;
    }
    .status-unknown {
      background-color: #6c757d;
    }
    .status-label {
      display: inline-block;
      padding: 5px 10px;
      border-radius: 3px;
      font-size: 14px;
      font-weight: bold;
      text-transform: uppercase;
    }
    .status-label-healthy {
      background-color: #d4edda;
      color: #155724;
    }
    .status-label-unhealthy {
      background-color: #f8d7da;
      color: #721c24;
    }
    .status-label-warning {
      background-color: #fff3cd;
      color: #856404;
    }
    .status-label-unknown {
      background-color: #e2e3e5;
      color: #383d41;
    }
    .status-detail {
      margin-bottom: 10px;
    }
    .status-property {
      font-weight: bold;
      margin-right: 5px;
    }
    button {
      padding: 8px 16px;
      background-color: #007bff;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      margin-right: 10px;
    }
    button:hover {
      background-color: #0069d9;
    }
    button:disabled {
      background-color: #cccccc;
      cursor: not-allowed;
    }
    .log-container {
      margin-top: 20px;
    }
    .log-tabs {
      display: flex;
      border-bottom: 1px solid #ddd;
      margin-bottom: 15px;
    }
    .log-tab {
      padding: 8px 16px;
      cursor: pointer;
      background-color: #f8f9fa;
      border: 1px solid #ddd;
      border-bottom: none;
      margin-right: 5px;
      border-top-left-radius: 4px;
      border-top-right-radius: 4px;
    }
    .log-tab.active {
      background-color: #fff;
      border-bottom: 2px solid #fff;
      margin-bottom: -1px;
      font-weight: bold;
    }
    .log-content {
      background-color: #f8f9fa;
      border: 1px solid #ddd;
      padding: 15px;
      height: 400px;
      overflow: auto;
      font-family: monospace;
      white-space: pre-wrap;
      font-size: 12px;
      line-height: 1.4;
    }
    .actions {
      margin: 15px 0;
    }
    .refresh-timer {
      font-size: 12px;
      color: #666;
      margin-left: 10px;
    }
    @media (max-width: 768px) {
      .container {
        padding: 0 10px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>Recurrer Health Monitor</h1>
    </header>
    
    <div class="status-card" id="monitor-status">
      <div class="status-header">
        <h2 class="status-title">Monitor Status</h2>
        <span class="status-label status-label-healthy">Running</span>
      </div>
      <div class="status-details">
        <div class="status-detail">
          <span class="status-property">Uptime:</span>
          <span id="monitor-uptime">Loading...</span>
        </div>
        <div class="status-detail">
          <span class="status-property">Started:</span>
          <span id="monitor-started">Loading...</span>
        </div>
      </div>
    </div>
    
    <div class="status-card" id="app-status">
      <div class="status-header">
        <h2 class="status-title">Main Application Status</h2>
        <span id="app-status-label" class="status-label status-label-unknown">Unknown</span>
      </div>
      <div class="status-details">
        <div class="status-detail">
          <span class="status-property">Status:</span>
          <span id="app-status-value">Loading...</span>
        </div>
        <div class="status-detail">
          <span class="status-property">Last Check:</span>
          <span id="app-last-check">Loading...</span>
        </div>
        <div class="status-detail">
          <span class="status-property">Uptime:</span>
          <span id="app-uptime">Loading...</span>
        </div>
        <div class="status-detail">
          <span class="status-property">Database:</span>
          <span id="app-database">Loading...</span>
        </div>
      </div>
    </div>
    
    <div class="actions">
      <button id="refresh-button" onclick="checkHealth()">Refresh Status</button>
      <button id="restart-button" onclick="restartApp()">Restart Application</button>
      <span id="refresh-timer" class="refresh-timer">Auto refresh in 30s</span>
    </div>
    
    <div class="log-container">
      <h2>Application Logs</h2>
      <div class="log-tabs" id="log-tabs"></div>
      <div class="log-content" id="log-content">Select a log file to view</div>
    </div>
  </div>
  
  <script>
    let healthCheckTimer;
    let refreshCountdown;
    let countdownValue = 30;
    let activeLogTab = null;
    let isRestarting = false;
    
    // Initialize the page
    window.onload = function() {
      // Initial health check
      checkHealth();
      
      // Start the auto-refresh timer
      startRefreshTimer();
      
      // Load log files
      loadLogFiles();
    };
    
    // Format a date string
    function formatDate(dateStr) {
      const date = new Date(dateStr);
      return date.toLocaleString();
    }
    
    // Format seconds into a human-readable duration
    function formatDuration(seconds) {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = Math.floor(seconds % 60);
      
      let result = '';
      if (hours > 0) result += \`\${hours}h \`;
      if (minutes > 0 || hours > 0) result += \`\${minutes}m \`;
      result += \`\${secs}s\`;
      
      return result;
    }
    
    // Check the health of the applications
    async function checkHealth() {
      try {
        const response = await fetch('/api/health');
        const data = await response.json();
        
        // Update monitor status
        document.getElementById('monitor-uptime').textContent = formatDuration(data.monitor.uptime);
        document.getElementById('monitor-started').textContent = formatDate(data.monitor.startTime);
        
        // Update app status
        const appStatus = data.mainApp.status;
        const statusLabel = document.getElementById('app-status-label');
        
        statusLabel.className = 'status-label';
        if (appStatus === 'healthy') {
          statusLabel.classList.add('status-label-healthy');
          statusLabel.textContent = 'Healthy';
        } else if (appStatus === 'unhealthy') {
          statusLabel.classList.add('status-label-unhealthy');
          statusLabel.textContent = 'Unhealthy';
        } else if (appStatus === 'timeout') {
          statusLabel.classList.add('status-label-warning');
          statusLabel.textContent = 'Timeout';
        } else {
          statusLabel.classList.add('status-label-unknown');
          statusLabel.textContent = 'Unknown';
        }
        
        document.getElementById('app-status-value').textContent = data.mainApp.status;
        document.getElementById('app-last-check').textContent = formatDate(data.mainApp.timestamp);
        
        if (data.mainApp.details && data.mainApp.details.uptime) {
          document.getElementById('app-uptime').textContent = formatDuration(data.mainApp.details.uptime);
        } else {
          document.getElementById('app-uptime').textContent = 'N/A';
        }
        
        if (data.mainApp.details && data.mainApp.details.database) {
          const dbStatus = data.mainApp.details.database.success ? 'Connected' : 'Disconnected';
          document.getElementById('app-database').textContent = dbStatus;
        } else {
          document.getElementById('app-database').textContent = 'Unknown';
        }
        
      } catch (error) {
        console.error('Error checking health:', error);
      }
    }
    
    // Restart the main application
    async function restartApp() {
      if (isRestarting) return;
      
      isRestarting = true;
      const restartButton = document.getElementById('restart-button');
      restartButton.textContent = 'Restarting...';
      restartButton.disabled = true;
      
      try {
        const response = await fetch('/api/restart', { method: 'POST' });
        const data = await response.json();
        
        if (data.success) {
          alert('Application restart initiated. Please wait for it to come back online.');
        } else {
          alert('Failed to restart the application. Check the logs for details.');
        }
        
      } catch (error) {
        console.error('Error restarting application:', error);
        alert(\`Error restarting application: \${error.message}\`);
      } finally {
        // Re-enable the button after a delay
        setTimeout(() => {
          isRestarting = false;
          restartButton.textContent = 'Restart Application';
          restartButton.disabled = false;
          
          // Check health after restart
          checkHealth();
        }, 10000);
      }
    }
    
    // Start the auto-refresh timer
    function startRefreshTimer() {
      // Clear any existing timers
      if (healthCheckTimer) clearTimeout(healthCheckTimer);
      if (refreshCountdown) clearInterval(refreshCountdown);
      
      // Reset countdown
      countdownValue = 30;
      document.getElementById('refresh-timer').textContent = \`Auto refresh in \${countdownValue}s\`;
      
      // Start countdown
      refreshCountdown = setInterval(() => {
        countdownValue--;
        document.getElementById('refresh-timer').textContent = \`Auto refresh in \${countdownValue}s\`;
        
        if (countdownValue <= 0) {
          clearInterval(refreshCountdown);
        }
      }, 1000);
      
      // Schedule health check
      healthCheckTimer = setTimeout(() => {
        checkHealth();
        startRefreshTimer();
      }, 30000);
    }
    
    // Load available log files
    async function loadLogFiles() {
      try {
        const response = await fetch('/api/logs');
        const data = await response.json();
        
        const logTabs = document.getElementById('log-tabs');
        logTabs.innerHTML = '';
        
        // Create tabs for each log file
        Object.keys(data.logFiles).forEach(filename => {
          const tab = document.createElement('div');
          tab.className = 'log-tab';
          tab.textContent = filename;
          tab.onclick = () => showLogContent(filename);
          logTabs.appendChild(tab);
        });
        
        // Show the first log by default
        if (Object.keys(data.logFiles).length > 0) {
          showLogContent(Object.keys(data.logFiles)[0]);
        }
        
      } catch (error) {
        console.error('Error loading log files:', error);
      }
    }
    
    // Show log content for a specific file
    async function showLogContent(filename) {
      try {
        // Update active tab
        const tabs = document.getElementsByClassName('log-tab');
        for (let i = 0; i < tabs.length; i++) {
          tabs[i].classList.remove('active');
          if (tabs[i].textContent === filename) {
            tabs[i].classList.add('active');
          }
        }
        
        activeLogTab = filename;
        
        // Fetch log content
        const response = await fetch(\`/api/logs/\${filename}\`);
        const content = await response.text();
        
        // Update log content
        const logContent = document.getElementById('log-content');
        logContent.textContent = content;
        
        // Scroll to bottom
        logContent.scrollTop = logContent.scrollHeight;
        
      } catch (error) {
        console.error(\`Error showing log content for \${filename}:\`, error);
      }
    }
    
    // Refresh log content periodically
    setInterval(() => {
      if (activeLogTab) {
        showLogContent(activeLogTab);
      }
    }, 10000);
  </script>
</body>
</html>
    `;
    
    res.send(html);
  });
  
  // Start the server
  const server = http.createServer(app);
  
  server.listen(PORT, '0.0.0.0', () => {
    log(`Health monitor listening on port ${PORT}`);
  });
  
  server.on('error', (err) => {
    log(`Health monitor server error: ${err.message}`, 'error');
  });
  
  return server;
}

// Schedule health checks
function scheduleHealthChecks() {
  // Check health immediately
  checkMainAppHealth().catch(err => {
    log(`Initial health check failed: ${err.message}`, 'error');
  });
  
  // Schedule regular health checks
  setInterval(() => {
    checkMainAppHealth().catch(err => {
      log(`Health check failed: ${err.message}`, 'error');
    });
  }, 30000); // Every 30 seconds
}

// Initialize everything
function init() {
  initLog();
  setupServer();
  scheduleHealthChecks();
}

// Initialize on startup
init();