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
import { isMobileDevice, isTouchDevice, getDeviceInfo } from './utils/deviceDetection.js';

// Get device information
const deviceInfo = getDeviceInfo();
logger.info('device', `Device detected: ${deviceInfo.type} (Mobile: ${deviceInfo.isMobile}, Touch: ${deviceInfo.isTouch})`);

// Variables for joystick control
let leftJoystick, rightJoystick;
let leftJoystickData = { x: 0, y: 0 };
let rightJoystickData = { x: 0, y: 0 };

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

/**
 * Creates and initializes joystick controls for mobile devices
 */
function setupMobileControls() {
    if (!deviceInfo.isMobile && !deviceInfo.isTouch) {
        logger.info('controls', 'Skipping mobile controls setup for non-mobile/non-touch device');
        return;
    }
    
    logger.info('controls', 'Setting up mobile joystick controls');
    
    // Create joystick container elements
    const leftJoystickEl = document.createElement('div');
    leftJoystickEl.id = 'leftJoystick';
    leftJoystickEl.className = 'joystick';
    
    const rightJoystickEl = document.createElement('div');
    rightJoystickEl.id = 'rightJoystick';
    rightJoystickEl.className = 'joystick';
    
    // Add joystick elements to document
    document.body.appendChild(leftJoystickEl);
    document.body.appendChild(rightJoystickEl);
    
    // Initialize nipplejs joysticks with better options for mobile
    leftJoystick = nipplejs.create({
        zone: leftJoystickEl,
        mode: 'static',
        position: { left: '50px', bottom: (deviceInfo.orientation === 'landscape' ? '50px' : '100px') },
        color: 'rgba(255, 255, 255, 0.7)',
        size: 120,
        dynamicPage: true,
        lockX: false,
        lockY: false,
        restJoystick: false,     // Keep tracking after releasing the joystick
        restOpacity: 0.8,        // Opacity when not touched
        fadeTime: 100,           // Faster fade transitions
        multitouch: true,        // Allow multiple simultaneous touches
        maxNumberOfNipples: 2,   // Max of 2 joysticks
        dataOnly: false,         // We need the UI
        threshold: 0.1           // Lower threshold to detect movement (more sensitive)
    });
    
    rightJoystick = nipplejs.create({
        zone: rightJoystickEl,
        mode: 'static',
        position: { right: '50px', bottom: (deviceInfo.orientation === 'landscape' ? '50px' : '100px') },
        color: 'rgba(255, 255, 255, 0.7)',
        size: 120,
        dynamicPage: true,
        lockX: false,
        lockY: false,
        restJoystick: false,     // Keep tracking after releasing the joystick
        restOpacity: 0.8,        // Opacity when not touched  
        fadeTime: 100,           // Faster fade transitions
        multitouch: true,        // Allow multiple simultaneous touches
        maxNumberOfNipples: 2,   // Max of 2 joysticks
        dataOnly: false,         // We need the UI
        threshold: 0.1           // Lower threshold to detect movement (more sensitive)
    });
    
    // Set up joystick event handlers
    setupJoystickEventHandlers(leftJoystick, rightJoystick);
    
    // Add mobile controls info
    const mobileControlsInfo = document.createElement('div');
    mobileControlsInfo.innerHTML = `
        <p>Left stick: Move | Right stick: Aim</p>
    `;
    Object.assign(mobileControlsInfo.style, {
        position: 'fixed',
        top: '10px',
        left: '0',
        width: '100%',
        color: '#aaa',
        fontSize: '0.9rem',
        textAlign: 'center',
        zIndex: '1000'
    });
    document.body.appendChild(mobileControlsInfo);
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        mobileControlsInfo.style.opacity = '0';
        mobileControlsInfo.style.transition = 'opacity 1s ease-in-out';
        setTimeout(() => {
            document.body.removeChild(mobileControlsInfo);
        }, 1000);
    }, 5000);
    
    // Make gameState aware of joystick data
    gameState.controls = gameState.controls || {};
    gameState.controls.leftJoystickData = leftJoystickData;
    gameState.controls.rightJoystickData = rightJoystickData;
    gameState.controls.isMobileDevice = deviceInfo.isMobile;
    gameState.controls.isTouchDevice = deviceInfo.isTouch;
    
    // Listen for orientation changes to reposition joysticks if needed
    window.addEventListener('orientationchange', () => {
        logger.info('controls', 'Orientation changed, updating joystick positions');
        
        // Allow time for the orientation change to complete
        setTimeout(() => {
            // Destroy and recreate joysticks with updated positions
            leftJoystick.destroy();
            rightJoystick.destroy();
            
            leftJoystick = nipplejs.create({
                zone: leftJoystickEl,
                mode: 'static',
                position: { left: '50px', bottom: (window.innerHeight > window.innerWidth ? '100px' : '50px') },
                color: 'rgba(255, 255, 255, 0.7)',
                size: 120,
                dynamicPage: true,
                lockX: false,
                lockY: false,
                restJoystick: false,
                restOpacity: 0.8,
                fadeTime: 100,
                multitouch: true,
                maxNumberOfNipples: 2,
                dataOnly: false,
                threshold: 0.1
            });
            
            rightJoystick = nipplejs.create({
                zone: rightJoystickEl,
                mode: 'static',
                position: { right: '50px', bottom: (window.innerHeight > window.innerWidth ? '100px' : '50px') },
                color: 'rgba(255, 255, 255, 0.7)',
                size: 120,
                dynamicPage: true,
                lockX: false,
                lockY: false,
                restJoystick: false,
                restOpacity: 0.8,
                fadeTime: 100,
                multitouch: true,
                maxNumberOfNipples: 2,
                dataOnly: false,
                threshold: 0.1
            });
            
            // Reattach event handlers
            setupJoystickEventHandlers(leftJoystick, rightJoystick);
        }, 300);
    });
    
    logger.info('controls', 'Mobile joystick controls initialized');
}

/**
 * Sets up event handlers for joysticks
 * @param {Object} leftStick - Left joystick instance
 * @param {Object} rightStick - Right joystick instance
 */
function setupJoystickEventHandlers(leftStick, rightStick) {
    // Left joystick for movement
    leftStick.on('start', (evt, data) => {
        logger.debug('joystick', 'Left joystick start');
        // Make sure leftJoystickData is initialized at start
        leftJoystickData = { x: 0, y: 0 };
    });
    
    leftStick.on('move', (evt, data) => {
        const side = data.vector.x;
        // Invert the Y value for Z movement (forward is negative in the game)
        const forward = -data.vector.y; // INVERTED to fix directional control
        
        // Apply directly to the leftJoystickData object (not creating a new reference)
        leftJoystickData.x = side;
        leftJoystickData.y = forward;
        
        // Force update the gameState controls reference
        if (gameState.controls && gameState.controls.leftJoystickData) {
            gameState.controls.leftJoystickData = leftJoystickData;
        }
        
        logger.debug('joystick', `Left joystick move: x=${side.toFixed(2)}, z=${forward.toFixed(2)}`);
    });
    
    leftStick.on('end', () => {
        // Reset values directly on the existing object
        leftJoystickData.x = 0;
        leftJoystickData.y = 0;
        
        // Force update the gameState controls reference
        if (gameState.controls && gameState.controls.leftJoystickData) {
            gameState.controls.leftJoystickData = leftJoystickData;
        }
        
        logger.debug('joystick', 'Left joystick end');
    });
    
    // Right joystick for aiming and shooting
    rightStick.on('start', (evt, data) => {
        // Enable shooting when right joystick is active
        gameState.mouseDown = true;
        logger.debug('joystick', 'Right joystick start - shooting enabled');
    });
    
    rightStick.on('move', (evt, data) => {
        const x = data.vector.x;
        const y = data.vector.y;
        rightJoystickData.x = x;
        rightJoystickData.y = y;
        
        // Keep shooting enabled while joystick is active
        gameState.mouseDown = true;
        
        logger.debug('joystick', 'Right joystick move:', rightJoystickData);
    });
    
    rightStick.on('end', () => {
        rightJoystickData = { x: 0, y: 0 };
        
        // Disable shooting when right joystick is released
        gameState.mouseDown = false;
        
        logger.debug('joystick', 'Right joystick end - shooting disabled');
    });
}

// Main initialization function
async function startGame() {
   // Initialize game
   gameComponents = initializeGame(gameState);
   const { scene, camera, renderer, player, clock, audioListener, powerupTimer, innerCircle, powerupTimerMaterial, powerupTimerGeometry, innerCircleGeometry, innerCircleMaterial } = gameComponents;

   setupEventListeners(player, scene, camera, renderer);
    
    // Wait for player to enter their name before starting the game
    await createStartupScreen();

    // Set up mobile controls if on a mobile device
    setupMobileControls();
   
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