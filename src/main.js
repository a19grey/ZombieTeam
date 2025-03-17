/**
 * Zombie Survival Game - Main Entry Point
 * 
 * This file initializes the game, sets up the Three.js scene, and coordinates
 * the game loop. It imports functionality from other modules to maintain a
 * clean, modular structure.
 * 
 * Example usage: This file is loaded by index.html and automatically starts the game.
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.132.2/build/three.module.js';

import { gameState } from './gameState.js';
import { initializeGame } from './gameSetup.js';
import { animate } from './gameLoop.js';
import { initMenuSystem, addSubMenu } from './ui/menu.js';
import { createControlsMenu } from './ui/controlsMenu.js';
import { createSoundSettingsUI } from './ui/soundSettings.js';
import { logger } from './utils/logger.js';
import { debugWebGL, fixWebGLContext, monitorRenderingPerformance, createFallbackCanvas } from './debug.js';
import { checkAudioFiles, suggestAudioFix } from './utils/audioChecker.js';
import { spawnEnvironmentObjects, spawnEnemy } from './gameplay/entitySpawners.js';
import { setupEventListeners } from './eventHandlers.js';

// Set log level based on environment
const DEBUG_MODE = window.NODE_ENV === 'development';
console.log('i am here MAIN.JS: NODE_ENV = ', window.NODE_ENV);
console.log('cat man dog MAIN.JS: DEBUG_MODE =', DEBUG_MODE);

if (DEBUG_MODE) {
    logger.setLevel(logger.levels.DEBUG);
    logger.info('Debug mode enabled - verbose logging active');
} else {
    logger.setLevel(logger.levels.INFO);
    logger.info('Production mode - minimal logging active');
}

const { scene, camera, renderer, player, clock, audioListener, powerupTimer,innerCircle,powerupTimerMaterial,powerupTimerGeometry,innerCircleGeometry,innerCircleMaterial } = initializeGame(gameState);

setupEventListeners(player, scene, camera, renderer);

// Initialize menu system with error handling
try {
    initMenuSystem();
    // Add controls menu
    addSubMenu('controls', 'Game Controls', createControlsMenu());
    
    // Add sound settings menu
    addSubMenu('sound', 'Sound Settings', createSoundSettingsUI());
    
    // Example: We could add more menus here
    // addSubMenu('display', 'Display Options', createDisplayOptionsMenu());
    
    logger.info('Menu system initialized successfully');
} catch (error) {
    logger.error('Failed to initialize menu system:', error);
    // Create a fallback controls display if the menu system fails
    try {
        const fallbackControls = document.createElement('div');
        fallbackControls.innerHTML = `
            <div>WASD: Move (slower when moving south)</div>
            <div>Mouse: Aim weapon</div>
            <div>Hold Left Mouse Button: Continuous fire</div>
        `;
        Object.assign(fallbackControls.style, {
            position: 'absolute',
            bottom: '10px',
            left: '10px',
            color: 'white',
            fontSize: '14px',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            padding: '10px',
            borderRadius: '5px'
        });
        document.body.appendChild(fallbackControls);
        logger.info('Fallback controls display created');
    } catch (fallbackError) {
        logger.error('Could not create fallback controls:', fallbackError);
    }
}

// Run WebGL diagnostics
const webglDiagnostics = debugWebGL();
logger.info('WebGL diagnostics:', webglDiagnostics);


// Spawn initial environment objects
spawnEnvironmentObjects(scene, gameState);

// Spawn initial zombies
for (let i = 0; i < gameState.initialSpawnCount; i++) {
    spawnEnemy(player.position, scene, gameState);
}

if (DEBUG_MODE) {
// Start performance monitoring in debug mode
let stopMonitoring;
}

// Start animation loop
animate(scene, camera, renderer, player, clock, powerupTimer, powerupTimerGeometry, innerCircle, powerupTimerMaterial, innerCircleGeometry, innerCircleMaterial);

// Spawn initial environment objects
spawnEnvironmentObjects(scene, gameState);

// Spawn initial zombies
for (let i = 0; i < gameState.initialSpawnCount; i++) {
    spawnEnemy(player.position, scene, gameState);
}

// Game initialization
const executeTests = async (scene, camera, renderer) => {
    try {
        // Setup is already done by this point
        console.log('Running game component tests...');
        
        // Check audio files
        console.log('Checking audio files...');
        const audioStatus = await checkAudioFiles();
        
        if (!audioStatus.success) {
            console.warn(`⚠️ Some required audio files failed to load (${audioStatus.failures.length} issues)`);
            audioStatus.failures.forEach(failure => {
                if (failure.file.required) {
                    console.error(`Critical audio file missing: ${failure.file.name}`);
                    console.error(`Suggested fix: ${suggestAudioFix(failure)}`);
                }
            });
        } else {
            console.log('✅ All required audio files loaded successfully');
        }
        
        // Run Three.js and other tests
        if (scene && camera && renderer) {
            const testResults = await window.runTests(scene, renderer, camera);
            await window.testWeaponsSystem();
            
            if (testResults && testResults.success) {
                console.log('%cAll tests passed! Game is running.', 'color: green; font-weight: bold');
            } else if (testResults) {
                console.warn('%cSome tests failed. Game may have issues.', 'color: orange; font-weight: bold');
            } else {
                console.warn('%cTests could not be run. Check console for errors.', 'color: orange; font-weight: bold');
            }
        } else {
            console.error('Cannot run tests: scene, camera, or renderer not initialized');
        }
    } catch (error) {
        console.error('Test initialization error:', error);
        logger.error('Test initialization error:', error);
    }
};

// Delay tests a bit to ensure everything is loaded
setTimeout(() => {
    executeTests(scene, camera, renderer);
}, 1000); 