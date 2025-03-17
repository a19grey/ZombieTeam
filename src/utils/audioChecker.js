/**
 * audioChecker.js
 * 
 * Utility for checking audio files at game startup to ensure they exist and can be loaded.
 * Provides detailed error reporting for missing or corrupt audio files.
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
    { path: './audio/sfx/gunshot.mp3', name: 'gunshot', required: true },
    { path: './audio/sfx/zombie-growl.mp3', name: 'zombie-growl', required: true },
    { path: './audio/sfx/player-hit.mp3', name: 'player-hit', required: true },
    { path: './audio/sfx/powerup-pickup.mp3', name: 'powerup-pickup', required: true },
    { path: './audio/sfx/zombie-death.mp3', name: 'zombie-death', required: true },
    { path: './audio/sfx/explosion.mp3', name: 'explosion', required: false },
    { path: './audio/sfx/shotgun.mp3', name: 'shotgun', required: false },
    { path: './audio/sfx/laser.mp3', name: 'laser', required: false }
];

/**
 * Checks if a single audio file exists and can be loaded
 * @param {object} audioFile - Object containing audio file information
 * @returns {Promise<object>} - Status of the audio file check
 */
const checkAudioFile = (audioFile) => {
    return new Promise((resolve) => {
        const audio = new Audio();
        let resolved = false;
        
        // Set timeout to avoid hanging
        const timeout = setTimeout(() => {
            if (!resolved) {
                resolved = true;
                resolve({
                    file: audioFile,
                    success: false,
                    error: 'Timeout loading audio file'
                });
            }
        }, 5000);
        
        // Success handler
        audio.addEventListener('canplaythrough', () => {
            if (!resolved) {
                clearTimeout(timeout);
                resolved = true;
                resolve({
                    file: audioFile,
                    success: true
                });
            }
        }, { once: true });
        
        // Error handler
        audio.addEventListener('error', (event) => {
            if (!resolved) {
                clearTimeout(timeout);
                resolved = true;
                
                let errorMsg = 'Unknown error';
                
                // Get detailed error information
                if (audio.error) {
                    switch (audio.error.code) {
                        case MediaError.MEDIA_ERR_ABORTED:
                            errorMsg = 'Loading aborted';
                            break;
                        case MediaError.MEDIA_ERR_NETWORK:
                            errorMsg = 'Network error';
                            break;
                        case MediaError.MEDIA_ERR_DECODE:
                            errorMsg = 'Decoding error (file may be corrupted)';
                            break;
                        case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
                            errorMsg = 'Format not supported';
                            break;
                    }
                }
                
                resolve({
                    file: audioFile,
                    success: false,
                    error: errorMsg
                });
            }
        }, { once: true });
        
        // Start loading
        audio.src = audioFile.path;
        audio.load();
    });
};

/**
 * Checks all game audio files to ensure they exist and can be loaded
 * @returns {Promise<object>} - Status of all audio file checks
 */
export const checkAudioFiles = async () => {
    logger.info('Checking audio files...');
    
    const results = await Promise.all(
        AUDIO_FILES.map(file => checkAudioFile(file))
    );
    
    const successes = results.filter(result => result.success);
    const failures = results.filter(result => !result.success);
    
    const criticalFailures = failures.filter(result => result.file.required);
    
    if (failures.length > 0) {
        logger.warn(`${failures.length} audio file(s) failed to load:`);
        failures.forEach(failure => {
            const logMethod = failure.file.required ? logger.error : logger.warn;
            logMethod(`- ${failure.file.name} (${failure.file.path}): ${failure.error}`);
        });
    }
    
    if (successes.length > 0) {
        logger.info(`${successes.length} audio file(s) loaded successfully`);
    }
    
    return {
        success: criticalFailures.length === 0,
        total: AUDIO_FILES.length,
        loaded: successes.length,
        failures: failures
    };
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