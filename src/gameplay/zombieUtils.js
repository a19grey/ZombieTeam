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
    if (!zombie) return zombie;
    
    // Create a copy of the zombie with updated health
    const updatedZombie = {
        ...zombie,
        health: zombie.health - damage
    };
    
    // Debug logging with error handling
    try {
        logger.debug(`Zombie ${zombie.type} took ${damage.toFixed(1)} damage, health: ${updatedZombie.health.toFixed(1)}/${zombie.dismemberment?.maxHealth || 'unknown'}`);
    } catch (error) {
        console.log(`Zombie ${zombie.type} took ${damage.toFixed(1)} damage, health: ${updatedZombie.health.toFixed(1)}`);
    }
    
    // Process dismemberment if we have the scene and the system is set up
    if (scene && zombie.dismemberment) {
        // Process dismemberment based on new damage
        const particles = processDismemberment(updatedZombie, damage, scene);
        
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
        logger.debug(`Zombie ${zombie.type} has no dismemberment system set up`);
    } else if (!scene) {
        logger.debug(`No scene provided for dismemberment effects`);
    }
    
    return updatedZombie;
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
    
    logger.info('explosion', `Initialized explosion system with ${MAX_EXPLOSIONS} reusable explosions`);
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
export const createExplosion = (scene, position, radius = 3, damage = 100, zombies = [], player, gameState, source = 'zombie') => {
    try {
        // Safety check for gameState.debug
        const debugEnabled = gameState && gameState.debug && gameState.debug.enabled;
        
        if (debugEnabled) {
            console.log("Creating explosion at", position, "with radius", radius, "and damage", damage, "from source:", source);
        }
        
        // Safety check for required parameters
        if (!scene) {
            console.error("Explosion creation failed: scene is undefined");
            return null;
        }
        
        if (!position) {
            console.error("Explosion creation failed: position is undefined");
            return null;
        }
        
        // Initialize explosion system if needed
        if (explosionPool.length === 0) {
            initExplosionSystem(scene);
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
            
            for (let i = 0; i < explosionPool.length; i++) {
                const startTime = activeExplosions.get(explosionPool[i]) || Infinity;
                if (startTime < oldestTime) {
                    oldestTime = startTime;
                    oldestIndex = i;
                }
            }
            
            explosion = explosionPool[oldestIndex];
            light = explosionLightPool[oldestIndex];
            
            logger.debug('explosion', 'Reusing oldest active explosion');
        }
        
        // Reset explosion properties
        explosion.position.copy(position);
        explosion.scale.set(0.1, 0.1, 0.1);
        explosion.material.opacity = 0.8;
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
            console.warn("Could not play explosion sound:", soundError);
        }
        
        // Check for player in explosion radius - only if source is 'zombie'
        if (source === 'zombie' && player && player.position) {
            const playerDistance = player.position.distanceTo(position);
            if (playerDistance < radius) {
                // Calculate damage based on distance (more damage closer to center)
                const playerDamage = Math.round(damage * (1 - playerDistance / radius));
                console.log("Player in explosion radius, dealing", playerDamage, "damage");
                try {
                    if (gameState && typeof damagePlayer === 'function') {
                        damagePlayer(gameState, playerDamage);
                    }
                } catch (playerDamageError) {
                    console.error("Failed to damage player:", playerDamageError);
                }
            }
        }
        
        // Check for zombies in explosion radius and damage them
        const zombiesToDamage = [];
        
        if (zombies && zombies.length > 0) {
            for (let i = 0; i < zombies.length; i++) {
                const zombie = zombies[i];
                if (zombie && zombie.mesh && zombie.mesh.position) {
                    const zombieDistance = zombie.mesh.position.distanceTo(position);
                    if (zombieDistance < radius) {
                        // Calculate damage based on distance
                        const zombieDamage = damage // Using simpler Math.round(damage * (1 - zombieDistance / radius));
                        if (typeof logger !== 'undefined' && logger.debug) {
                            logger.debug("Zombie in explosion radius, dealing", zombieDamage, "damage");
                        }
                        zombiesToDamage.push({ zombie, damage: zombieDamage, index: i });
                    }
                }
            }
        }
        
        // Apply damage to zombies after checking all of them
        if (typeof damageZombie === 'function') {
            zombiesToDamage.forEach(({ zombie, damage, index }) => {
                try {
                    // Apply damage and update the zombie in the original array
                    const updatedZombie = damageZombie(zombie, damage, scene);
                    
                    // Update the zombie in the original array to persist the damage
                    if (zombies[index]) {
                        zombies[index] = updatedZombie;
                    }
                } catch (zombieDamageError) {
                    console.error("Failed to damage zombie:", zombieDamageError);
                }
            });
        }
        
        // Animation variables
        let scale = 0.1;
        let opacity = 0.8;
        const expandSpeed = 0.15;
        const fadeSpeed = 0.05;
        const maxScale = radius / 2; // Scale to match the radius
        
        // Animation function using requestAnimationFrame for better performance
        const explosionId = requestAnimationFrame(function animate() {
            // Increase scale
            scale += expandSpeed;
            const currentScale = Math.min(scale, maxScale);
            explosion.scale.set(currentScale, currentScale, currentScale);
            
            // Decrease opacity
            opacity -= fadeSpeed;
            explosion.material.opacity = Math.max(0, opacity);
            
            // Update light intensity
            light.intensity = Math.max(0, opacity * 2);
            
            // Continue animation until fully faded
            if (opacity > 0) {
                requestAnimationFrame(animate);
            } else {
                // When animation is complete, just hide the objects
                explosion.visible = false;
                light.visible = false;
                // Remove from active list
                activeExplosions.delete(explosion);
            }
        });
        
        // Backup cleanup - force hide after 3 seconds
        setTimeout(() => {
            if (explosion.visible) {
                explosion.visible = false;
                light.visible = false;
                activeExplosions.delete(explosion);
            }
        }, 3000);
        
        // Return the explosion mesh for backwards compatibility
        return explosion;
        
    } catch (error) {
        console.error('Error creating explosion:', error);
        return null;
    }
}; 