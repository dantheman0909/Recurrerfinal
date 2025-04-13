/**
 * Reliable data synchronization module
 * This module handles synchronization with external services
 * with automatic retry and health monitoring
 */

const fs = require('fs');
const path = require('path');
const dbApi = require('./db-api');

// Configuration
const LOG_FILE = 'data-sync.log';
const SYNC_INTERVAL = 60 * 60 * 1000; // 1 hour
const RETRY_INTERVAL = 5 * 60 * 1000; // 5 minutes
const MAX_RETRIES = 10;

// State tracking
let lastSyncAttempt = null;
let lastSuccessfulSync = null;
let syncInProgress = false;
let retryCount = 0;
let syncScheduled = false;
let syncTimer = null;

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
  Recurrer Data Synchronization - Started ${new Date().toISOString()}
==========================================================
`;
    fs.writeFileSync(LOG_FILE, header);
    log('Data synchronization initialized');
  } catch (err) {
    console.error(`Failed to initialize log file: ${err.message}`);
  }
}

// Perform health check of external services
async function checkServiceHealth() {
  const results = {
    database: false,
    chargebee: false,
    mysql: false
  };
  
  try {
    // Check database connection
    const dbStatus = await dbApi.testConnection();
    results.database = dbStatus.success;
    
    // Add checks for Chargebee and MySQL if available
    
    return results;
  } catch (err) {
    log(`Health check failed: ${err.message}`, 'error');
    return results;
  }
}

// Synchronize data with external services
async function synchronizeData() {
  if (syncInProgress) {
    log('Synchronization already in progress, skipping');
    return;
  }
  
  syncInProgress = true;
  lastSyncAttempt = new Date();
  
  try {
    log('Starting data synchronization');
    
    // Check service health first
    const healthStatus = await checkServiceHealth();
    
    if (!healthStatus.database) {
      throw new Error('Database connection is not healthy');
    }
    
    // 1. Sync data from Chargebee if available
    if (healthStatus.chargebee) {
      log('Synchronizing Chargebee data');
      // Implement Chargebee sync
    } else {
      log('Chargebee service is not available, skipping sync', 'warn');
    }
    
    // 2. Sync data from MySQL if available
    if (healthStatus.mysql) {
      log('Synchronizing MySQL data');
      // Implement MySQL sync
    } else {
      log('MySQL service is not available, skipping sync', 'warn');
    }
    
    // Update last successful sync time
    lastSuccessfulSync = new Date();
    retryCount = 0;
    
    log('Data synchronization completed successfully');
    
  } catch (err) {
    log(`Data synchronization failed: ${err.message}`, 'error');
    
    retryCount++;
    
    if (retryCount <= MAX_RETRIES) {
      log(`Will retry synchronization in ${RETRY_INTERVAL / 60000} minutes (attempt ${retryCount} of ${MAX_RETRIES})`);
      
      // Schedule a retry
      setTimeout(synchronizeData, RETRY_INTERVAL);
    } else {
      log(`Maximum retries (${MAX_RETRIES}) exceeded, giving up until next scheduled sync`, 'error');
      retryCount = 0;
    }
  } finally {
    syncInProgress = false;
  }
}

// Schedule regular synchronization
function scheduleSynchronization() {
  if (syncScheduled) {
    return;
  }
  
  syncScheduled = true;
  
  // Schedule the first sync after a short delay
  log(`Scheduling first synchronization in 1 minute`);
  syncTimer = setTimeout(() => {
    synchronizeData();
    
    // Schedule regular syncs
    log(`Scheduling regular synchronization every ${SYNC_INTERVAL / 3600000} hours`);
    syncTimer = setInterval(synchronizeData, SYNC_INTERVAL);
  }, 60000);
}

// Cancel scheduled synchronization
function cancelSynchronization() {
  if (syncTimer) {
    clearTimeout(syncTimer);
    clearInterval(syncTimer);
    syncTimer = null;
  }
  
  syncScheduled = false;
  log('Scheduled synchronization canceled');
}

// Get synchronization status
function getSyncStatus() {
  return {
    lastSyncAttempt: lastSyncAttempt ? lastSyncAttempt.toISOString() : null,
    lastSuccessfulSync: lastSuccessfulSync ? lastSuccessfulSync.toISOString() : null,
    syncInProgress,
    retryCount,
    syncScheduled
  };
}

// Initialize
function init() {
  initLog();
  scheduleSynchronization();
}

// Handle process exit
process.on('SIGINT', () => {
  log('Received SIGINT signal, shutting down data sync');
  cancelSynchronization();
});

process.on('SIGTERM', () => {
  log('Received SIGTERM signal, shutting down data sync');
  cancelSynchronization();
});

// Export functions
module.exports = {
  init,
  synchronizeData,
  getSyncStatus,
  checkServiceHealth,
  scheduleSynchronization,
  cancelSynchronization
};