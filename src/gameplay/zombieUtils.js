/**
 * Zombie Utilities Module - Shared utility functions for zombie gameplay
 * 
 * This module contains common helper functions for handling zombie game mechanics such as
 * damage calculation, death detection, and special effects like explosions.
 * 
 * Example usage:
 *   import { damageZombie, isZombieDead, createExplosion } from './zombieUtils.js';
 *   
 *   // Damage a zombie
 *   const updatedZombie = damageZombie(zombie, 10, scene);
 *   
 *   // Check if zombie is dead
 *   if (isZombieDead(updatedZombie)) {
 *     removeZombie(updatedZombie);
 *   }
 *   
 *   // Create an explosion
 *   createExplosion(scene, position, 3, 100, zombies, player, gameState);
 */

import * as THREE from 'three';
import { playSound } from './audio.js';
import { logger } from '../utils/logger.js';
import { processDismemberment } from './dismemberment.js';

/**
 * Damages the player and handles related effects
 * @param {Object} gameState - The game state object containing player data
 * @param {number} damageAmount - Amount of damage to apply
 */
export const damagePlayer = (gameState, damageAmount) => {
    if (!gameState || !gameState.player) return;
    
    gameState.player.health -= damageAmount;
    
    if (gameState.player.health < 0) {
        gameState.player.health = 0;
    }
    
    if (gameState.player.health <= 0 && typeof gameState.handleGameOver === 'function') {
        gameState.handleGameOver();
    }
    
    // Add a damage animation effect to the health halo
    if (gameState.player.health > 0 && gameState.playerObject && gameState.playerObject.userData) {
        const halo = gameState.playerObject.userData.healthHalo;
        const glowHalo = gameState.playerObject.userData.glowHalo;
        
        
        if (glowHalo) {
            // Make the glow halo briefly larger
            const originalScale = glowHalo.scale.x;
            glowHalo.scale.set(1.3, 1.3, 1);
            
            // Reset after a short time
            setTimeout(() => {
                if (glowHalo.scale) {
                    glowHalo.scale.set(originalScale, originalScale, 1);
                }
            }, 150);
        }
    }
};

/**
 * Damages a zombie and checks if it's dead
 * @param {Object} zombie - The zombie object
 * @param {number} damage - Amount of damage to apply
 * @param {THREE.Scene} scene - The scene for visual effects
 * @returns {Object} Updated zombie object
 */
export const damageZombie = (zombie, damage, scene) => {
    logger.debug('zombiedamage','74: zombieUtils',damage);
    // if (!zombie) return zombie;
    
    // Directly modify the zombie's health instead of creating a copy
    logger.debug('zombiedamage','78: Zombie health before',zombie.health);
    zombie.health -= damage;
    logger.debug('zombiedamage','80: Zombie health after',zombie.health);
    // Debug logging with error handling
    try {
        logger.debug(`Zombie ${zombie.type} took ${damage.toFixed(1)} damage, health: ${zombie.health.toFixed(1)}/${zombie.dismemberment?.maxHealth || 'unknown'}`);
    } catch (error) {
        console.log(`Zombie ${zombie.type} took ${damage.toFixed(1)} damage, health: ${zombie.health.toFixed(1)}`);
    }
    
    // Process dismemberment if we have the scene and the system is set up
    if (scene && zombie.dismemberment) {
        // Process dismemberment based on new damage
        logger.debug('zombiedamage','91: Processing dismemberment');
        const particles = processDismemberment(zombie, damage, scene);
        
        // Add particles to game state for animation
        if (particles.length > 0 && zombie.gameState) {
            if (!zombie.gameState.dismembermentParticles) {
                zombie.gameState.dismembermentParticles = [];
            }
            zombie.gameState.dismembermentParticles.push(...particles);
            try {
                logger.debug(`Added ${particles.length} colorful particles`);
            } catch (error) {
                console.log(`Added ${particles.length} colorful particles`);
            }
        }
    } else if (!zombie.dismemberment) {
        logger.debug('zombiedamage','107: Zombie ${zombie.type} has no dismemberment system set up');
    } else if (!scene) {
        logger.debug('zombiedamage','109: No scene provided for dismemberment effects');
    }
    
    return zombie;
};

/**
 * Checks if a zombie is dead
 * @param {Object} zombie - The zombie object to check
 * @returns {boolean} True if the zombie is dead
 */
export const isZombieDead = (zombie) => {
    return zombie && zombie.health <= 0;
};

// Pre-create reusable explosion objects to avoid shader recompilation
// Use a pool of explosion objects that can be reused
const explosionPool = [];
const explosionLightPool = [];
const MAX_EXPLOSIONS = 20; // Maximum number of simultaneous explosions

// Track active explosions for cleanup and reuse
const activeExplosions = new Map();

/**
 * Initializes the explosion system with reusable objects
 * @param {THREE.Scene} scene - The Three.js scene
 */
export const initExplosionSystem = (scene) => {
    // Create explosion pool with different sizes
    for (let i = 0; i < MAX_EXPLOSIONS; i++) {
        // Create explosion mesh with reusable geometry and material
        const explosionGeometry = new THREE.SphereGeometry(1, 16, 16); // Use standard size, we'll scale it
        const explosionMaterial = new THREE.MeshBasicMaterial({
            color: 0xff5500,
            transparent: true,
            opacity: 0
        });
        const explosion = new THREE.Mesh(explosionGeometry, explosionMaterial);
        explosion.visible = false;
        explosion.scale.set(0.1, 0.1, 0.1);
        scene.add(explosion);
        explosionPool.push(explosion);
        
        // Create light for each explosion
        const light = new THREE.PointLight(0xff5500, 0, 0); // Start with intensity and distance of 0
        light.visible = false;
        scene.add(light);
        explosionLightPool.push(light);
    }
    
    logger.info('explosion', `158: Initialized explosion system with ${MAX_EXPLOSIONS} reusable explosions`);
};

/**
 * Handles the logic when a zombie dies
 * @param {Object} zombie - The zombie object that died
 * @param {THREE.Scene} scene - The Three.js scene
 * @param {Object} gameState - The game state object
 * @param {Array} zombiesArray - The array from which the zombie should be eventually removed (passed for context, removal happens outside)
 */
export const handleZombieDeath = (zombie, scene, gameState, zombiesArray) => {
    if (!zombie || !scene || !gameState || zombie.isDead) return; // Already processed or invalid

    zombie.isDead = true; // Mark as dead to prevent double processing
    logger.info('zombiedeath', `Handling death for zombie ${zombie.id || 'unknown'} type ${zombie.type}`);

    // Award points based on the zombie's points property
    const pointsAwarded = zombie.points || 10; // Use zombie.points, fallback to 10
    gameState.score += pointsAwarded;
    logger.debug('zombiedeath', `Awarded ${pointsAwarded} points for killing zombie. Score: ${gameState.score}`);

    // Increment kill counter
    if (gameState.stats) {
        gameState.stats.zombiesKilled = (gameState.stats.zombiesKilled || 0) + 1;
        logger.debug('zombiedeath', `Incremented kill count. Total kills: ${gameState.stats.zombiesKilled}`);
    } else {
        logger.warn('zombiedeath', 'gameState.stats is missing, cannot increment kill count.');
    }

    // Check for exploder specific logic - needs access to createExplosion
    // This might need adjustment if createExplosion isn't available directly.
    // Consider passing createExplosion as an argument if needed.
    if (zombie.type === 'exploder' && zombie.mesh.isExploding !== false) { // isExploding might be undefined initially
        logger.info('zombiedeath', 'Exploder zombie died, triggering final explosion.');
        // Re-use createExplosion logic carefully, ensure source is 'zombie'
        createExplosion(
            scene,
            zombie.mesh.position.clone(),
            3, // radius
            50, // damage
            zombiesArray, // Pass the correct zombie array
            gameState.playerObject, // Pass player object for potential damage
            gameState,
            'zombie' // Source is zombie
        );
    } else if (zombie.type === 'exploder') {
         logger.debug('zombiedeath', 'Exploder zombie died but was already exploding or disarmed.');
    }
    
    // Remove zombie mesh from scene
    if (zombie.mesh) {
        scene.remove(zombie.mesh);
        logger.debug('zombiedeath', `Removed zombie mesh ${zombie.mesh.uuid} from scene.`);
    } else {
         logger.warn('zombiedeath', `Zombie ${zombie.id || 'unknown'} has no mesh to remove.`);
    }

    // Note: Removal from the actual zombies array happens outside this function
    // to avoid modifying arrays during iteration.
};

/**
 * Creates an explosion effect at the given position
 * @param {THREE.Scene} scene - The scene to add the explosion to
 * @param {THREE.Vector3} position - The position of the explosion
 * @param {number} radius - The radius of the explosion
 * @param {number} damage - The damage dealt by the explosion
 * @param {Array} zombies - Array of zombies to check for damage
 * @param {THREE.Object3D} player - The player object
 * @param {Object} gameState - The game state
 * @param {string} source - Source of the explosion ('zombie' or 'player')
 * @returns {THREE.Mesh} The explosion mesh
 */
export const createExplosion = (scene, position, radius, damage, zombies = [], player, gameState, source) => {
    try {
        logger.debug('explosion', '175: Creating explosion at', position, 'with radius', radius, 'and damage', damage, 'from source:', source);
        
        // Safety check for required parameters
        if (!scene) {
            logger.error('explosion','179: Explosion creation failed: scene is undefined'); // Use logger
            return null;
        }
        
        if (!position) {
            logger.error('explosion','183: Explosion creation failed: position is undefined'); // Use logger
            return null;
        }
        
        // Initialize explosion system if needed
        if (explosionPool.length === 0) {
            logger.warn('explosion','187: Explosion system not initialized, initializing now.'); // Use logger
            initExplosionSystem(scene);
             if (explosionPool.length === 0) { // Check again after init
                 logger.error('explosion', '191: Explosion system failed to initialize.');
                 return null; // Cannot proceed
             }
        }
        
        // Find an available explosion and light from the pool
        let explosion = null;
        let light = null;
        
        // First try to find an unused one
        for (let i = 0; i < explosionPool.length; i++) {
            if (!explosionPool[i].visible) {
                explosion = explosionPool[i];
                light = explosionLightPool[i];
                break;
            }
        }
        
        // If none available, reuse the oldest one
        if (!explosion) {
            // Get the explosion that has been active the longest
            let oldestTime = Infinity;
            let oldestIndex = 0;
            
            // Make sure activeExplosions is initialized
             if (!(activeExplosions instanceof Map)) {
                 logger.error('explosion', 'activeExplosions map not initialized correctly.');
                 // Attempt recovery or return null
                  return null; 
             }

            explosionPool.forEach((exp, i) => { // Use forEach for safer iteration
                 const startTime = activeExplosions.get(exp); // No || Infinity here
                 if (startTime !== undefined && startTime < oldestTime) {
                     oldestTime = startTime;
                     oldestIndex = i;
                 } else if (startTime === undefined && oldestTime === Infinity) {
                      // If an explosion was never tracked (shouldn't happen), use it
                      oldestIndex = i;
                      oldestTime = -1; // Ensure this one gets picked if others have times
                 }
             });

            // Check if we actually found an oldest one to reuse
             if (oldestTime === Infinity && explosionPool.length > 0) {
                 // This case means all explosions are potentially new/unused, or the map is broken
                 // Let's just take the first one as a fallback
                 oldestIndex = 0; 
                 logger.warn('explosion', 'Could not determine oldest explosion, reusing index 0.');
            } else {
                 logger.debug('explosion', `224: Reusing explosion at index ${oldestIndex}`);
             }
            
            explosion = explosionPool[oldestIndex];
            light = explosionLightPool[oldestIndex];
            
        }
        
        // Ensure we actually got an explosion object
         if (!explosion || !light) {
             logger.error('explosion', 'Failed to get a reusable explosion/light object from pool.');
             return null;
         }

        // Reset explosion properties
        explosion.position.copy(position);
        explosion.scale.set(0.1, 0.1, 0.1);
         // Ensure material exists before accessing opacity
         if (explosion.material) {
            explosion.material.opacity = 0.8;
         } else {
             logger.error('explosion', `Explosion object at index ${explosionPool.indexOf(explosion)} is missing material.`);
             // Handle error - maybe skip this explosion? For now, log and continue.
         }
        explosion.visible = true;
        
        // Track when this explosion started
        activeExplosions.set(explosion, Date.now());
        
        // Reset light properties
        light.position.copy(position);
        light.intensity = 2;
        light.distance = radius * 2;
        light.visible = true;
        
        // Play explosion sound at the explosion position
        try {
            if (typeof playSound === 'function') {
                playSound('explosion', position);
            }
        } catch (soundError) {
            logger.warn('explosion','248: Could not play explosion sound:', soundError);
        }
        
        // Check for player in explosion radius - only if source is 'zombie'
        if (source === 'zombie' && player && player.position) {
            const playerDistance = player.position.distanceTo(position);
            if (playerDistance < radius) {
                // Calculate damage based on distance (more damage closer to center)
                const playerDamage = Math.round(damage * (1 - playerDistance / radius));
                logger.info('explosion',`257: Player in explosion radius (dist: ${playerDistance.toFixed(2)} < ${radius}), dealing ${playerDamage} damage`);
                try {
                    if (gameState && typeof damagePlayer === 'function') {
                        damagePlayer(gameState, playerDamage);
                    }
                } catch (playerDamageError) {
                    logger.error('explosion','263: Failed to damage player:', playerDamageError);
                }
            }
        }
        logger.debug('explosion','267: Checking zombies for explosion damage.');
        
        const deadZombiesIndices = []; // Keep track of indices to remove later

        // Check for zombies in explosion radius and damage them
        if (zombies && zombies.length > 0) {
             logger.debug('explosion',`270: Checking ${zombies.length} zombies for damage.`);
            for (let i = 0; i < zombies.length; i++) {
                const zombie = zombies[i];
                // Add checks for zombie validity and already dead status
                if (zombie && zombie.mesh && zombie.mesh.position && zombie.health > 0 && !zombie.isDead) {
                    const zombieDistance = zombie.mesh.position.distanceTo(position);
                    if (zombieDistance < radius) {
                        const damageToDeal = Math.round(damage * (1 - zombieDistance / radius)); // Damage falloff
                        logger.debug('explosion',`278: Zombie ${i} (type ${zombie.type}) in radius (dist: ${zombieDistance.toFixed(2)} < ${radius}), dealing ${damageToDeal} damage`);
                        try {
                            // Damage the zombie (this modifies health directly)
                            damageZombie(zombie, damageToDeal, scene); 

                            // Check if the zombie died from this explosion
                            if (isZombieDead(zombie)) {
                                logger.debug('explosion', `Zombie ${i} died from explosion.`);
                                // Call death handler (doesn't remove from array here)
                                handleZombieDeath(zombie, scene, gameState, zombies); 
                                deadZombiesIndices.push(i); // Mark index for removal
                            }
                        } catch (zombieDamageError) {
                            logger.error('explosion',`283: Failed to process zombie ${i} damage/death:`, zombieDamageError);
                        }
                    }
                } else if (zombie && zombie.isDead) {
                    logger.debug('explosion', `Skipping already dead zombie ${i}`);
                } else if (!zombie || !zombie.mesh || !zombie.mesh.position) {
                     logger.warn('explosion', `Skipping invalid zombie object at index ${i}`);
                }
            }
        } else {
             logger.debug('explosion', 'No zombies provided or array is empty.');
        }

        // Remove dead zombies from the main gameState array AFTER the loop
        // Iterate backwards to avoid index issues after splicing
        if (deadZombiesIndices.length > 0 && gameState && gameState.zombies) {
            logger.debug('explosion', `Removing ${deadZombiesIndices.length} dead zombies from gameState.zombies`);
            deadZombiesIndices.sort((a, b) => b - a); // Sort indices descending
            for (const index of deadZombiesIndices) {
                 // Check if the zombie at this index in the gameState array matches the one we processed
                 // This assumes 'zombies' passed in IS gameState.zombies
                 // A safer approach might be to pass IDs and find/remove by ID.
                 if (index >= 0 && index < gameState.zombies.length && gameState.zombies[index].isDead) {
                      gameState.zombies.splice(index, 1);
                 } else {
                      logger.warn('explosion', `Could not remove zombie at index ${index} - array mismatch or zombie already removed?`);
                 }
            }
             logger.debug('explosion', `Remaining zombies in gameState: ${gameState.zombies.length}`);
        } else if (deadZombiesIndices.length > 0) {
             logger.warn('explosion', 'Cannot remove dead zombies - gameState.zombies is not available.');
        }


        // Animation variables
        let scale = 0.1;
        let opacity = 0.8;
        const expandSpeed = 0.15;
        const fadeSpeed = 0.05;
        const maxScale = radius / 2; // Scale to match the radius
        let animationFrameId = null; // Store the request ID

        // Animation function using requestAnimationFrame for better performance
        const animateExplosion = () => { // Renamed for clarity
            // Increase scale
            scale += expandSpeed;
            const currentScale = Math.min(scale, maxScale);
             if (explosion.scale) { // Check if scale exists
                explosion.scale.set(currentScale, currentScale, currentScale);
             }
            
            // Decrease opacity
            opacity -= fadeSpeed;
             if (explosion.material) { // Check if material exists
                explosion.material.opacity = Math.max(0, opacity);
             }
            
            // Update light intensity
             if (light) { // Check if light exists
                light.intensity = Math.max(0, opacity * 2);
             }
            
            // Continue animation until fully faded
            if (opacity > 0) {
                animationFrameId = requestAnimationFrame(animateExplosion);
            } else {
                // When animation is complete, just hide the objects
                if (explosion) explosion.visible = false;
                if (light) light.visible = false;
                // Remove from active list
                 if (explosion) activeExplosions.delete(explosion);
                 logger.debug('explosion', 'Explosion animation finished, hiding objects.');
            }
        };
        
        // Start the animation
        animationFrameId = requestAnimationFrame(animateExplosion);
        
        // Backup cleanup - force hide after 3 seconds
        const cleanupTimeoutId = setTimeout(() => {
            cancelAnimationFrame(animationFrameId); // Stop animation if running
            if (explosion && explosion.visible) {
                explosion.visible = false;
                logger.debug('explosion', 'Forcing explosion hide after timeout.');
            }
            if (light && light.visible) {
                light.visible = false;
                 logger.debug('explosion', 'Forcing explosion light hide after timeout.');
            }
            if (explosion) activeExplosions.delete(explosion);
        }, 3000);
        
        // Store timeout ID for potential cancellation if animation finishes first? (Optional)
        // explosion.userData.cleanupTimeoutId = cleanupTimeoutId; 

        // Return the explosion mesh for backwards compatibility
        return explosion;
        
    } catch (error) {
        logger.error('explosion', 'Critical error in createExplosion:', error); // Use logger
        return null;
    }
}; 