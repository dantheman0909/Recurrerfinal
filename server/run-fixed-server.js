// This supervisor script ensures that the server process keeps running
// It restarts the server if it crashes

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('Starting server supervisor...');

function startServer() {
  // Set NODE_ENV to development
  const env = { ...process.env, NODE_ENV: 'development' };
  
  // Use tsx to run the TypeScript server file
  const serverProcess = spawn('npx', ['tsx', join(__dirname, 'stable-server.ts')], {
    env,
    stdio: 'inherit'
  });
  
  console.log(`Server process started with PID: ${serverProcess.pid}`);
  
  // Handle server process exit
  serverProcess.on('exit', (code, signal) => {
    console.log(`Server process exited with code ${code} and signal ${signal}`);
    console.log('Restarting server in 3 seconds...');
    setTimeout(startServer, 3000);
  });
  
  // Handle unexpected errors
  serverProcess.on('error', (err) => {
    console.error('Failed to start server process:', err);
    console.log('Attempting to restart server in 3 seconds...');
    setTimeout(startServer, 3000);
  });
}

// Handle supervisor process signals
process.on('SIGINT', () => {
  console.log('Supervisor received SIGINT, shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Supervisor received SIGTERM, shutting down...');
  process.exit(0);
});

// Start the server initially
startServer();

// Keep the supervisor process alive
setInterval(() => {
  console.log('Supervisor heartbeat - ensuring server is running');
}, 60000);