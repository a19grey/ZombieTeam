/**
 * Debug Check Utility
 * 
 * This script verifies if debug mode is correctly set up and displays information
 * about the environment variables in the browser console and DOM.
 */

// Import the required modules to check if they're available
import { debugWebGL } from './debug.js';

// Check if window.APP_ENV exists
console.log('DEBUG CHECK: window.APP_ENV =', window.APP_ENV);
console.log('DEBUG CHECK: window.NODE_ENV =', window.NODE_ENV);
console.log('DEBUG CHECK: window.SERVER_TIMESTAMP =', window.SERVER_TIMESTAMP);

// Define DEBUG_MODE based on environment
const APP_ENV = window.APP_ENV || 'production';
const NODE_ENV = window.NODE_ENV || 'production';
const DEBUG_MODE = APP_ENV === 'development';
console.log('DEBUG CHECK: DEBUG_MODE =', DEBUG_MODE);

// Display info in the DOM
const createDebugInfo = () => {
    const debugInfo = document.createElement('div');
    debugInfo.style.position = 'fixed';
    debugInfo.style.bottom = '10px';
    debugInfo.style.right = '10px';
    debugInfo.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    debugInfo.style.color = 'white';
    debugInfo.style.padding = '10px';
    debugInfo.style.borderRadius = '5px';
    debugInfo.style.fontFamily = 'monospace';
    debugInfo.style.fontSize = '14px';
    debugInfo.style.zIndex = '2000';
    
    debugInfo.innerHTML = `
        <div>APP_ENV: ${APP_ENV}</div>
        <div>NODE_ENV: ${NODE_ENV}</div>
        <div>DEBUG_MODE: ${DEBUG_MODE}</div>
        <div>Server Timestamp: ${window.SERVER_TIMESTAMP || 'not set'}</div>
        <div>Client Timestamp: ${new Date().toISOString()}</div>
        <div>debug.js imported: ${typeof debugWebGL === 'function' ? 'Yes' : 'No'}</div>
    `;
    
    document.body.appendChild(debugInfo);
};

// Run the debug info on page load
window.addEventListener('DOMContentLoaded', () => {
    if (DEBUG_MODE) {
        createDebugInfo();
    }
});

export const debugCheck = {
    isDebugMode: DEBUG_MODE,
    appEnv: APP_ENV,
    nodeEnv: NODE_ENV
}; 