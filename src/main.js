/**
 * Zombie Survival Game - Main Entry Point
 * 
 * This file initializes the game, sets up the Three.js scene, and coordinates
 * the game loop. It imports functionality from other modules to maintain a
 * clean, modular structure.
 * 
 * Example usage: This file is loaded by index.html and automatically starts the game.
 */

// Check for portal parameters FIRST, before any imports that might parse URL params
const urlParams = new URLSearchParams(window.location.search);
const ARRIVED_VIA_PORTAL = urlParams.get('portal') === 'true';
const PORTAL_USERNAME = urlParams.get('username') || 'Traveler';
const PORTAL_COLOR = urlParams.get('color');
const PORTAL_SPEED = urlParams.get('speed');
const PORTAL_SCORE = urlParams.get('score');
const PORTAL_HEALTH = urlParams.get('health');
const PORTAL_REFERER_RAW = urlParams.get('ref');

// Ensure the referrer URL has a protocol prefix
let PORTAL_REFERER = null;
if (PORTAL_REFERER_RAW) {
    // Check if the URL already has a protocol
    if (PORTAL_REFERER_RAW.startsWith('http://') || PORTAL_REFERER_RAW.startsWith('https://')) {
        PORTAL_REFERER = PORTAL_REFERER_RAW;
    } else {
        // Default to https:// if no protocol is specified
        PORTAL_REFERER = 'https://' + PORTAL_REFERER_RAW;
    }
}

// Now import modules
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
        // Make sure rightJoystickData is initialized at start
        rightJoystickData = { x: 0, y: 0 };
        logger.debug('joystick', 'Right joystick start - shooting enabled');
    });
    
    rightStick.on('move', (evt, data) => {
        const x = data.vector.x;
        const y = data.vector.y;
        // Apply directly to the rightJoystickData object (not creating a new reference)
        rightJoystickData.x = x;
        rightJoystickData.y = y;
        
        // Force update the gameState controls reference
        if (gameState.controls && gameState.controls.rightJoystickData) {
            gameState.controls.rightJoystickData = rightJoystickData;
        }
        
        // Keep shooting enabled while joystick is active
        gameState.mouseDown = true;
        
        logger.debug('joystick', 'Right joystick move:', rightJoystickData);
    });
    
    rightStick.on('end', () => {
        // Reset values directly on the existing object
        rightJoystickData.x = 0;
        rightJoystickData.y = 0;
        
        // Force update the gameState controls reference
        if (gameState.controls && gameState.controls.rightJoystickData) {
            gameState.controls.rightJoystickData = rightJoystickData;
        }
        
        // Disable shooting when right joystick is released
        gameState.mouseDown = false;
        
        logger.debug('joystick', 'Right joystick end - shooting disabled');
    });
}

// Main initialization function
async function startGame() {
   // Refresh logger URL parameters to ensure correct debug sections are loaded
   logger.parseURLParameters();
   
   // Initialize game
   gameComponents = initializeGame(gameState);
   const { scene, camera, renderer, player, clock, audioListener, powerupTimer, innerCircle, powerupTimerMaterial, powerupTimerGeometry, innerCircleGeometry, innerCircleMaterial } = gameComponents;

   setupEventListeners(player, scene, camera, renderer);
    
   // Log portal arrival data (moved check to top of file)
   if (ARRIVED_VIA_PORTAL) {
       // Set player name from portal params
       gameState.player.name = PORTAL_USERNAME;
       
       // Set player health if provided (with validation)
       if (PORTAL_HEALTH && !isNaN(parseInt(PORTAL_HEALTH))) {
           const portalHealth = parseInt(PORTAL_HEALTH);
           gameState.player.health = Math.min(100, Math.max(10, portalHealth)); // Clamp between 10-100
       }
       
       // Set player score if provided
       if (PORTAL_SCORE && !isNaN(parseInt(PORTAL_SCORE))) {
           gameState.score = parseInt(PORTAL_SCORE);
       }
       
       // Log portal arrival
       logger.info('portal', `Player ${PORTAL_USERNAME} arrived via portal`, {
           color: PORTAL_COLOR,
           speed: PORTAL_SPEED,
           referer: PORTAL_REFERER,
           health: PORTAL_HEALTH,
           score: PORTAL_SCORE
       });
       
       // Create entry portal effect
       createEntryPortal(scene, player.position.clone());
       
       // Create return portal if we have a referrer URL
       if (PORTAL_REFERER) {
           // Place the return portal 50 units behind the player in +Z direction
           const returnPortalPosition = player.position.clone();
           returnPortalPosition.z += 30; // 50 units in +Z direction
           returnPortalPosition.x = returnPortalPosition.x+8 ; 
           createReturnPortal(scene, returnPortalPosition, PORTAL_REFERER);
       }
       
       // Display welcome message with portal context
       displayWelcomeMessage(`${PORTAL_USERNAME} arrived through a dimensional rift!`);
   } else {
       // Regular entry - wait for player to enter their name before starting the game
       logger.info('portal', 'Player joined normal mode');
       await createStartupScreen();
   }

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

/**
 * Creates an entry portal effect at the specified position
 * @param {THREE.Scene} scene - The Three.js scene
 * @param {THREE.Vector3} position - Position for the portal
 */
function createEntryPortal(scene, position) {
    logger.info('portal', 'Creating entry portal at', position);
    
    // Create portal group to hold all portal elements
    const portalGroup = new THREE.Group();
    portalGroup.position.copy(position);
    
    // Portal ring
    const portalRingGeometry = new THREE.TorusGeometry(2, 0.3, 16, 50);
    const portalRingMaterial = new THREE.MeshPhongMaterial({
        color: 0xff0000,
        emissive: 0xff0000,
        transparent: true,
        opacity: 0.8
    });
    const portalRing = new THREE.Mesh(portalRingGeometry, portalRingMaterial);
    portalRing.rotation.x = Math.PI / 2; // Make it horizontal (flat on ground)
    portalGroup.add(portalRing);
    
    // Portal inner effect
    const portalInnerGeometry = new THREE.CircleGeometry(1.7, 32);
    const portalInnerMaterial = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide
    });
    const portalInner = new THREE.Mesh(portalInnerGeometry, portalInnerMaterial);
    portalInner.rotation.x = Math.PI / 2; // Flat on ground
    portalInner.position.y = 0.1; // Slightly above ground
    portalGroup.add(portalInner);
    
    // Create "ENTRY PORTAL" label
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 512;
   canvas.height = 128;
    
    // Fill background with solid dark color
    context.fillStyle = '#000033'; // Dark blue background
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add text with simple styling
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = 'bold 45px Arial, sans-serif';
    
    // Draw black outline
    context.lineWidth = 8;
    context.strokeStyle = 'black';
    context.strokeText('ENTRY PORTAL', canvas.width / 2, canvas.height / 2);
    
    // Draw white text
    context.fillStyle = 'white';
    context.fillText('ENTRY PORTAL', canvas.width / 2, canvas.height / 2);
    
    const texture = new THREE.CanvasTexture(canvas);
    const labelGeometry = new THREE.PlaneGeometry(5, 1); // Larger geometry for bigger label
    const labelMaterial = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide,
        alphaTest: 0.1 // Helps with transparency artifacts
    });
    
    // Create label with glow effect around edges
    const label = new THREE.Mesh(labelGeometry, labelMaterial);
    label.position.y = 2.5; // Height above ground
    label.position.z = -2.0; // Position in front of the portal
    label.rotation.x = 0; // No x rotation for vertical orientation
    
    // Add subtle animation to the label
    const labelAnimation = () => {
        label.position.y = 2.5 + Math.sin(Date.now() * 0.001) * 0.1; // Less dramatic bobbing
        label.rotation.y = Math.sin(Date.now() * 0.0005) * 0.05; // Gentle swaying
        
        if (gameState.entryPortal) {
            requestAnimationFrame(labelAnimation);
        }
    };
    requestAnimationFrame(labelAnimation);
    
    portalGroup.add(label);
    
    // Create particle system for portal effects
    const particleCount = 500;
    const portalParticles = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount * 3; i += 3) {
        // Create particles in a ring pattern around the portal
        const angle = Math.random() * Math.PI * 2;
        const radius = 1.7 + (Math.random() - 0.5) * 0.6;
        particlePositions[i] = Math.cos(angle) * radius;
        particlePositions[i + 1] = (Math.random() - 0.5) * 0.5; // Vertical spread
        particlePositions[i + 2] = Math.sin(angle) * radius;
        
        // Reddish particle colors
        particleColors[i] = 0.8 + Math.random() * 0.2;
        particleColors[i + 1] = 0;
        particleColors[i + 2] = 0;
    }
    
    portalParticles.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    portalParticles.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));
    
    const particleMaterial = new THREE.PointsMaterial({
        size: 0.05,
        vertexColors: true,
        transparent: true,
        opacity: 0.6
    });
    
    const particleSystem = new THREE.Points(portalParticles, particleMaterial);
    portalGroup.add(particleSystem);
    
    // Add portal to scene
    scene.add(portalGroup);
    
    // Store portal in gameState for animation
    gameState.entryPortal = {
        group: portalGroup,
        ring: portalRing,
        inner: portalInner,
        particles: particleSystem,
        particlesGeometry: portalParticles,
        createdAt: Date.now()
    };
    
    // Animate portal particles
    function animatePortalParticles() {
        if (!gameState.entryPortal || !gameState.entryPortal.particlesGeometry) return;
        
        const positions = gameState.entryPortal.particlesGeometry.attributes.position.array;
        const time = Date.now() * 0.001;
        
        for (let i = 0; i < positions.length; i += 3) {
            // Create swirling effect
            const x = positions[i];
            const z = positions[i + 2];
            const distance = Math.sqrt(x * x + z * z);
            const angle = Math.atan2(z, x) + 0.05 * Math.sin(time + distance);
            const newRadius = distance * (1 + 0.02 * Math.sin(time * 2 + distance * 3));
            
            positions[i] = Math.cos(angle) * newRadius;
            positions[i + 2] = Math.sin(angle) * newRadius;
            positions[i + 1] += 0.01 * Math.sin(time * 5 + i);
        }
        
        gameState.entryPortal.particlesGeometry.attributes.position.needsUpdate = true;
        
        // Continue animation until portal expires
        if (Date.now() - gameState.entryPortal.createdAt < 10000) { // 10 second duration
            requestAnimationFrame(animatePortalParticles);
        } else {
            // Start fading out portal
            fadeOutEntryPortal();
        }
    }
    
    function fadeOutEntryPortal() {
        if (!gameState.entryPortal) return;
        
        const fadeStep = 0.01;
        const fadeInterval = setInterval(() => {
            if (!gameState.entryPortal) {
                clearInterval(fadeInterval);
                return;
            }
            
            // Reduce opacity
            portalRingMaterial.opacity -= fadeStep;
            portalInnerMaterial.opacity -= fadeStep;
            particleMaterial.opacity -= fadeStep;
            
            // Shrink size
            portalGroup.scale.multiplyScalar(0.99);
            
            // Remove when completely faded
            if (portalRingMaterial.opacity <= 0) {
                scene.remove(portalGroup);
                gameState.entryPortal = null;
                clearInterval(fadeInterval);
            }
        }, 30);
    }
    
    // Start animation
    animatePortalParticles();
}

/**
 * Creates a return portal that sends the player back to their origin
 * @param {THREE.Scene} scene - The Three.js scene
 * @param {THREE.Vector3} position - Position for the portal
 * @param {string} referrerUrl - URL to return the player to
 */
function createReturnPortal(scene, position, referrerUrl) {
    if (!referrerUrl) {
        logger.warn('portal', 'Cannot create return portal: missing referrer URL');
        return;
    }
    const returnText = 'Take Me back HOME!'
    // Additional URL validation to ensure it's properly formatted
    // This works with the earlier fix that adds the protocol if missing
    try {
        // Try to create a URL object to validate the URL
        const urlObj = new URL(referrerUrl);
        // Log the validated URL
        logger.info('portal', `Creating return portal at ${position.x.toFixed(2)},${position.z.toFixed(2)} to validated URL: ${urlObj.href}`);
        // Use the validated URL
        referrerUrl = urlObj.href;
    } catch (error) {
        logger.warn('portal', `Invalid referrer URL: ${referrerUrl}, error: ${error.message}`);
        // Keep the original URL if validation fails
    }
    
    // Create portal group to hold all portal elements
    const portalGroup = new THREE.Group();
    portalGroup.position.copy(position);
    
    // Portal ring
    const portalRingGeometry = new THREE.TorusGeometry(2, 0.3, 16, 50);
    const portalRingMaterial = new THREE.MeshPhongMaterial({
        color: 0x0000ff, // Blue for return portals
        emissive: 0x0000ff,
        transparent: true,
        opacity: 0.8
    });
    const portalRing = new THREE.Mesh(portalRingGeometry, portalRingMaterial);
    portalRing.rotation.x = Math.PI / 2; // Make it horizontal (flat on ground)
    portalGroup.add(portalRing);
    
    // Portal inner effect
    const portalInnerGeometry = new THREE.CircleGeometry(1.7, 32);
    const portalInnerMaterial = new THREE.MeshBasicMaterial({
        color: 0x0000ff, // Blue for return portals
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide
    });
    const portalInner = new THREE.Mesh(portalInnerGeometry, portalInnerMaterial);
    portalInner.rotation.x = Math.PI / 2; // Flat on ground
    portalInner.position.y = 0.1; // Slightly above ground
    portalGroup.add(portalInner);
    
    // Create simple "RETURN ME WHENCE I CAME" label
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 512;
    canvas.height = 128;
    
    // Fill background with solid dark color
    // context.fillStyle = '#000033';
    // context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add text wsith simple styling
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = 'bold 36px Arial, sans-serif';
    
    // Draw black outline
    context.lineWidth = 10;
    context.strokeStyle = 'black';
    context.strokeText(returnText, canvas.width / 2, canvas.height / 2);
    
    // Draw white text
    context.fillStyle = 'white';
    context.fillText(returnText, canvas.width / 2, canvas.height / 2);
    
    const texture = new THREE.CanvasTexture(canvas);
    const labelGeometry = new THREE.PlaneGeometry(5, 1); // Larger geometry for bigger label
    const labelMaterial = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide,
        alphaTest: 0.1
    });
    
    // Create label
    const label = new THREE.Mesh(labelGeometry, labelMaterial);
    label.position.y = 2.5; // Height above ground
    label.position.z = -2.0; // Position in front of the portal
    label.rotation.x = 0; // Vertical orientation
    
    // Add subtle animation to the label
    const labelAnimation = () => {
        label.position.y = 2.5 + Math.sin(Date.now() * 0.001) * 0.1; // Subtle bobbing
        label.rotation.y = Math.sin(Date.now() * 0.0005) * 0.05; // Gentle swaying
        
        if (gameState.returnPortal) {
            requestAnimationFrame(labelAnimation);
        }
    };
    requestAnimationFrame(labelAnimation);
    
    portalGroup.add(label);
    
    // Create particle system for portal effects
    const particleCount = 500;
    const portalParticles = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount * 3; i += 3) {
        // Create particles in a ring pattern around the portal
        const angle = Math.random() * Math.PI * 2;
        const radius = 1.7 + (Math.random() - 0.5) * 0.6;
        particlePositions[i] = Math.cos(angle) * radius;
        particlePositions[i + 1] = (Math.random() - 0.5) * 0.5; // Vertical spread
        particlePositions[i + 2] = Math.sin(angle) * radius;
        
        // Bluish particle colors
        particleColors[i] = 0;
        particleColors[i + 1] = 0;
        particleColors[i + 2] = 0.8 + Math.random() * 0.2;
    }
    
    portalParticles.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    portalParticles.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));
    
    const particleMaterial = new THREE.PointsMaterial({
        size: 0.05,
        vertexColors: true,
        transparent: true,
        opacity: 0.6
    });
    
    const particleSystem = new THREE.Points(portalParticles, particleMaterial);
    portalGroup.add(particleSystem);
    
    // Create collision box for portal
    const returnCollisionBox = new THREE.Box3().setFromObject(portalGroup);
    
    // Add portal to scene
    scene.add(portalGroup);
    
    // Store portal in gameState for animation
    gameState.returnPortal = {
        group: portalGroup,
        ring: portalRing,
        inner: portalInner,
        particles: particleSystem,
        particlesGeometry: portalParticles,
        collisionBox: returnCollisionBox,
        referrerUrl: referrerUrl,
        active: true,
        createdAt: Date.now()
    };
    
    // Animate portal particles
    function animateReturnPortalParticles() {
        if (!gameState.returnPortal || !gameState.returnPortal.particlesGeometry) return;
        
        const positions = gameState.returnPortal.particlesGeometry.attributes.position.array;
        const time = Date.now() * 0.001;
        
        for (let i = 0; i < positions.length; i += 3) {
            // Create swirling effect
            const x = positions[i];
            const z = positions[i + 2];
            const distance = Math.sqrt(x * x + z * z);
            const angle = Math.atan2(z, x) + 0.05 * Math.sin(time + distance);
            const newRadius = distance * (1 + 0.02 * Math.sin(time * 2 + distance * 3));
            
            positions[i] = Math.cos(angle) * newRadius;
            positions[i + 2] = Math.sin(angle) * newRadius;
            positions[i + 1] += 0.01 * Math.sin(time * 5 + i);
        }
        
        gameState.returnPortal.particlesGeometry.attributes.position.needsUpdate = true;
        
        // Update collision box
        gameState.returnPortal.collisionBox = new THREE.Box3().setFromObject(portalGroup);
        
        // Continue animation until game ends
        requestAnimationFrame(animateReturnPortalParticles);
    }
    
    // Start animation
    animateReturnPortalParticles();
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