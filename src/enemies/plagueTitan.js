/**
 * Plague Titan Module - Creates a poison-based boss enemy
 * 
 * This module contains the function to create a Plague Titan, a boss-level enemy
 * that can poison players in its vicinity. The Plague Titan is a massive, bloated
 * zombie with a sickly green aura that deals damage over time to players who get
 * too close to it.
 * 
 * Example usage:
 *   import { createPlagueTitan } from './enemies/plagueTitan.js';
 *   
 *   // Create a Plague Titan at position (25, 0, 25) with speed 0.05
 *   const titan = createPlagueTitan({x: 25, z: 25}, 0.05);
 *   scene.add(titan);
 */

import * as THREE from 'three';
import { logger } from '../utils/logger.js';

// Add 'enemy' to logger sections if not already included
logger.addSection('enemy');

export const createPlagueTitan = (position, baseSpeed) => {
    // Configuration parameters
    const scale = new THREE.Vector3(1.0, 1.0, 1.0); // Scale vector for easy adjustment
    
    const titan = new THREE.Group();

    // Massive body
    const bodyGeometry = new THREE.BoxGeometry(2, 6, 1.5);
    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: 0x3c2f2f, // Dark reddish-brown, festering flesh
        roughness: 0.9
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 3;
    body.castShadow = true;
    titan.add(body);

    // Head with oozing sores
    const headGeometry = new THREE.BoxGeometry(1, 1, 1);
    const headMaterial = new THREE.MeshStandardMaterial({
        color: 0x2e8b57, // Greenish decay
        roughness: 0.9
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 7;
    head.castShadow = true;
    titan.add(head);

    // Glowing sores (emissive)
    const soreGeometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
    const soreMaterial = new THREE.MeshStandardMaterial({
        color: 0xffff00, // Yellow pus
        emissive: 0xffff00,
        emissiveIntensity: 0.5
    });
    const sore1 = new THREE.Mesh(soreGeometry, soreMaterial);
    sore1.position.set(0.8, 4, 0.8);
    titan.add(sore1);
    const sore2 = new THREE.Mesh(soreGeometry, soreMaterial);
    sore2.position.set(-0.8, 2, 0.8);
    titan.add(sore2);

    // Club-like arms
    const armGeometry = new THREE.BoxGeometry(1, 3, 1);
    const leftArm = new THREE.Mesh(armGeometry, bodyMaterial);
    leftArm.position.set(-1.5, 4, 0);
    leftArm.rotation.x = Math.PI / 4;
    leftArm.castShadow = true;
    titan.add(leftArm);
    const rightArm = new THREE.Mesh(armGeometry, bodyMaterial);
    rightArm.position.set(1.5, 4, 0);
    rightArm.rotation.x = Math.PI / 4;
    rightArm.castShadow = true;
    titan.add(rightArm);

    // Legs
    const legGeometry = new THREE.BoxGeometry(0.8, 4, 0.8);
    const leftLeg = new THREE.Mesh(legGeometry, bodyMaterial);
    leftLeg.position.set(-0.6, 2, 0);
    leftLeg.castShadow = true;
    titan.add(leftLeg);
    const rightLeg = new THREE.Mesh(legGeometry, bodyMaterial);
    rightLeg.position.set(0.6, 2, 0);
    rightLeg.castShadow = true;
    titan.add(rightLeg);

    // Position the titan
    titan.position.set(position.x, 0, position.z);

    // Log the creation
    logger.info('enemy', `Creating plague titan at ${position.x.toFixed(2)},${position.z.toFixed(2)}`);

    // Set properties
    titan.mesh = titan;
    titan.enemyType = 'plagueTitan';
    titan.health = 500; // Very high health
    titan.speed = baseSpeed * 0.5; // Much slower than standard zombies
    titan.mass = 4.0; // Very heavy
    titan.poisonRadius = 5.0; // Radius of poison effect
    titan.poisonDamage = 10; // Damage per second from poison
    
    // Scale the plague titan according to scale parameter
    titan.scale.copy(scale);

    // Update method
    titan.update = (context) => {
        logger.verbose('enemy', `Plague titan update at ${titan.position.x.toFixed(2)},${titan.position.z.toFixed(2)}`);
        
        // Get context variables
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
            playerPosition.x - titan.position.x,
            0,
            playerPosition.z - titan.position.z
        );
        
        const distance = direction.length();
        const finalDirection = direction.clone().normalize();
        
        // Add slight randomness to movement
        const randomFactor = Math.min(0.1, distance * 0.005);
        const randomAngle = (Math.random() - 0.5) * Math.PI * randomFactor;
        finalDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), randomAngle);
        
        // Calculate intended position
        const moveDistance = titan.speed * delta * 60;
        const intendedPosition = new THREE.Vector3()
            .copy(titan.position)
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
                        const thisSize = titan.mass || 1.0;
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
        titan.position.copy(intendedPosition);
        titan.rotation.y = Math.atan2(finalDirection.x, finalDirection.z);
        
        // Poison effect
        const distanceToPlayer = new THREE.Vector3(
            playerPosition.x - titan.position.x,
            0,
            playerPosition.z - titan.position.z
        ).length();
        
        if (distanceToPlayer < titan.poisonRadius) {
            const poisonAmount = titan.poisonDamage * delta;
            if (gameState) {
                logger.info('enemy', `Plague titan poisoning player for ${poisonAmount.toFixed(2)} damage`);
                damagePlayer(gameState, poisonAmount);
            }
        }
    };
    
    return titan;
};

