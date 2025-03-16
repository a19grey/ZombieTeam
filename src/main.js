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

import { createScene, createCamera, createRenderer, createLighting, createGround } from './rendering/scene.js';
import { createPlayer, handlePlayerMovement, createPlayerWeapon, aimPlayerWithMouse } from './gameplay/player.js';
import { createZombie, updateZombies, createSkeletonArcher, createExploder, createZombieKing, createExplosion } from './gameplay/zombie.js';
import { updateUI, showMessage, initUI } from './ui/ui.js';
import { handleCollisions, checkCollision, applyPowerupEffect } from './gameplay/physics.js';
import { createBullet, updateBullets } from './gameplay/weapons.js';
import { logger } from './utils/logger.js';
import { createRapidFirePowerup, createShotgunBlastPowerup, createExplosionPowerup, createLaserShotPowerup, createGrenadeLauncherPowerup, animatePowerup, createSmokeTrail } from './gameplay/powerups2.js';
import { createTexturedGround, createBuilding, createRock, createDeadTree } from './rendering/environment.js';
import { setupDismemberment, updateParticleEffects } from './gameplay/dismemberment.js';
import { shouldSpawnPowerup, spawnPowerupBehindPlayer, cleanupOldPowerups } from './gameplay/powerupSpawner.js';
import { initAudio, loadAudio, loadPositionalAudio, playSound, stopSound, toggleMute, setMasterVolume, debugAudioSystem, getAudioState, setAudioEnabled } from './gameplay/audio.js';
import { createSoundSettingsUI, toggleSoundSettingsUI, isSoundSettingsVisible } from './ui/soundSettings.js';
import { debugWebGL, fixWebGLContext, monitorRenderingPerformance, createFallbackCanvas } from './debug.js';
import { runTests } from './utils/testRunner.js';
import { testWeaponsSystem } from './utils/weaponsTester.js';
import { safeCall } from './utils/safeAccess.js';
import { checkAudioFiles, suggestAudioFix } from './utils/audioChecker.js';


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

// Run WebGL diagnostics
const webglDiagnostics = debugWebGL();
logger.info('WebGL diagnostics:', webglDiagnostics);


// Setup event listeners
document.addEventListener('keydown', (event) => {
    gameState.keys[event.key.toLowerCase()] = true;
    
    // Debug key to spawn a powerup (P key)
    if (event.key.toLowerCase() === 'p' && gameState.debug) {
        logger.debug('Manual powerup spawn triggered');
        spawnPowerupBehindPlayer(scene, gameState, player);
    }
    
    // Toggle sound settings with M key
    if (event.key.toLowerCase() === 'm') {
        createSoundSettingsUI();
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
    
    // Apply rapid fire powerup effect if active
    let actualFireRate = fireRateCooldown;
    if (gameState.player.activePowerup === 'rapidFire') {
        actualFireRate = fireRateCooldown / 3; // 3x faster fire rate
    }
    
    if (currentTime - gameState.lastShotTime < actualFireRate) {
        return; // Still in cooldown
    }
    
    gameState.lastShotTime = currentTime;
    
    // Play gunshot sound
    playSound('gunshot');
    
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
    
    // Apply powerup effects
    if (gameState.player.activePowerup === 'rapidFire') {
        // Rapid fire is handled by reducing the cooldown above
        // Create a single bullet with standard damage
        const bullet = createBullet(
            bulletPosition,
            direction,
            gameState.player.damage,
            1.8 // Faster bullet speed for rapid fire
        );
        
        if (bullet.mesh) {
            scene.add(bullet.mesh);
        }
        gameState.bullets.push(bullet);
    } else if (gameState.player.activePowerup === 'shotgunBlast') {
        // Create 8 bullets in a spread pattern
        for (let i = 0; i < 8; i++) {
            const spreadDirection = direction.clone().applyAxisAngle(
                new THREE.Vector3(0, 1, 0),
                (Math.random() - 0.5) * Math.PI / 4
            );
            
            const spreadBullet = createBullet(
                bulletPosition.clone(),
                spreadDirection,
                gameState.player.damage * 0.6, // Less damage per pellet
                1.5
            );
            
            if (spreadBullet.mesh) {
                scene.add(spreadBullet.mesh);
            }
            gameState.bullets.push(spreadBullet);
        }
    } else if (gameState.player.activePowerup === 'laserShot') {
        // Create a laser beam (long, thin bullet with high damage)
        const laserBullet = createBullet(
            bulletPosition,
            direction,
            gameState.player.damage * 2, // Double damage
            3.0, // Very fast
            0x00ffff // Cyan color for laser
        );
        
        // Use safeCall instead of direct access to avoid null errors
        safeCall(laserBullet, 'mesh.scale.set', [0.05, 0.05, 3.0]);
        
        if (laserBullet.mesh) {
            scene.add(laserBullet.mesh);
        }
        gameState.bullets.push(laserBullet);
        
        // Add laser light effect
        const laserLight = new THREE.PointLight(0x00ffff, 1, 5);
        laserLight.position.copy(bulletPosition);
        scene.add(laserLight);
        
        // Remove light after a short time
        setTimeout(() => {
            scene.remove(laserLight);
        }, 100);
    } else if (gameState.player.activePowerup === 'grenadeLauncher') {
        // Create a grenade (slower moving bullet that explodes on impact)
        const grenadeBullet = createBullet(
            bulletPosition,
            direction,
            0, // No direct damage, damage is from explosion
            0.8, // Slower speed
            0x228b22 // Green color
        );
        
        // Use safeCall instead of direct access to avoid null errors
        safeCall(grenadeBullet, 'mesh.scale.set', [0.2, 0.2, 0.2]);
        
        if (grenadeBullet.mesh) {
            scene.add(grenadeBullet.mesh);
        }
        
        // Add grenade properties
        grenadeBullet.isGrenade = true;
        grenadeBullet.smokeTrail = [];
        
        gameState.bullets.push(grenadeBullet);
    } else if (gameState.player.activePowerup === 'explosion') {
        // Create an explosive bullet
        const explosiveBullet = createBullet(
            bulletPosition,
            direction,
            gameState.player.damage,
            1.5
        );
        
        // Use safeCall instead of direct access to avoid null errors
        safeCall(explosiveBullet, 'mesh.scale.set', [0.15, 0.15, 0.3]);
        
        // Add explosive property
        explosiveBullet.isExplosive = true;
        
        if (explosiveBullet.mesh) {
            // Make it slightly larger and red-tinted
            explosiveBullet.mesh.material.color.set(0xff6666);
            scene.add(explosiveBullet.mesh);
        }
        
        gameState.bullets.push(explosiveBullet);
    } else {
        // Standard bullet
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
    
    // Play zombie growl sound at the zombie's position
    playSound('zombieGrowl', enemyObj.mesh.position);
    
    logger.debug(`New ${enemyObj.type} spawned`, { position });
    
    return enemyObj;
};

// Spawn initial environment objects
spawnEnvironmentObjects();

// Spawn initial zombies
for (let i = 0; i < gameState.initialSpawnCount; i++) {
    spawnEnemy(player.position);
}

if (DEBUG_MODE) {
// Start performance monitoring in debug mode
let stopMonitoring;
}

// Start animation loop
animate();

// Spawn initial environment objects
spawnEnvironmentObjects();

// Spawn initial zombies
for (let i = 0; i < gameState.initialSpawnCount; i++) {
    spawnEnemy(player.position);
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