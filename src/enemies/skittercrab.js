/**
 * Skittercrab Module - Creates a fast, agile zombie variant
 * 
 * This module contains the function to create a Skittercrab, a unique enemy type
 * that moves very quickly but has low health. The Skittercrab is a small, hunched
 * zombie with crab-like features that can rapidly close the distance to players
 * and attack with quick strikes.
 * 
 * Example usage:
 *   import { createSkittercrab } from './enemies/skittercrab.js';
 *   
 *   // Create a Skittercrab at position (15, 0, 20) with speed 0.05
 *   const crab = createSkittercrab({x: 15, z: 20}, 0.05);
 *   scene.add(crab);
 */

/**
 * Creates a Skittercrab - a small, fast crab-like zombie
 * @param {Object} position - The initial position of the skittercrab
 * @param {number} baseSpeed - Base movement speed
 * @returns {THREE.Group} The Skittercrab object
 */

// src/enemies/zombie.js
import * as THREE from 'three';
import { logger } from '../utils/logger.js';

// Add 'enemy' to logger sections if not already included
logger.addSection('enemy');

export const createSkittercrab = (position, baseSpeed) => {
    // Configuration parameters
    const scale = new THREE.Vector3(0.6, 0.6, 0.6); // Scale vector for easy adjustment
    
    const crab = new THREE.Group();

    // Low, wide body
    const bodyGeometry = new THREE.BoxGeometry(1, 0.5, 0.8);
    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: 0x696969, // Dark gray carapace
        roughness: 0.9
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.25;
    body.castShadow = true;
    crab.add(body);

    // Spiky shell
    const spikeGeometry = new THREE.BoxGeometry(0.2, 0.4, 0.2);
    const spikeMaterial = new THREE.MeshStandardMaterial({
        color: 0x8b0000, // Dark red spikes
        roughness: 0.9
    });
    const spike1 = new THREE.Mesh(spikeGeometry, spikeMaterial);
    spike1.position.set(0, 0.65, 0);
    crab.add(spike1);
    const spike2 = new THREE.Mesh(spikeGeometry, spikeMaterial);
    spike2.position.set(0.3, 0.55, 0);
    crab.add(spike2);

    // Pincer legs
    const pincerGeometry = new THREE.BoxGeometry(0.3, 0.3, 0.6);
    const leftPincer = new THREE.Mesh(pincerGeometry, bodyMaterial);
    leftPincer.position.set(-0.65, 0.15, 0.2);
    leftPincer.rotation.z = Math.PI / 4;
    leftPincer.castShadow = true;
    crab.add(leftPincer);
    const rightPincer = new THREE.Mesh(pincerGeometry, bodyMaterial);
    rightPincer.position.set(0.65, 0.15, 0.2);
    rightPincer.rotation.z = -Math.PI / 4;
    rightPincer.castShadow = true;
    crab.add(rightPincer);

    // Back legs
    const legGeometry = new THREE.BoxGeometry(0.2, 0.3, 0.4);
    const leftLeg = new THREE.Mesh(legGeometry, bodyMaterial);
    leftLeg.position.set(-0.4, 0.15, -0.2);
    leftLeg.castShadow = true;
    crab.add(leftLeg);
    const rightLeg = new THREE.Mesh(legGeometry, bodyMaterial);
    rightLeg.position.set(0.4, 0.15, -0.2);
    rightLeg.castShadow = true;
    crab.add(rightLeg);

    // Position the skittercrab
    crab.position.set(position.x, 0, position.z);

    // Log the creation
    logger.info('enemy', `Creating skittercrab at ${position.x.toFixed(2)},${position.z.toFixed(2)}`);

    // Set properties
    crab.mesh = crab;
    crab.enemyType = 'skittercrab';
    crab.health = 10; // Low health
    crab.speed = baseSpeed * 1.5; // Very fast
    crab.mass = 0.5; // Very light
    crab.lastDashTime = 0;
    crab.dashCooldown = 3000; // 3 seconds between dashes
    
    // Scale the skittercrab according to scale parameter
    crab.scale.copy(scale);

    // Update method
    crab.update = (context) => {
        logger.verbose('enemy', `Skittercrab update at ${crab.position.x.toFixed(2)},${crab.position.z.toFixed(2)}`);
        
        const { 
            playerPosition, 
            delta, 
            collisionSettings,
            environmentObjects,
            nearbyZombies,
            gameState,
            checkCollision,
            pushAway,
            damagePlayer
        } = context;
        
        // Calculate direction to player
        const direction = new THREE.Vector3(
            playerPosition.x - crab.position.x,
            0,
            playerPosition.z - crab.position.z
        );
        
        const distanceToPlayer = direction.length();
        let finalDirection = direction.clone().normalize();
        
        // Special dash ability
        let moveSpeed = crab.speed;
        const now = Date.now();
        if (now - crab.lastDashTime > crab.dashCooldown) {
            // Dash when at medium range
            if (distanceToPlayer > 5 && distanceToPlayer < 10) {
                logger.info('enemy', `Skittercrab performing dash attack toward player`);
                crab.lastDashTime = now;
                // Dash gives temporary speed boost
                moveSpeed = crab.speed * 3.0;
            }
        }
        
        // Add slight randomness to movement (less than zombie because crabs are more precise)
        const randomFactor = Math.min(0.05, distanceToPlayer * 0.003);
        const randomAngle = (Math.random() - 0.5) * Math.PI * randomFactor;
        finalDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), randomAngle);
        
        // Calculate intended position
        const moveDistance = moveSpeed * delta * 60;
        const intendedPosition = new THREE.Vector3()
            .copy(crab.position)
            .addScaledVector(finalDirection, moveDistance);
        
        // Handle collisions if collision settings are available
        if (collisionSettings) {
            const { COLLISION_DISTANCE, DAMAGE_DISTANCE, DAMAGE_PER_SECOND, ZOMBIE_COLLISION_DISTANCE } = collisionSettings;
            
            if (checkCollision && pushAway) {
                if (checkCollision(intendedPosition, playerPosition, COLLISION_DISTANCE)) {
                    const newPosition = pushAway(intendedPosition, playerPosition, COLLISION_DISTANCE);
                    intendedPosition.x = newPosition.x;
                    intendedPosition.z = newPosition.z;
                    
                    if (checkCollision(intendedPosition, playerPosition, DAMAGE_DISTANCE)) {
                        const damageAmount = DAMAGE_PER_SECOND * delta;
                        if (gameState) damagePlayer(gameState, damageAmount);
                    }
                }
            }
            
            // Zombie collisions
            if (nearbyZombies && checkCollision && pushAway) {
                for (let i = 0; i < nearbyZombies.length; i++) {
                    const otherZombie = nearbyZombies[i];
                    if (!otherZombie || !otherZombie.mesh || otherZombie.mesh.isExploding) continue;
                    
                    if (checkCollision(intendedPosition, otherZombie.mesh.position, ZOMBIE_COLLISION_DISTANCE)) {
                        const thisSize = crab.mass || 1.0;
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
        crab.position.copy(intendedPosition);
        crab.rotation.y = Math.atan2(finalDirection.x, finalDirection.z);
    };
    
    return crab;
};

