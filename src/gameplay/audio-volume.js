/**
 * Audio Volume Module - Manages volume settings and mute functionality
 * 
 * This module provides functions for controlling the volume levels of different sound categories
 * (master, music, sound effects) and toggling mute state.
 * 
 * Example usage:
 * import { setMasterVolume, setMusicVolume, setSfxVolume, toggleMute } from './gameplay/audio-volume.js';
 * 
 * // Set volumes (value between 0.0 and 1.0)
 * setMasterVolume(0.8);  // Set master volume to 80%
 * setMusicVolume(0.5);   // Set music volume to 50%
 * setSfxVolume(0.7);     // Set sound effects volume to 70%
 * 
 * // Toggle mute state
 * const isMuted = toggleMute(); // Returns true if now muted, false if unmuted
 */

import { logger } from '../utils/logger.js';
import { audioState } from './audio-core.js';

/**
 * Set master volume for all sounds
 * @param {number} volume - Volume level (0.0 to 1.0)
 */
export const setMasterVolume = (volume) => {
  audioState.masterVolume = Math.max(0, Math.min(1, volume));
  
  // Update all sound volumes
  updateAllSoundVolumes();
  
  logger.debug('audio', `Master volume set: ${audioState.masterVolume}`);
};

/**
 * Set music volume
 * @param {number} volume - Volume level (0.0 to 1.0)
 */
export const setMusicVolume = (volume) => {
  audioState.musicVolume = Math.max(0, Math.min(1, volume));
  
  // Update only music volumes
  updateSoundVolumesByType('music');
  
  logger.debug('audio', `Music volume set: ${audioState.musicVolume}`);
};

/**
 * Set sound effects volume
 * @param {number} volume - Volume level (0.0 to 1.0)
 */
export const setSfxVolume = (volume) => {
  audioState.sfxVolume = Math.max(0, Math.min(1, volume));
  
  // Update only SFX volumes
  updateSoundVolumesByType('sfx');
  
  logger.debug('audio', `SFX volume set: ${audioState.sfxVolume}`);
};

/**
 * Update volumes for all sounds
 */
const updateAllSoundVolumes = () => {
  audioState.sounds.forEach((soundData, name) => {
    const { audio, type } = soundData;
    const baseVolume = audio.getVolume() / (type === 'music' ? audioState.musicVolume : audioState.sfxVolume) / audioState.masterVolume;
    
    if (type === 'music') {
      audio.setVolume(baseVolume * audioState.musicVolume * audioState.masterVolume);
    } else {
      audio.setVolume(baseVolume * audioState.sfxVolume * audioState.masterVolume);
    }
  });
};

/**
 * Update volumes for sounds of a specific type
 * @param {string} type - Type of sounds to update ('music' or 'sfx')
 */
const updateSoundVolumesByType = (type) => {
  audioState.sounds.forEach((soundData, name) => {
    if (soundData.type === type) {
      const { audio } = soundData;
      const baseVolume = audio.getVolume() / (type === 'music' ? audioState.musicVolume : audioState.sfxVolume) / audioState.masterVolume;
      
      if (type === 'music') {
        audio.setVolume(baseVolume * audioState.musicVolume * audioState.masterVolume);
      } else {
        audio.setVolume(baseVolume * audioState.sfxVolume * audioState.masterVolume);
      }
    }
  });
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
  
  logger.debug('audio', `Audio ${audioState.muted ? 'muted' : 'unmuted'}`);
  return audioState.muted;
}; 