/**
 * Audio Loader Module - Handles loading and initialization of audio assets
 * 
 * This module provides functions for loading both global audio (music, UI sounds)
 * and positional audio (sounds that occur at specific locations in the 3D world).
 * 
 * Example usage:
 * import { loadAudio, loadPositionalAudio } from './gameplay/audio-loader.js';
 * 
 * // Load a UI sound effect
 * await loadAudio('buttonClick', '/audio/click.mp3', false, 0.8, 'sfx');
 * 
 * // Load background music
 * await loadAudio('backgroundMusic', '/audio/music/theme.mp3', true, 0.5, 'music');
 * 
 * // Load a positional explosion sound
 * await loadPositionalAudio('explosion', '/audio/explosion.mp3', 10, 0.8);
 */

import * as THREE from 'three';
import { logger } from '../utils/logger.js';
import { audioState } from './audio-core.js';

/**
 * Load a global audio file (e.g., music, gunshot)
 * @param {string} name - Unique identifier for the sound
 * @param {string} url - Path to the audio file
 * @param {boolean} isLooping - Whether the sound should loop
 * @param {number} volume - Volume level (0.0 to 1.0)
 * @param {string} type - Type of sound ('music' or 'sfx')
 * @returns {Promise} Promise that resolves when the audio is loaded
 */
export const loadAudio = (name, url, isLooping = false, volume = 1.0, type = 'sfx') => {
  return new Promise((resolve, reject) => {
    const audioLoader = new THREE.AudioLoader();
    const sound = new THREE.Audio(audioState.listener);
    
    // Apply the appropriate volume based on type
    const adjustedVolume = type === 'music' 
      ? volume * audioState.musicVolume * audioState.masterVolume
      : volume * audioState.sfxVolume * audioState.masterVolume;

    audioLoader.load(
      url,
      (buffer) => {
        sound.setBuffer(buffer);
        sound.setLoop(isLooping);
        sound.setVolume(adjustedVolume);
        audioState.sounds.set(name, { 
          audio: sound, 
          buffer, 
          isPlaying: false,
          type
        });
        logger.debug('audio', `Audio loaded: ${name} (${type})`);
        resolve(sound);
      },
      undefined,
      (error) => {
        logger.error('audio', `Failed to load audio ${name}: ${error}`);
        reject(error);
      }
    );
  });
};

/**
 * Load a positional audio file (e.g. explosion)
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
    
    // Apply SFX volume to positional audio
    const adjustedVolume = volume * audioState.sfxVolume * audioState.masterVolume;

    audioLoader.load(
      url,
      (buffer) => {
        sound.setBuffer(buffer);
        sound.setRefDistance(refDistance);
        sound.setVolume(adjustedVolume);
        audioState.sounds.set(name, { 
          audio: sound, 
          buffer, 
          isPlaying: false, 
          isPositional: true,
          type: 'sfx'
        });
        logger.debug('audio', `Positional audio loaded: ${name}`);
        resolve(sound);
      },
      undefined,
      (error) => {
        logger.error('audio', `Failed to load positional audio ${name}: ${error}`);
        reject(error);
      }
    );
  });
}; 