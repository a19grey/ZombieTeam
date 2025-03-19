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
    powerupSpawnRate: 1500, // ms between powerup spawns
    lastEnemySpawnTime: 0, maxZombies: 1000, // Maximum number of zombies allowed at once
    initialSpawnCount: 300, // Number of zombies to spawn at start (increased from 30 to 300)
    dismembermentParticles: [], // Store colorful particles for dismemberment effects
    lastPowerupSpawnTime: 0, // Track when the last powerup was spawned
    playerObject: null, // Store player object for access by other functions
    baseSpeed: 0.10, // Global base speed for player and enemies
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
    gameOverDiv.innerHTML = `
        GAME OVER<br>
        ${gameState.player.name} has fallen!<br>
        Score: ${gameState.player.exp}<br><br>
        <span style="font-size: 24px">Press R to restart</span>
    `;
    document.body.appendChild(gameOverDiv);
    
    // Add event listener for restart
    document.addEventListener('keydown', (event) => {
        if (event.key.toLowerCase() === 'r' && gameState.gameOver) {
            location.reload(); // Simple reload to restart
        }
    });
};

// Assign the handleGameOver function to gameState
gameState.handleGameOver = handleGameOver;

export { gameState, handleGameOver, setGlobalBaseSpeed }; 