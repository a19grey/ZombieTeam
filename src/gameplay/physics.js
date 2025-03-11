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

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.132.2/build/three.module.js';
import { createBullet } from './weapons.js';
import { damageZombie, isZombieDead } from './zombie.js';
import { logger } from '../utils/logger.js';
import { showMessage } from '../ui/ui.js';

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
        
        // Initialize damage sound if not already done
        if (!damageSound && gameState.camera && gameState.camera.children[0]) {
            initDamageSound(gameState.camera.children[0]);
        }
        
        const ZOMBIE_COLLISION_DISTANCE = 1.0; // Also reduced zombie-zombie collision distance
        
        // Check player-powerup collisions
        for (let i = powerups.length - 1; i >= 0; i--) {
            const powerup = powerups[i];
            if (!powerup || !powerup.mesh || !powerup.active) continue;
            
            if (checkCollision(player.position, powerup.mesh.position, POWERUP_PICKUP_DISTANCE)) {
                // Activate powerup
                activatePowerup(gameState, powerup.type, 'walk');
                
                // Remove powerup from scene
                scene.remove(powerup.mesh);
                powerup.active = false;
                
                // Log powerup activation
                logger.debug(`Player collected powerup: ${powerup.type}`);
                
                // Show message
                showMessage(`${powerup.type} activated!`, 2000);
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
            
            // Check bullet-powerup collisions first
            for (let p = powerups.length - 1; p >= 0; p--) {
                const powerup = powerups[p];
                if (!powerup || !powerup.mesh || !powerup.active) continue;
                
                // Use a slightly larger collision distance for non-tracer bullets to improve hit detection
                const bulletCollisionDistance = bullet.mesh ? 1.0 : 1.5;
                
                if (checkCollision(bulletPosition, powerup.mesh.position, bulletCollisionDistance)) {
                    // Activate powerup
                    activatePowerup(gameState, powerup.type, 'shoot');
                    
                    // Remove bullet
                    if (bullet.mesh) {
                        scene.remove(bullet.mesh);
                    }
                    bullets.splice(i, 1);
                    
                    // Remove powerup from scene
                    scene.remove(powerup.mesh);
                    powerup.active = false;
                    
                    // Log powerup activation
                    logger.debug(`Powerup activated by bullet: ${powerup.type}`);
                    
                    // Mark bullet as hit
                    bulletHit = true;
                    break;
                }
            }
            
            // If bullet already hit a powerup, skip zombie collision checks
            if (bulletHit) continue;
            
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
 */
export const activatePowerup = (gameState, powerupType, activationMethod = 'walk') => {
    if (!gameState || !powerupType) return;
    
    // Set the active powerup in the game state
    gameState.player.activePowerup = powerupType;
    gameState.player.powerupDuration = 10; // 10 seconds duration
    
    // Log powerup activation (for debugging only)
    if (activationMethod === 'walk') {
        logger.debug(`Powerup collected by walking: ${powerupType}`);
    } else {
        logger.debug(`Powerup activated by shooting: ${powerupType}`);
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
    
    // Create a bullet directly with the correct parameters
    const createBulletWithDirection = (pos, dir) => {
        // Create bullet geometry
        const bulletGeometry = new THREE.SphereGeometry(0.2, 8, 8);
        const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
        
        // Set initial position
        bullet.position.copy(pos);
        
        // Store direction and other properties
        bullet.userData = {
            direction: dir.normalize(),
            speed: 1.0,
            distance: 0,
            maxDistance: 50,
            damage: 25
        };
        
        return bullet;
    };
    
    // Check if there's an active powerup
    const powerupType = gameState.player.activePowerup;
    
    if (!powerupType) {
        // No active powerup, create a normal bullet
        const bullet = createBulletWithDirection(position, direction);
        gameState.bullets.push(bullet);
        scene.add(bullet);
        return;
    }
    
    switch (powerupType) {
        case 'tripleShot':
            // Create three bullets in a spread pattern
            const spreadAngle = Math.PI / 12; // 15 degrees
            
            // Center bullet
            const centerBullet = createBulletWithDirection(position, direction.clone());
            gameState.bullets.push(centerBullet);
            scene.add(centerBullet);
            
            // Left bullet (rotate direction)
            const leftDir = direction.clone();
            leftDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), spreadAngle);
            const leftBullet = createBulletWithDirection(position, leftDir);
            gameState.bullets.push(leftBullet);
            scene.add(leftBullet);
            
            // Right bullet (rotate direction)
            const rightDir = direction.clone();
            rightDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), -spreadAngle);
            const rightBullet = createBulletWithDirection(position, rightDir);
            gameState.bullets.push(rightBullet);
            scene.add(rightBullet);
            
            logger.debug('Triple shot fired');
            break;
            
        case 'shotgunBlast':
            // Create a spread of 5 bullets in a cone (reduced from 7 for performance)
            const shotgunSpread = Math.PI / 8; // 22.5 degrees
            const numPellets = 5;
            
            for (let i = 0; i < numPellets; i++) {
                // Calculate angle for this pellet (evenly distributed across the spread)
                const angle = (i / (numPellets - 1) - 0.5) * 2 * shotgunSpread;
                
                // Create direction vector with spread
                const pelletDir = direction.clone();
                pelletDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
                
                // Create bullet with reduced damage
                const pellet = createBulletWithDirection(position, pelletDir);
                pellet.userData.damage = 15; // Reduced damage per pellet
                gameState.bullets.push(pellet);
                scene.add(pellet);
            }
            
            logger.debug('Shotgun blast fired');
            break;
            
        case 'explosion':
            // Create an explosion effect that damages all zombies within range
            const EXPLOSION_RADIUS = 10;
            const EXPLOSION_DAMAGE = 100;
            
            // Visual effect - simple flash
            const explosionLight = new THREE.PointLight(0xff5500, 2, EXPLOSION_RADIUS * 2);
            explosionLight.position.copy(gameState.player.position);
            explosionLight.position.y = 1;
            scene.add(explosionLight);
            
            // Remove light after a short time
            setTimeout(() => {
                scene.remove(explosionLight);
            }, 500);
            
            // Damage all zombies within range
            const zombiesToRemove = [];
            
            gameState.zombies.forEach((zombie, index) => {
                if (!zombie || !zombie.mesh) return;
                
                const dx = gameState.player.position.x - zombie.mesh.position.x;
                const dz = gameState.player.position.z - zombie.mesh.position.z;
                const distance = Math.sqrt(dx * dx + dz * dz);
                
                if (distance <= EXPLOSION_RADIUS) {
                    // Calculate damage based on distance (more damage closer to center)
                    const damageMultiplier = 1 - (distance / EXPLOSION_RADIUS);
                    const damage = EXPLOSION_DAMAGE * damageMultiplier;
                    
                    // Apply damage to zombie
                    const updatedZombie = damageZombie(zombie, damage, scene);
                    gameState.zombies[index] = updatedZombie;
                    
                    // Check if zombie is dead
                    if (isZombieDead(updatedZombie)) {
                        zombiesToRemove.push({ index, mesh: zombie.mesh });
                        
                        // Award EXP to player
                        gameState.player.exp += 10;
                    }
                }
            });
            
            // Remove dead zombies after the loop to avoid array index issues
            zombiesToRemove.sort((a, b) => b.index - a.index); // Sort in reverse order
            zombiesToRemove.forEach(zombie => {
                scene.remove(zombie.mesh);
                gameState.zombies.splice(zombie.index, 1);
            });
            
            // Clear the powerup after use (explosion is one-time use)
            gameState.player.activePowerup = null;
            gameState.player.powerupDuration = 0;
            
            logger.debug('Explosion activated');
            break;
            
        default:
            // Default to normal bullet
            const bullet = createBulletWithDirection(position, direction);
            gameState.bullets.push(bullet);
            scene.add(bullet);
            break;
    }
}; 