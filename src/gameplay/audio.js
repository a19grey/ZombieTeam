/**
 * Audio Module - Handles audio loading, playback, and state management
 * 
 * This module provides functionality for loading and playing both global and positional
 * audio in the game. It supports background music, sound effects, and spatial audio.
 * 
 * Example usage:
 * import { initAudio, loadAudio, playSound } from './gameplay/audio.js';
 * 
 * // Initialize audio system
 * initAudio(camera);
 * 
 * // Load background music and sound effects
 * await loadAudio('backgroundMusic', '/audio/zombie-theme.mp3', true, 0.5);
 * await loadAudio('gunshot', '/audio/gunshot.mp3', false, 0.8);
 * 
 * // Play sounds
 * playSound('backgroundMusic'); // Play background music
 * playSound('gunshot'); // Play gunshot sound
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.132.2/build/three.module.js';
import { logger } from '../utils/logger.js';

// Audio state object
const audioState = {
  listener: null,
  sounds: new Map(), // Map of sound name to { audio, buffer, isPlaying }
  masterVolume: 1.0,
  muted: false
};

/**
 * Initialize audio listener (to be attached to camera)
 * @param {THREE.Camera} camera - The camera to attach the audio listener to
 * @returns {THREE.AudioListener} The initialized audio listener
 */
export const initAudio = (camera) => {
  audioState.listener = new THREE.AudioListener();
  camera.add(audioState.listener);
  logger.info('Audio listener initialized');
  return audioState.listener;
};

/**
 * Load a global audio file (e.g., music, gunshot)
 * @param {string} name - Unique identifier for the sound
 * @param {string} url - Path to the audio file
 * @param {boolean} isLooping - Whether the sound should loop
 * @param {number} volume - Volume level (0.0 to 1.0)
 * @returns {Promise} Promise that resolves when the audio is loaded
 */
export const loadAudio = (name, url, isLooping = false, volume = 1.0) => {
  return new Promise((resolve, reject) => {
    const audioLoader = new THREE.AudioLoader();
    const sound = new THREE.Audio(audioState.listener);

    audioLoader.load(
      url,
      (buffer) => {
        sound.setBuffer(buffer);
        sound.setLoop(isLooping);
        sound.setVolume(volume * audioState.masterVolume);
        audioState.sounds.set(name, { audio: sound, buffer, isPlaying: false });
        logger.debug(`Audio loaded: ${name}`);
        resolve(sound);
      },
      undefined,
      (error) => {
        logger.error(`Failed to load audio ${name}: ${error}`);
        reject(error);
      }
    );
  });
};

/**
 * Load a positional audio file (e.g., zombie growl, explosion)
 * @param {string} name - Unique identifier for the sound
 * @param {string} url - Path to the audio file
 * @param {number} refDistance - Distance at which the volume is reduced by half
 * @param {number} volume - Volume level (0.0 to 1.0)
 * @returns {Promise} Promise that resolves when the audio is loaded
 */
export const loadPositionalAudio = (name, url, refDistance = 10, volume = 1.0) => {
  return new Promise((resolve, reject) => {
    const audioLoader = new THREE.AudioLoader();
    const sound = new THREE.PositionalAudio(audioState.listener);

    audioLoader.load(
      url,
      (buffer) => {
        sound.setBuffer(buffer);
        sound.setRefDistance(refDistance);
        sound.setVolume(volume * audioState.masterVolume);
        audioState.sounds.set(name, { audio: sound, buffer, isPlaying: false, isPositional: true });
        logger.debug(`Positional audio loaded: ${name}`);
        resolve(sound);
      },
      undefined,
      (error) => {
        logger.error(`Failed to load positional audio ${name}: ${error}`);
        reject(error);
      }
    );
  });
};

/**
 * Play a sound by name, with optional position for positional audio
 * @param {string} name - Name of the sound to play
 * @param {THREE.Vector3} position - Position for positional audio (optional)
 * @returns {boolean} Whether the sound was successfully played
 */
export const playSound = (name, position = null) => {
  if (audioState.muted) {
    logger.debug(`Sound ${name} not played (audio muted)`);
    return false;
  }

  const soundData = audioState.sounds.get(name);
  if (!soundData) {
    logger.warn(`Sound not found: ${name}`);
    return false;
  }

  const { audio, isPositional } = soundData;
  
  // For positional audio, we need to attach it to an object at the specified position
  if (isPositional && position) {
    // If the audio is already attached to an object, we need to detach it first
    if (audio.parent !== audioState.listener) {
      audio.parent.remove(audio);
    }
    
    // Create a temporary object at the specified position
    const tempObject = new THREE.Object3D();
    tempObject.position.copy(position);
    tempObject.add(audio);
  }

  if (!soundData.isPlaying) {
    audio.play();
    soundData.isPlaying = true;
    audio.onEnded = () => {
      soundData.isPlaying = false;
    };
    logger.debug(`Playing sound: ${name}`);
    return true;
  }
  
  return false;
};

/**
 * Stop a sound by name
 * @param {string} name - Name of the sound to stop
 * @returns {boolean} Whether the sound was successfully stopped
 */
export const stopSound = (name) => {
  const soundData = audioState.sounds.get(name);
  if (soundData && soundData.isPlaying) {
    soundData.audio.stop();
    soundData.isPlaying = false;
    logger.debug(`Stopped sound: ${name}`);
    return true;
  }
  return false;
};

/**
 * Set master volume for all sounds
 * @param {number} volume - Volume level (0.0 to 1.0)
 */
export const setMasterVolume = (volume) => {
  audioState.masterVolume = Math.max(0, Math.min(1, volume));
  audioState.sounds.forEach((soundData) => {
    soundData.audio.setVolume(soundData.audio.volume * audioState.masterVolume);
  });
  logger.debug(`Master volume set: ${audioState.masterVolume}`);
};

/**
 * Toggle mute state for all sounds
 * @returns {boolean} The new mute state
 */
export const toggleMute = () => {
  audioState.muted = !audioState.muted;
  
  audioState.sounds.forEach((soundData) => {
    if (audioState.muted) {
      if (soundData.isPlaying) {
        soundData.audio.pause();
      }
    } else {
      if (soundData.isPlaying) {
        soundData.audio.play();
      }
    }
  });
  
  logger.debug(`Audio ${audioState.muted ? 'muted' : 'unmuted'}`);
  return audioState.muted;
};

/**
 * Get the current audio state
 * @returns {Object} The current audio state
 */
export const getAudioState = () => {
  return {
    masterVolume: audioState.masterVolume,
    muted: audioState.muted,
    loadedSounds: Array.from(audioState.sounds.keys())
  };
}; 