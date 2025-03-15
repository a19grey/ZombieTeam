#!/bin/bash

# Script to run the server in production mode
# This script explicitly sets the NODE_ENV environment variable

echo "Starting server in PRODUCTION mode..."
echo "Setting NODE_ENV=production"

# Kill any existing Node.js processes (optional, uncomment if needed)
pkill -f node || true

# Set environment variable and run server
export NODE_ENV=production
echo "NODE_ENV is set to: $NODE_ENV"
node server.js