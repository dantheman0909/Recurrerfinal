#!/bin/bash

# Make the script executable
chmod +x run-standalone.sh

echo "Starting Recurrer standalone server..."

# Run the standalone server
NODE_ENV=development node server/standalone-server.js