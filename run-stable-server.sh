#!/bin/bash

echo "Starting Recurrer persistent server with supervisor..."

# Function to start the supervisor
start_supervisor() {
  NODE_ENV=development node server/run-persistent-server.js
}

# Start the supervisor
start_supervisor