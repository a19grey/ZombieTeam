/**
 * Necrofiend Module - Creates a tall boss enemy that can summon minions
 * 
 * This module contains the function to create a Necrofiend, a boss-level enemy
 * with minion-summoning abilities. The Necrofiend is an elongated, ghastly zombie
 * with a gaping maw and long limbs. It moves at a moderate pace, has substantial
 * health, and can periodically summon lesser zombies to fight for it.
 * 
 * Example usage:
 *   import { createNecrofiend } from './enemies/necrofiend.js';
 *   
 *   // Create a Necrofiend at position (25, 0, 25) with speed 0.05
 *   const necrofiend = createNecrofiend({x: 25, z: 25}, 0.05);
 *   scene.add(necrofiend);
 */

import * as THREE from 'three';
import { logger } from '../utils/logger.js';

// Add 'enemy' to logger sections if not already included
logger.addSection('enemy');

export const createNecrofiend = (position, baseSpeed) => {
    // Configuration parameters
    const scale = new THREE.Vector3(1.0, 1.0, 1.0); // Scale vector for easy adjustment
    
    const necro = new THREE.Group();

    // Elongated body
    const bodyGeometry = new THREE.BoxGeometry(0.8, 4, 0.6);
    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: 0x483c32, // Dark grayish-brown
        roughness: 0.9
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 2;
    body.castShadow = true;
    necro.add(body);

    // Head with gaping maw
    const headGeometry = new THREE.BoxGeometry(0.6, 0.8, 0.6);
    const headMaterial = new THREE.MeshStandardMaterial({
        color: 0x2e8b57, // Greenish decay
        roughness: 0.9
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 5;
    head.castShadow = true;
    necro.add(head);
    const mouth = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.4, 0.1),
        new THREE.MeshStandardMaterial({ color: 0x000000 })
    );
    mouth.position.set(0, 4.8, 0.31);
    necro.add(mouth);

    // Claw-like arms
    const armGeometry = new THREE.BoxGeometry(0.3, 2, 0.3);
    const leftArm = new THREE.Mesh(armGeometry, bodyMaterial);
    leftArm.position.set(-0.6, 3, 0.2);
    leftArm.rotation.x = Math.PI / 3;
    leftArm.castShadow = true;
    necro.add(leftArm);
    const rightArm = new THREE.Mesh(armGeometry, bodyMaterial);
    rightArm.position.set(0.6, 3, 0.2);
    rightArm.rotation.x = Math.PI / 3;
    rightArm.castShadow = true;
    necro.add(rightArm);

    // Legs
    const legGeometry = new THREE.BoxGeometry(0.4, 2, 0.4);
    const leftLeg = new THREE.Mesh(legGeometry, bodyMaterial);
    leftLeg.position.set(-0.2, 1, 0);
    leftLeg.castShadow = true;
    necro.add(leftLeg);
    const rightLeg = new THREE.Mesh(legGeometry, bodyMaterial);
    rightLeg.position.set(0.2, 1, 0);
    rightLeg.castShadow = true;
    necro.add(rightLeg);

    necro.position.set(position.x, 0, position.z);
    
    // Log the creation
    logger.info('enemyspawner', `Creating necrofiend at ${position.x.toFixed(2)},${position.z.toFixed(2)}`);
    
    // Set properties
    necro.mesh = necro;
    necro.enemyType = 'necrofiend';
    necro.health = 400; // High health for a boss type
    necro.speed = baseSpeed * 0.7; // Slower than standard zombies
    necro.mass = 3.0; // Heavy
    necro.nextSummonTime = Date.now() + 5000; // First summon after 5 seconds
    
    // Scale the necrofiend according to scale parameter
    necro.scale.copy(scale);
    
    // Update method
    necro.update = (context) => {
        logger.verbose('enemy', `Necrofiend update at ${necro.position.x.toFixed(2)},${necro.position.z.toFixed(2)}`);
        
        const { 
            playerPosition, 
            delta, 
            collisionSettings,
            environmentObjects,
            nearbyZombies,
            gameState,
            checkCollision,
            pushAway,
            damagePlayer,
            summonZombie
        } = context;
        
        // Calculate direction to player
        const direction = new THREE.Vector3(
            playerPosition.x - necro.position.x,
            0,
            playerPosition.z - necro.position.z
        );
        
        const distance = direction.length();
        const finalDirection = direction.clone().normalize();
        
        // Add slight randomness to movement
        const randomFactor = Math.min(0.1, distance * 0.005);
        const randomAngle = (Math.random() - 0.5) * Math.PI * randomFactor;
        finalDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), randomAngle);
        
        // Calculate intended position
        const moveDistance = necro.speed * delta * 60;
        const intendedPosition = new THREE.Vector3()
            .copy(necro.position)
            .addScaledVector(finalDirection, moveDistance);
        
        // Debug log position change
        logger.verbose('enemy', `Necrofiend moving from ${necro.position.x.toFixed(2)},${necro.position.z.toFixed(2)} to ${intendedPosition.x.toFixed(2)},${intendedPosition.z.toFixed(2)}`);
        
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
                        const thisSize = necro.mass || 1.0;
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
        necro.position.copy(intendedPosition);
        necro.rotation.y = Math.atan2(finalDirection.x, finalDirection.z);
        
        // Summon minions periodically
        const now = Date.now();
        if (now > necro.nextSummonTime) {
            logger.info('enemy', `Necrofiend summoning minions`);
            necro.nextSummonTime = now + 15000; // Next summon in 15 seconds
            
            // Summon logic would go here, e.g.:
            if (summonZombie) {
                // Random slight offset positions for summoned zombies
                const summonOffset = 2.0;
                for (let i = 0; i < 3; i++) {
                    const offsetX = (Math.random() - 0.5) * summonOffset;
                    const offsetZ = (Math.random() - 0.5) * summonOffset;
                    const summonPos = {
                        x: necro.position.x + offsetX,
                        z: necro.position.z + offsetZ
                    };
                    summonZombie(summonPos, 1); // Summon 1 zombie at this position
                }
            }
        }
    };
    
    return necro;
};

