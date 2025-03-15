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
  
  // Calculate DEBUG_MODE value
  const debugMode = appEnv === 'development';
  console.log('ENV CHECK: DEBUG_MODE =', debugMode);
  
  // Check for main.js globals that should be available
  const hasRenderer = typeof window.renderer !== 'undefined';
  const hasScene = typeof window.scene !== 'undefined';
  const hasCamera = typeof window.camera !== 'undefined';
  
  // Check for dev mode functions
  const hasCreateDevPanel = typeof window.createDevPanel === 'function' || 
                           (typeof window.devMode !== 'undefined' && typeof window.devMode.createDevPanel === 'function');
  
  // Add environment information to the container
  container.innerHTML = `
    <h3 style="margin-top: 0; margin-bottom: 10px; color: #4CAF50;">Environment Check</h3>
    <div style="margin-bottom: 5px;"><strong>window.APP_ENV:</strong> <span style="color: ${appEnv === 'development' ? '#4CAF50' : '#FF5252'}">${appEnv}</span></div>
    <div style="margin-bottom: 5px;"><strong>DEBUG_MODE:</strong> <span style="color: ${debugMode ? '#4CAF50' : '#FF5252'}">${debugMode}</span></div>
    <div style="margin-bottom: 5px;"><strong>NodeJS ENV:</strong> <span>${window.NODE_ENV || 'not set'}</span></div>
    <div style="margin-bottom: 5px;"><strong>URL:</strong> <span>${window.location.href}</span></div>
    <div style="margin-top: 10px; color: ${hasRenderer && hasScene && hasCamera ? '#4CAF50' : '#FF5252'}">
      <strong>Three.js Globals:</strong>
      <div>renderer: ${hasRenderer ? '✓' : '✗'}</div>
      <div>scene: ${hasScene ? '✓' : '✗'}</div>
      <div>camera: ${hasCamera ? '✓' : '✗'}</div>
    </div>
    <div style="margin-top: 10px; color: ${hasCreateDevPanel ? '#4CAF50' : '#FF5252'}">
      <strong>Dev Functions:</strong>
      <div>createDevPanel: ${hasCreateDevPanel ? '✓' : '✗'}</div>
    </div>
  `;
  
  // Create a button to attempt to manually create the dev panel
  const createPanelButton = document.createElement('button');
  createPanelButton.textContent = 'Create Dev Panel';
  createPanelButton.style.marginTop = '10px';
  createPanelButton.style.padding = '8px 12px';
  createPanelButton.style.backgroundColor = '#2196F3';
  createPanelButton.style.color = 'white';
  createPanelButton.style.border = 'none';
  createPanelButton.style.borderRadius = '4px';
  createPanelButton.style.cursor = 'pointer';
  createPanelButton.style.display = 'block';
  createPanelButton.style.width = '100%';
  
  createPanelButton.addEventListener('click', () => {
    try {
      if (window.createDevPanel) {
        window.createDevPanel(window.renderer, window.scene, window.camera);
        console.log('Dev panel created via window.createDevPanel');
        alert('Dev panel created via global function');
      } else if (window.devMode && window.devMode.createDevPanel) {
        window.devMode.createDevPanel(window.renderer, window.scene, window.camera);
        console.log('Dev panel created via window.devMode.createDevPanel');
        alert('Dev panel created via devMode module');
      } else {
        // Try to dynamically import the module
        import('./utils/devMode.js')
          .then(module => {
            if (module && module.createDevPanel) {
              module.createDevPanel(window.renderer, window.scene, window.camera);
              console.log('Dev panel created via dynamic import');
              alert('Dev panel created via dynamic import');
            } else {
              throw new Error('createDevPanel function not found in module');
            }
          })
          .catch(error => {
            console.error('Failed to import devMode module:', error);
            alert(`Failed to import devMode module: ${error.message}`);
          });
      }
    } catch (error) {
      console.error('Error creating dev panel:', error);
      alert(`Error creating dev panel: ${error.message}`);
    }
  });
  
  container.appendChild(createPanelButton);
  
  // Add to the document
  document.body.appendChild(container);
  
  // Log available global variables
  console.log('ENV CHECK: Global variables check:');
  console.log('window.renderer:', window.renderer);
  console.log('window.scene:', window.scene);
  console.log('window.camera:', window.camera);
  console.log('window.createDevPanel:', window.createDevPanel);
  console.log('window.devMode:', window.devMode);
});

// Export for module support
export default {}; 