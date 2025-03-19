/**
 * Audio Module - Main entry point for the audio system
 * 
 * This module re-exports all functionality from the individual audio modules:
 * - audio-core.js: Core audio setup and state management
 * - audio-loader.js: Functions for loading audio files
 * - audio-playback.js: Functions for playing and stopping sounds
 * - audio-volume.js: Volume control functions
 * - audio-music.js: Music track management
 * 
 * Example usage:
 * import { 
 *   initAudio, loadAudio, playSound, setMasterVolume, 
 *   loadMusicTracks, playRandomMusicTrack 
 * } from './gameplay/audio.js';
 * 
 * // Initialize audio system
 * initAudio(camera);
 * 
 * // Load background music and sound effects
 * await loadAudio('backgroundMusic', '/audio/Pulse-Drive.mp3', true, 0.5, 'music');
 * await loadAudio('gunshot', '/audio/gunshot.mp3', false, 0.8);
 * 
 * // Play sounds
 * playSound('backgroundMusic'); // Play background music
 * playSound('gunshot'); // Play gunshot sound
 * 
 * // Debug with URL parameters:
 * // ?debug=5&debugSection=audio       - Enable detailed audio logs
 * // ?debugAll=true                    - Enable all debug sections
 */

// Re-export from audio-core.js
export { 
  initAudio,
  getAudioState,
  debugAudioSystem,
  setAudioEnabled,
  audioState 
} from './audio-core.js';

// Re-export from audio-loader.js
export { 
  loadAudio,
  loadPositionalAudio 
} from './audio-loader.js';

// Re-export from audio-playback.js
export { 
  playSound,
  stopSound 
} from './audio-playback.js';

// Re-export from audio-volume.js
export { 
  setMasterVolume,
  setMusicVolume,
  setSfxVolume,
  toggleMute 
} from './audio-volume.js';

// Re-export from audio-music.js
export { 
  loadMusicTracks,
  playRandomMusicTrack,
  setRandomMusicEnabled,
  musicTracks,
  currentMusicIndex,
  isRandomMusicEnabled 
} from './audio-music.js'; 