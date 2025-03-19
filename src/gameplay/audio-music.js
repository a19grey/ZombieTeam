/**
 * Audio Music Module - Manages music tracks and random music playback
 * 
 * This module provides functionality for loading, managing, and playing music tracks.
 * It supports random music selection and automatic playback of the next track.
 * 
 * Example usage:
 * import { loadMusicTracks, playRandomMusicTrack, setRandomMusicEnabled } from './gameplay/audio-music.js';
 * 
 * // Load all music tracks
 * await loadMusicTracks('./audio/music/');
 * 
 * // Start playing random music
 * playRandomMusicTrack();
 * 
 * // Enable/disable random music
 * setRandomMusicEnabled(true);
 */

import { logger } from '../utils/logger.js';
import { audioState } from './audio-core.js';
import { loadAudio } from './audio-loader.js';
import { playSound, stopSound } from './audio-playback.js';

// Store music tracks for random playback
export const musicTracks = [];
export let currentMusicIndex = -1;
export let isRandomMusicEnabled = true;

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
    
    logger.info('audio', `Loading ${musicFiles.length} music tracks...`);
    
    // Clear existing music tracks
    musicTracks.length = 0;
    
    // Load each music track with sanitized file name as the track name
    for (const file of musicFiles) {
      // Remove file extension and sanitize name (replace spaces with dashes)
      const baseName = file.replace('.mp3', '');
      const sanitizedName = baseName.replace(/\s+/g, '-').replace(/[()]/g, '');
      
      await loadAudio(sanitizedName, `${directory}${file}`, true, 0.5, 'music');
      musicTracks.push(sanitizedName);
      logger.debug('audio', `Loaded music track: ${file} as ${sanitizedName}`);
    }
    
    logger.info('audio', `Successfully loaded ${musicTracks.length} music tracks`);
    return true;
  } catch (error) {
    logger.error('audio', `Failed to load music tracks: ${error}`);
    return false;
  }
};

/**
 * Play a random music track from the loaded tracks
 * @returns {boolean} Whether a track was successfully played
 */
export const playRandomMusicTrack = () => {
  logger.info('audio', 'A: playRandomMusicTrack is going to play a random track');
  if (!isRandomMusicEnabled || musicTracks.length === 0) {
    logger.debug('audio', 'C: No random music - enabled: ' + isRandomMusicEnabled + ', tracks: ' + musicTracks.length);
    return false;
  }
  
  // Stop current music if playing
  if (currentMusicIndex >= 0 && currentMusicIndex < musicTracks.length) {
    const currentTrack = musicTracks[currentMusicIndex];
    logger.debug('audio', 'D: Stopping current track before playing new one: ' + currentTrack);
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
  logger.debug('audio', 'E: Selected track #' + newIndex + ': ' + trackToPlay);
  
  // Get the sound data for the track
  const soundData = audioState.sounds.get(trackToPlay);
  if (soundData && soundData.audio) {
    // Set up the onEnded callback to play the next random track
    soundData.audio.onEnded = () => {
      soundData.isPlaying = false;
      logger.debug('audio', 'B: Sound ended: ' + trackToPlay);
      // Play another random track when this one ends
      logger.debug('audio', 'F: Sound ended naturally, calling playRandomMusicTrack again');
      playRandomMusicTrack();
    };
    
    logger.debug('audio', 'G: Track setup complete - isLooping: ' + soundData.audio.loop + ' duration: ' + (soundData.duration || 'unknown'));
  } else {
    logger.warn('audio', 'H: Sound data not found for track: ' + trackToPlay);
  }
  
  // Play the selected track
  const success = playSound(trackToPlay);
  if (success) {
    logger.debug('audio', 'I: Successfully started playing music track: ' + trackToPlay);
  } else {
    logger.warn('audio', 'J: Failed to play music track: ' + trackToPlay);
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
    logger.info('audio', 'Random music playback disabled');
  } else {
    // Start playing a random track if enabled
    playRandomMusicTrack();
    logger.info('audio', 'Random music playback enabled');
  }
  
  return isRandomMusicEnabled;
}; 