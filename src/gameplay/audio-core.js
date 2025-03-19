/**
 * Audio Core Module - Provides core audio functionality and state management
 * 
 * This module provides the foundation for the audio system, including initializing
 * the audio listener, maintaining the audio state, and providing utility functions
 * for debugging and system control.
 * 
 * Example usage:
 * import { initAudio, setAudioEnabled } from './gameplay/audio-core.js';
 * 
 * // Initialize audio system
 * const listener = initAudio(camera);
 * 
 * // Enable/disable audio system
 * setAudioEnabled(false); // Disable audio
 * 
 * // Get audio state for debugging
 * const state = getAudioState();
 * 
 * // Debug audio system
 * debugAudioSystem();
 */

import * as THREE from 'three';
import { logger } from '../utils/logger.js';

// Audio state object
export const audioState = {
  listener: null,
  sounds: new Map(), // Map of sound name to { audio, buffer, isPlaying, type }
  masterVolume: 0.7,
  musicVolume: 0.5,
  sfxVolume: 0.8,
  muted: false,
  enabled: true // Global setting to enable/disable audio system
};

/**
 * Initialize audio listener (to be attached to camera)
 * @param {THREE.Camera} camera - The camera to attach the audio listener to
 * @returns {THREE.AudioListener} The initialized audio listener
 */
export const initAudio = (camera) => {
  audioState.listener = new THREE.AudioListener();
  camera.add(audioState.listener);
  logger.info('audio', 'Audio listener initialized');
  return audioState.listener;
};

/**
 * Get the current audio state
 * @returns {Object} The current audio state
 */
export const getAudioState = () => {
  return {
    masterVolume: audioState.masterVolume,
    musicVolume: audioState.musicVolume,
    sfxVolume: audioState.sfxVolume,
    muted: audioState.muted,
    enabled: audioState.enabled,
    loadedSounds: Array.from(audioState.sounds.keys())
  };
};

/**
 * Debug audio system and log detailed information
 * Useful for troubleshooting audio issues
 */
export const debugAudioSystem = () => {
  logger.info('audio', '=== AUDIO SYSTEM DEBUG ===');
  logger.info('audio', `Audio Context State: ${audioState.listener?.context?.state || 'No context'}`);
  logger.info('audio', `Audio System Enabled: ${audioState.enabled}`);
  logger.info('audio', `Master Volume: ${audioState.masterVolume}`);
  logger.info('audio', `Music Volume: ${audioState.musicVolume}`);
  logger.info('audio', `SFX Volume: ${audioState.sfxVolume}`);
  logger.info('audio', `Muted: ${audioState.muted}`);
  
  logger.info('audio', 'Loaded Sounds:');
  audioState.sounds.forEach((soundData, name) => {
    logger.info('audio', `- ${name}: ${soundData.isPlaying ? 'Playing' : 'Stopped'}, Type: ${soundData.type}, Positional: ${soundData.isPositional || false}`);
  });
  
  // Check if browser might be blocking audio
  if (audioState.listener?.context?.state === 'suspended') {
    logger.warn('audio', 'Audio context is suspended. This usually means the browser is blocking autoplay.');
    logger.info('audio', 'Try resuming the audio context after user interaction:');
    logger.info('audio', 'audioState.listener.context.resume()');
  }
  
  return {
    contextState: audioState.listener?.context?.state || 'No context',
    enabled: audioState.enabled,
    masterVolume: audioState.masterVolume,
    musicVolume: audioState.musicVolume,
    sfxVolume: audioState.sfxVolume,
    muted: audioState.muted,
    loadedSounds: Array.from(audioState.sounds.keys())
  };
};

/**
 * Enable or disable the entire audio system
 * @param {boolean} enabled - Whether the audio system should be enabled
 * @returns {boolean} The new enabled state
 */
export const setAudioEnabled = (enabled) => {
  audioState.enabled = !!enabled;
  
  // If disabling, stop all currently playing sounds
  if (!audioState.enabled) {
    audioState.sounds.forEach((soundData, name) => {
      if (soundData.isPlaying) {
        soundData.audio.stop();
        soundData.isPlaying = false;
      }
    });
    logger.info('audio', 'Audio system disabled');
  } else {
    logger.info('audio', 'Audio system enabled');
  }
  
  return audioState.enabled;
}; 