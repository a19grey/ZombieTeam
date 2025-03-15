/**
 * Development Mode Utilities
 * 
 * This module provides tools for debugging and development without UI panels.
 * The dev panel implementation has been removed for simplicity.
 * 
 * Example usage:
 * import { toggleFeature, isFeatureEnabled } from './utils/devMode.js';
 */

import { logger } from './logger.js';

// Dev mode state
const devState = {
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

/**
 * Access to dev controls for programmatic manipulation
 * @returns {Object} The dev controls object
 */
export const getDevControls = () => {
  return devState.controls;
};

/**
 * Updates a control value
 * @param {string} control - The control to update
 * @param {number} value - The new value
 * @returns {boolean} Whether the control was successfully updated
 */
export const updateDevControl = (control, value) => {
  if (control in devState.controls) {
    devState.controls[control] = value;
    logger.debug(`Dev control ${control} set to ${value}`);
    return true;
  }
  return false;
}; 