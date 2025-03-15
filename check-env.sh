#!/bin/bash

# Script to check the current environment variables
# This script displays the current NODE_ENV and other relevant environment variables

echo "=== Environment Variables Check ==="
echo "NODE_ENV: ${NODE_ENV:-not set}"
echo "Current directory: $(pwd)"
echo "Node.js version: $(node -v)"
echo "NPM version: $(npm -v)"
echo "=== End of Environment Check ===" 