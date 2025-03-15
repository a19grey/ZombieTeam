#!/bin/bash

# Script to run the server in development mode
# This script explicitly sets the NODE_ENV environment variable

echo "Starting server in DEVELOPMENT mode..."
echo "Setting NODE_ENV=development"

# Kill any existing Node.js processes (optional, uncomment if needed)
pkill -f node || true

# Set environment variable and run server
export NODE_ENV=development
./check-env.sh
node server.js