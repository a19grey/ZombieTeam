/**
 * Zombie Module - Handles zombie creation and AI behavior
 * 
 * This module contains functions for creating Minecraft-style low-poly zombies and updating their
 * positions to chase the player. g 
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.132.2/build/three.module.js';
import { checkCollision, pushAway } from './physics.js'; // Import physics helpers
import { setupDismemberment } from './dismemberment.js'; // Import dismemberment system
import { playSound } from './audio.js'; // Import audio system
import { logger } from '../utils/logger.js'; // Import logger for debugging
import { damagePlayer, damageZombie, isZombieDead, createExplosion } from './zombieUtils.js'; // Import zombie utilities

/**
 * Updates the positions of all zombies to chase the player with extended enemy behaviors
 * @param {Array} zombies - Array of zombie objects
 * @param {THREE.Vector3} playerPosition - The player's current position
 * @param {number} delta - Time delta between frames
 * @param {number} baseSpeed - Base movement speed (optional, for runtime speed adjustments)
 */
export const updateZombies = (zombies, playerPosition, delta = 1/60, baseSpeed) => {
    if (!zombies || !playerPosition) {
        console.warn("Missing required parameters for updateZombies");
        return;
    }
    
    const COLLISION_DISTANCE = 1.0;
    const DAMAGE_DISTANCE = 1.2;
    const DAMAGE_PER_SECOND = 20;
    const ZOMBIE_COLLISION_DISTANCE = 0.8; // Distance to maintain between zombies
    
    // Update zombie king speeds - now relative to baseSpeed if provided
    zombies.forEach(zombie => {
        if (zombie.mesh && zombie.mesh.enemyType === 'zombieKing') {
            // If baseSpeed is provided, we're doing a runtime adjustment
            if (baseSpeed !== null) {
                // Recalculate speed based on the new baseSpeed while maintaining relative speed
                const currentSpeedRatio = zombie.speed / (zombie.originalBaseSpeed || baseSpeed);
                zombie.speed = baseSpeed * currentSpeedRatio;
                zombie.originalBaseSpeed = baseSpeed;
            }
            
            // Continue with normal zombie king speed increase logic
            const maxSpeedFactor = 1.2; // Cap at 120% of their base speed
            const currentBaseSpeed = baseSpeed || (zombie.originalBaseSpeed);
            const maxSpeed = baseSpeed * maxSpeedFactor;
            const speedIncreaseFactor = 0.0001;
            
            zombie.speed = Math.min(maxSpeed, zombie.speed + speedIncreaseFactor * delta * 60);
        }
    });
    
    // Calculate zombie sizes for pushing mechanics based on mass
    const zombieSizes = {};
    zombies.forEach((zombie, index) => {
        if (zombie && zombie.mesh) {
            // Use the mass property if available, otherwise default to 1.0
            zombieSizes[index] = zombie.mesh.mass || 1.0;
        } else {
            zombieSizes[index] = 1.0;
        }
    });
    
    // Create spatial partitioning for zombies
    const gridSize = 5;
    const grid = {};
    
    // Add zombies to spatial grid
    zombies.forEach((zombie, index) => {
        if (!zombie || !zombie.mesh || !zombie.mesh.position) return;
        
        const gridX = Math.floor(zombie.mesh.position.x / gridSize);
        const gridZ = Math.floor(zombie.mesh.position.z / gridSize);
        const key = `${gridX},${gridZ}`;
        
        if (!grid[key]) {
            grid[key] = [];
        }
        
        grid[key].push(index);
    });
    
    // Get nearby zombies from spatial grid
    const getNearbyZombies = (position, excludeIndex) => {
        const gridX = Math.floor(position.x / gridSize);
        const gridZ = Math.floor(position.z / gridSize);
        const nearby = [];
        
        // Check 3x3 grid cells around the zombie
        for (let x = gridX - 1; x <= gridX + 1; x++) {
            for (let z = gridZ - 1; z <= gridZ + 1; z++) {
                const key = `${x},${z}`;
                if (grid[key]) {
                    grid[key].forEach(index => {
                        if (index !== excludeIndex) {
                            nearby.push(index);
                        }
                    });
                }
            }
        }
        
        return nearby;
    };
    
    // Create a random but stable update order to prevent bias
    const updateOrder = Array.from({ length: zombies.length }, (_, i) => i);
    updateOrder.sort(() => Math.random() - 0.5);
    
    // Update zombies in random order
    updateOrder.forEach(index => {
        const zombie = zombies[index];
        if (!zombie || !zombie.mesh || !zombie.mesh.position) return;
        
        try {
            // Get nearby zombies for collision detection
            const nearbyZombies = getNearbyZombies(zombie.mesh.position, index);
            
            // Prepare game state and context object to pass to the update method
            const updateContext = {
                playerPosition,
                delta,
                collisionSettings: {
                    COLLISION_DISTANCE,
                    DAMAGE_DISTANCE,
                    DAMAGE_PER_SECOND,
                    ZOMBIE_COLLISION_DISTANCE
                },
                environmentObjects: window.gameState?.environmentObjects || [],
                nearbyZombies: nearbyZombies.map(idx => zombies[idx]),
                zombieSizes,
                gameState: zombie.gameState || window.gameState,
                checkCollision,
                pushAway,
                damagePlayer
            };
            
            // Call the zombie's update method if it exists
            if (typeof zombie.mesh.update === 'function') {
                zombie.mesh.update(updateContext);
            } else {
                // Fallback for zombies without update method - basic movement towards player
                const direction = new THREE.Vector3(
                    playerPosition.x - zombie.mesh.position.x,
                    0,
                    playerPosition.z - zombie.mesh.position.z
                ).normalize();
                
                const moveDistance = zombie.speed * delta * 60;
                zombie.mesh.position.addScaledVector(direction, moveDistance);
                zombie.mesh.rotation.y = Math.atan2(direction.x, direction.z);
            }
        } catch (error) {
            console.error("Error updating zombie:", error);
        }
    });
};

// Export the utility functions from zombieUtils.js
export { damagePlayer, damageZombie, isZombieDead, createExplosion };
