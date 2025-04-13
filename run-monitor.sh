#!/bin/bash

# Make this script executable
chmod +x run-monitor.sh

echo "Starting Recurrer server monitor..."

# Start the monitor in the background
node server-watch.js &

# Store the PID of the monitor
MONITOR_PID=$!

echo "Monitor started with PID: $MONITOR_PID"
echo "Monitor is accessible at http://localhost:5099"
echo "Press Ctrl+C to stop the monitor"

# Wait for the monitor to exit
wait $MONITOR_PID