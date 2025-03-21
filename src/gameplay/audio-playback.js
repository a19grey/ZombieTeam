/**
 * Audio Playback Module - Handles playing and stopping sound effects and music
 * 
 * This module provides functions for playing and stopping both global and positional audio.
 * It handles the playback state and positioning of sounds in 3D space.
 * 
 * Example usage:
 * import { playSound, stopSound } from './gameplay/audio-playback.js';
 * 
 * // Play a global sound
 * playSound('buttonClick');
 * 
 * // Play a positional sound at a specific location
 * playSound('explosion', new THREE.Vector3(10, 0, 5));
 * 
 * // Stop a currently playing sound
 * stopSound('backgroundMusic');
 */

import * as THREE from 'three';
import { logger } from '../utils/logger.js';
import { audioState } from './audio-core.js';
import { musicTracks } from './audio-music.js';

/**
 * Play a sound by name, with optional position for positional audio
 * @param {string} name - Name of the sound to play
 * @param {THREE.Vector3|Object} position - Position for positional audio (optional)
 * @returns {boolean} Whether the sound was successfully played
 */
export const playSound = (name, position = null) => {
  logger.verbose('audio', 'M: playSound: ' + name);
  // Check if audio system is enabled
  if (!audioState.enabled) {
    logger.debug('audio', 'N: Sound ' + name + ' not played (audio system disabled)');
    return false;
  }
  
  if (audioState.muted) {
    logger.debug('audio', 'O: Sound ' + name + ' not played (audio muted)');
    return false;
  }

  const soundData = audioState.sounds.get(name);
  if (!soundData) {
    logger.warn('audio', 'P: Sound not found: ' + name);
    // List available sounds to help debugging
    const availableSounds = Array.from(audioState.sounds.keys()).join(', ');
    logger.warn('audio', 'Q: Sound not found: "' + name + '". Available sounds: ' + (availableSounds || 'none'));
    return false;
  }

  const { audio, isPositional, type, buffer } = soundData;
  logger.debug('audio', 'R: About to play sound: ' + name + ' - Type: ' + type + ' - ContextState: ' + (audio.context?.state || 'unknown'));
  
  // Check if audio context is suspended and try to resume it
  if (audio.context && audio.context.state === 'suspended') {
    logger.debug('audio', 'S: Attempting to resume audio context for ' + name);
    audio.context.resume().then(() => {
      logger.debug('audio', 'T: Audio context resumed successfully');
    }).catch(error => {
      logger.error('audio', 'U: Failed to resume audio context: ' + error);
    });
  }
  
  try {
    // For positional audio, create a new instance each time to allow concurrent sounds
    if (isPositional && position) {
      logger.debug('audio', 'Creating new positional audio instance for: ' + name);
      
      // Create a new positional audio instance for each play to allow overlapping sounds
      const newSound = new THREE.PositionalAudio(audioState.listener);
      newSound.setBuffer(buffer);
      newSound.setRefDistance(audio.refDistance || 10);
      newSound.setVolume(audio.getVolume());
      
      // Create a temporary object at the specified position and add it to the scene
      const tempObject = new THREE.Object3D();
      
      // Handle both Vector3 and object with position property
      if (position.isVector3) {
        tempObject.position.copy(position);
      } else if (position.position && position.position.isVector3) {
        tempObject.position.copy(position.position);
      } else if (typeof position.x === 'number' && typeof position.z === 'number') {
        tempObject.position.set(position.x, position.y || 0, position.z);
      }
      
      // Reference to scene
      const scene = window.scene || THREE.DefaultScene;
      if (!scene) {
        logger.error('audio', 'No scene available to add positional audio');
        return false;
      }
      
      // Add tempObject to the scene
      scene.add(tempObject);
      tempObject.add(newSound);
      
      logger.debug('audio', 'W: Created new positional audio at: ' + 
               tempObject.position.x.toFixed(2) + ',' + tempObject.position.y.toFixed(2) + ',' + tempObject.position.z.toFixed(2));
      
      // Play the sound and set up cleanup when it's done
      newSound.play();
      
      // Set up cleanup when the sound is finished
      newSound.onEnded = () => {
        logger.debug('audio', 'Removing temporary positional audio object for: ' + name);
        scene.remove(tempObject);
      };
      
      return true;
    } else {
      // For non-positional audio, use the original audio object
      logger.debug('audio', 'Y: Calling audio.play() on ' + name + ' - Loop: ' + audio.loop);
      
      if (!soundData.isPlaying) {
        audio.play();
        soundData.isPlaying = true;
        
        audio.onEnded = () => {
          logger.debug('audio', 'Z: onEnded callback triggered for: ' + name);
          soundData.isPlaying = false;
          logger.debug('audio', 'AA: Sound ended: ' + name);
          
          // For music tracks, log more details
          if (type === 'music') {
            logger.info('audio', 'AB: Music track completed: ' + name + ' - Will loop: ' + audio.loop);
            if (!audio.loop && musicTracks.includes(name)) {
              logger.info('audio', 'AC: Non-looping music track ended naturally, should trigger next track');
            }
          }
        };
        return true;
      } else {
        logger.debug('audio', 'AF: Sound ' + name + ' is already playing, not starting again');
      }
    }
  } catch (error) {
    logger.error('audio', 'AE: Error playing sound ' + name + ': ' + error);
    return false;
  }
  
  return false;
};

/**
 * Stop a sound by name
 * @param {string} name - Name of the sound to stop
 * @returns {boolean} Whether the sound was successfully stopped
 */
export const stopSound = (name) => {
  logger.verbose('audio', 'AG: stopSound: ' + name);
  const soundData = audioState.sounds.get(name);
  if (soundData && soundData.isPlaying) {
    logger.debug('audio', 'AH: Actually stopping sound: ' + name + ' - type: ' + soundData.type);
    soundData.audio.stop();
    soundData.isPlaying = false;
    logger.debug('audio', 'AI: Stopped sound: ' + name);
    return true;
  } else if (soundData) {
    logger.debug('audio', 'AJ: Called stopSound but sound was not playing: ' + name);
  } else {
    logger.debug('audio', 'AK: Called stopSound but sound not found: ' + name);
  }
  return false;
}; 