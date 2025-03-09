/**
 * Simple Express server for the Zombie Survival Game
 * 
 * This file creates a basic HTTP server to serve the game files
 * with proper MIME types for ES modules.
 * 
 * Example usage: Run with 'node server.js' and access at http://localhost:3000
 */

const express = require('express');
const path = require('path');
const app = express();
const port = 3000;

// Serve static files from the root directory
app.use(express.static(__dirname, {
  setHeaders: (res, path) => {
    // Set proper MIME type for JavaScript modules
    if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
  }
}));

// Start the server
app.listen(port, () => {
  console.log(`Zombie Survival Game running at http://localhost:${port}`);
}); 