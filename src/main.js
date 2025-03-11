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
import { createScene, createCamera, createRenderer, createLighting } from './rendering/scene.js';
import { createPlayer, handlePlayerMovement, createPlayerWeapon, aimPlayerWithMouse } from './gameplay/player.js';
import { createZombie, updateZombies, createSkeletonArcher, createExploder, createZombieKing, createExplosion } from './gameplay/zombie.js';
import { updateUI, showMessage, initUI } from './ui/ui.js';
import { handleCollisions, checkCollision, applyPowerupEffect } from './gameplay/physics.js';
import { createBullet, updateBullets } from './gameplay/weapons.js';
import { logger } from './utils/logger.js';
import { createTripleShotPowerup, createShotgunBlastPowerup, createExplosionPowerup, animatePowerup } from './gameplay/powerups.js';
import { createTexturedGround, createBuilding, createRock, createDeadTree } from './rendering/environment.js';
import { setupDismemberment, updateBloodEffects } from './gameplay/dismemberment.js';
import { shouldSpawnPowerup, spawnPowerupBehindPlayer, cleanupOldPowerups } from './gameplay/powerupSpawner.js';

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
    score: 0, // Track player score
    enemySpawnRate: 200, // Time between enemy spawns in ms (reduced for more zombies)
    lastEnemySpawnTime: 0,
    maxZombies: 100, // Maximum number of zombies allowed at once
    initialSpawnCount: 30, // Number of zombies to spawn at start
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
    }
};

// Make gameState globally accessible for zombie collision detection
window.gameState = gameState;

// Initialize the scene
const scene = createScene();
const camera = createCamera();
gameState.camera = camera; // Store camera reference
const renderer = createRenderer();
const { ambientLight, directionalLight } = createLighting(scene);

// Create textured ground
const ground = createTexturedGround(1000);
scene.add(ground);

// Create player
const player = createPlayer();
scene.add(player);
player.position.y = 0;

// Store player object in gameState for access by other functions
gameState.playerObject = player;

// Add weapon to player
const playerWeapon = createPlayerWeapon();
player.add(playerWeapon);

// Create powerup timer indicator (initially invisible)
const powerupTimerGeometry = new THREE.RingGeometry(0, 2, 32);
const powerupTimerMaterial = new THREE.MeshBasicMaterial({
    color: 0x00ffff,
    transparent: true,
    opacity: 0.6,
    side: THREE.DoubleSide
});
const powerupTimer = new THREE.Mesh(powerupTimerGeometry, powerupTimerMaterial);
powerupTimer.rotation.x = Math.PI / 2; // Lay flat on ground
powerupTimer.position.y = 0.05; // Just above ground
powerupTimer.visible = false; // Initially invisible
player.add(powerupTimer);

// Add inner circle for better visual effect
const innerCircleGeometry = new THREE.CircleGeometry(0.5, 32);
const innerCircleMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.3,
    side: THREE.DoubleSide
});
const innerCircle = new THREE.Mesh(innerCircleGeometry, innerCircleMaterial);
innerCircle.rotation.x = Math.PI / 2; // Lay flat on ground
innerCircle.position.y = 0.04; // Just below the ring
innerCircle.visible = false; // Initially invisible
player.add(innerCircle);

// Create clock for timing
const clock = new THREE.Clock();

// Initialize UI
initUI(gameState);

// Setup event listeners
document.addEventListener('keydown', (event) => {
    gameState.keys[event.key.toLowerCase()] = true;
    
    // Debug key to spawn a powerup (P key)
    if (event.key.toLowerCase() === 'p' && gameState.debug) {
        logger.debug('Manual powerup spawn triggered');
        spawnPowerupBehindPlayer(scene, gameState, player);
    }
});

document.addEventListener('keyup', (event) => {
    gameState.keys[event.key.toLowerCase()] = false;
});

document.addEventListener('mousemove', (event) => {
    // Calculate normalized device coordinates (-1 to +1)
    gameState.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    gameState.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
});

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
});

// Function to spawn environment objects
const spawnEnvironmentObjects = () => {
    // Create buildings in the distance
    for (let i = 0; i < 15; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = 40 + Math.random() * 60;
        const position = {
            x: Math.sin(angle) * distance,
            z: Math.cos(angle) * distance
        };
        
        // Randomly choose between building, rock, or tree
        const objectType = Math.random();
        let environmentObject;
        
        if (objectType < 0.4) {
            // Create building with random size
            const width = 4 + Math.random() * 6;
            const height = 6 + Math.random() * 10;
            const depth = 4 + Math.random() * 6;
            environmentObject = createBuilding(position, width, height, depth);
        } else if (objectType < 0.7) {
            // Create rock with random size
            const size = 1 + Math.random() * 2;
            environmentObject = createRock(position, size);
        } else {
            // Create dead tree
            environmentObject = createDeadTree(position);
        }
        
        scene.add(environmentObject);
        gameState.environmentObjects.push(environmentObject);
    }
    
    logger.debug('Environment objects spawned');
};

// Function to shoot a bullet
const shootBullet = () => {
    // Check if enough time has passed since the last shot
    const currentTime = Date.now();
    // Use debug gun fire rate if available
    const fireRateCooldown = gameState.debug && gameState.debug.gunFireRate ? gameState.debug.gunFireRate : 100;
    if (currentTime - gameState.lastShotTime < fireRateCooldown) { // Use debug setting
        return; // Still in cooldown
    }
    
    gameState.lastShotTime = currentTime;
    
    // Get player's forward direction - now using positive Z as forward
    const direction = new THREE.Vector3(0, 0, 1);
    direction.applyQuaternion(player.quaternion);
    
    // Get weapon mount position if available
    let bulletPosition;
    if (player.userData.weaponMount) {
        bulletPosition = new THREE.Vector3();
        player.userData.weaponMount.getWorldPosition(bulletPosition);
        
        // Offset slightly in the direction the player is facing (reduced offset for closer bullets)
        bulletPosition.add(direction.clone().multiplyScalar(0.2));
    } else {
        // Fallback to position in front of player
        bulletPosition = new THREE.Vector3(
            player.position.x + direction.x * 0.2,
            player.position.y + 0.5, // Bullet height
            player.position.z + direction.z * 0.2
        );
    }
    
    const bullet = createBullet(
        bulletPosition,
        direction,
        gameState.player.damage,
        1.5 // Faster bullet speed
    );
    
    // Only add mesh to scene if it's a tracer bullet
    if (bullet.mesh) {
        scene.add(bullet.mesh);
    }
    gameState.bullets.push(bullet);
    
    // Apply powerup effects if active
    if (gameState.player.activePowerup === 'tripleShot') {
        // Create two additional bullets at angles
        const leftDirection = direction.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 12);
        const rightDirection = direction.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 12);
        
        const leftBullet = createBullet(
            bulletPosition.clone(),
            leftDirection,
            gameState.player.damage,
            1.5
        );
        
        const rightBullet = createBullet(
            bulletPosition.clone(),
            rightDirection,
            gameState.player.damage,
            1.5
        );
        
        // Only add meshes to scene if they're tracer bullets
        if (leftBullet.mesh) scene.add(leftBullet.mesh);
        if (rightBullet.mesh) scene.add(rightBullet.mesh);
        
        gameState.bullets.push(leftBullet);
        gameState.bullets.push(rightBullet);
    } else if (gameState.player.activePowerup === 'shotgunBlast') {
        // Create 5 additional bullets in a spread pattern
        for (let i = 0; i < 5; i++) {
            const spreadDirection = direction.clone().applyAxisAngle(
                new THREE.Vector3(0, 1, 0),
                (Math.random() - 0.5) * Math.PI / 6
            );
            
            const spreadBullet = createBullet(
                bulletPosition.clone(),
                spreadDirection,
                gameState.player.damage * 0.7, // Slightly less damage per pellet
                1.5
            );
            
            // Only add mesh to scene if it's a tracer bullet
            if (spreadBullet.mesh) scene.add(spreadBullet.mesh);
            gameState.bullets.push(spreadBullet);
        }
    }
    
    // Add muzzle flash effect
    const muzzleFlash = new THREE.PointLight(0xffff00, 1, 3);
    muzzleFlash.position.copy(bulletPosition);
    scene.add(muzzleFlash);
    
    // Remove muzzle flash after a short time
    setTimeout(() => {
        scene.remove(muzzleFlash);
    }, 50);
};

// Function to spawn a new enemy based on game state
const spawnEnemy = (playerPos) => {
    // Don't spawn more zombies if we've reached the maximum
    if (gameState.zombies.length >= gameState.maxZombies) {
        return null;
    }
    
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
    
    // Determine which enemy type to spawn based on game state
    let enemyObj;
    const enemyTypeRoll = Math.random();
    
    if (enemyTypeRoll < 0.6) {
        // Regular zombie (60% chance)
        const zombie = createZombie(position);
        enemyObj = {
            mesh: zombie,
            health: 50,
            speed: 0.03 + Math.random() * 0.02,
            gameState: gameState,
            baseSpeed: 0.03 + Math.random() * 0.02,
            type: 'zombie'
        };
    } else if (enemyTypeRoll < 0.8) {
        // Skeleton Archer (20% chance)
        const skeletonArcher = createSkeletonArcher(position);
        enemyObj = {
            mesh: skeletonArcher,
            health: 40, // Less health than zombie
            speed: 0.04, // Faster but keeps distance
            gameState: gameState,
            baseSpeed: 0.04,
            type: 'skeletonArcher',
            lastShotTime: 0
        };
    } else if (enemyTypeRoll < 0.95) {
        // Exploder (15% chance)
        const exploder = createExploder(position);
        enemyObj = {
            mesh: exploder,
            health: 30, // Less health
            speed: 0.05, // Faster to get close to player
            gameState: gameState,
            baseSpeed: 0.05,
            type: 'exploder'
        };
    } else {
        // Zombie King (5% chance - rare but powerful)
        const zombieKing = createZombieKing(position);
        enemyObj = {
            mesh: zombieKing,
            health: 200, // Reduced from 500 to make dismemberment more visible
            speed: 0.02, // Slower but powerful
            gameState: gameState,
            baseSpeed: 0.02,
            type: 'zombieKing'
        };
    }
    
    // Ensure the mesh has the same type property for consistency
    enemyObj.mesh.type = enemyObj.type;
    
    // Set up dismemberment system for this zombie
    setupDismemberment(enemyObj);
    
    gameState.zombies.push(enemyObj);
    scene.add(enemyObj.mesh);
    logger.debug(`New ${enemyObj.type} spawned`, { position });
    
    return enemyObj;
};

// Function to handle game over
const handleGameOver = () => {
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
        Score: ${gameState.score}<br><br>
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

// Spawn initial environment objects
spawnEnvironmentObjects();

// Spawn initial zombies
for (let i = 0; i < gameState.initialSpawnCount; i++) {
    spawnEnemy(player.position);
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    try {
        const delta = clock.getDelta();
        const currentTime = Date.now();
        
        // Skip updates if game is over
        if (gameState.gameOver) {
            renderer.render(scene, camera);
            return;
        }
        
        // Update player position based on input with direction-based speeds
        handlePlayerMovement(player, gameState.keys, gameState.player.speed);
        
        // Aim player with mouse
        aimPlayerWithMouse(player, gameState.mouse, camera);
        
        // Update health halo based on player health
        if (player.userData.healthHalo) {
            // Calculate the angle based on health percentage (full circle = 2π radians)
            const healthPercent = Math.max(0, Math.min(100, gameState.player.health)) / 100;
            const angle = healthPercent * Math.PI * 2;
            
            // Replace the current halo with an updated one that shows the correct health
            const haloRadius = 0.4;
            const haloTubeWidth = 0.08;
            
            // Remove the old halo
            const oldHalo = player.userData.healthHalo;
            player.remove(oldHalo);
            
            // Remove the old glow halo if it exists
            if (player.userData.glowHalo) {
                const oldGlow = player.userData.glowHalo;
                player.remove(oldGlow);
            }
            
            // Create a new halo with the correct arc length
            const haloGeometry = new THREE.RingGeometry(
                haloRadius - haloTubeWidth, 
                haloRadius, 
                32, 
                1, 
                0, 
                angle
            );
            
            // Change color based on health - improved gradient
            let haloColor;
            if (healthPercent > 0.8) {
                haloColor = 0xffffff; // White for 80-100%
            } else if (healthPercent > 0.6) {
                haloColor = 0x00ff00; // Green for 60-80%
            } else if (healthPercent > 0.4) {
                haloColor = 0xffff00; // Yellow for 40-60%
            } else if (healthPercent > 0.2) {
                haloColor = 0xff8800; // Orange for 20-40%
            } else {
                haloColor = 0xff0000; // Red for 0-20%
            }
            
            const haloMaterial = new THREE.MeshBasicMaterial({
                color: haloColor,
                transparent: true,
                opacity: 0.8,
                side: THREE.DoubleSide
            });
            
            const newHalo = new THREE.Mesh(haloGeometry, haloMaterial);
            newHalo.rotation.x = -Math.PI / 2; // Make it horizontal
            newHalo.position.y = 1.9; // Position above the head
            player.add(newHalo);
            
            // Create a new glow halo with the correct arc length
            const glowGeometry = new THREE.RingGeometry(
                haloRadius - haloTubeWidth - 0.02, 
                haloRadius + 0.02, 
                32, 
                1, 
                0, 
                angle
            );
            
            const glowMaterial = new THREE.MeshBasicMaterial({
                color: haloColor,
                transparent: true,
                opacity: 0.3,
                side: THREE.DoubleSide
            });
            
            const newGlow = new THREE.Mesh(glowGeometry, glowMaterial);
            newGlow.rotation.x = -Math.PI / 2;
            newGlow.position.y = 1.9;
            player.add(newGlow);
            
            // Update the references
            player.userData.healthHalo = newHalo;
            player.userData.glowHalo = newGlow;
            
            // Add a subtle pulsing effect to the glow when health is low
            if (healthPercent < 0.3) {
                const pulseScale = 1 + 0.1 * Math.sin(currentTime * 0.01);
                newGlow.scale.set(pulseScale, pulseScale, 1);
            }
        }
        
        // Update camera to follow player
        camera.position.x = player.position.x;
        camera.position.z = player.position.z + 10; // Now in front of the player (flipped 180 degrees)
        camera.position.y = 10; // Higher camera position for more overhead view (was 7)
        
        // Calculate a target point that's:
        // 1. At the player's x position
        // 2. Below the player's y position (to position player higher in frame)
        // 3. Behind the player (to look back at the player)
        const targetPoint = new THREE.Vector3(
            player.position.x,
            player.position.y - 1, // Adjusted to tilt camera more overhead
            player.position.z - 3  // Now behind the player (flipped 180 degrees)
        );
        camera.lookAt(targetPoint);
        
        // Handle continuous firing when mouse is held down - with rate limiting
        if ((gameState.mouseDown || gameState.keys[' ']) && !gameState.gameOver) {
            shootBullet();
        }
        
        // Update bullets
        updateBullets(gameState.bullets, delta);
        
        // Handle all collisions (player-powerup, bullet-powerup, player-zombie, etc.)
        handleCollisions(gameState, scene, delta);
        
        // Check for bullet collisions with zombies
        for (let i = gameState.bullets.length - 1; i >= 0; i--) {
            const bullet = gameState.bullets[i];
            
            // Skip if bullet is already marked for removal
            if (bullet.toRemove) continue;
            
            for (let j = gameState.zombies.length - 1; j >= 0; j--) {
                const zombie = gameState.zombies[j];
                
                // Skip if zombie is already dead
                if (zombie.health <= 0) continue;
                
                // Use bullet.position for both tracer and non-tracer bullets
                // Increased collision threshold from 1.0 to 1.5 to better detect nearby enemies
                if (checkCollision(bullet.position, zombie.mesh.position, 1.5)) {
                    // Apply damage to zombie
                    zombie.health -= bullet.damage;
                    
                    // Mark bullet for removal
                    bullet.toRemove = true;
                    
                    // Check if zombie is dead
                    if (zombie.health <= 0) {
                        // Award points based on enemy type
                        let pointsAwarded = 10; // Base points for regular zombie
                        
                        if (zombie.type === 'skeletonArcher') {
                            pointsAwarded = 20;
                        } else if (zombie.type === 'exploder') {
                            pointsAwarded = 25;
                            
                            // Only create explosion if the exploder was already in explosion sequence
                            // NOT when it's shot and killed directly
                            if (zombie.mesh.isExploding) {
                                createExplosion(
                                    scene, 
                                    zombie.mesh.position.clone(), 
                                    3, // radius
                                    50, // damage
                                    gameState.zombies, 
                                    player, 
                                    gameState
                                );
                            }
                        } else if (zombie.type === 'zombieKing') {
                            pointsAwarded = 200;
                        }
                        
                        gameState.score += pointsAwarded;
                        
                        // Remove zombie from scene
                        scene.remove(zombie.mesh);
                        
                        // Remove zombie from array
                        gameState.zombies.splice(j, 1);
                    }
                    
                    break; // Bullet can only hit one zombie
                }
            }
        }
        
        // Remove bullets marked for removal
        for (let i = gameState.bullets.length - 1; i >= 0; i--) {
            if (gameState.bullets[i].toRemove) {
                // Only remove mesh from scene if it's a tracer bullet
                if (gameState.bullets[i].mesh) {
                    scene.remove(gameState.bullets[i].mesh);
                }
                gameState.bullets.splice(i, 1);
            }
        }
        
        // Update zombies
        updateZombies(gameState.zombies, player.position, delta);
        
        // Handle exploder explosions
        for (let i = gameState.zombies.length - 1; i >= 0; i--) {
            try {
                const zombie = gameState.zombies[i];
                
                if (!zombie || !zombie.mesh) continue;
                
                if (zombie.type === 'exploder' && 
                    zombie.mesh.isExploding && 
                    zombie.mesh.explosionTimer <= 0) {
                    
                    // Create explosion
                    createExplosion(
                        scene, 
                        zombie.mesh.position.clone(), 
                        4, // radius
                        75, // damage
                        gameState.zombies, 
                        player, 
                        gameState
                    );
                    
                    // Remove exploder
                    scene.remove(zombie.mesh);
                    gameState.zombies.splice(i, 1);
                    
                    // Add points for successful explosion
                    gameState.score += 25;
                }
            } catch (error) {
                logger.error(`Error handling exploder explosion: ${error.message}`);
                // Try to safely remove the zombie if there was an error
                try {
                    if (gameState.zombies[i] && gameState.zombies[i].mesh) {
                        scene.remove(gameState.zombies[i].mesh);
                    }
                    gameState.zombies.splice(i, 1);
                } catch (e) {
                    logger.error(`Error cleaning up zombie after explosion error: ${e.message}`);
                }
            }
        }
        
        // Handle skeleton archer shooting
        for (let i = 0; i < gameState.zombies.length; i++) {
            const zombie = gameState.zombies[i];
            
            if (zombie.type === 'skeletonArcher') {
                const currentTime = Date.now();
                const ARCHER_COOLDOWN = 2000; // 2 seconds between shots
                
                if (currentTime - zombie.lastShotTime >= ARCHER_COOLDOWN) {
                    // Check if in range and has line of sight
                    const distance = zombie.mesh.position.distanceTo(player.position);
                    
                    if (distance < 15 && distance > 5) {
                        zombie.lastShotTime = currentTime;
                        
                        // Get direction to player
                        const direction = new THREE.Vector3(
                            player.position.x - zombie.mesh.position.x,
                            0,
                            player.position.z - zombie.mesh.position.z
                        ).normalize();
                        
                        // Create arrow (similar to bullet but slower and different appearance)
                        const arrow = createBullet(
                            new THREE.Vector3(
                                zombie.mesh.position.x,
                                zombie.mesh.position.y + 0.5,
                                zombie.mesh.position.z
                            ),
                            direction,
                            10, // Arrow damage
                            0.2, // Arrow speed (slower than bullets)
                            0x8B4513 // Brown color for arrow
                        );
                        
                        // Make arrow longer and thinner
                        arrow.mesh.scale.set(0.05, 0.05, 0.3);
                        
                        scene.add(arrow.mesh);
                        gameState.bullets.push(arrow);
                    }
                }
            }
        }
        
        // Handle zombie king summoning minions
        for (let i = 0; i < gameState.zombies.length; i++) {
            const zombie = gameState.zombies[i];
            
            if (zombie.type === 'zombieKing' && zombie.mesh.summonCooldown <= 0) {
                // Reset cooldown
                zombie.mesh.summonCooldown = 10; // 10 seconds between summons
                
                // Summon 2-3 regular zombies around the king
                const numMinions = 2 + Math.floor(Math.random() * 2);
                
                for (let j = 0; j < numMinions; j++) {
                    const angle = Math.random() * Math.PI * 2;
                    const distance = 2 + Math.random() * 2;
                    
                    const position = {
                        x: zombie.mesh.position.x + Math.sin(angle) * distance,
                        z: zombie.mesh.position.z + Math.cos(angle) * distance
                    };
                    
                    const minion = createZombie(position);
                    const minionObj = {
                        mesh: minion,
                        health: 30, // Weaker than regular zombies
                        speed: 0.04, // But faster
                        gameState: gameState,
                        baseSpeed: 0.04,
                        type: 'zombie'
                    };
                    
                    gameState.zombies.push(minionObj);
                    scene.add(minion);
                }
                
                // Visual effect for summoning
                const summonEffect = new THREE.Mesh(
                    new THREE.RingGeometry(0.5, 3, 32),
                    new THREE.MeshBasicMaterial({
                        color: 0x800080,
                        transparent: true,
                        opacity: 0.7,
                        side: THREE.DoubleSide
                    })
                );
                
                summonEffect.rotation.x = Math.PI / 2; // Lay flat on ground
                summonEffect.position.copy(zombie.mesh.position);
                summonEffect.position.y = 0.1; // Just above ground
                scene.add(summonEffect);
                
                // Animate and remove the effect
                let scale = 1;
                const animateSummonEffect = () => {
                    scale -= 0.02;
                    summonEffect.scale.set(scale, scale, scale);
                    summonEffect.material.opacity = scale * 0.7;
                    
                    if (scale > 0) {
                        requestAnimationFrame(animateSummonEffect);
                    } else {
                        scene.remove(summonEffect);
                        summonEffect.geometry.dispose();
                        summonEffect.material.dispose();
                    }
                };
                
                animateSummonEffect();
            }
        }
        
        // Spawn new enemies based on time - much more frequently for a horde
        if (currentTime - gameState.lastEnemySpawnTime > gameState.enemySpawnRate) {
            // Spawn multiple zombies at once for a horde effect
            const spawnCount = Math.min(5, gameState.maxZombies - gameState.zombies.length);
            
            for (let i = 0; i < spawnCount; i++) {
                spawnEnemy(player.position);
            }
            
            gameState.lastEnemySpawnTime = currentTime;
        }
        
        // Update powerups - animate them
        for (const powerup of gameState.powerups) {
            if (powerup.active && powerup.mesh) {
                animatePowerup(powerup.mesh, clock.elapsedTime);
            }
        }
        
        // Check if we should spawn a powerup
        if (shouldSpawnPowerup(gameState, currentTime)) {
            spawnPowerupBehindPlayer(scene, gameState, player);
        }
        
        // Clean up old powerups
        cleanupOldPowerups(scene, gameState, 30000); // 30 seconds max age
        
        // Update powerup duration
        if (gameState.player.activePowerup && gameState.player.powerupDuration > 0) {
            gameState.player.powerupDuration -= delta;
            
            // Update powerup timer indicator
            if (!powerupTimer.visible) {
                powerupTimer.visible = true;
                innerCircle.visible = true;
                
                // Set color based on powerup type
                let timerColor, innerColor;
                if (gameState.player.activePowerup === 'tripleShot') {
                    timerColor = 0xffa500; // Orange
                    innerColor = 0xffcc00; // Light orange
                } else if (gameState.player.activePowerup === 'shotgunBlast') {
                    timerColor = 0xff0000; // Red
                    innerColor = 0xff6666; // Light red
                } else if (gameState.player.activePowerup === 'explosion') {
                    timerColor = 0x00ffff; // Cyan
                    innerColor = 0x99ffff; // Light cyan
                }
                
                powerupTimerMaterial.color.set(timerColor);
                innerCircleMaterial.color.set(innerColor);
            }
            
            // Calculate scale based on remaining duration (starts at 2, shrinks to 0)
            const scale = gameState.player.powerupDuration / 10 * 2;
            
            // Dispose old geometries
            powerupTimerGeometry.dispose();
            innerCircleGeometry.dispose();
            
            // Create new geometries with updated sizes
            powerupTimer.geometry = new THREE.RingGeometry(scale * 0.8, scale, 32);
            innerCircle.geometry = new THREE.CircleGeometry(scale * 0.7, 32);
            
            // Add pulsing effect to the inner circle
            const pulseScale = 0.9 + Math.sin(clock.elapsedTime * 5) * 0.1;
            innerCircle.scale.set(pulseScale, pulseScale, 1);
            
            // Adjust opacity based on remaining time (fade out as time runs out)
            const remainingTimeRatio = gameState.player.powerupDuration / 10;
            powerupTimerMaterial.opacity = 0.6 * remainingTimeRatio + 0.2; // Min opacity 0.2
            
            // Clear powerup if duration is up
            if (gameState.player.powerupDuration <= 0) {
                gameState.player.activePowerup = null;
                gameState.player.powerupDuration = 0;
                powerupTimer.visible = false;
                innerCircle.visible = false;
            }
        } else if (powerupTimer.visible || innerCircle.visible) {
            // Ensure timer elements are hidden when no powerup is active
            powerupTimer.visible = false;
            innerCircle.visible = false;
        }
        
        // Update UI
        updateUI(gameState);
        
        // Update blood particles from dismemberment
        if (gameState.bloodParticles && gameState.bloodParticles.length > 0) {
            updateBloodEffects(gameState.bloodParticles, scene, delta);
        }
        
        // Render scene
        renderer.render(scene, camera);
    } catch (error) {
        console.error("Error in animation loop:", error);
        logger.error(`Animation loop error: ${error.message}`);
    }
}

// Start animation loop
animate();

// Create debug UI if in debug mode
if (DEBUG_MODE) {
    createDebugUI(gameState);
}

// Function to create debug UI
function createDebugUI(gameState) {
    // Create container
    const debugContainer = document.createElement('div');
    debugContainer.style.position = 'absolute';
    debugContainer.style.top = '10px';
    debugContainer.style.left = '10px';
    debugContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    debugContainer.style.padding = '10px';
    debugContainer.style.borderRadius = '5px';
    debugContainer.style.color = 'white';
    debugContainer.style.fontFamily = 'Arial, sans-serif';
    debugContainer.style.zIndex = '1000';
    debugContainer.style.width = '300px';
    
    // Add title
    const title = document.createElement('h3');
    title.textContent = 'Debug Controls';
    title.style.margin = '0 0 10px 0';
    debugContainer.appendChild(title);
    
    // Create sliders
    const sliders = [
        {
            name: 'Gun Fire Rate',
            min: 50,
            max: 500,
            value: gameState.debug.gunFireRate,
            step: 10,
            onChange: (value) => {
                gameState.debug.gunFireRate = value;
            }
        },
        {
            name: 'Player Move Speed',
            min: 0.05,
            max: 0.5,
            value: gameState.debug.playerMoveSpeed,
            step: 0.01,
            onChange: (value) => {
                gameState.debug.playerMoveSpeed = value;
                gameState.player.speed = value;
            }
        },
        {
            name: 'Zombie Spawn Rate',
            min: 100,
            max: 2000,
            value: gameState.debug.zombieSpawnRate,
            step: 100,
            onChange: (value) => {
                gameState.debug.zombieSpawnRate = value;
                gameState.enemySpawnRate = value;
            }
        },
        {
            name: 'Powerup Spawn Rate',
            min: 5000,
            max: 30000,
            value: gameState.debug.powerupSpawnRate,
            step: 1000,
            onChange: (value) => {
                gameState.debug.powerupSpawnRate = value;
            }
        }
    ];
    
    // Add sliders to container
    sliders.forEach(slider => {
        const sliderContainer = document.createElement('div');
        sliderContainer.style.marginBottom = '10px';
        
        const label = document.createElement('label');
        label.textContent = `${slider.name}: ${slider.value}`;
        label.style.display = 'block';
        label.style.marginBottom = '5px';
        
        const input = document.createElement('input');
        input.type = 'range';
        input.min = slider.min;
        input.max = slider.max;
        input.value = slider.value;
        input.step = slider.step;
        input.style.width = '100%';
        
        input.addEventListener('input', () => {
            slider.onChange(parseFloat(input.value));
            label.textContent = `${slider.name}: ${input.value}`;
        });
        
        sliderContainer.appendChild(label);
        sliderContainer.appendChild(input);
        debugContainer.appendChild(sliderContainer);
    });
    
    // Add super health button
    const superHealthButton = document.createElement('button');
    superHealthButton.textContent = 'Give 100x Health';
    superHealthButton.style.padding = '8px 16px';
    superHealthButton.style.backgroundColor = '#4CAF50';
    superHealthButton.style.color = 'white';
    superHealthButton.style.border = 'none';
    superHealthButton.style.borderRadius = '4px';
    superHealthButton.style.cursor = 'pointer';
    superHealthButton.style.width = '100%';
    superHealthButton.style.marginTop = '10px';
    
    superHealthButton.addEventListener('click', () => {
        gameState.player.health = 10000;
        showMessage('Super health activated!', 2000);
    });
    
    debugContainer.appendChild(superHealthButton);
    
    // Add to document
    document.body.appendChild(debugContainer);
} 