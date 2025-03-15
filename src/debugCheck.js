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

// Run debug checks on page load
window.addEventListener('DOMContentLoaded', () => {
    console.log('DEBUG CHECK: DOM loaded, debug mode is', DEBUG_MODE);
});

export const debugCheck = {
    isDebugMode: DEBUG_MODE,
    appEnv: APP_ENV,
    nodeEnv: NODE_ENV
}; 