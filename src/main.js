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
import { createScene, createCamera, createRenderer, createLighting, createGround } from './rendering/scene.js';
import { createPlayer, handlePlayerMovement, createPlayerWeapon, aimPlayerWithMouse } from './gameplay/player.js';
import { createZombie, updateZombies } from './gameplay/zombie.js';
import { updateUI, showMessage, initUI } from './ui/ui.js';
import { handleCollisions, checkCollision } from './gameplay/physics.js';
import { createBullet, updateBullets } from './gameplay/weapons.js';
import { logger } from './utils/logger.js';

// Set log level based on debug flag
const DEBUG_MODE = true;
if (DEBUG_MODE) {
    logger.setLevel(logger.levels.DEBUG);
    logger.info('Debug mode enabled - verbose logging active');
} else {
    logger.setLevel(logger.levels.INFO);
    logger.info('Production mode - minimal logging active');
}

// Game state
const gameState = {
    player: {
        health: 100,
        exp: 0,
        damage: 25,
        speed: 0.1
    },
    zombies: [],
    bullets: [],
    keys: {},
    mouse: { x: 0, y: 0 },
    mouseDown: false, // Track if mouse button is held down
    gameOver: false,
    debug: DEBUG_MODE, // Enable debug mode
    camera: null // Added for camera reference
};

// Initialize Three.js scene
logger.debug('Initializing Three.js scene');
try {
    const scene = createScene();
    logger.debug('Scene created successfully');
    
    const camera = createCamera();
    logger.debug('Camera created successfully', { 
        position: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
        fov: camera.fov,
        aspect: camera.aspect
    });
    
    const renderer = createRenderer();
    logger.debug('Renderer created successfully', { 
        size: { width: renderer.domElement.width, height: renderer.domElement.height },
        pixelRatio: window.devicePixelRatio
    });
    
    const lighting = createLighting(scene);
    logger.debug('Lighting created successfully');
    
    const ground = createGround();
    logger.debug('Ground created successfully');
    scene.add(ground);
    
    // Add audio listener to camera
    const audioListener = new THREE.AudioListener();
    camera.add(audioListener);
    logger.debug('Audio listener added to camera');
    
    // Add camera to gameState for use in other modules
    gameState.camera = camera;
    
    // Create player
    logger.debug('Creating player');
    const player = createPlayer();
    scene.add(player);
    logger.debug('Player added to scene', { 
        position: { x: player.position.x, y: player.position.y, z: player.position.z }
    });
    
    const playerWeapon = createPlayerWeapon();
    player.add(playerWeapon);
    logger.debug('Player weapon created and added');
    
    // Store the audio listener in the player's userData
    player.userData.audioListener = audioListener;
    
    // Create initial zombies
    logger.debug('Creating initial zombies');
    for (let i = 0; i < 5; i++) {
        const position = {
            x: Math.random() * 40 - 20,
            z: Math.random() * 40 - 20
        };
        // Don't spawn zombies too close to player
        if (Math.sqrt(position.x * position.x + position.z * position.z) > 10) {
            const zombie = createZombie(position);
            gameState.zombies.push({
                mesh: zombie,
                health: 50,
                speed: 0.03 + Math.random() * 0.02
            });
            scene.add(zombie);
            logger.debug(`Zombie ${i} created`, { position });
        }
    }
    
    // Set up camera position
    camera.position.set(0, 5, 10);
    // Initial camera setup - we'll adjust it in the game loop
    camera.lookAt(new THREE.Vector3(0, -1, 0)); // Look at a point below the player initially
    logger.debug('Camera position set', { 
        position: { x: camera.position.x, y: camera.position.y, z: camera.position.z }
    });
    
    // Initialize UI
    logger.debug('Initializing UI');
    initUI();
    
    // Show instructions
    showMessage("Use WASD to move, MOUSE to aim, and HOLD LEFT MOUSE BUTTON to shoot zombies", 5000);
    
    // Event listeners
    logger.debug('Setting up event listeners');
    document.addEventListener('keydown', (e) => {
        gameState.keys[e.key.toLowerCase()] = true;
        
        // Debug key - press 'P' to log player position and nearby zombies
        if (e.key.toLowerCase() === 'p' && gameState.debug) {
            logger.debug("Player position:", { position: player.position });
            
            // Log nearby zombies
            gameState.zombies.forEach((zombie, index) => {
                if (zombie && zombie.mesh) {
                    const dx = player.position.x - zombie.mesh.position.x;
                    const dz = player.position.z - zombie.mesh.position.z;
                    const distance = Math.sqrt(dx * dx + dz * dz);
                    logger.debug(`Zombie ${index} info:`, { 
                        distance: distance.toFixed(2), 
                        position: zombie.mesh.position,
                        health: zombie.health
                    });
                }
            });
        }
    });
    
    document.addEventListener('keyup', (e) => gameState.keys[e.key.toLowerCase()] = false);
    document.addEventListener('mousemove', (e) => {
        // Convert mouse position to normalized device coordinates (-1 to +1)
        gameState.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        gameState.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });
    
    // Mouse down/up events for continuous firing
    document.addEventListener('mousedown', () => {
        gameState.mouseDown = true;
    });
    document.addEventListener('mouseup', () => {
        gameState.mouseDown = false;
    });
    
    // Handle window resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        logger.debug('Window resized', { 
            width: window.innerWidth, 
            height: window.innerHeight 
        });
    });
    
    // Function to handle shooting
    const shootBullet = () => {
        const bullet = createBullet(player.position, player.rotation);
        if (bullet) {
            scene.add(bullet);
            gameState.bullets.push(bullet);
            updateUI(gameState);
            logger.debug('Bullet created', { 
                position: { x: bullet.position.x, y: bullet.position.y, z: bullet.position.z },
                rotation: { y: player.rotation.y }
            });
            
            // Add muzzle flash effect
            const muzzleFlash = new THREE.PointLight(0xffff00, 1, 3);
            muzzleFlash.position.set(
                player.position.x + Math.sin(player.rotation.y) * 1.0,
                player.position.y + 0.5,
                player.position.z + Math.cos(player.rotation.y) * 1.0
            );
            scene.add(muzzleFlash);
            
            // Remove muzzle flash after a short time
            setTimeout(() => {
                scene.remove(muzzleFlash);
            }, 100);
        }
    };
    
    // Function to spawn a new zombie
    const spawnZombie = (playerPos) => {
        // Generate a position away from the player, mostly to the north
        let position;
        let tooClose = true;
        
        // Keep trying until we find a suitable position
        while (tooClose) {
            // 80% chance to spawn north of the player
            const spawnNorth = Math.random() < 0.8;
            
            if (spawnNorth) {
                // Spawn north of the player (negative z)
                position = {
                    x: Math.random() * 60 - 30, // Wider range for x
                    z: playerPos.z - 20 - Math.random() * 20 // Always north (negative z)
                };
            } else {
                // Random direction but still far from player
                position = {
                    x: Math.random() * 60 - 30,
                    z: Math.random() * 60 - 30
                };
            }
            
            // Check if position is far enough from player
            const dx = position.x - playerPos.x;
            const dz = position.z - playerPos.z;
            const distance = Math.sqrt(dx * dx + dz * dz);
            
            if (distance > 15) {
                tooClose = false;
            }
        }
        
        // Create and add the zombie
        const zombie = createZombie(position);
        const zombieObj = {
            mesh: zombie,
            health: 50,
            speed: 0.03 + Math.random() * 0.02
        };
        
        gameState.zombies.push(zombieObj);
        scene.add(zombie);
        logger.debug('New zombie spawned', { position });
        
        return zombieObj;
    };
    
    // Function to handle game over
    const handleGameOver = () => {
        if (gameState.gameOver) return;
        
        gameState.gameOver = true;
        showMessage("GAME OVER! Reload the page to play again.", 0);
        logger.info('Game over');
    };
    
    // Add references to functions in gameState for access from other modules
    gameState.handleGameOver = handleGameOver;
    gameState.updateUI = updateUI;
    
    // Game loop
    logger.info('Starting game loop');
    const clock = new THREE.Clock();
    function animate() {
        requestAnimationFrame(animate);
        
        try {
            const delta = clock.getDelta();
            
            // Skip updates if game is over
            if (gameState.gameOver) {
                renderer.render(scene, camera);
                return;
            }
            
            // Update player position based on input with direction-based speeds
            handlePlayerMovement(player, gameState.keys, gameState.player.speed);
            
            // Aim player with mouse
            aimPlayerWithMouse(player, gameState.mouse, camera);
            
            // Update camera to follow player
            camera.position.x = player.position.x;
            camera.position.z = player.position.z + 10;
            camera.position.y = 7; // Higher camera position for better angle
            
            // Calculate a target point that's:
            // 1. At the player's x position
            // 2. Below the player's y position (to position player higher in frame)
            // 3. In front of the player (to look slightly downward)
            const targetPoint = new THREE.Vector3(
                player.position.x,
                player.position.y - 1.5, // Lower target to position player at ~35% from bottom
                player.position.z - 5    // Target in front of player for downward angle
            );
            camera.lookAt(targetPoint);
            
            // Handle continuous firing when mouse is held down
            if (gameState.mouseDown && !gameState.gameOver) {
                shootBullet();
            }
            
            // Update bullets
            updateBullets(gameState.bullets, scene);
            
            // Update zombies - pass delta time for consistent movement
            updateZombies(gameState.zombies, player.position, delta);
            
            // Check for collisions - pass delta time for time-based damage
            handleCollisions(gameState, scene, delta);
            
            // Update UI every frame
            updateUI(gameState);
            
            // Spawn new zombies continuously
            if (Math.random() < 0.01) {
                spawnZombie(player.position);
            }
            
            // Check for game over
            if (gameState.player.health <= 0 && !gameState.gameOver) {
                handleGameOver();
            }
            
            // Render the scene
            renderer.render(scene, camera);
            
            // Log frame rate occasionally
            if (gameState.debug && Math.random() < 0.01) {
                const fps = 1 / delta;
                logger.debug(`Frame rate: ${fps.toFixed(1)} FPS`);
            }
        } catch (error) {
            logger.error("Error in game loop:", error);
            console.error("Error in game loop:", error);
        }
    }
    
    // Start the animation loop
    animate();
    logger.info('Game initialized successfully');
} catch (error) {
    logger.error("Error initializing game:", error);
    console.error("Error initializing game:", error);
    showMessage("Error initializing game. Check console for details.", 0);
} 