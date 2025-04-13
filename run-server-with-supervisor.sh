#!/bin/bash

# Make the script executable
chmod +x run-server-with-supervisor.sh

echo "Starting Recurrer server with supervisor..."

# Start the supervisor
node keep-alive.js