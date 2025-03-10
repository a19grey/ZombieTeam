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
    lastShotTime: 0,
    environmentObjects: [], // Store environment objects
    score: 0, // Track player score
    enemySpawnRate: 200, // Time between enemy spawns in ms (reduced for more zombies)
    lastEnemySpawnTime: 0,
    maxZombies: 100, // Maximum number of zombies allowed at once
    initialSpawnCount: 30 // Number of zombies to spawn at start
};

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

// Create clock for timing
const clock = new THREE.Clock();

// Initialize UI
initUI(gameState);

// Setup event listeners
document.addEventListener('keydown', (event) => {
    gameState.keys[event.key.toLowerCase()] = true;
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
    if (currentTime - gameState.lastShotTime < 150) { // Reduced cooldown for faster firing
        return; // Still in cooldown
    }
    
    gameState.lastShotTime = currentTime;
    
    // Get player's forward direction - INVERTED for correct aiming
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(player.quaternion);
    
    // Create bullet with position slightly in front of player
    const bulletPosition = new THREE.Vector3(
        player.position.x + direction.x * 0.5,
        player.position.y + 0.5, // Bullet height
        player.position.z + direction.z * 0.5
    );
    
    const bullet = createBullet(
        bulletPosition,
        direction,
        gameState.player.damage,
        1.5 // Faster bullet speed
    );
    
    scene.add(bullet.mesh);
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
        
        scene.add(leftBullet.mesh);
        scene.add(rightBullet.mesh);
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
            
            scene.add(spreadBullet.mesh);
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
            health: 500, // Boss has much more health
            speed: 0.02, // Slower but powerful
            gameState: gameState,
            baseSpeed: 0.02,
            type: 'zombieKing'
        };
        showMessage("A Zombie King has appeared!", 3000);
    }
    
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
    spawnEnemy(new THREE.Vector3(0, 0, 0));
}

// Animation loop
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
            shootBullet();
        }
        
        // Update bullets
        updateBullets(gameState.bullets, delta);
        
        // Check for bullet collisions with zombies
        for (let i = gameState.bullets.length - 1; i >= 0; i--) {
            const bullet = gameState.bullets[i];
            
            // Skip if bullet is already marked for removal
            if (bullet.toRemove) continue;
            
            for (let j = gameState.zombies.length - 1; j >= 0; j--) {
                const zombie = gameState.zombies[j];
                
                // Skip if zombie is already dead
                if (zombie.health <= 0) continue;
                
                if (checkCollision(bullet.position, zombie.mesh.position, 1.0)) {
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
                            showMessage("The Zombie King has been defeated!", 3000);
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
                scene.remove(gameState.bullets[i].mesh);
                gameState.bullets.splice(i, 1);
            }
        }
        
        // Update zombies
        updateZombies(gameState.zombies, player.position, delta);
        
        // Handle exploder explosions
        for (let i = gameState.zombies.length - 1; i >= 0; i--) {
            const zombie = gameState.zombies[i];
            
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
        const currentTime = Date.now();
        if (currentTime - gameState.lastEnemySpawnTime > gameState.enemySpawnRate) {
            // Spawn multiple zombies at once for a horde effect
            const spawnCount = Math.min(5, gameState.maxZombies - gameState.zombies.length);
            
            for (let i = 0; i < spawnCount; i++) {
                spawnEnemy(player.position);
            }
            
            gameState.lastEnemySpawnTime = currentTime;
        }
        
        // Update powerups
        for (let i = gameState.powerups.length - 1; i >= 0; i--) {
            const powerup = gameState.powerups[i];
            
            // Animate powerup
            animatePowerup(powerup, delta);
            
            // Check for collision with player
            if (checkCollision(powerup.position, player.position, 1.5)) {
                // Apply powerup effect
                applyPowerupEffect(powerup.type, gameState);
                
                // Remove powerup
                scene.remove(powerup);
                gameState.powerups.splice(i, 1);
                
                // Show message
                showMessage(`Powerup activated: ${powerup.type}!`, 3000);
            }
        }
        
        // Update powerup duration
        if (gameState.player.activePowerup) {
            gameState.player.powerupDuration -= delta;
            
            if (gameState.player.powerupDuration <= 0) {
                gameState.player.activePowerup = null;
                showMessage("Powerup expired", 2000);
            }
        }
        
        // Update UI
        updateUI(gameState);
        
        // Render scene
        renderer.render(scene, camera);
    } catch (error) {
        console.error("Error in animation loop:", error);
    }
}

// Start animation loop
animate(); 