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

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.132.2/build/three.module.js';
import { createExplosion } from '../gameplay/zombieUtils.js'; // Import explosion utility

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
        
        // Exploder specific behavior - start exploding when close to player
        if (distance < 3 && !exploder.isExploding) {
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
            const flashSpeed = Math.max(0.1, exploder.explosionTimer / 3);
            const flashIntensity = Math.sin(Date.now() * 0.01 / flashSpeed) * 0.5 + 0.5;
            
            exploder.children.forEach(child => {
                if (child.material && child.material.emissiveIntensity !== undefined) {
                    child.material.emissiveIntensity = flashIntensity;
                }
            });
            
            // Create explosion when timer reaches zero
            if (exploder.explosionTimer <= 0) {
                // Create explosion at exploder's position
                if (gameState && gameState.scene) {
                    createExplosion(
                        gameState.scene, 
                        exploder.position.clone(), 
                        3.5, // Explosion radius
                        120, // Explosion damage
                        gameState.zombies || [], 
                        gameState.playerObject,
                        gameState
                    );
                    
                    // Remove the exploder
                    if (exploder.parent) {
                        exploder.parent.remove(exploder);
                    }
                    
                    // Mark the zombie as dead in the game state
                    exploder.health = 0;
                }
            }
            
            return; // Don't move while exploding
        }
        
        // Normal movement if not exploding
        const finalDirection = direction.clone().normalize();
        
        // Add slight randomness to movement
        const randomFactor = Math.min(0.1, distance * 0.005);
        const randomAngle = (Math.random() - 0.5) * Math.PI * randomFactor;
        finalDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), randomAngle);
        
        // Calculate intended position
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
            
            if (checkCollision(intendedPosition, playerPosition, DAMAGE_DISTANCE)) {
                const damageAmount = DAMAGE_PER_SECOND * delta;
                if (gameState) damagePlayer(gameState, damageAmount);
            }
        }
        
        // Zombie collisions
        for (let i = 0; i < nearbyZombies.length; i++) {
            const otherZombie = nearbyZombies[i];
            if (!otherZombie || !otherZombie.mesh || otherZombie.mesh.isExploding) continue;
            
            if (checkCollision(intendedPosition, otherZombie.mesh.position, ZOMBIE_COLLISION_DISTANCE)) {
                const thisSize = exploder.mass || 1.0;
                const otherSize = otherZombie.mesh.mass || 1.0;
                
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
};
