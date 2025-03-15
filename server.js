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
const fs = require('fs');
const app = express();
const port = process.env.PORT || 3000;
const alternativePorts = [3001, 3002, 3003, 3004, 3005];

// Get environment from NODE_ENV (default to production if not set)
console.log(`NODE_ENV environment variable: ${process.env.NODE_ENV}`);
const environment = process.env.NODE_ENV;
console.log(`I will soon be Running in ${environment} mode because that is process.env.NODE_ENV value right now`);


// Inject environment variable into index.html
app.get('/', (req, res) => {
  fs.readFile(path.join(__dirname, 'index.html'), 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading index.html:', err);
      return res.status(500).send('Error loading game');
    }
    
    const timestamp = new Date().toISOString();
    
    // Create script content based on environment
    let scriptContent = `
      <script>
        window.APP_ENV = "${environment}";
        window.NODE_ENV = "${environment}";
        window.SERVER_TIMESTAMP = "${timestamp}";
        console.log("Server injected APP_ENV:", "${environment}");
        console.log("Server injected NODE_ENV:", "${environment}");
        console.log("Server timestamp:", "${timestamp}");
      </script>
      <script type="module" src="./src/debugCheck.js"></script>`;
    
    // Only include envCheck.js in development mode
    if (environment === 'development') {
      scriptContent += `\n      <script type="module" src="./src/envCheck.js"></script>`;
    }
    
    // Inject the scripts before closing head tag
    const injectedData = data.replace('</head>', `${scriptContent}</head>`);
    
    res.send(injectedData);
  });
});

// Serve static files from the root directory
app.use(express.static(__dirname, {
  setHeaders: (res, path) => {
    // Set proper MIME type for JavaScript modules
    if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
  }
}));
// Try to start the server on the main port, fall back to alternatives if needed
const startServer = (portToUse, portIndex = 0) => {
  const server = app.listen(portToUse, () => {
    console.log(`Zombie Survival Game running at http://localhost:${portToUse} in ${environment} mode`);
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${portToUse} is already in use.`);
      
      // Try the next alternative port if available
      if (portIndex < alternativePorts.length) {
        const nextPort = alternativePorts[portIndex];
        console.log(`Trying alternative port: ${nextPort}`);
        startServer(nextPort, portIndex + 1);
      } else {
        console.error('All ports are in use. Please close one of the running servers or specify a different port.');
        process.exit(1);
      }
    } else {
      console.error('Error starting server:', err);
      process.exit(1);
    }
  });
};

// Start the server
startServer(port); 