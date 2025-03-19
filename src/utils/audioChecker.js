/**
 * audioChecker.js - Utility for verifying audio files exist and can be loaded
 * 
 * This module provides functions to check if audio files exist and are valid before attempting
 * to load them in the main game. It helps diagnose audio-related issues early in the loading process.
 * 
 * Example usage:
 * import { checkAudioFiles } from './utils/audioChecker.js';
 * 
 * // In your game initialization:
 * const audioStatus = await checkAudioFiles();
 * if (!audioStatus.success) {
 *     console.error('Audio files failed to load:', audioStatus.failures);
 * }
 */

import { logger } from './logger.js';

/**
 * List of all audio files used in the game
 * Add new audio files to this list as they are added to the game
 */
const AUDIO_FILES = [
    // SFX audio files
    { path: './sfx/gunshot.mp3', name: 'gunshot', type: 'sfx', required: false },
    { path: './sfx/zombie-growl.mp3', name: 'zombie-growl', type: 'sfx', required: false },
    { path: './sfx/zombie-death.mp3', name: 'zombie-death', type: 'sfx', required: false },
    { path: './sfx/player-hit.mp3', name: 'player-hit', type: 'sfx', required: false },
    { path: './sfx/powerup-pickup.mp3', name: 'powerup-pickup', type: 'sfx', required: false },
    { path: './sfx/explosion.mp3', name: 'explosion', type: 'sfx', required: false },
    { path: './sfx/shotgun.mp3', name: 'shotgun', type: 'sfx', required: false },
    { path: './sfx/laser.mp3', name: 'laser', type: 'sfx', required: false },
    { path: './sfx/bullet.mp3', name: 'bullet', type: 'sfx', required: false },
    
    // Music audio files
    { path: './music/Electric Heartbeat.mp3', name: 'Electric-Heartbeat', type: 'music', required: false },
    { path: './music/Electric Pulse.mp3', name: 'Electric-Pulse', type: 'music', required: false },
    { path: './music/Night Circuit.mp3', name: 'Night-Circuit', type: 'music', required: false },
    { path: './music/Night of the Undead1.mp3', name: 'Night-of-the-Undead1', type: 'music', required: false },
    { path: './music/Pulse Control.mp3', name: 'Pulse-Control', type: 'music', required: false }
];

/**
 * Check if audio files exist and can be loaded
 * 
 * @returns {Promise<Object>} Object containing success status and list of failures
 */
export const checkAudioFiles = async () => {
    const results = {
        success: true,
        checked: 0,
        loaded: 0,
        failures: [],
        warnings: []
    };
    
    logger.info('audio', 'Checking audio files...');
    
    const checkPromises = AUDIO_FILES.map(file => {
        return new Promise((resolve) => {
            const audio = new Audio();
            let timeoutId;

            // Successfully loaded
            audio.addEventListener('canplaythrough', () => {
                clearTimeout(timeoutId);
                results.loaded++;
                logger.debug('audio', `✓ Audio file verified: ${file.name} (${file.path})`);
                resolve(true);
            }, { once: true });
            
            // Error loading
            audio.addEventListener('error', (error) => {
                clearTimeout(timeoutId);
                
                const errorInfo = {
                    file: file.path,
                    name: file.name,
                    type: file.type,
                    error: error.message || 'Unknown error',
                    status: file.required ? 'ERROR' : 'WARNING'
                };
                
                if (file.required) {
                    results.success = false;
                    results.failures.push(errorInfo);
                    logger.error('audio', `✗ Required audio file missing: ${file.name} (${file.path})`);
                } else {
                    results.warnings.push(errorInfo);
                    logger.warn('audio', `⚠ Optional audio file missing: ${file.name} (${file.path})`);
                }
                
                resolve(false);
            }, { once: true });
            
            // Set timeout for loading (5 seconds)
            timeoutId = setTimeout(() => {
                const timeoutInfo = {
                    file: file.path,
                    name: file.name,
                    type: file.type,
                    error: 'Timeout loading audio file',
                    status: file.required ? 'ERROR' : 'WARNING'
                };
                
                if (file.required) {
                    results.success = false;
                    results.failures.push(timeoutInfo);
                    logger.error('audio', `✗ Timeout loading required audio: ${file.name} (${file.path})`);
                } else {
                    results.warnings.push(timeoutInfo);
                    logger.warn('audio', `⚠ Timeout loading optional audio: ${file.name} (${file.path})`);
                }
                
                resolve(false);
            }, 5000);
            
            // Start loading the file
            results.checked++;
            audio.src = file.path;
            audio.load();
        });
    });
    
    // Wait for all checks to complete
    await Promise.all(checkPromises);
    
    logger.info('audio', `Audio check complete: ${results.loaded}/${results.checked} files verified`);
    
    if (!results.success) {
        logger.error('audio', `Failed to load ${results.failures.length} required audio files`);
    }
    
    if (results.warnings.length > 0) {
        logger.warn('audio', `${results.warnings.length} optional audio files missing`);
    }
    
    return results;
};

/**
 * Fix common audio path issues
 * This function helps correct common path issues with audio files
 * 
 * @param {string} originalPath - The original path to the audio file
 * @returns {string} The corrected path
 */
export const fixAudioPath = (originalPath) => {
    // Check if path starts with './' (relative path)
    if (!originalPath.startsWith('./') && !originalPath.startsWith('/')) {
        // Add './' to the beginning
        return './' + originalPath;
    }
    
    // For VITE server configuration, if path includes 'audio/' directory, remove it
    if (originalPath.includes('/audio/')) {
        // If path contains '/audio/sfx/', replace with '/sfx/'
        if (originalPath.includes('/audio/sfx/')) {
            return originalPath.replace('/audio/sfx/', '/sfx/');
        }
        
        // If path contains '/audio/music/', replace with '/music/'
        if (originalPath.includes('/audio/music/')) {
            return originalPath.replace('/audio/music/', '/music/');
        }
    }
    
    return originalPath;
};

/**
 * Provides a fix suggestion based on the error
 * @param {object} failure - Failed audio check result
 * @returns {string} - Suggested fix
 */
export const suggestAudioFix = (failure) => {
    const { error, file } = failure;
    
    if (error.includes('Network error') || error.includes('not found')) {
        return `Check if the file exists at path: ${file.path}`;
    } else if (error.includes('Decoding error')) {
        return `The file may be corrupted. Try replacing it with a valid audio file.`;
    } else if (error.includes('Format not supported')) {
        return `Convert the audio to a widely supported format like MP3.`;
    } else {
        return `Check browser console for more details.`;
    }
}; 