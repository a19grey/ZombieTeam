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
  },
  controls: {
    playerSpeed: 0.15,
    zombieSpeedRatio: 1.0, // Ratio of zombie speed to player speed
    gunFireRate: 100,
    cameraDistance: 10,
    cameraHeight: 10,
    cameraTilt: 0
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
  panel.style.width = '300px'; // Fixed width for better layout
  
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
  
  // Create a slider control
  const createSlider = (name, label, min, max, value, step, onChange) => {
    const container = document.createElement('div');
    container.style.marginBottom = '15px';
    
    const labelEl = document.createElement('label');
    labelEl.htmlFor = `slider-${name}`;
    labelEl.textContent = `${label}: ${value}`;
    labelEl.style.display = 'block';
    labelEl.style.marginBottom = '5px';
    
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.id = `slider-${name}`;
    slider.min = min;
    slider.max = max;
    slider.step = step;
    slider.value = value;
    slider.style.width = '100%';
    
    slider.addEventListener('input', () => {
      const newValue = parseFloat(slider.value);
      labelEl.textContent = `${label}: ${newValue}`;
      onChange(newValue);
    });
    
    container.appendChild(labelEl);
    container.appendChild(slider);
    return container;
  };
  
  // Create a section title
  const createSectionTitle = (title) => {
    const container = document.createElement('div');
    container.style.marginTop = '15px';
    container.style.marginBottom = '10px';
    container.style.fontWeight = 'bold';
    container.style.borderBottom = '1px solid rgba(255, 255, 255, 0.3)';
    container.textContent = title;
    return container;
  };
  
  // Add Feature Toggles section
  panel.appendChild(createSectionTitle('Feature Toggles'));
  
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
  
  // Add Gameplay Sliders section
  panel.appendChild(createSectionTitle('Gameplay Controls'));
  
  // Player Speed slider
  panel.appendChild(createSlider(
    'playerSpeed',
    'Player Speed',
    0.05,  // min
    0.5,   // max
    devState.controls.playerSpeed, // initial value
    0.01,  // step
    (value) => {
      devState.controls.playerSpeed = value;
      if (window.gameState) {
        window.gameState.player.speed = value;
        if (window.gameState.debug) {
          window.gameState.debug.playerMoveSpeed = value;
        }
      }
      logger.debug(`Player speed set to ${value}`);
    }
  ));
  
  // Zombie Speed Ratio slider
  panel.appendChild(createSlider(
    'zombieSpeedRatio',
    'Zombie Speed Ratio',
    0.1,  // min
    3.0,  // max
    devState.controls.zombieSpeedRatio, // initial value
    0.1,  // step
    (value) => {
      devState.controls.zombieSpeedRatio = value;
      if (window.gameState && window.gameState.zombies) {
        // Update all zombie speeds based on ratio to player speed
        window.gameState.zombies.forEach(zombie => {
          if (zombie) {
            zombie.speed = zombie.baseSpeed * value;
          }
        });
      }
      logger.debug(`Zombie speed ratio set to ${value}`);
    }
  ));
  
  // Gun Fire Rate slider
  panel.appendChild(createSlider(
    'gunFireRate',
    'Gun Fire Rate (ms)',
    50,   // min
    500,  // max
    devState.controls.gunFireRate, // initial value
    10,   // step
    (value) => {
      devState.controls.gunFireRate = value;
      if (window.gameState && window.gameState.debug) {
        window.gameState.debug.gunFireRate = value;
      }
      logger.debug(`Gun fire rate set to ${value}ms`);
    }
  ));
  
  // Zombie Spawn Rate slider
  panel.appendChild(createSlider(
    'zombieSpawnRate',
    'Zombie Spawn Rate (ms)',
    100,  // min
    2000, // max
    window.gameState?.enemySpawnRate || 200, // initial value
    100,  // step
    (value) => {
      if (window.gameState) {
        window.gameState.enemySpawnRate = value;
        if (window.gameState.debug) {
          window.gameState.debug.zombieSpawnRate = value;
        }
      }
      logger.debug(`Zombie spawn rate set to ${value}ms`);
    }
  ));
  
  // Add Camera Controls section
  panel.appendChild(createSectionTitle('Camera Controls'));
  
  // Camera Distance slider
  panel.appendChild(createSlider(
    'cameraDistance',
    'Camera Distance',
    5,    // min
    20,   // max
    devState.controls.cameraDistance, // initial value
    0.5,  // step
    (value) => {
      devState.controls.cameraDistance = value;
      if (window.gameState && window.gameState.debug && window.gameState.debug.camera) {
        window.gameState.debug.camera.distance = value;
      }
      logger.debug(`Camera distance set to ${value}`);
    }
  ));
  
  // Camera Height slider
  panel.appendChild(createSlider(
    'cameraHeight',
    'Camera Height',
    5,    // min
    20,   // max
    devState.controls.cameraHeight, // initial value
    0.5,  // step
    (value) => {
      devState.controls.cameraHeight = value;
      if (window.gameState && window.gameState.debug && window.gameState.debug.camera) {
        window.gameState.debug.camera.height = value;
      }
      logger.debug(`Camera height set to ${value}`);
    }
  ));
  
  // Camera Tilt slider
  panel.appendChild(createSlider(
    'cameraTilt',
    'Camera Tilt',
    -30,  // min
    30,   // max
    devState.controls.cameraTilt, // initial value
    1,    // step
    (value) => {
      devState.controls.cameraTilt = value;
      if (window.gameState && window.gameState.debug && window.gameState.debug.camera) {
        window.gameState.debug.camera.tilt = value;
      }
      logger.debug(`Camera tilt set to ${value}`);
    }
  ));
  
  // Add Actions section
  panel.appendChild(createSectionTitle('Actions'));
  
  // Add fix WebGL button
  const fixWebGLButton = document.createElement('button');
  fixWebGLButton.textContent = 'Fix WebGL Context';
  fixWebGLButton.style.marginTop = '10px';
  fixWebGLButton.style.padding = '8px';
  fixWebGLButton.style.width = '100%';
  fixWebGLButton.style.backgroundColor = '#2a2a2a';
  fixWebGLButton.style.color = 'white';
  fixWebGLButton.style.border = 'none';
  fixWebGLButton.style.borderRadius = '4px';
  fixWebGLButton.style.cursor = 'pointer';
  fixWebGLButton.addEventListener('click', () => {
    const fixed = fixWebGLContext(renderer);
    logger.info(`WebGL context fix attempt: ${fixed ? 'successful' : 'no changes made'}`);
  });
  panel.appendChild(fixWebGLButton);
  
  // Add diagnostic info button
  const diagButton = document.createElement('button');
  diagButton.textContent = 'Run WebGL Diagnostics';
  diagButton.style.marginTop = '10px';
  diagButton.style.padding = '8px';
  diagButton.style.width = '100%';
  diagButton.style.backgroundColor = '#2a2a2a';
  diagButton.style.color = 'white';
  diagButton.style.border = 'none';
  diagButton.style.borderRadius = '4px';
  diagButton.style.cursor = 'pointer';
  diagButton.addEventListener('click', () => {
    const info = debugWebGL();
    
    // Display diagnostic info
    const infoDiv = document.createElement('div');
    infoDiv.style.marginTop = '10px';
    infoDiv.style.padding = '8px';
    infoDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    infoDiv.style.borderRadius = '4px';
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
  resetButton.style.marginTop = '10px';
  resetButton.style.padding = '8px';
  resetButton.style.width = '100%';
  resetButton.style.backgroundColor = '#aa3333';
  resetButton.style.color = 'white';
  resetButton.style.border = 'none';
  resetButton.style.borderRadius = '4px';
  resetButton.style.cursor = 'pointer';
  resetButton.addEventListener('click', () => {
    // Reload the page
    window.location.reload();
  });
  panel.appendChild(resetButton);
  
  // Reset camera button
  const resetCameraButton = document.createElement('button');
  resetCameraButton.textContent = 'Reset Camera Settings';
  resetCameraButton.style.marginTop = '10px';
  resetCameraButton.style.padding = '8px';
  resetCameraButton.style.width = '100%';
  resetCameraButton.style.backgroundColor = '#3333aa';
  resetCameraButton.style.color = 'white';
  resetCameraButton.style.border = 'none';
  resetCameraButton.style.borderRadius = '4px';
  resetCameraButton.style.cursor = 'pointer';
  resetCameraButton.addEventListener('click', () => {
    // Reset camera settings to default
    if (window.gameState && window.gameState.debug && window.gameState.debug.camera) {
      const defaultValues = window.gameState.debug.camera.defaultValues;
      
      // Update dev state
      devState.controls.cameraDistance = defaultValues.distance;
      devState.controls.cameraHeight = defaultValues.height;
      devState.controls.cameraTilt = defaultValues.tilt;
      
      // Update game state
      window.gameState.debug.camera.distance = defaultValues.distance;
      window.gameState.debug.camera.height = defaultValues.height;
      window.gameState.debug.camera.tilt = defaultValues.tilt;
      
      // Update sliders
      document.getElementById('slider-cameraDistance').value = defaultValues.distance;
      document.getElementById('slider-cameraHeight').value = defaultValues.height;
      document.getElementById('slider-cameraTilt').value = defaultValues.tilt;
      
      // Update labels
      document.querySelector('label[for="slider-cameraDistance"]').textContent = 
        `Camera Distance: ${defaultValues.distance}`;
      document.querySelector('label[for="slider-cameraHeight"]').textContent = 
        `Camera Height: ${defaultValues.height}`;
      document.querySelector('label[for="slider-cameraTilt"]').textContent = 
        `Camera Tilt: ${defaultValues.tilt}`;
      
      logger.debug('Camera settings reset to defaults');
    }
  });
  panel.appendChild(resetCameraButton);
  
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
  
  // Initialize panel with game state values if available
  if (window.gameState) {
    // Initialize gameplay values
    if (window.gameState.player) {
      const playerSpeedSlider = document.getElementById('slider-playerSpeed');
      if (playerSpeedSlider) {
        playerSpeedSlider.value = window.gameState.player.speed;
        document.querySelector('label[for="slider-playerSpeed"]').textContent = 
          `Player Speed: ${window.gameState.player.speed}`;
      }
    }
    
    if (window.gameState.debug) {
      // Gun fire rate
      const gunFireRateSlider = document.getElementById('slider-gunFireRate');
      if (gunFireRateSlider && window.gameState.debug.gunFireRate) {
        gunFireRateSlider.value = window.gameState.debug.gunFireRate;
        document.querySelector('label[for="slider-gunFireRate"]').textContent = 
          `Gun Fire Rate (ms): ${window.gameState.debug.gunFireRate}`;
      }
      
      // Zombie spawn rate
      const zombieSpawnRateSlider = document.getElementById('slider-zombieSpawnRate');
      if (zombieSpawnRateSlider && window.gameState.enemySpawnRate) {
        zombieSpawnRateSlider.value = window.gameState.enemySpawnRate;
        document.querySelector('label[for="slider-zombieSpawnRate"]').textContent = 
          `Zombie Spawn Rate (ms): ${window.gameState.enemySpawnRate}`;
      }
      
      // Camera settings
      if (window.gameState.debug.camera) {
        const camera = window.gameState.debug.camera;
        
        const cameraDistanceSlider = document.getElementById('slider-cameraDistance');
        if (cameraDistanceSlider) {
          cameraDistanceSlider.value = camera.distance;
          document.querySelector('label[for="slider-cameraDistance"]').textContent = 
            `Camera Distance: ${camera.distance}`;
        }
        
        const cameraHeightSlider = document.getElementById('slider-cameraHeight');
        if (cameraHeightSlider) {
          cameraHeightSlider.value = camera.height;
          document.querySelector('label[for="slider-cameraHeight"]').textContent = 
            `Camera Height: ${camera.height}`;
        }
        
        const cameraTiltSlider = document.getElementById('slider-cameraTilt');
        if (cameraTiltSlider) {
          cameraTiltSlider.value = camera.tilt;
          document.querySelector('label[for="slider-cameraTilt"]').textContent = 
            `Camera Tilt: ${camera.tilt}`;
        }
      }
    }
  }
  
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