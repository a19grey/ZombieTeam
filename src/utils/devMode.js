/**
 * Development Mode Utilities
 * 
 * This module provides tools for debugging and development, including
 * a dev mode panel with controls for toggling features and diagnosing issues.
 * 
 * Example usage:
 * import { createDevPanel, toggleFeature } from './utils/devMode.js';
 * createDevPanel(renderer, scene, camera);
 */

import { logger } from './logger.js';
import { debugWebGL, fixWebGLContext } from '../debug.js';

// Dev mode state
const devState = {
  panelVisible: false,
  features: {
    shadows: true,
    fog: true,
    audio: true,
    textures: true,
    lighting: true
  }
};

/**
 * Creates a development panel with debugging controls
 * @param {THREE.WebGLRenderer} renderer - The Three.js renderer
 * @param {THREE.Scene} scene - The Three.js scene
 * @param {THREE.Camera} camera - The Three.js camera
 * @returns {HTMLElement} The created panel element
 */
export const createDevPanel = (renderer, scene, camera) => {
  // Create panel container
  const panel = document.createElement('div');
  panel.id = 'dev-panel';
  panel.style.position = 'fixed';
  panel.style.top = '10px';
  panel.style.right = '10px';
  panel.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  panel.style.color = 'white';
  panel.style.padding = '10px';
  panel.style.borderRadius = '5px';
  panel.style.fontFamily = 'monospace';
  panel.style.fontSize = '12px';
  panel.style.zIndex = '1000';
  panel.style.maxHeight = '80vh';
  panel.style.overflowY = 'auto';
  panel.style.display = devState.panelVisible ? 'block' : 'none';
  
  // Create header
  const header = document.createElement('div');
  header.style.fontWeight = 'bold';
  header.style.marginBottom = '10px';
  header.style.fontSize = '14px';
  header.textContent = 'Dev Mode Controls';
  panel.appendChild(header);
  
  // Create feature toggles
  const createToggle = (name, label, initialState, onChange) => {
    const container = document.createElement('div');
    container.style.marginBottom = '5px';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `toggle-${name}`;
    checkbox.checked = initialState;
    checkbox.addEventListener('change', (e) => {
      onChange(e.target.checked);
    });
    
    const labelEl = document.createElement('label');
    labelEl.htmlFor = `toggle-${name}`;
    labelEl.textContent = label;
    labelEl.style.marginLeft = '5px';
    
    container.appendChild(checkbox);
    container.appendChild(labelEl);
    return container;
  };
  
  // Add feature toggles
  panel.appendChild(createToggle('shadows', 'Shadows', devState.features.shadows, (enabled) => {
    devState.features.shadows = enabled;
    renderer.shadowMap.enabled = enabled;
    logger.debug(`Shadows ${enabled ? 'enabled' : 'disabled'}`);
  }));
  
  panel.appendChild(createToggle('fog', 'Fog', devState.features.fog, (enabled) => {
    devState.features.fog = enabled;
    if (scene.fog) {
      scene.fog.far = enabled ? 100 : 10000;
    }
    logger.debug(`Fog ${enabled ? 'enabled' : 'disabled'}`);
  }));
  
  panel.appendChild(createToggle('textures', 'Textures', devState.features.textures, (enabled) => {
    devState.features.textures = enabled;
    // This would need to iterate through materials in the scene
    logger.debug(`Textures ${enabled ? 'enabled' : 'disabled'}`);
  }));
  
  // Add fix WebGL button
  const fixWebGLButton = document.createElement('button');
  fixWebGLButton.textContent = 'Fix WebGL Context';
  fixWebGLButton.style.marginTop = '10px';
  fixWebGLButton.style.padding = '5px';
  fixWebGLButton.style.width = '100%';
  fixWebGLButton.addEventListener('click', () => {
    const fixed = fixWebGLContext(renderer);
    logger.info(`WebGL context fix attempt: ${fixed ? 'successful' : 'no changes made'}`);
  });
  panel.appendChild(fixWebGLButton);
  
  // Add diagnostic info button
  const diagButton = document.createElement('button');
  diagButton.textContent = 'Run WebGL Diagnostics';
  diagButton.style.marginTop = '5px';
  diagButton.style.padding = '5px';
  diagButton.style.width = '100%';
  diagButton.addEventListener('click', () => {
    const info = debugWebGL();
    
    // Display diagnostic info
    const infoDiv = document.createElement('div');
    infoDiv.style.marginTop = '10px';
    infoDiv.style.padding = '5px';
    infoDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    infoDiv.style.borderRadius = '3px';
    infoDiv.style.maxHeight = '200px';
    infoDiv.style.overflowY = 'auto';
    
    infoDiv.innerHTML = `
      <div><strong>WebGL Available:</strong> ${info.webglAvailable}</div>
      <div><strong>WebGL2 Available:</strong> ${info.webgl2Available}</div>
      <div><strong>Renderer:</strong> ${info.renderer || 'N/A'}</div>
      <div><strong>Vendor:</strong> ${info.vendor || 'N/A'}</div>
      <div><strong>Version:</strong> ${info.version || 'N/A'}</div>
      <div><strong>Max Texture Size:</strong> ${info.maxTextureSize || 'N/A'}</div>
      ${info.error ? `<div style="color: red"><strong>Error:</strong> ${info.error}</div>` : ''}
    `;
    
    // Remove previous info if exists
    const oldInfo = panel.querySelector('.diag-info');
    if (oldInfo) {
      panel.removeChild(oldInfo);
    }
    
    infoDiv.className = 'diag-info';
    panel.appendChild(infoDiv);
  });
  panel.appendChild(diagButton);
  
  // Add reset button
  const resetButton = document.createElement('button');
  resetButton.textContent = 'Reset Scene';
  resetButton.style.marginTop = '5px';
  resetButton.style.padding = '5px';
  resetButton.style.width = '100%';
  resetButton.addEventListener('click', () => {
    // Reload the page
    window.location.reload();
  });
  panel.appendChild(resetButton);
  
  // Add to document
  document.body.appendChild(panel);
  
  // Create toggle button
  const toggleButton = document.createElement('button');
  toggleButton.textContent = '🛠️';
  toggleButton.style.position = 'fixed';
  toggleButton.style.top = '10px';
  toggleButton.style.right = '10px';
  toggleButton.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  toggleButton.style.color = 'white';
  toggleButton.style.padding = '5px 10px';
  toggleButton.style.borderRadius = '5px';
  toggleButton.style.fontFamily = 'monospace';
  toggleButton.style.fontSize = '16px';
  toggleButton.style.zIndex = '1001';
  toggleButton.style.cursor = 'pointer';
  toggleButton.style.border = 'none';
  
  toggleButton.addEventListener('click', () => {
    devState.panelVisible = !devState.panelVisible;
    panel.style.display = devState.panelVisible ? 'block' : 'none';
    toggleButton.style.display = devState.panelVisible ? 'none' : 'block';
  });
  
  document.body.appendChild(toggleButton);
  
  return panel;
};

/**
 * Toggles a development feature
 * @param {string} feature - The feature to toggle
 * @param {boolean} enabled - Whether the feature should be enabled
 * @returns {boolean} Whether the feature was successfully toggled
 */
export const toggleFeature = (feature, enabled) => {
  if (feature in devState.features) {
    devState.features[feature] = enabled;
    logger.debug(`Dev feature ${feature} ${enabled ? 'enabled' : 'disabled'}`);
    return true;
  }
  return false;
};

/**
 * Gets the current state of a development feature
 * @param {string} feature - The feature to check
 * @returns {boolean} Whether the feature is enabled
 */
export const isFeatureEnabled = (feature) => {
  return feature in devState.features ? devState.features[feature] : false;
}; 