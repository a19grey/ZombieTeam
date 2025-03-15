/**
 * Environment Check Utility
 * 
 * This script helps debug environment-related issues by displaying the current
 * environment variables and settings in a visible overlay on the page.
 * 
 * Example usage: Import this module in your HTML to see environment information.
 */

// Create and append the environment display container to the document
window.addEventListener('DOMContentLoaded', () => {
  console.log('ENV CHECK: Environment check script loaded');
  
  // Create the container element
  const container = document.createElement('div');
  container.id = 'env-check-container';
  container.style.position = 'fixed';
  container.style.top = '10px';
  container.style.left = '10px';
  container.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
  container.style.color = 'white';
  container.style.padding = '15px';
  container.style.borderRadius = '5px';
  container.style.fontFamily = 'monospace';
  container.style.fontSize = '14px';
  container.style.zIndex = '10000';
  container.style.maxWidth = '400px';
  container.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
  
  // Determine the environment value
  const appEnv = window.APP_ENV || 'not set';
  console.log('ENV CHECK: APP_ENV =', appEnv);
  
  // Get NODE_ENV value
  const nodeEnv = window.NODE_ENV || 'not set';
  console.log('ENV CHECK: NODE_ENV =', nodeEnv);
  
  // Calculate DEBUG_MODE value
  const debugMode = appEnv === 'development';
  console.log('ENV CHECK: DEBUG_MODE =', debugMode);
  
  // Check for main.js globals that should be available
  const hasRenderer = typeof window.renderer !== 'undefined';
  const hasScene = typeof window.scene !== 'undefined';
  const hasCamera = typeof window.camera !== 'undefined';
  
  // Add environment information to the container
  container.innerHTML = `
    <h3 style="margin-top: 0; margin-bottom: 10px; color: ${appEnv === 'development' ? '#4CAF50' : '#FF5252'};">Environment Check: ${appEnv.toUpperCase()}</h3>
    <div style="margin-bottom: 5px;"><strong>window.APP_ENV:</strong> <span style="color: ${appEnv === 'development' ? '#4CAF50' : '#FF5252'}">${appEnv}</span></div>
    <div style="margin-bottom: 5px;"><strong>window.NODE_ENV:</strong> <span style="color: ${nodeEnv === 'development' ? '#4CAF50' : '#FF5252'}">${nodeEnv}</span></div>
    <div style="margin-bottom: 5px;"><strong>DEBUG_MODE:</strong> <span style="color: ${debugMode ? '#4CAF50' : '#FF5252'}">${debugMode}</span></div>
    <div style="margin-bottom: 5px;"><strong>URL:</strong> <span>${window.location.href}</span></div>
    <div style="margin-top: 10px; color: ${hasRenderer && hasScene && hasCamera ? '#4CAF50' : '#FF5252'}">
      <strong>Three.js Globals:</strong>
      <div>renderer: ${hasRenderer ? '✓' : '✗'}</div>
      <div>scene: ${hasScene ? '✓' : '✗'}</div>
      <div>camera: ${hasCamera ? '✓' : '✗'}</div>
    </div>
    <div style="margin-top: 10px;">
      <strong>Script Load Time:</strong> ${new Date().toISOString()}
    </div>
  `;
  
  // Add to the document
  document.body.appendChild(container);
  
  // Log available global variables
  console.log('ENV CHECK: Global variables check:');
  console.log('window.renderer:', window.renderer);
  console.log('window.scene:', window.scene);
  console.log('window.camera:', window.camera);
  
  // Add a refresh button to force reload the page
  const refreshButton = document.createElement('button');
  refreshButton.textContent = 'Refresh Page';
  refreshButton.style.marginTop = '10px';
  refreshButton.style.padding = '5px 10px';
  refreshButton.style.backgroundColor = '#4CAF50';
  refreshButton.style.color = 'white';
  refreshButton.style.border = 'none';
  refreshButton.style.borderRadius = '3px';
  refreshButton.style.cursor = 'pointer';
  refreshButton.onclick = () => {
    window.location.reload(true); // Force reload from server
  };
  
  container.appendChild(refreshButton);
});

// Export for module support
export default {}; 