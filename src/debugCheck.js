/**
 * Debug Check Utility
 * 
 * This script verifies if debug mode is correctly set up and displays information
 * about the environment variables in the browser console and DOM.
 */

// Import the required modules to check if they're available
import { debugWebGL } from './debug.js';
import { createDevPanel } from './utils/devMode.js';

// Check if window.APP_ENV exists
console.log('DEBUG CHECK: window.APP_ENV =', window.APP_ENV);

// Calculate DEBUG_MODE the same way main.js does
const DEBUG_MODE = window.APP_ENV === 'development';
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
        <div>APP_ENV: ${window.APP_ENV || 'not set'}</div>
        <div>DEBUG_MODE: ${DEBUG_MODE}</div>
        <div>devMode.js imported: ${typeof createDevPanel === 'function' ? 'Yes' : 'No'}</div>
        <div>debug.js imported: ${typeof debugWebGL === 'function' ? 'Yes' : 'No'}</div>
    `;
    
    document.body.appendChild(debugInfo);
    
    // Add a button to manually create the dev panel
    const createButton = document.createElement('button');
    createButton.textContent = 'Create Dev Panel Manually';
    createButton.style.display = 'block';
    createButton.style.marginTop = '10px';
    createButton.style.padding = '5px';
    createButton.style.width = '100%';
    createButton.addEventListener('click', () => {
        try {
            // Check if Three.js objects are available in window
            const renderer = window.renderer || null;
            const scene = window.scene || null;
            const camera = window.camera || null;
            
            console.log('Manual dev panel creation:', { renderer, scene, camera });
            
            if (typeof createDevPanel === 'function' && renderer && scene && camera) {
                const panel = createDevPanel(renderer, scene, camera);
                console.log('Dev panel created manually:', panel);
                debugInfo.innerHTML += '<div style="color:#00ff00">Panel created!</div>';
            } else {
                console.error('Cannot create dev panel: Missing objects', { 
                    renderer: !!renderer, 
                    scene: !!scene, 
                    camera: !!camera,
                    createDevPanel: typeof createDevPanel
                });
                debugInfo.innerHTML += '<div style="color:#ff0000">Failed to create panel</div>';
            }
        } catch (error) {
            console.error('Error creating dev panel:', error);
            debugInfo.innerHTML += `<div style="color:#ff0000">Error: ${error.message}</div>`;
        }
    });
    debugInfo.appendChild(createButton);
};

// Run after page is loaded
window.addEventListener('DOMContentLoaded', () => {
    console.log('DEBUG CHECK: DOM loaded, running checks...');
    createDebugInfo();
    
    // Try to access some debug functions
    try {
        console.log('DEBUG CHECK: Trying to access debug functions...');
        if (typeof debugWebGL === 'function') {
            console.log('DEBUG CHECK: debugWebGL is available');
        } else {
            console.warn('DEBUG CHECK: debugWebGL is not available');
        }
        
        if (typeof createDevPanel === 'function') {
            console.log('DEBUG CHECK: createDevPanel is available');
        } else {
            console.warn('DEBUG CHECK: createDevPanel is not available');
        }
    } catch (error) {
        console.error('DEBUG CHECK: Error accessing debug functions:', error);
    }
});

export const debugCheck = {
    isDebugMode: DEBUG_MODE,
    appEnv: window.APP_ENV
}; 