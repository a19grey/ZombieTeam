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
 * await loadAudio('backgroundMusic', '/audio/Pulse-Drive.mp3'.mp3', true, 0.5);
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
  sounds: new Map(), // Map of sound name to { audio, buffer, isPlaying, type }
  masterVolume: 0.7,
  musicVolume: 0.5,
  sfxVolume: 0.8,
  muted: false,
  enabled: true // Global setting to enable/disable audio system
};

// Store music tracks for random playback
const musicTracks = [];
let currentMusicIndex = -1;
let isRandomMusicEnabled = true;

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
        logger.debug(`Audio loaded: ${name} (${type})`);
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
  // Check if audio system is enabled
  if (!audioState.enabled) {
    logger.debug(`Sound ${name} not played (audio system disabled)`);
    return false;
  }

  if (audioState.muted) {
    logger.debug(`Sound ${name} not played (audio muted)`);
    return false;
  }

  const soundData = audioState.sounds.get(name);
  if (!soundData) {
    logger.warn(`Sound not found: ${name}`);
    // List available sounds to help debugging
    const availableSounds = Array.from(audioState.sounds.keys()).join(', ');
    logger.warn(`Sound not found: "${name}". Available sounds: ${availableSounds || 'none'}`);
    return false;
  }

  const { audio, isPositional } = soundData;
  
  // Check if audio context is suspended and try to resume it
  if (audio.context && audio.context.state === 'suspended') {
    logger.debug(`Attempting to resume audio context for ${name}`);
    audio.context.resume().then(() => {
      logger.debug(`Audio context resumed successfully`);
    }).catch(error => {
      logger.error(`Failed to resume audio context: ${error}`);
    });
  }
  
  // For positional audio, we need to attach it to an object at the specified position
  if (isPositional && position) {
    // If the audio is already attached to an object, we need to detach it first
    if (audio.parent !== audioState.listener && audio.parent !== null) {
      audio.parent.remove(audio);
    }
    
    // Create a temporary object at the specified position
    const tempObject = new THREE.Object3D();
    tempObject.position.copy(position);
    tempObject.add(audio);
  }

  if (!soundData.isPlaying) {
    try {
      audio.play();
      soundData.isPlaying = true;
      audio.onEnded = () => {
        soundData.isPlaying = false;
      };
      logger.debug(`Playing sound: ${name}, context state: ${audio.context?.state || 'unknown'}`);
      return true;
    } catch (error) {
      logger.error(`Error playing sound ${name}: ${error}`);
      return false;
    }
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
  
  // Update all sound volumes
  updateAllSoundVolumes();
  
  logger.debug(`Master volume set: ${audioState.masterVolume}`);
};

/**
 * Set music volume
 * @param {number} volume - Volume level (0.0 to 1.0)
 */
export const setMusicVolume = (volume) => {
  audioState.musicVolume = Math.max(0, Math.min(1, volume));
  
  // Update only music volumes
  updateSoundVolumesByType('music');
  
  logger.debug(`Music volume set: ${audioState.musicVolume}`);
};

/**
 * Set sound effects volume
 * @param {number} volume - Volume level (0.0 to 1.0)
 */
export const setSfxVolume = (volume) => {
  audioState.sfxVolume = Math.max(0, Math.min(1, volume));
  
  // Update only SFX volumes
  updateSoundVolumesByType('sfx');
  
  logger.debug(`SFX volume set: ${audioState.sfxVolume}`);
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
  logger.info('=== AUDIO SYSTEM DEBUG ===');
  logger.info(`Audio Context State: ${audioState.listener?.context?.state || 'No context'}`);
  logger.info(`Audio System Enabled: ${audioState.enabled}`);
  logger.info(`Master Volume: ${audioState.masterVolume}`);
  logger.info(`Music Volume: ${audioState.musicVolume}`);
  logger.info(`SFX Volume: ${audioState.sfxVolume}`);
  logger.info(`Muted: ${audioState.muted}`);
  
  logger.info('Loaded Sounds:');
  audioState.sounds.forEach((soundData, name) => {
    logger.info(`- ${name}: ${soundData.isPlaying ? 'Playing' : 'Stopped'}, Type: ${soundData.type}, Positional: ${soundData.isPositional || false}`);
  });
  
  // Check if browser might be blocking audio
  if (audioState.listener?.context?.state === 'suspended') {
    logger.warn('Audio context is suspended. This usually means the browser is blocking autoplay.');
    logger.info('Try resuming the audio context after user interaction:');
    logger.info('audioState.listener.context.resume()');
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
    logger.info('Audio system disabled');
  } else {
    logger.info('Audio system enabled');
  }
  
  return audioState.enabled;
};

/**
 * Load all music tracks from the specified directory
 * @param {string} directory - Path to the music directory
 * @returns {Promise} Promise that resolves when all tracks are loaded
 */
export const loadMusicTracks = async (directory = './audio/music/') => {
  try {
    // List of music files to load
    const musicFiles = [
      'Electric Heartbeat.mp3',
      'Electric Pulse.mp3',
      'Night Circuit.mp3',
      'Night of the Undead1.mp3',
      'Pulse Control.mp3',
      'Pulse Drive_deux.mp3',
      'Pulse-Drive.mp3',
      'Pulse of the Shadows.mp3',
      'Pulse of the Shadows_deux.mp3',
      'Pulse of the Undead.mp3',
      'Pulse of the Undead_Chill.mp3',
      'Zombie Shuffle.mp3'
    ];
    
    logger.info(`Loading ${musicFiles.length} music tracks...`);
    
    // Clear existing music tracks
    musicTracks.length = 0;
    
    // Load each music track with sanitized file name as the track name
    for (const file of musicFiles) {
      // Remove file extension and sanitize name (replace spaces with dashes)
      const baseName = file.replace('.mp3', '');
      const sanitizedName = baseName.replace(/\s+/g, '-').replace(/[()]/g, '');
      
      await loadAudio(sanitizedName, `${directory}${file}`, true, 0.5, 'music');
      musicTracks.push(sanitizedName);
      logger.debug(`Loaded music track: ${file} as ${sanitizedName}`);
    }
    
    logger.info(`Successfully loaded ${musicTracks.length} music tracks`);
    return true;
  } catch (error) {
    logger.error(`Failed to load music tracks: ${error}`);
    return false;
  }
};

/**
 * Play a random music track from the loaded tracks
 * @returns {boolean} Whether a track was successfully played
 */
export const playRandomMusicTrack = () => {
  if (!isRandomMusicEnabled || musicTracks.length === 0) {
    return false;
  }
  
  // Stop current music if playing
  if (currentMusicIndex >= 0 && currentMusicIndex < musicTracks.length) {
    const currentTrack = musicTracks[currentMusicIndex];
    stopSound(currentTrack);
  }
  
  // Select a random track (different from the current one if possible)
  let newIndex;
  if (musicTracks.length === 1) {
    newIndex = 0;
  } else {
    do {
      newIndex = Math.floor(Math.random() * musicTracks.length);
    } while (newIndex === currentMusicIndex && musicTracks.length > 1);
  }
  
  currentMusicIndex = newIndex;
  const trackToPlay = musicTracks[currentMusicIndex];
  
  // Get the sound data for the track
  const soundData = audioState.sounds.get(trackToPlay);
  if (soundData && soundData.audio) {
    // Set up the onEnded callback to play the next random track
    soundData.audio.onEnded = () => {
      soundData.isPlaying = false;
      // Play another random track when this one ends
      playRandomMusicTrack();
    };
  }
  
  // Play the selected track
  const success = playSound(trackToPlay);
  if (success) {
    logger.info(`Now playing music track: ${trackToPlay}`);
  }
  
  return success;
};

/**
 * Enable or disable random music playback
 * @param {boolean} enabled - Whether random music should be enabled
 * @returns {boolean} The new enabled state
 */
export const setRandomMusicEnabled = (enabled) => {
  isRandomMusicEnabled = !!enabled;
  
  if (!isRandomMusicEnabled) {
    // Stop all music tracks if random music is disabled
    musicTracks.forEach(track => {
      stopSound(track);
    });
    logger.info('Random music playback disabled');
  } else {
    // Start playing a random track if enabled
    playRandomMusicTrack();
    logger.info('Random music playback enabled');
  }
  
  return isRandomMusicEnabled;
}; 