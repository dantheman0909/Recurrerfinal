/**
 * Runner script for the Recurrer health monitor
 * Simply runs the health monitor in a separate process
 */

const { spawn } = require('child_process');
const path = require('path');

// Start the health monitor
const monitor = spawn('node', [path.join(__dirname, 'server/health-monitor.js')], {
  stdio: 'inherit',
  detached: false
});

monitor.on('error', (err) => {
  console.error(`Failed to start health monitor: ${err.message}`);
  process.exit(1);
});

// Keep the process running
console.log('Health monitor started. Press Ctrl+C to exit.');