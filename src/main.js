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
import { handleCollisions, checkCollision, applyPowerupEffect } from './gameplay/physics.js';
import { createBullet, updateBullets } from './gameplay/weapons.js';
import { logger } from './utils/logger.js';
import { createTripleShotPowerup, createShotgunBlastPowerup, createExplosionPowerup, animatePowerup } from './gameplay/powerups.js';

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
    lastShotTime: 0
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
    
    // Create powerups
    logger.debug('Creating powerups');
    const powerups = [];
    
    // Create Triple Shot powerup - placed more randomly
    const tripleShot = createTripleShotPowerup({ x: -15, z: 12 });
    scene.add(tripleShot);
    powerups.push({
        mesh: tripleShot,
        type: 'tripleShot',
        active: true
    });
    logger.debug('Triple Shot powerup created', { position: tripleShot.position });
    
    // Create Shotgun Blast powerup - placed more randomly
    const shotgun = createShotgunBlastPowerup({ x: 18, z: -8 });
    scene.add(shotgun);
    powerups.push({
        mesh: shotgun,
        type: 'shotgunBlast',
        active: true
    });
    logger.debug('Shotgun Blast powerup created', { position: shotgun.position });
    
    // Create Explosion powerup - placed more randomly
    const explosion = createExplosionPowerup({ x: -5, z: -20 });
    scene.add(explosion);
    powerups.push({
        mesh: explosion,
        type: 'explosion',
        active: true
    });
    logger.debug('Explosion powerup created', { position: explosion.position });
    
    // Add powerups to gameState
    gameState.powerups = powerups;
    
    // Create initial zombies
    logger.debug('Creating initial zombies');
    for (let i = 0; i < 10; i++) {
        const position = {
            x: Math.random() * 40 - 20,
            z: Math.random() * 40 - 20
        };
        // Don't spawn zombies too close to player
        if (Math.sqrt(position.x * position.x + position.z * position.z) > 10) {
            const zombie = createZombie(position);
            const baseSpeed = 0.03 + Math.random() * 0.02;
            gameState.zombies.push({
                mesh: zombie,
                health: 50,
                speed: baseSpeed,
                baseSpeed: baseSpeed, // Store base speed for reference
                gameState: gameState // Pass gameState reference to zombie
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
    
    // Don't show the startup message with controls
    // showMessage("Use WASD to move, MOUSE to aim, and HOLD LEFT MOUSE BUTTON to shoot zombies", 5000);
    
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
        // Get the weapon mount from player's userData if available
        const weaponMount = player.userData.weaponMount || null;
        
        // Get bullet start position and direction
        const bulletStartPos = new THREE.Vector3();
        const bulletDirection = new THREE.Vector3();
        
        if (weaponMount) {
            // Use weapon mount position if available
            weaponMount.getWorldPosition(bulletStartPos);
            
            // Get direction from player rotation - FIXED DIRECTION
            // In Three.js, positive Z is forward in our game's coordinate system
            bulletDirection.set(0, 0, 1).applyQuaternion(player.quaternion);
        } else {
            // Fallback to player position
            bulletStartPos.copy(player.position);
            bulletStartPos.y += 1; // Adjust height
            
            // Get direction from player rotation - FIXED DIRECTION
            bulletDirection.set(0, 0, 1).applyQuaternion(player.quaternion);
        }
        
        // Apply powerup effect or create normal bullet
        applyPowerupEffect(gameState, bulletStartPos, bulletDirection, scene);
        
        // Add muzzle flash effect
        const muzzleFlash = new THREE.PointLight(0xffff00, 1, 3);
        muzzleFlash.position.copy(bulletStartPos);
        scene.add(muzzleFlash);
        
        // Remove muzzle flash after a short time
        setTimeout(() => {
            scene.remove(muzzleFlash);
        }, 100);
        
        // Update UI
        updateUI(gameState);
    };
    
    // Function to spawn a new zombie
    const spawnZombie = (playerPos) => {
        // Generate a position away from the player, primarily in front of the player
        let position;
        let tooClose = true;
        
        // Keep trying until we find a suitable position
        while (tooClose) {
            // Generate a random angle, biased towards the front of the player
            // Front is considered to be the positive Z direction (top of screen)
            let theta;
            
            // Rejection sampling for angle - higher probability in front of player
            // This will generate angles primarily in the range of π/2 to 3π/2 (top half)
            do {
                theta = Math.random() * 2 * Math.PI; // Random angle between 0 and 2π
            } while (Math.random() > (1 + Math.cos(theta + Math.PI)) / 2); // Rejection sampling with flipped direction
            
            // Calculate position based on angle and distance
            const distance = 20 + Math.random() * 10; // Distance from player
            position = {
                x: playerPos.x + distance * Math.sin(theta),
                z: playerPos.z + distance * Math.cos(theta)
            };
            
            // Check if position is far enough from player
            const dx = position.x - playerPos.x;
            const dz = position.z - playerPos.z;
            const distanceToPlayer = Math.sqrt(dx * dx + dz * dz);
            
            if (distanceToPlayer > 15) {
                tooClose = false;
            }
        }
        
        // Create and add the zombie
        const zombie = createZombie(position);
        const zombieObj = {
            mesh: zombie,
            health: 50,
            speed: 0.03 + Math.random() * 0.02,
            gameState: gameState, // Pass gameState reference to zombie
            baseSpeed: 0.03 + Math.random() * 0.02 // Store the base speed for reference
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
            
            // Handle continuous firing when mouse is held down - with rate limiting
            if (gameState.mouseDown && !gameState.gameOver) {
                // Check if enough time has passed since the last shot
                const currentTime = Date.now();
                if (!gameState.lastShotTime) {
                    gameState.lastShotTime = 0;
                }
                
                const SHOT_COOLDOWN = 300; // 300ms between shots (slower fire rate)
                if (currentTime - gameState.lastShotTime > SHOT_COOLDOWN) {
                    shootBullet();
                    gameState.lastShotTime = currentTime;
                }
            }
            
            // Update powerup duration
            if (gameState.player.activePowerup && gameState.player.powerupDuration > 0) {
                gameState.player.powerupDuration -= delta;
                
                // Clear powerup when duration expires
                if (gameState.player.powerupDuration <= 0) {
                    gameState.player.activePowerup = null;
                    gameState.player.powerupDuration = 0;
                    showMessage("Powerup expired", 1000);
                }
            }
            
            // Animate powerups
            if (gameState.powerups) {
                gameState.powerups.forEach(powerup => {
                    if (powerup.active && powerup.mesh) {
                        animatePowerup(powerup.mesh, Date.now() * 0.001);
                    }
                });
            }
            
            // Update bullets
            updateBullets(gameState.bullets, scene);
            
            // Update zombies - pass delta time for consistent movement
            updateZombies(gameState.zombies, player.position, delta);
            
            // Check for collisions - pass delta time for time-based damage
            handleCollisions(gameState, scene, delta);
            
            // Update UI every frame
            updateUI(gameState);
            
            // Spawn new zombies continuously - increased spawn rate by 50%
            if (Math.random() < 0.045) { // Changed from 0.03 to 0.045
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