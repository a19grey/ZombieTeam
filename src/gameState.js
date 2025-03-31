/**
 * Game State Module - Defines and manages the game state
 * 
 * This file contains the central gameState object that tracks all game variables
 * including player stats, enemies, bullets, and game settings. It also includes
 * functions for managing game state like handling game over.
 * 
 * Example usage: Import gameState to access or modify game variables
 */

import { logger } from './utils/logger.js';
import { stopSound } from './gameplay/audio.js';
import { showMessage } from './ui/ui.js';

// Set log level based on environment
const DEBUG_MODE = window.NODE_ENV === 'development';
console.log('GAMESTATE.JS: NODE_ENV = ', window.NODE_ENV);
console.log('GAMESTATE.JS: DEBUG_MODE =', DEBUG_MODE);

// Game state
const gameState = {
    player: {
        health: 100, exp: 0, damage: 40, speed: 0.15, activePowerup: null, powerupDuration: 0, name: 'Unknown Survivor'
    },
    zombies: [],bullets: [],keys: {},mouse: { x: 0, y: 0 },
    mouseDown: false, // Track if mouse button is held down
    gameOver: false, debug: DEBUG_MODE, /* Enable debug mode*/ camera: null, // Added for camera reference
    powerups: [], lastShotTime: 0, environmentObjects: [], // Store environment objects
    enemySpawnRate: 200, // Time between enemy spawns in ms (reduced for more zombies)
    powerupSpawnRate: 3500, // ms between powerup spawns
    lastEnemySpawnTime: 0, maxZombies: 500, // Maximum number of zombies allowed at once
    initialSpawnCount: 200, // Number of zombies to spawn at start (increased from 30 to 300)
    dismembermentParticles: [], // Store colorful particles for dismemberment effects
    lastPowerupSpawnTime: 0, // Track when the last powerup was spawned
    playerObject: null, // Store player object for access by other functions
    baseSpeed: 0.07, // Global base speed for player and enemies
    score: 0, // Initialize score to 0
    // Sound control parameters
    sound: {
        lastZombieSoundTime: 0,     // Last time any zombie made a sound
        zombieSoundCheckInterval: 600, // Check for zombie sounds every 600ms
        zombieSoundChance: {         // Chance that a zombie type will make a sound (per check)
            zombie: 0.04,            // 3% chance for regular zombies
            skeletonArcher: 0.02,    // 2% chance for archers
            exploder: 0.05,          // 5% chance for exploders
            zombieKing: 0.15         // 15% chance for zombie kings
        },
        maxZombieSoundsPerInterval: 1 // Maximum number of zombie sounds per interval
    },
    // Game statistics for end-game summary
    stats: {
        startTime: Date.now(),       // When the game started
        zombiesKilled: 0,            // Total zombies killed
        distanceTraveled: 0          // Distance traveled by player (calculated at game over)
    }
};

// Make gameState globally accessible for zombie collision detection
window.gameState = gameState;

// Update player speed to reference the global base speed
gameState.player.speed = gameState.baseSpeed;

/**
 * Sets the global base speed for both player and enemies
 * @param {number} newSpeed - The new base speed value
 */
const setGlobalBaseSpeed = (newSpeed) => {
    if (typeof newSpeed === 'number' && newSpeed > 0) {
        gameState.baseSpeed = newSpeed;
        gameState.player.speed = newSpeed;
        logger.debug('speed', `Global base speed updated to: ${newSpeed}`);
    } else {
        logger.error('speed', 'Invalid speed value provided to setGlobalBaseSpeed');
    }
};

// Add the function to gameState for access
gameState.setGlobalBaseSpeed = setGlobalBaseSpeed;

/**
 * Handles game over state, displays message and sets up restart functionality
 */
const handleGameOver = () => {
    // Stop background music
    stopSound('backgroundMusic');
    
    gameState.gameOver = true;
    
    // Save player name to localStorage for next session
    if (gameState.player.name) {
        localStorage.setItem('playerName', gameState.player.name);
    }
    
    // Calculate final stats
    const timePlayedMs = Date.now() - gameState.stats.startTime;
    const timePlayedSeconds = Math.floor(timePlayedMs / 1000);
    const minutes = Math.floor(timePlayedSeconds / 60);
    const seconds = timePlayedSeconds % 60;
    const formattedTime = `${minutes}m ${seconds}s`;
    
    // Calculate distance traveled as direct distance from origin
    if (gameState.playerObject) {
        const pos = gameState.playerObject.position;
        const distanceFromOrigin = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
        gameState.stats.distanceTraveled = distanceFromOrigin;
    }
    
    // Display game over message
    const gameOverDiv = document.createElement('div');
    gameOverDiv.style.position = 'absolute';
    gameOverDiv.style.top = '50%';
    gameOverDiv.style.left = '50%';
    gameOverDiv.style.transform = 'translate(-50%, -50%)';
    gameOverDiv.style.color = 'red';
    gameOverDiv.style.fontSize = '48px';
    gameOverDiv.style.fontWeight = 'bold';
    gameOverDiv.style.textAlign = 'center';
    gameOverDiv.style.textShadow = '2px 2px 4px #000000';
    gameOverDiv.style.padding = '30px';
    gameOverDiv.style.borderRadius = '15px';
    gameOverDiv.style.backgroundColor = 'rgba(50, 50, 50, 0.4)';
    gameOverDiv.style.boxShadow = '0 0 20px rgba(0, 0, 0, 0.5)';
    gameOverDiv.style.width = '80%';
    gameOverDiv.style.maxWidth = '600px';
    gameOverDiv.innerHTML = `
        GAME OVER<br>
        ${gameState.player.name} has fallen!<br>
        Score: ${gameState.score}<br>
        <div style="font-size: 28px; margin-top: 15px; color: #ffffff; line-height: 1.4;">
            Time Survived: ${formattedTime}<br>
            Zombies Killed: ${gameState.stats.zombiesKilled}<br>
            Distance Traveled: ${Math.round(gameState.stats.distanceTraveled)} meters
        </div><br>
        <span style="font-size: 24px">Press R to restart</span>
    `;
    
    // Create restart button for mobile users
    const restartButton = document.createElement('button');
    restartButton.textContent = 'RESTART GAME';
    restartButton.id = 'restartButton';
    Object.assign(restartButton.style, {
        backgroundColor: '#ff3030',
        color: 'white',
        border: 'none',
        padding: '15px 30px',
        borderRadius: '5px',
        fontSize: '20px',
        fontWeight: 'bold',
        cursor: 'pointer',
        marginTop: '20px',
        boxShadow: '0 0 10px rgba(0, 0, 0, 0.5)',
        display: 'block',
        margin: '20px auto',
        transition: 'all 0.2s ease',
        WebkitTapHighlightColor: 'transparent', // Remove tap highlight on mobile
        touchAction: 'manipulation', // Optimize for touch
        userSelect: 'none' // Prevent text selection
    });
    
    // Add hover effects for desktop
    restartButton.onmouseover = () => {
        Object.assign(restartButton.style, {
            backgroundColor: '#ff5050',
            transform: 'scale(1.05)'
        });
    };
    
    restartButton.onmouseout = () => {
        Object.assign(restartButton.style, {
            backgroundColor: '#ff3030',
            transform: 'scale(1)'
        });
    };
    
    // Add mobile touch feedback
    restartButton.addEventListener('touchstart', (e) => {
        e.preventDefault(); // Prevent double-tap zoom on mobile
        Object.assign(restartButton.style, {
            backgroundColor: '#ff5050',
            transform: 'scale(1.05)'
        });
    }, { passive: false });
    
    restartButton.addEventListener('touchend', () => {
        Object.assign(restartButton.style, {
            backgroundColor: '#ff3030',
            transform: 'scale(1)'
        });
        
        // Delay the reload slightly to show the button press animation
        setTimeout(() => {
            location.reload();
        }, 100);
    });
    
    // Add click event for desktop
    restartButton.addEventListener('click', (e) => {
        // Only trigger on real mouse clicks, not on touch events that generate click events
        if (e.pointerType !== 'touch') {
            location.reload();
        }
    });
    
    // Create "TO VIBEVERSE" button
    const vibeVerseButton = document.createElement('button');
    vibeVerseButton.textContent = 'TO VIBEVERSE';
    vibeVerseButton.id = 'vibeVerseButton';
    Object.assign(vibeVerseButton.style, {
        backgroundColor: '#00aa44', // Green color for Vibeverse
        color: 'white',
        border: 'none',
        padding: '15px 30px',
        borderRadius: '5px',
        fontSize: '20px',
        fontWeight: 'bold',
        cursor: 'pointer',
        marginTop: '10px',
        boxShadow: '0 0 10px rgba(0, 0, 0, 0.5)',
        display: 'block',
        margin: '20px auto',
        transition: 'all 0.2s ease',
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation',
        userSelect: 'none'
    });
    
    // Add hover effects
    vibeVerseButton.onmouseover = () => {
        Object.assign(vibeVerseButton.style, {
            backgroundColor: '#00cc55',
            transform: 'scale(1.05)'
        });
    };
    
    vibeVerseButton.onmouseout = () => {
        Object.assign(vibeVerseButton.style, {
            backgroundColor: '#00aa44',
            transform: 'scale(1)'
        });
    };
    
    // Handle click/touch
    const handleVibeVerseTransport = () => {
        // Create URL parameters with player state
        const params = new URLSearchParams({
            portal: 'true',
            username: gameState.player.name || 'Fallen Survivor',
            score: gameState.score.toString(),
            health: '100', // Reset health for new game
            color: 'red',
            speed: gameState.baseSpeed.toString(),
            ref: window.location.href // URL of our game as referrer
        });
        
        // Redirect to Vibeverse
        window.location.href = `http://portal.pieter.com/?${params.toString()}`;
    };
    
    vibeVerseButton.addEventListener('click', (e) => {
        if (e.pointerType !== 'touch') {
            handleVibeVerseTransport();
        }
    });
    
    vibeVerseButton.addEventListener('touchend', () => {
        setTimeout(handleVibeVerseTransport, 100);
    });
    
    // Create "Take me back to last game" button
    const backButton = document.createElement('button');
    backButton.textContent = 'TAKE ME BACK TO LAST GAME';
    backButton.id = 'backButton';
    Object.assign(backButton.style, {
        backgroundColor: '#4444ff', // Blue color for back button
        color: 'white',
        border: 'none',
        padding: '15px 30px',
        borderRadius: '5px',
        fontSize: '20px',
        fontWeight: 'bold',
        cursor: 'pointer',
        marginTop: '10px',
        boxShadow: '0 0 10px rgba(0, 0, 0, 0.5)',
        display: 'block',
        margin: '20px auto',
        transition: 'all 0.2s ease',
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation',
        userSelect: 'none'
    });
    
    // Add hover effects
    backButton.onmouseover = () => {
        Object.assign(backButton.style, {
            backgroundColor: '#5555ff',
            transform: 'scale(1.05)'
        });
    };
    
    backButton.onmouseout = () => {
        Object.assign(backButton.style, {
            backgroundColor: '#4444ff',
            transform: 'scale(1)'
        });
    };
    
    // Check if we have a referrer URL to go back to
    const urlParams = new URLSearchParams(window.location.search);
    const referrerUrl = urlParams.get('ref');
    
    // Only show the back button if we have a referrer
    if (referrerUrl) {
        backButton.addEventListener('click', (e) => {
            if (e.pointerType !== 'touch') {
                window.location.href = referrerUrl;
            }
        });
        
        backButton.addEventListener('touchend', () => {
            setTimeout(() => {
                window.location.href = referrerUrl;
            }, 100);
        });
    } else {
        // If no referrer, hide the button
        backButton.style.display = 'none';
    }
    
    // Make buttons bigger on mobile
    if (window.gameState?.controls?.isMobileDevice || window.gameState?.controls?.isTouchDevice) {
        const styleButtons = (btn) => {
            Object.assign(btn.style, {
                padding: '20px 40px',
                fontSize: '24px',
                marginTop: '15px'
            });
        };
        
        styleButtons(restartButton);
        styleButtons(vibeVerseButton);
        styleButtons(backButton);
    }
    
    // Add buttons to game over div
    gameOverDiv.appendChild(restartButton);
    gameOverDiv.appendChild(vibeVerseButton);
    gameOverDiv.appendChild(backButton);
    document.body.appendChild(gameOverDiv);
    
    // Add event listener for restart via keyboard (keep this for desktop users)
    document.addEventListener('keydown', (event) => {
        if (event.key.toLowerCase() === 'r' && gameState.gameOver) {
            location.reload(); // Simple reload to restart
        }
    });
};

// Assign the handleGameOver function to gameState
gameState.handleGameOver = handleGameOver;

/**
 * Initializes player position tracking for distance calculation
 * @param {Object} position - Object containing x, y, z coordinates
 */
const initPlayerPositionTracking = (position) => {
    // No longer needed with simplified distance calculation
    // but keeping the empty function to avoid breaking existing code
    logger.debug('stats', 'Using simplified distance calculation');
};

// Add the functions to gameState for access
gameState.initPlayerPositionTracking = initPlayerPositionTracking;

export { gameState, handleGameOver, setGlobalBaseSpeed }; 