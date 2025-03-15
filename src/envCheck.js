/**
 * Environment Check Utility
 * 
 * This script helps debug environment-related issues by displaying the current
 * environment variables and settings in a visible overlay on the page.
 * The overlay appears for 2 seconds and then collapses to a small wrench icon
 * that can be clicked to expand it again.
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
  container.style.bottom = '10px';
  container.style.right = '10px';
  container.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
  container.style.color = 'white';
  container.style.padding = '15px';
  container.style.borderRadius = '5px';
  container.style.fontFamily = 'monospace';
  container.style.fontSize = '14px';
  container.style.zIndex = '10000';
  container.style.maxWidth = '400px';
  container.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
  container.style.transition = 'all 0.3s ease-in-out';
  
  // Create collapsed container (wrench icon)
  const collapsedContainer = document.createElement('div');
  collapsedContainer.id = 'env-check-collapsed';
  collapsedContainer.style.position = 'fixed';
  collapsedContainer.style.bottom = '10px';
  collapsedContainer.style.right = '10px';
  collapsedContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
  collapsedContainer.style.color = 'white';
  collapsedContainer.style.padding = '10px';
  collapsedContainer.style.borderRadius = '5px';
  collapsedContainer.style.fontFamily = 'monospace';
  collapsedContainer.style.fontSize = '16px';
  collapsedContainer.style.zIndex = '10000';
  collapsedContainer.style.cursor = 'pointer';
  collapsedContainer.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
  collapsedContainer.style.display = 'none';
  collapsedContainer.innerHTML = '🔧'; // Wrench icon
  collapsedContainer.title = 'Click to expand environment info';
  
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
  
  // Add a collapse button
  const collapseButton = document.createElement('button');
  collapseButton.textContent = 'Collapse';
  collapseButton.style.marginTop = '10px';
  collapseButton.style.marginRight = '5px';
  collapseButton.style.padding = '5px 10px';
  collapseButton.style.backgroundColor = '#2196F3';
  collapseButton.style.color = 'white';
  collapseButton.style.border = 'none';
  collapseButton.style.borderRadius = '3px';
  collapseButton.style.cursor = 'pointer';
  collapseButton.onclick = () => {
    container.style.display = 'none';
    collapsedContainer.style.display = 'block';
  };
  
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
  
  // Add buttons to container
  container.appendChild(collapseButton);
  container.appendChild(refreshButton);
  
  // Add containers to the document
  document.body.appendChild(container);
  document.body.appendChild(collapsedContainer);
  
  // Set up click handler for collapsed container
  collapsedContainer.onclick = () => {
    collapsedContainer.style.display = 'none';
    container.style.display = 'block';
  };
  
  // Log available global variables
  console.log('ENV CHECK: Global variables check:');
  console.log('window.renderer:', window.renderer);
  console.log('window.scene:', window.scene);
  console.log('window.camera:', window.camera);
  
  // Auto-collapse after 2 seconds
  setTimeout(() => {
    container.style.display = 'none';
    collapsedContainer.style.display = 'block';
  }, 2000);
});

// Export for module support
export default {}; 