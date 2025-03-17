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
    
    // Calculate zombie sizes for pushing mechanics
    const zombieSizes = {};
    zombies.forEach((zombie, index) => {
        if (zombie.mesh && zombie.mesh.enemyType === 'zombieKing') {
            zombieSizes[index] = 2.0;
        } else if (zombie.mesh && zombie.mesh.enemyType === 'exploder') {
            zombieSizes[index] = 1.2;
        } else if (zombie.mesh && zombie.mesh.enemyType === 'skeletonArcher') {
            zombieSizes[index] = 0.8;
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
    
    // Function to push object away from another
    const pushAway = (position, fromPosition, minDistance) => {
        const dx = position.x - fromPosition.x;
        const dz = position.z - fromPosition.z;
        const distanceSquared = dx * dx + dz * dz;
        
        if (distanceSquared < 0.0001) {
            // Objects are too close, push in random direction
            const angle = Math.random() * Math.PI * 2;
            return {
                x: fromPosition.x + Math.cos(angle) * minDistance,
                z: fromPosition.z + Math.sin(angle) * minDistance
            };
        }
        
        const distance = Math.sqrt(distanceSquared);
        if (distance < minDistance) {
            const factor = minDistance / distance;
            return {
                x: fromPosition.x + dx * factor,
                z: fromPosition.z + dz * factor
            };
        }
        
        return { x: position.x, z: position.z };
    };
    
    // Create a random but stable update order to prevent bias
    const updateOrder = Array.from({ length: zombies.length }, (_, i) => i);
    updateOrder.sort(() => Math.random() - 0.5);
    
    // Update zombies in random order
    updateOrder.forEach(index => {
        const zombie = zombies[index];
        if (!zombie || !zombie.mesh || !zombie.mesh.position) return;
        
        try {
            // Calculate direct direction to player (no prediction/leading)
            const direction = new THREE.Vector3(
                playerPosition.x - zombie.mesh.position.x,
                0,
                playerPosition.z - zombie.mesh.position.z
            );
            
            const distance = direction.length();
            
            // Normalize direction
            const finalDirection = direction.clone().normalize();
            
            // Add slight randomness to movement (much less than before)
            const randomFactor = Math.min(0.1, distance * 0.005);
            const randomAngle = (Math.random() - 0.5) * Math.PI * randomFactor;
            finalDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), randomAngle);
            
            // Handle special enemy behaviors
            switch (zombie.mesh.enemyType) {
                case 'skeletonArcher':
                    if (distance < 8) {
                        finalDirection.negate(); // Run away when close
                    } else if (distance > 15) {
                        // Move toward player
                    } else {
                        return; // Stand still and shoot
                    }
                    break;
                    
                case 'exploder':
                    if (distance < 3 && !zombie.mesh.isExploding) {
                        zombie.mesh.isExploding = true;
                        zombie.mesh.explosionTimer = 1.5;
                        zombie.mesh.children.forEach(child => {
                            if (child.material && child.material.color) {
                                child.material.color.set(0xff0000);
                                if (child.material.emissive) {
                                    child.material.emissive.set(0xff0000);
                                    child.material.emissiveIntensity = 0.5;
                                }
                            }
                        });
                        return;
                    } else if (zombie.mesh.isExploding) {
                        zombie.mesh.explosionTimer -= delta;
                        const flashSpeed = Math.max(0.1, zombie.mesh.explosionTimer / 3);
                        const flashIntensity = Math.sin(Date.now() * 0.01 / flashSpeed) * 0.5 + 0.5;
                        zombie.mesh.children.forEach(child => {
                            if (child.material && child.material.emissiveIntensity !== undefined) {
                                child.material.emissiveIntensity = flashIntensity;
                            }
                        });
                        return;
                    }
                    break;
                    
                case 'zombieKing':
                    zombie.mesh.summonCooldown -= delta;
                    break;
            }
            
            if (distance > 0) {
                const moveDistance = zombie.speed * delta * 60;
                const intendedPosition = new THREE.Vector3()
                    .copy(zombie.mesh.position)
                    .addScaledVector(finalDirection, moveDistance);
                
                // Player collision
                if (checkCollision(intendedPosition, playerPosition, COLLISION_DISTANCE)) {
                    const newPosition = pushAway(intendedPosition, playerPosition, COLLISION_DISTANCE);
                    intendedPosition.x = newPosition.x;
                    intendedPosition.z = newPosition.z;
                    
                    if (checkCollision(intendedPosition, playerPosition, DAMAGE_DISTANCE)) {
                        let damageAmount = DAMAGE_PER_SECOND * delta;
                        if (zombie.mesh.enemyType === 'zombieKing') damageAmount *= 2;
                        if (zombie.gameState) damagePlayer(zombie.gameState, damageAmount);
                    }
                }
                
                // Zombie collisions
                const nearbyZombies = getNearbyZombies(zombie.mesh.position, index);
                for (let i = 0; i < nearbyZombies.length; i++) {
                    const otherIndex = nearbyZombies[i];
                    const otherZombie = zombies[otherIndex];
                    if (!otherZombie || !otherZombie.mesh || otherZombie.mesh.isExploding) continue;
                    
                    if (checkCollision(intendedPosition, otherZombie.mesh.position, ZOMBIE_COLLISION_DISTANCE)) {
                        const thisSize = zombieSizes[index] || 1.0;
                        const otherSize = zombieSizes[otherIndex] || 1.0;
                        
                        if (thisSize > otherSize * 1.3) {
                            const pushDirection = new THREE.Vector3()
                                .subVectors(otherZombie.mesh.position, intendedPosition)
                                .normalize();
                            otherZombie.mesh.position.addScaledVector(pushDirection, moveDistance * 0.5);
                            const avoidancePosition = pushAway(
                                intendedPosition, 
                                otherZombie.mesh.position, 
                                ZOMBIE_COLLISION_DISTANCE * 0.5
                            );
                            intendedPosition.x = (intendedPosition.x * 0.8 + avoidancePosition.x * 0.2);
                            intendedPosition.z = (intendedPosition.z * 0.8 + avoidancePosition.z * 0.2);
                        } else {
                            const avoidancePosition = pushAway(
                                intendedPosition, 
                                otherZombie.mesh.position, 
                                ZOMBIE_COLLISION_DISTANCE
                            );
                            intendedPosition.x = (intendedPosition.x + avoidancePosition.x) * 0.5;
                            intendedPosition.z = (intendedPosition.z + avoidancePosition.z) * 0.5;
                        }
                    }
                }
                
                // Environment collisions
                if (window.gameState && window.gameState.environmentObjects) {
                    for (const object of window.gameState.environmentObjects) {
                        if (object && object.isObstacle) {
                            const dx = intendedPosition.x - object.position.x;
                            const dz = intendedPosition.z - object.position.z;
                            const distance = Math.sqrt(dx * dx + dz * dz);
                            if (distance < (object.boundingRadius || 2.5)) {
                                const pushDirection = new THREE.Vector3(dx, 0, dz).normalize();
                                const pushDistance = (object.boundingRadius || 2.5) - distance + 0.1;
                                intendedPosition.x += pushDirection.x * pushDistance;
                                intendedPosition.z += pushDirection.z * pushDistance;
                                break;
                            }
                        }
                    }
                }
                
                // Apply final position and rotation
                zombie.mesh.position.copy(intendedPosition);
                zombie.mesh.rotation.y = Math.atan2(finalDirection.x, finalDirection.z);
            }
        } catch (error) {
            console.error("Error updating zombie:", error);
        }
    });
};

// Export the utility functions from zombieUtils.js
export { damagePlayer, damageZombie, isZombieDead, createExplosion };
