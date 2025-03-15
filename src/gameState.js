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
console.log('i am here GAMESTATE.JS: NODE_ENV = ', window.NODE_ENV);
console.log('cat man dog GAMESTATE.JS: DEBUG_MODE =', DEBUG_MODE);

// Game state
const gameState = {
    player: {
        health: 100,
        exp: 0,
        damage: 40,
        speed: 0.15,
        activePowerup: null,
        powerupDuration: 0
    },
    zombies: [],
    bullets: [],
    keys: {},
    mouse: { x: 0, y: 0 },
    mouseDown: false, // Track if mouse button is held down
    gameOver: false,
    debug: DEBUG_MODE, // Enable debug mode
    camera: null, // Added for camera reference
    powerups: [],
    lastShotTime: 0,
    environmentObjects: [], // Store environment objects
    enemySpawnRate: 200, // Time between enemy spawns in ms (reduced for more zombies)
    lastEnemySpawnTime: 0,
    maxZombies: 1000, // Maximum number of zombies allowed at once
    initialSpawnCount: 10, // Number of zombies to spawn at start (increased from 30 to 300)
    bloodParticles: [], // Store blood particles for dismemberment effects
    lastPowerupSpawnTime: 0, // Track when the last powerup was spawned
    playerObject: null, // Store player object for access by other functions
    // Debug settings
    debug: {
        enabled: DEBUG_MODE,
        gunFireRate: 100, // ms between shots
        playerMoveSpeed: 0.15, // Base movement speed
        zombieSpawnRate: 200, // ms between zombie spawns
        powerupSpawnRate: 15000, // ms between powerup spawns
        camera: {
            distance: 10, // Distance from player
            height: 10,   // Height above ground
            tilt: 0,      // Camera tilt angle in degrees
            defaultValues: {
                distance: 10,
                height: 10,
                tilt: 0
            }
        }
    }
};

// Make gameState globally accessible for zombie collision detection
window.gameState = gameState;

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

export { gameState, handleGameOver }; 