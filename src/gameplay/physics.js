/**
 * Physics Module - Handles collision detection
 * 
 * This module contains functions for detecting and handling collisions
 * between game entities (player, zombies, bullets).
 * 
 * Example usage:
 * import { handleCollisions } from './gameplay/physics.js';
 * handleCollisions(gameState, scene);
 */

import * as THREE from 'three';
import { createBullet } from './weapons.js';
import { damageZombie, isZombieDead } from './zombie.js';
import { logger } from '../utils/logger.js';
import { showMessage } from '../ui/ui.js';
import { playSound } from './audio.js'; // Import audio system
import { damagePowerup } from './powerupSpawner.js';
import { createExplosion } from './zombieUtils.js';

// Create audio for damage sound
let damageSound = null;

/**
 * Initializes the damage sound
 * @param {THREE.AudioListener} listener - The audio listener from the camera
 * @returns {Audio} The damage sound audio object
 */
const initDamageSound = (listener) => {
    // Safety check for listener
    if (!listener) {
        logger.warn('Audio listener not provided to initDamageSound');
        return null;
    }
    
    try {
        // Create a global audio source
        const sound = new THREE.Audio(listener);
        
        // Load a sound and set it as the Audio object's buffer
        const audioLoader = new THREE.AudioLoader();
        audioLoader.load(
            'https://assets.mixkit.co/active_storage/sfx/212/212-preview.mp3', // Pain grunt sound
            function(buffer) {
                sound.setBuffer(buffer);
                sound.setVolume(0.5);
                logger.debug('Damage sound loaded successfully');
            },
            function(xhr) {
                logger.debug(`Damage sound loading: ${(xhr.loaded / xhr.total * 100).toFixed(0)}%`);
            },
            function(err) {
                logger.error('Error loading damage sound:', err);
            }
        );
        
        return sound;
    } catch (error) {
        logger.error('Error initializing damage sound:', error);
        return null;
    }
};

/**
 * Checks if two objects are colliding based on their positions and a threshold distance
 * @param {THREE.Vector3} pos1 - Position of the first object
 * @param {THREE.Vector3} pos2 - Position of the second object
 * @param {number} threshold - Distance threshold for collision
 * @returns {boolean} True if the objects are colliding
 */
export const checkCollision = (pos1, pos2, threshold) => {
    // Safety check for undefined positions
    if (!pos1 || !pos2 || typeof pos1.x !== 'number' || typeof pos2.x !== 'number') {
        return false;
    }
    
    const dx = pos1.x - pos2.x;
    const dz = pos1.z - pos2.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    return distance < threshold;
};

/**
 * Pushes an object away from another object to prevent overlapping
 * @param {THREE.Vector3} objPos - Position of the object to push
 * @param {THREE.Vector3} fromPos - Position to push away from
 * @param {number} minDistance - Minimum distance to maintain
 * @returns {THREE.Vector3} New position for the object
 */
export const pushAway = (objPos, fromPos, minDistance) => {
    // Calculate direction vector
    const dx = objPos.x - fromPos.x;
    const dz = objPos.z - fromPos.z;
    
    // Calculate current distance
    const currentDistance = Math.sqrt(dx * dx + dz * dz);
    
    // If already at minimum distance or further, no need to push
    if (currentDistance >= minDistance) {
        return objPos;
    }
    
    // Normalize direction
    const normalizedDx = dx / currentDistance;
    const normalizedDz = dz / currentDistance;
    
    // Calculate new position
    return {
        x: fromPos.x + normalizedDx * minDistance,
        y: objPos.y,
        z: fromPos.z + normalizedDz * minDistance
    };
};

/**
 * Creates a floating damage indicator
 * @param {number} damage - The amount of damage to display
 * @param {THREE.Vector3} position - The position to display the indicator
 * @param {THREE.Camera} camera - The camera for 3D to 2D projection
 */
const createDamageIndicator = (damage, position, camera) => {
    try {
        // Safety check for parameters
        if (!position || !camera) {
            logger.warn('Missing parameters for createDamageIndicator');
            return;
        }
        
        // Create a div for the damage indicator
        const indicator = document.createElement('div');
        indicator.textContent = `-${Math.round(damage)}`;
        indicator.style.position = 'absolute';
        indicator.style.color = 'red';
        indicator.style.fontWeight = 'bold';
        indicator.style.fontSize = '20px';
        indicator.style.fontFamily = 'Arial, sans-serif';
        indicator.style.textShadow = '2px 2px 2px black';
        indicator.style.zIndex = '1000';
        indicator.style.pointerEvents = 'none';
        
        // Convert 3D position to screen position using proper projection
        if (camera) {
            // Clone the position to avoid modifying the original
            const pos = new THREE.Vector3(position.x, position.y, position.z);
            
            // Project the 3D position to 2D screen space
            pos.project(camera);
            
            // Convert to screen coordinates
            const screenX = (pos.x * 0.5 + 0.5) * window.innerWidth;
            const screenY = (-pos.y * 0.5 + 0.5) * window.innerHeight;
            
            indicator.style.left = `${screenX}px`;
            indicator.style.top = `${screenY}px`;
            
            logger.debug('Damage indicator created', { 
                damage: Math.round(damage),
                screenPosition: { x: screenX, y: screenY }
            });
        } else {
            // Fallback if camera is not available
            const screenX = (position.x / 20 + 0.5) * window.innerWidth;
            const screenY = (-position.z / 20 + 0.5) * window.innerHeight;
            
            indicator.style.left = `${screenX}px`;
            indicator.style.top = `${screenY}px`;
            
            logger.debug('Damage indicator created (fallback positioning)', { 
                damage: Math.round(damage)
            });
        }
        
        document.body.appendChild(indicator);
        
        // Animate the indicator
        let opacity = 1;
        let posY = parseFloat(indicator.style.top);
        
        const animate = () => {
            opacity -= 0.02;
            posY -= 1;
            
            indicator.style.opacity = opacity;
            indicator.style.top = `${posY}px`;
            
            if (opacity > 0) {
                requestAnimationFrame(animate);
            } else {
                document.body.removeChild(indicator);
            }
        };
        
        animate();
    } catch (error) {
        logger.error('Error creating damage indicator:', error);
    }
};

/**
 * Handles all collisions in the game
 * @param {Object} gameState - The current game state
 * @param {THREE.Scene} scene - The scene to remove objects from
 * @param {number} delta - Time delta between frames
 */
export const handleCollisions = (gameState, scene, delta = 1/60) => {
    try {
        const { bullets, zombies, player } = gameState;
        if (!bullets || !zombies || !player) {
            return;
        }
        
        // Get powerups from gameState
        const powerups = gameState.powerups || [];
        
        // Collision distances
        const COLLISION_DISTANCE = 1.5; // Increased from 1.0 to better detect nearby enemies
        const DAMAGE_DISTANCE = 1.2;
        const POWERUP_PICKUP_DISTANCE = 1.5; // Distance for player to pick up powerups
        const BULLET_POWERUP_COLLISION_DISTANCE = 0.8; // Distance for bullet to hit powerup
        
        // Initialize damage sound if not already done
        if (!damageSound && gameState.camera && gameState.camera.children[0]) {
            initDamageSound(gameState.camera.children[0]);
        }
        
        const ZOMBIE_COLLISION_DISTANCE = 1.0; // Also reduced zombie-zombie collision distance
        
        // Check for bullet-powerup collisions
        for (let b = bullets.length - 1; b >= 0; b--) {
            const bullet = bullets[b];
            
            // Skip if bullet doesn't exist
            if (!bullet) {
                logger.debug('collision', 'Skipping bullet: bullet is null');
                continue;
            }
            
            // Get bullet position - handle both tracer and non-tracer bullets
            const bulletPosition = bullet.mesh ? bullet.mesh.position : bullet.position;
            if (!bulletPosition) {
                logger.debug('collision', 'Skipping bullet: no position found');
                continue;
            }
            
            // Log bullet properties for debugging
            logger.debug('collision', 'Processing bullet for powerup collision', { 
                position: bulletPosition, 
                isTracer: bullet.isTracer,
                damage: bullet.damage || bullet.userData?.damage
            });
            
            for (let p = 0; p < powerups.length; p++) {
                const powerup = powerups[p];
                
                // Skip if powerup is not active or already unlocked
                if (!powerup || !powerup.active || powerup.unlocked) {
                    if (powerup) {
                        logger.debug('collision', `Skipping powerup: active=${powerup.active}, unlocked=${powerup.unlocked}`);
                    }
                    continue;
                }
                
                // Log powerup being checked
                logger.debug('collision', 'Checking powerup collision', { 
                    type: powerup.type, 
                    position: powerup.mesh.position,
                    health: powerup.health
                });
                
                // Using a much larger collision distance for better hit detection
                const INCREASED_COLLISION_DISTANCE = 2.0; // Increased from 0.8
                
                // Check if bullet hits powerup
                if (checkCollision(bulletPosition, powerup.mesh.position, INCREASED_COLLISION_DISTANCE)) {
                    // Get the damage from the bullet or use default
                    const bulletDamage = bullet.damage || bullet.userData?.damage || 20;
                    
                    logger.info('collision', `Bullet hit powerup!`, {
                        bulletPos: [bulletPosition.x.toFixed(2), bulletPosition.y.toFixed(2), bulletPosition.z.toFixed(2)],
                        powerupPos: [powerup.mesh.position.x.toFixed(2), powerup.mesh.position.y.toFixed(2), powerup.mesh.position.z.toFixed(2)],
                        distance: INCREASED_COLLISION_DISTANCE,
                        damage: bulletDamage
                    });
                    
                    // Damage the powerup and pass gameState and scene for activation
                    const isUnlocked = damagePowerup(powerup, bulletDamage, gameState, scene);
                    
                    // Log powerup hit
                    logger.info('powerup', `B: Powerup hit by bullet`, {
                        type: powerup.type,
                        damage: bulletDamage,
                        remainingHealth: powerup.health,
                        unlocked: powerup.unlocked,
                        active: powerup.active
                    });
                    
                    // Create a small hit effect
                    createHitEffect(scene, bulletPosition.clone(), 0.3);
                    
                    // Remove the bullet
                    if (bullet.mesh) {
                        scene.remove(bullet.mesh);
                    }
                    bullets.splice(b, 1);
                    
                    // Break out of powerup loop since bullet is now gone
                    break;
                }
            }
        }
        
        // Check player-powerup collisions
        for (let i = powerups.length - 1; i >= 0; i--) {
            const powerup = powerups[i];

            if (powerup.type === 'explosion' && powerup.unlocked) {
                logger.info('powerup', `Checking collision for powerup with state type/unlock/active: ${powerup.type} ${powerup.unlocked} ${powerup.active}`);
                }

            // Skip the current powerup if it is not defined, does not have a mesh, or is not active
            if (!powerup || !powerup.mesh || !powerup.active) continue;
            


            if (true) {
                
                // Only allow pickup if powerup is unlocked
                if (powerup.unlocked) {
                    // Log powerup state before activation
                    logger.info('powerup', `About to activate powerup`, { 
                        type: powerup.type, 
                        unlocked: powerup.unlocked,
                        playerPos: [player.position.x.toFixed(2), player.position.y.toFixed(2), player.position.z.toFixed(2)],
                        powerupPos: [powerup.mesh.position.x.toFixed(2), powerup.mesh.position.y.toFixed(2), powerup.mesh.position.z.toFixed(2)]
                    });
                    
                    // Explicitly call the exported activatePowerup function
                    activatePowerup(gameState, powerup.type, 'walk', scene);
                    
                    // Emergency direct property assignment (backup approach)
                    gameState.player.activePowerup = powerup.type;
                    gameState.player.powerupDuration = 10;
                    
                    // Log player state after activation
                    logger.info('powerup', `Player powerup state after direct assignment`, {
                        activePowerup: gameState.player.activePowerup,
                        powerupDuration: gameState.player.powerupDuration
                    });
                    
                    // Log powerup activation
                    logger.info('powerup', `Player collected powerup: ${powerup.type}`);
                    
                    // Show message
                    showMessage(`${powerup.type} activated!`, 2000);
                    
                    // Play powerup pickup sound 
                    playSound('powerupPickup');
                }
                else {
                    // Show a message that powerup needs to be shot first
                    if (!powerup.lastUnlockMessage || Date.now() - powerup.lastUnlockMessage > 3000) {
                        showMessage(`Shoot the ${powerup.type} to unlock it!`, 1500);
                        powerup.lastUnlockMessage = Date.now();
                    }
                }
            }
        }
        
        // Player-zombie damage visual effects
        // Note: Actual damage is now handled in zombie.js
        for (let i = 0; i < zombies.length; i++) {
            const zombie = zombies[i];
            if (!zombie || !zombie.mesh || !zombie.mesh.position) continue;
            
            if (checkCollision(player.position, zombie.mesh.position, DAMAGE_DISTANCE)) {
                // Show damage indicator occasionally
                if (Math.random() < 0.2 && gameState.camera) {
                    createDamageIndicator(1, player.position, gameState.camera);
                }
                
                // Play damage sound occasionally to avoid sound spam
                if (Math.random() < 0.1 && damageSound && damageSound.buffer && !damageSound.isPlaying) {
                    try {
                        damageSound.play();
                        logger.debug('Playing damage sound');
                    } catch (error) {
                        logger.error('Error playing damage sound:', error);
                    }
                }
                
                // Visual feedback for damage - flash the player red
                try {
                    if (!player.userData.damageEffect) {
                        // Store original materials
                        if (!player.userData.originalMaterials) {
                            player.userData.originalMaterials = [];
                            player.traverse((child) => {
                                if (child.isMesh && child.material) {
                                    player.userData.originalMaterials.push({
                                        mesh: child,
                                        material: child.material.clone()
                                    });
                                }
                            });
                        }
                        
                        // Apply red material to all player meshes
                        player.traverse((child) => {
                            if (child.isMesh && child.material) {
                                child.material = new THREE.MeshStandardMaterial({
                                    color: 0xff0000,
                                    emissive: 0xff0000,
                                    emissiveIntensity: 0.5
                                });
                            }
                        });
                        
                        // Set damage effect flag
                        player.userData.damageEffect = true;
                        
                        // Reset after a short time
                        setTimeout(() => {
                            try {
                                // Restore original materials
                                if (player.userData.originalMaterials) {
                                    player.userData.originalMaterials.forEach((item) => {
                                        item.mesh.material = item.material;
                                    });
                                }
                                player.userData.damageEffect = false;
                            } catch (error) {
                                logger.error('Error restoring player materials:', error);
                            }
                        }, 100);
                    }
                } catch (error) {
                    logger.error('Error applying damage effect to player:', error);
                }
                
                // Visual feedback for damage - screen flash
                if (Math.random() < 0.1) { // Only occasionally to avoid spam
                    logger.debug(`Player damaged! Health: ${gameState.player.health.toFixed(1)}`);
                    
                    try {
                        // Flash the screen red for damage feedback
                        const damageFlash = document.createElement('div');
                        damageFlash.style.position = 'absolute';
                        damageFlash.style.top = '0';
                        damageFlash.style.left = '0';
                        damageFlash.style.width = '100%';
                        damageFlash.style.height = '100%';
                        damageFlash.style.backgroundColor = 'rgba(255, 0, 0, 0.3)';
                        damageFlash.style.pointerEvents = 'none';
                        damageFlash.style.zIndex = '999';
                        document.body.appendChild(damageFlash);
                        
                        // Remove the flash after a short time
                        setTimeout(() => {
                            document.body.removeChild(damageFlash);
                        }, 100);
                    } catch (error) {
                        logger.error('Error creating screen flash effect:', error);
                    }
                }
                
                // Update UI after damage
                if (typeof gameState.updateUI === 'function') {
                    gameState.updateUI(gameState);
                }
            }
        }
        
        // Check bullet-zombie collisions
        for (let i = bullets.length - 1; i >= 0; i--) {
            const bullet = bullets[i];
            if (!bullet) continue;
            
            // Get bullet position - handle both tracer and non-tracer bullets
            const bulletPosition = bullet.mesh ? bullet.mesh.position : bullet.position;
            if (!bulletPosition) continue;
            
            let bulletHit = false;
            
            // Check bullet-zombie collisions
            for (let j = zombies.length - 1; j >= 0; j--) {
                const zombie = zombies[j];
                if (!zombie || !zombie.mesh || !zombie.mesh.position) continue;
                
                if (checkCollision(bulletPosition, zombie.mesh.position, COLLISION_DISTANCE)) {
                    // Damage zombie
                    const updatedZombie = damageZombie(zombie, bullet.userData ? bullet.userData.damage : 25, scene);
                    zombies[j] = updatedZombie;
                    
                    // Remove bullet
                    if (bullet.mesh) {
                        scene.remove(bullet.mesh);
                    }
                    bullets.splice(i, 1);
                    
                    // Mark bullet as hit
                    bulletHit = true;
                    
                    // Check if zombie is dead
                    if (isZombieDead(updatedZombie)) {
                        // Remove zombie from scene
                        scene.remove(updatedZombie.mesh);
                        
                        // Remove zombie from array
                        zombies.splice(j, 1);
                        
                        // Award EXP to player
                        gameState.player.exp += 10;
                    }
                    
                    break; // Bullet can only hit one zombie
                }
            }
        }
        
        // Prevent zombies from overlapping with each other
        for (let i = 0; i < zombies.length; i++) {
            const zombie1 = zombies[i];
            if (!zombie1 || !zombie1.mesh || !zombie1.mesh.position) continue;
            
            for (let j = i + 1; j < zombies.length; j++) {
                const zombie2 = zombies[j];
                if (!zombie2 || !zombie2.mesh || !zombie2.mesh.position) continue;
                
                if (checkCollision(zombie1.mesh.position, zombie2.mesh.position, ZOMBIE_COLLISION_DISTANCE)) {
                    // Push zombies away from each other
                    const newZombie2Pos = pushAway(zombie2.mesh.position, zombie1.mesh.position, ZOMBIE_COLLISION_DISTANCE);
                    zombie2.mesh.position.x = newZombie2Pos.x;
                    zombie2.mesh.position.z = newZombie2Pos.z;
                }
            }
        }
    } catch (error) {
        logger.error('Error in handleCollisions:', error);
    }
};

/**
 * Activates a powerup effect
 * @param {Object} gameState - The game state object
 * @param {string} powerupType - The type of powerup to activate
 * @param {string} activationMethod - How the powerup was activated ('walk' or 'shoot')
 * @param {THREE.Scene} scene - The scene to add objects to
 */
export const activatePowerup = (gameState, powerupType, activationMethod = 'walk', scene = null) => {
logger.debug('powerup', 'Activating powerup', { powerupType, activationMethod });
    if (!gameState || !powerupType) {
        logger.error('powerup', 'Failed to activate powerup - invalid parameters', { 
            hasGameState: !!gameState, 
            powerupType 
        });
        return;
    }
    
    try {
        // Set the active powerup in the game state
        if (!gameState.player) {
            logger.error('powerup', 'Cannot activate powerup - gameState.player is undefined');
            return;
        }
        
        // Ensure the player object has the required properties
        if (typeof gameState.player !== 'object') {
            logger.error('powerup', 'gameState.player is not an object', { 
                playerType: typeof gameState.player 
            });
            return;
        }
        
        // Initialize player powerup properties if they don't exist
        if (!gameState.player.hasOwnProperty('activePowerup')) {
            gameState.player.activePowerup = null;
        }
        
        if (!gameState.player.hasOwnProperty('powerupDuration')) {
            gameState.player.powerupDuration = 0;
        }
        
        // Set the active powerup values
        gameState.player.activePowerup = powerupType;
        gameState.player.powerupDuration = 10; // 10 seconds duration
        
        // Log powerup activation
        logger.info('powerup', `Powerup activated successfully`, {
            type: powerupType,
            method: activationMethod,
            duration: gameState.player.powerupDuration
        });
        
        // Special handling for explosion powerup - deploy mines immediately
        if (powerupType === 'explosion' && scene) {
            logger.info('powerup', 'N: Explosion powerup detected - deploying mines immediately');
            // Create a dummy direction vector since we're not using it for mine placement
            const dummyDirection = new THREE.Vector3(0, 0, 1);
            // Call applyPowerupEffect to create the minefield
            applyPowerupEffect(
                gameState,
                gameState.playerObject.position.clone(),
                dummyDirection,
                scene
            );
        }
        
        // Play powerup pickup sound
        playSound('powerupPickup');
    } catch (error) {
        logger.error('powerup', 'Error activating powerup:', error);
    }
};

/**
 * Applies the active powerup effect to a bullet shot
 * @param {Object} gameState - The game state object
 * @param {THREE.Vector3} position - The position to create bullets at
 * @param {THREE.Vector3} direction - The direction for bullets to travel
 * @param {THREE.Scene} scene - The scene to add bullets to
 */
export const applyPowerupEffect = (gameState, position, direction, scene) => {
    if (!gameState || !gameState.player) {
        return;
    }
    logger.info('powerup', 'L: Applying powerup effect ', { powerupType: gameState.player.activePowerup });
   
    // Check if there's an active powerup
    const powerupType = gameState.player.activePowerup;
    
    if (!powerupType) {
        // No active powerup, create a normal bullet
        const bullet = createBullet(position, direction);
        gameState.bullets.push(bullet);
        if (bullet.mesh) {
            scene.add(bullet.mesh);
        }
        return;
    }
    
    switch (powerupType) {
        case 'rapidFire':
            // Create a single faster bullet with standard damage
            const rapidBullet = createBullet(position, direction, 25, 1.5, 0xffa500);
            gameState.bullets.push(rapidBullet);
            if (rapidBullet.mesh) {
                scene.add(rapidBullet.mesh);
            }
            
            logger.debug('Rapid fire bullet fired');
            break;
            
        case 'shotgunBlast':
            // Create a spread of 8 bullets in a cone (increased from 5 for better spread)
            const shotgunSpread = Math.PI / 8; // 22.5 degrees
            const numPellets = 8;
            
            for (let i = 0; i < numPellets; i++) {
                // Calculate angle for this pellet (evenly distributed across the spread)
                const angle = (i / (numPellets - 1) - 0.5) * 2 * shotgunSpread;
                
                // Create direction vector with spread
                const pelletDir = direction.clone();
                pelletDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
                
                // Create bullet with reduced damage
                const pellet = createBullet(position, pelletDir, 15, 1.0, 0x4682b4);
                gameState.bullets.push(pellet);
                if (pellet.mesh) {
                    scene.add(pellet.mesh);
                }
            }
            
            logger.debug('Shotgun blast fired');
            break;
            
        case 'laserShot':
            // Create a laser beam (long, thin bullet with high damage)
            const laserBullet = createBullet(position, direction, 50, 2.0, 0x00ffff);
            
            // Make laser longer and thinner
            if (laserBullet.mesh) {
                laserBullet.mesh.scale.set(0.05, 0.05, 3.0);
            }
            
            gameState.bullets.push(laserBullet);
            if (laserBullet.mesh) {
                scene.add(laserBullet.mesh);
            }
            
            // Add laser light effect
            const laserLight = new THREE.PointLight(0x00ffff, 1, 5);
            laserLight.position.copy(position);
            scene.add(laserLight);
            
            // Remove light after a short time
            setTimeout(() => {
                scene.remove(laserLight);
            }, 100);
            
            logger.debug('Laser shot fired');
            break;
            
        case 'grenadeLauncher':
            // Create a grenade (slower moving bullet that explodes on impact)
            const grenadeBullet = createBullet(position, direction, 0, 0.8, 0x228b22);
            
            // Make grenade larger and spherical
            if (grenadeBullet.mesh) {
                grenadeBullet.mesh.scale.set(0.3, 0.3, 0.3);
            }
            
            // Add grenade properties
            grenadeBullet.isGrenade = true;
            grenadeBullet.smokeTrail = [];
            
            gameState.bullets.push(grenadeBullet);
            if (grenadeBullet.mesh) {
                scene.add(grenadeBullet.mesh);
            }
            
            logger.debug('Grenade launched');
            break;
            
        case 'explosion':
            logger.info('powerup', 'M: Starting explosion powerup minefield deployment');
            
            // Create a defensive line of mines in front of the player
            const MINE_ROWS = 2;
            const MINES_PER_ROW = 10;
            const MINE_SPACING = 1.5; // Space between mines
            const ROW_SPACING = 1.0; // Space between rows
            const MINE_DISTANCE = -5;
            
            logger.debug('powerup', 'Mine configuration', {
                rows: MINE_ROWS,
                minesPerRow: MINES_PER_ROW,
                spacing: MINE_SPACING,
                rowSpacing: ROW_SPACING,
                distance: MINE_DISTANCE
            });
            
            // Calculate starting position (always in +Z direction)
            const startPosition = new THREE.Vector3(
                gameState.playerObject.position.x,
                0.05, // Just above ground
                gameState.playerObject.position.z + MINE_DISTANCE
            );
            
            logger.debug('powerup', 'Starting position for mines', {
                x: startPosition.x.toFixed(2),
                y: startPosition.y.toFixed(2),
                z: startPosition.z.toFixed(2),
                playerPos: {
                    x: gameState.playerObject.position.x.toFixed(2),
                    z: gameState.playerObject.position.z.toFixed(2)
                }
            });
            
            // Always use world X axis for mine rows
            const perpDirection = new THREE.Vector3(1, 0, 0);
            
            // Initialize mine count for logging
            let minesCreated = 0;
            
            // Create mines in two rows
            for (let row = 0; row < MINE_ROWS; row++) {
                const rowOffset = perpDirection.clone().multiplyScalar(row * ROW_SPACING);
                const rowStart = startPosition.clone().add(rowOffset);
                
                logger.debug('powerup', `Creating row ${row + 1}`, {
                    rowStartX: rowStart.x.toFixed(2),
                    rowStartZ: rowStart.z.toFixed(2)
                });
                
                for (let i = 0; i < MINES_PER_ROW; i++) {
                    const mineOffset = perpDirection.clone().multiplyScalar((i - MINES_PER_ROW/2) * MINE_SPACING);
                    const minePosition = rowStart.clone().add(mineOffset);
                    
                    logger.debug('powerup', `Creating mine ${i + 1} in row ${row + 1}`, {
                        x: minePosition.x.toFixed(2),
                        z: minePosition.z.toFixed(2)
                    });
                    
                    // Create mine mesh
                    const mineGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.1, 8);
                    const mineMaterial = new THREE.MeshStandardMaterial({
                        color: 0xff0000,
                        emissive: 0xff0000,
                        emissiveIntensity: 0.5
                    });
                    const mine = new THREE.Mesh(mineGeometry, mineMaterial);
                    mine.position.copy(minePosition);
                    
                    // Add to scene
                    scene.add(mine);
                    minesCreated++;
                    
                    // Create mine object with properties
                    const mineObject = {
                        mesh: mine,
                        position: minePosition.clone(),
                        damage: 800,
                        radius: 3,
                        isActive: true,
                        createdAt: Date.now(),
                        lifetime: 10000 // 10 seconds lifetime
                    };
                    
                    // Add pulsing effect
                    let pulseScale = 1.0;
                    const pulseSpeed = 0.1;
                    const pulseIntensity = 0.2;
                    
                    mineObject.update = () => {
                        if (!mineObject.isActive) return false;
                        
                        // Update lifetime
                        if (Date.now() - mineObject.createdAt > mineObject.lifetime) {
                            logger.debug('powerup', 'Mine expired', {
                                position: {
                                    x: mine.position.x.toFixed(2),
                                    z: mine.position.z.toFixed(2)
                                }
                            });
                            mineObject.isActive = false;
                            scene.remove(mine);
                            mine.geometry.dispose();
                            mine.material.dispose();
                            return false;
                        }
                        
                        // Update pulse effect
                        pulseScale = 1.0 + Math.sin(Date.now() * pulseSpeed) * pulseIntensity;
                        mine.scale.set(pulseScale, 1, pulseScale);
                        
                        // Check for zombie collisions
                        for (const zombie of gameState.zombies) {
                            if (!zombie || !zombie.mesh) continue;
                            
                            const distance = mine.position.distanceTo(zombie.mesh.position);
                            if (distance < 1) { // Mine triggered
                                logger.info('powerup', 'Mine triggered by zombie', {
                                    minePos: {
                                        x: mine.position.x.toFixed(2),
                                        z: mine.position.z.toFixed(2)
                                    },
                                    zombiePos: {
                                        x: zombie.mesh.position.x.toFixed(2),
                                        z: zombie.mesh.position.z.toFixed(2)
                                    },
                                    distance: distance.toFixed(2)
                                });
                                
                                // Create explosion
                                createExplosion(
                                    scene,
                                    mine.position,
                                    mineObject.radius,
                                    mineObject.damage,
                                    gameState.zombies,
                                    gameState.playerObject,
                                    gameState,
                                    'player'
                                );
                                
                                // Remove mine
                                mineObject.isActive = false;
                                scene.remove(mine);
                                mine.geometry.dispose();
                                mine.material.dispose();
                                return false;
                            }
                        }
                        
                        return true;
                    };
                    
                    // Add to gameState for updating
                    if (!gameState.mines) {
                        gameState.mines = [];
                    }
                    gameState.mines.push(mineObject);
                    
                    // Play mine placement sound
                    playSound('minePlace', minePosition);
                }
            }
            
            logger.info('powerup', 'Minefield deployment complete', {
                totalMines: minesCreated,
                startPosition: {
                    x: startPosition.x.toFixed(2),
                    z: startPosition.z.toFixed(2)
                }
            });
            
            // Show message to player
            showMessage('Minefield deployed!', 2000);
            break;
            
        default:
            // Unknown powerup, create a normal bullet
            const defaultBullet = createBullet(position, direction);
            gameState.bullets.push(defaultBullet);
            if (defaultBullet.mesh) {
                scene.add(defaultBullet.mesh);
            }
            break;
    }
};

/**
 * Creates a small hit effect at the given position
 * @param {THREE.Scene} scene - The scene to add the effect to
 * @param {THREE.Vector3} position - Position for the effect
 * @param {number} size - Size of the effect
 */
const createHitEffect = (scene, position, size = 0.5) => {
    // Create a small particle effect
    const geometry = new THREE.SphereGeometry(size, 8, 8);
    const material = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.8
    });
    
    const effect = new THREE.Mesh(geometry, material);
    effect.position.copy(position);
    scene.add(effect);
    
    // Animate and remove the effect
    let scale = 1;
    const fadeOut = () => {
        scale -= 0.1;
        effect.scale.set(scale, scale, scale);
        effect.material.opacity = scale;
        
        if (scale > 0) {
            requestAnimationFrame(fadeOut);
        } else {
            scene.remove(effect);
            effect.geometry.dispose();
            effect.material.dispose();
        }
    };
    
    fadeOut();
}; 