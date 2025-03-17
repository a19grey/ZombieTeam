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

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.132.2/build/three.module.js';
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

/**
 * Creates an explosion effect at the given position
 * @param {THREE.Scene} scene - The scene to add the explosion to
 * @param {THREE.Vector3} position - The position of the explosion
 * @param {number} radius - The radius of the explosion
 * @param {number} damage - The damage dealt by the explosion
 * @param {Array} zombies - Array of zombies to check for damage
 * @param {THREE.Object3D} player - The player object
 * @param {Object} gameState - The game state
 */
export const createExplosion = (scene, position, radius = 3, damage = 100, zombies = [], player, gameState) => {
    try {
        if (gameState.debug.enabled) {
        console.log("Creating explosion at", position, "with radius", radius, "and damage", damage);
        }
        // Safety check for required parameters
        if (!scene) {
            console.error("Explosion creation failed: scene is undefined");
            return;
        }
        
        if (!position) {
            console.error("Explosion creation failed: position is undefined");
            return;
        }
        
        // Create explosion visual effect
        const explosionGeometry = new THREE.SphereGeometry(radius, 16, 16);
        const explosionMaterial = new THREE.MeshBasicMaterial({
            color: 0xff5500,
            transparent: true,
            opacity: 0.8
        });
        const explosion = new THREE.Mesh(explosionGeometry, explosionMaterial);
        explosion.position.copy(position);
        explosion.scale.set(0.1, 0.1, 0.1); // Start small
        scene.add(explosion);
        
        // Play explosion sound at the explosion position
        try {
            playSound('explosion', position);
        } catch (soundError) {
            console.warn("Could not play explosion sound:", soundError);
        }
        
        // Add a point light for glow effect
        const light = new THREE.PointLight(0xff5500, 2, radius * 2);
        light.position.copy(position);
        scene.add(light);
        
        // Check for player in explosion radius
        if (player && player.position) {
            const playerDistance = player.position.distanceTo(position);
            if (playerDistance < radius) {
                // Calculate damage based on distance (more damage closer to center)
                const playerDamage = Math.round(damage * (1 - playerDistance / radius));
                console.log("Player in explosion radius, dealing", playerDamage, "damage");
                try {
                    damagePlayer(gameState, playerDamage);
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
                        const zombieDamage = Math.round(damage * (1 - zombieDistance / radius));
                        logger.debug("Zombie in explosion radius, dealing", zombieDamage, "damage");
                        zombiesToDamage.push({ zombie, damage: zombieDamage });
                    }
                }
            }
        }
        
        // Apply damage to zombies after checking all of them
        zombiesToDamage.forEach(({ zombie, damage }) => {
            try {
                damageZombie(zombie, damage, scene);
            } catch (zombieDamageError) {
                console.error("Failed to damage zombie:", zombieDamageError);
            }
        });
        
        // Animation variables
        let scale = 0.1;
        let opacity = 0.8;
        const expandSpeed = 0.15;
        const fadeSpeed = 0.05;
        
        // Animation function
        function animate() {
            // Increase scale
            scale += expandSpeed;
            explosion.scale.set(scale, scale, scale);
            
            // Decrease opacity
            opacity -= fadeSpeed;
            explosion.material.opacity = Math.max(0, opacity);
            light.intensity = Math.max(0, opacity * 2);
            
            // Continue animation until fully faded
            if (opacity > 0) {
                requestAnimationFrame(animate);
            } else {
                // Clean up when animation is complete
                scene.remove(explosion);
                scene.remove(light);
                explosion.geometry.dispose();
                explosion.material.dispose();
            }
        }
        
        // Start animation
        requestAnimationFrame(animate);
        
        // Backup cleanup - force remove after 3 seconds
        setTimeout(() => {
            if (explosion.parent) {
                scene.remove(explosion);
                scene.remove(light);
                explosion.geometry.dispose();
                explosion.material.dispose();
            }
        }, 3000);
        
    } catch (error) {
        console.error('Error creating explosion:', error);
    }
}; 