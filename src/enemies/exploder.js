/**
 * Exploder Module - Creates an explosive enemy that detonates near players
 * 
 * This module contains the function to create an exploder enemy inspired by Minecraft's
 * creeper. The exploder is a mid-level enemy that rushes toward the player and
 * explodes when in close proximity, dealing area damage. It has a distinctive
 * bright green blocky body with a frowning face.
 * 
 * Example usage:
 *   import { createExploder } from './enemies/exploder.js';
 *   
 *   // Create an exploder at position (15, 0, 10) with speed 0.05
 *   const exploder = createExploder({x: 15, z: 10}, 0.05);
 *   scene.add(exploder);
 */

import * as THREE from 'three';
import { createExplosion } from '../gameplay/zombieUtils.js'; // Import explosion utility
import { logger } from '../utils/logger.js';

// Add 'enemy' to logger sections if not already included
logger.addSection('enemy');

export const createExploder = (position, baseSpeed ) => {
    const exploder = new THREE.Group();

    // Blocky head/body combo
    const bodyGeometry = new THREE.BoxGeometry(0.6, 1.2, 0.6);
    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: 0x00cc00, // Bright green
        roughness: 0.9
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.6;
    body.castShadow = true;
    exploder.add(body);

    // Face (black eyes and mouth)
    const featureGeometry = new THREE.BoxGeometry(0.15, 0.15, 0.1);
    const featureMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
    const leftEye = new THREE.Mesh(featureGeometry, featureMaterial);
    leftEye.position.set(-0.15, 0.9, 0.31);
    exploder.add(leftEye);
    const rightEye = new THREE.Mesh(featureGeometry, featureMaterial);
    rightEye.position.set(0.15, 0.9, 0.31);
    exploder.add(rightEye);
    const mouth = new THREE.Mesh(featureGeometry, featureMaterial);
    mouth.scale.set(1, 2, 1);
    mouth.position.set(0, 0.6, 0.31);
    exploder.add(mouth);

    // Stubby legs
    const legGeometry = new THREE.BoxGeometry(0.25, 0.4, 0.25);
    const leftLeg = new THREE.Mesh(legGeometry, bodyMaterial);
    leftLeg.position.set(-0.15, 0.2, 0);
    exploder.add(leftLeg);
    const rightLeg = new THREE.Mesh(legGeometry, bodyMaterial);
    rightLeg.position.set(0.15, 0.2, 0);
    exploder.add(rightLeg);

    exploder.position.set(position.x, 0, position.z);
    
    // Debug log for exploder creation
    logger.debug('enemy', `Creating exploder at ${position.x.toFixed(2)},${position.z.toFixed(2)}`);
    
    exploder.mesh = exploder;
    
    // Set enemy type for special behavior
    exploder.enemyType = 'exploder';
    exploder.isExploding = false;
    exploder.explosionTimer = 0;
    
    // Set speed relative to baseSpeed (slightly slower than standard zombie)
    exploder.speed = baseSpeed * 0.9; // 90% of base speed
    
    // Set mass for physics calculations - exploder is medium-weight
    exploder.mass = 1.2;
    
    // Set default health
    exploder.health = 75;
    
    /**
     * Updates the exploder's position and behavior
     * @param {Object} context - The update context containing all necessary information
     */
    exploder.update = (context) => {
        // Debug log update call
        logger.verbose('enemy', `Exploder update method called (at ${exploder.position.x.toFixed(2)},${exploder.position.z.toFixed(2)}), isExploding: ${exploder.isExploding}`);
        
        const { 
            playerPosition, 
            delta, 
            collisionSettings,
            environmentObjects,
            nearbyZombies,
            zombieSizes,
            gameState,
            checkCollision,
            pushAway,
            damagePlayer
        } = context;
        
        // Special exploder behavior - explodes when close to player
        const direction = new THREE.Vector3(
            playerPosition.x - exploder.position.x,
            0,
            playerPosition.z - exploder.position.z
        );
        
        const distance = direction.length();
        
        // Debug distance to player
        logger.verbose('enemy', `Exploder distance to player: ${distance.toFixed(2)}`);
        
        // Exploder specific behavior - start exploding when close to player
        if (distance < 3 && !exploder.isExploding) {
            logger.debug('enemy', `Exploder starting explosion sequence`);
            
            exploder.isExploding = true;
            exploder.explosionTimer = 1.5; // Time before exploding
            
            // Change color to red
            exploder.children.forEach(child => {
                if (child.material && child.material.color) {
                    child.material.color.set(0xff0000);
                    if (child.material.emissive) {
                        child.material.emissive.set(0xff0000);
                        child.material.emissiveIntensity = 0.5;
                    }
                }
            });
            
            return; // Don't move once exploding starts
        } else if (exploder.isExploding) {
            // Update explosion timer and flashing effect
            exploder.explosionTimer -= delta;
            
            logger.verbose('enemy', `Exploder explosion timer: ${exploder.explosionTimer.toFixed(2)}`);
            
            const flashSpeed = Math.max(0.1, exploder.explosionTimer / 3);
            const flashIntensity = Math.sin(Date.now() * 0.01 / flashSpeed) * 0.5 + 0.5;
            
            // Make it flash red/yellow as countdown progresses
            exploder.children.forEach(child => {
                if (child.material && child.material.color) {
                    // Flash between red and yellow
                    const r = 1.0;
                    const g = flashIntensity * 0.8;
                    const b = 0;
                    child.material.color.setRGB(r, g, b);
                    
                    if (child.material.emissive) {
                        child.material.emissive.setRGB(r * 0.5, g * 0.5, 0);
                        child.material.emissiveIntensity = 0.5 + flashIntensity * 0.5;
                    }
                }
            });
            
            // Wobble/shake the exploder as it's about to explode
            const wobbleIntensity = Math.min(0.05, (1.5 - exploder.explosionTimer) * 0.1);
            exploder.position.x += (Math.random() - 0.5) * wobbleIntensity;
            exploder.position.z += (Math.random() - 0.5) * wobbleIntensity;
            
            // Explode when timer runs out
            if (exploder.explosionTimer <= 0) {
                logger.info('enemy', `Exploder detonating at ${exploder.position.x.toFixed(2)},${exploder.position.z.toFixed(2)}`);
                
                // Create explosion effect
                const explosion = createExplosion(
                    new THREE.Vector3(
                        exploder.position.x,
                        0.5, // Height of explosion
                        exploder.position.z
                    ), 
                    3.5 // Explosion radius
                );
                
                // Add explosion to scene
                if (context.scene) {
                    context.scene.add(explosion);
                    // Remove explosion after animation (2 seconds)
                    setTimeout(() => {
                        context.scene.remove(explosion);
                    }, 2000);
                }
                
                // Deal damage to player if in blast radius
                const blastRadius = 5;
                const blastDamage = 30; // Base explosion damage
                const playerDistance = direction.length();
                
                if (playerDistance < blastRadius) {
                    // Calculate damage based on distance (less damage farther away)
                    const damageMultiplier = 1 - (playerDistance / blastRadius);
                    const actualDamage = blastDamage * damageMultiplier;
                    
                    logger.info('enemy', `Explosion damaging player: ${actualDamage.toFixed(1)} damage`);
                    
                    if (gameState) {
                        damagePlayer(gameState, actualDamage);
                    }
                }
                
                // Handle nearby zombies being damaged by explosion
                if (nearbyZombies) {
                    nearbyZombies.forEach(otherZombie => {
                        if (otherZombie && otherZombie.mesh) {
                            const zombieDirection = new THREE.Vector3(
                                otherZombie.mesh.position.x - exploder.position.x,
                                0,
                                otherZombie.mesh.position.z - exploder.position.z
                            );
                            const zombieDistance = zombieDirection.length();
                            
                            // Apply blast force to other zombies
                            if (zombieDistance < blastRadius) {
                                const pushForce = 0.5 * (1 - zombieDistance / blastRadius);
                                const pushVector = zombieDirection.normalize().multiplyScalar(pushForce);
                                
                                // Only move zombies if they have a position
                                if (otherZombie.mesh.position) {
                                    otherZombie.mesh.position.x += pushVector.x;
                                    otherZombie.mesh.position.z += pushVector.z;
                                }
                                
                                // Damage other zombies too
                                if (otherZombie.mesh.health !== undefined) {
                                    otherZombie.mesh.health -= 20 * (1 - zombieDistance / blastRadius);
                                }
                            }
                        }
                    });
                }
                
                // Remove this exploder from the scene
                if (context.scene) {
                    context.scene.remove(exploder);
                }
                
                // Mark for cleanup
                exploder.markedForDeletion = true;
                exploder.health = 0;
                
                return;
            }
            
            return; // Don't move while exploding
        }
        
        // Standard movement when not exploding (normalized for consistent speed)
        const finalDirection = direction.clone().normalize();
        
        // Add slight jitter to movement
        const randomFactor = Math.min(0.15, distance * 0.005);
        const randomAngle = (Math.random() - 0.5) * Math.PI * randomFactor;
        finalDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), randomAngle);
        
        // Calculate movement
        const moveDistance = exploder.speed * delta * 60;
        const intendedPosition = new THREE.Vector3()
            .copy(exploder.position)
            .addScaledVector(finalDirection, moveDistance);
        
        // Player collision
        const { COLLISION_DISTANCE, DAMAGE_DISTANCE, DAMAGE_PER_SECOND, ZOMBIE_COLLISION_DISTANCE } = collisionSettings;
        
        if (checkCollision(intendedPosition, playerPosition, COLLISION_DISTANCE)) {
            const newPosition = pushAway(intendedPosition, playerPosition, COLLISION_DISTANCE);
            intendedPosition.x = newPosition.x;
            intendedPosition.z = newPosition.z;
        }
        
        // Zombie collisions
        for (let i = 0; i < nearbyZombies.length; i++) {
            const otherZombie = nearbyZombies[i];
            if (!otherZombie || !otherZombie.mesh || otherZombie === exploder) continue;
            
            if (checkCollision(intendedPosition, otherZombie.mesh.position, ZOMBIE_COLLISION_DISTANCE)) {
                const avoidancePosition = pushAway(
                    intendedPosition, 
                    otherZombie.mesh.position, 
                    ZOMBIE_COLLISION_DISTANCE
                );
                intendedPosition.x = (intendedPosition.x + avoidancePosition.x) * 0.5;
                intendedPosition.z = (intendedPosition.z + avoidancePosition.z) * 0.5;
            }
        }
        
        // Environment collisions
        if (environmentObjects) {
            for (const object of environmentObjects) {
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
        exploder.position.copy(intendedPosition);
        exploder.rotation.y = Math.atan2(finalDirection.x, finalDirection.z);
    };

    return exploder;
}
