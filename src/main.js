/**
 * Zombie Survival Game - Main Entry Point
 * 
 * This file initializes the game, sets up the Three.js scene, and coordinates
 * the game loop. It imports functionality from other modules to maintain a
 * clean, modular structure.
 * 
 * Example usage: This file is loaded by index.html and automatically starts the game.
 */

import * as THREE from 'three';

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
logger.verbose('MAIN.JS: NODE_ENV = ', window.NODE_ENV);
logger.verbose('MAIN.JS: DEBUG_MODE =', DEBUG_MODE);

if (DEBUG_MODE) {
    logger.setLevel(logger.levels.DEBUG);
    logger.info('Debug mode enabled - verbose logging active');
} else {
    logger.setLevel(logger.levels.INFO);
    logger.info('Production mode - minimal logging active');
}

/**
 * Creates a startup screen with name input form
 * @returns {Promise} Resolves when user submits the form with their name
 */
function createStartupScreen() {
    return new Promise((resolve) => {
        // Create startup container
        const startupContainer = document.createElement('div');
        Object.assign(startupContainer.style, {
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: '1000'
        });

        // Create title
        const title = document.createElement('h1');
        title.textContent = 'ZOMBIE SURVIVAL';
        Object.assign(title.style, {
            color: '#ff3030',
            fontSize: '3rem',
            marginBottom: '2rem',
            textShadow: '0 0 10px rgba(255, 0, 0, 0.7)'
        });

        // Create form
        const form = document.createElement('form');
        Object.assign(form.style, {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
            padding: '2rem',
            backgroundColor: 'rgba(20, 20, 20, 0.7)',
            borderRadius: '10px',
            boxShadow: '0 0 20px rgba(255, 0, 0, 0.3)'
        });

        // Create input label
        const label = document.createElement('label');
        label.textContent = 'Enter your name, survivor:';
        label.htmlFor = 'player-name';
        Object.assign(label.style, {
            color: 'white',
            fontSize: '1.2rem'
        });

        // Create input field
        const input = document.createElement('input');
        input.type = 'text';
        input.id = 'player-name';
        input.placeholder = 'Your name...';
        input.required = true;
        input.maxLength = 15;
        Object.assign(input.style, {
            padding: '0.7rem',
            fontSize: '1rem',
            borderRadius: '5px',
            border: '2px solid #444',
            backgroundColor: '#222',
            color: 'white',
            width: '250px'
        });

        // Create submit button
        const button = document.createElement('button');
        button.type = 'submit';
        button.textContent = 'FIGHT THE HORDE';
        Object.assign(button.style, {
            padding: '0.7rem 1.5rem',
            fontSize: '1rem',
            borderRadius: '5px',
            border: 'none',
            backgroundColor: '#ff3030',
            color: 'white',
            cursor: 'pointer',
            fontWeight: 'bold',
            marginTop: '1rem',
            transition: 'all 0.2s ease'
        });

        // Button hover effect
        button.onmouseover = () => {
            Object.assign(button.style, {
                backgroundColor: '#ff5050',
                transform: 'scale(1.05)'
            });
        };
        button.onmouseout = () => {
            Object.assign(button.style, {
                backgroundColor: '#ff3030',
                transform: 'scale(1)'
            });
        };

        // Add controls info
        const controlsInfo = document.createElement('div');
        controlsInfo.innerHTML = `
            <p>WASD: Move | Mouse: Aim | Left Click: Shoot</p>
        `;
        Object.assign(controlsInfo.style, {
            color: '#aaa',
            marginTop: '2rem',
            fontSize: '0.9rem',
            textAlign: 'center'
        });

        // Assemble form
        form.appendChild(label);
        form.appendChild(input);
        form.appendChild(button);
        
        // Assemble startup screen
        startupContainer.appendChild(title);
        startupContainer.appendChild(form);
        startupContainer.appendChild(controlsInfo);
        document.body.appendChild(startupContainer);

        // Focus the input field
        input.focus();

        // Handle form submission
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const playerName = input.value.trim();
            if (playerName) {
                // Store player name in gameState
                gameState.player.name = playerName;
                
                // Remove startup screen
                document.body.removeChild(startupContainer);
                
                // Display welcome message
                displayWelcomeMessage(playerName);
                
                // Resolve the promise to continue game initialization
                resolve();
            }
        });
    });
}

// Initialize game components but don't start animation loop yet
let gameComponents = null;

// Main initialization function
async function startGame() {
    // Wait for player to enter their name before starting the game
    await createStartupScreen();

    // Initialize game
    gameComponents = initializeGame(gameState);
    const { scene, camera, renderer, player, clock, audioListener, powerupTimer, innerCircle, powerupTimerMaterial, powerupTimerGeometry, innerCircleGeometry, innerCircleMaterial } = gameComponents;

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

    // Run game tests
    if (DEBUG_MODE) {
        // Delay tests a bit to ensure everything is loaded
        setTimeout(() => {
            executeTests(scene, camera, renderer);
        }, 1000);
    }

    // Start animation loop (after user interaction, which helps with AudioContext)
    animate(scene, camera, renderer, player, clock, powerupTimer, powerupTimerGeometry, innerCircle, powerupTimerMaterial, innerCircleGeometry, innerCircleMaterial);
}

// Game testing function
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
                    console.error(`Critical audio file missing: ${failure.file.path}`);
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

// Start the game
startGame();

// The following line displays welcome message for player when they first submit their name
// This function gets called after the startup screen is dismissed
function displayWelcomeMessage(playerName) {
    const welcomeMessage = document.createElement('div');
    welcomeMessage.textContent = `Welcome to the fight, ${playerName}!`;
    Object.assign(welcomeMessage.style, {
        position: 'absolute',
        top: '10%',
        left: '50%',
        transform: 'translateX(-50%)',
        color: '#ff3030',
        fontSize: '1.5rem',
        fontWeight: 'bold',
        textShadow: '0 0 10px rgba(0, 0, 0, 0.7)',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        padding: '1rem',
        borderRadius: '5px',
        zIndex: '100',
        opacity: '1',
        transition: 'opacity 2s ease-in-out'
    });
    
    document.body.appendChild(welcomeMessage);
    
    // Fade out welcome message after 3 seconds
    setTimeout(() => {
        welcomeMessage.style.opacity = '0';
        // Remove from DOM after fadeout completes
        setTimeout(() => {
            document.body.removeChild(welcomeMessage);
        }, 2000);
    }, 3000);
} 