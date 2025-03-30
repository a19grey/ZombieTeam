/**
 * Necrofiend Module - Creates a tall boss enemy that can summon minions
 * 
 * This module contains the function to create a Necrofiend, a boss-level enemy
 * with minion-summoning abilities. The Necrofiend is an elongated, ghastly zombie
 * with a distinctive tall hat-like structure, ethereal flowing limbs, and mystical
 * patterns on its body. It moves at a moderate pace, has substantial health, and
 * can periodically summon lesser zombies to fight for it.
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
    const scale = new THREE.Vector3(1.4, 0.9, 1.4); // Slightly taller
    
    const necro = new THREE.Group();

    // Main body - taller and more slender
    const bodyGeometry = new THREE.BoxGeometry(0.7, 3.5, 0.5);
    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: 0x2F4F4F, // Darker slate gray
        roughness: 0.7,
        metalness: 0.3
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 2;
    body.castShadow = true;
    necro.add(body);

    // Decorative patterns on body
    const patternMaterial = new THREE.MeshStandardMaterial({
        color: 0x4A766E, // Slightly lighter accent color
        roughness: 0.6,
        metalness: 0.4
    });
    
    // Add pattern details to body
    const patternGeometry = new THREE.BoxGeometry(0.8, 0.1, 0.6);
    for (let i = 0; i < 5; i++) {
        const pattern = new THREE.Mesh(patternGeometry, patternMaterial);
        pattern.position.y = 1 + (i * 0.8);
        pattern.position.z = 0.01;
        body.add(pattern);
    }

    // Distinctive tall hat/head structure
    const hatGroup = new THREE.Group();
    
    // Base of the hat
    const hatBaseGeometry = new THREE.BoxGeometry(0.8, 0.4, 0.6);
    const hatBase = new THREE.Mesh(hatBaseGeometry, bodyMaterial);
    hatBase.position.y = 4;
    hatGroup.add(hatBase);
    
    // Tall part of hat
    const hatTopGeometry = new THREE.BoxGeometry(0.6, 1.2, 0.4);
    const hatTop = new THREE.Mesh(hatTopGeometry, bodyMaterial);
    hatTop.position.y = 4.8;
    hatGroup.add(hatTop);
    
    // Horizontal bar on hat
    const hatBarGeometry = new THREE.BoxGeometry(1.2, 0.15, 0.15);
    const hatBar = new THREE.Mesh(hatBarGeometry, patternMaterial);
    hatBar.position.y = 4.4;
    hatGroup.add(hatBar);
    
    // Add glowing pink eyes
    const eyeGeometry = new THREE.SphereGeometry(0.08, 16, 16);
    const eyeMaterial = new THREE.MeshStandardMaterial({
        color: 0xFF69B4, // Hot pink
        emissive: 0xFF1493, // Deep pink
        emissiveIntensity: 2.0,
        roughness: 0.1,
        metalness: 0.8
    });
    
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    
    // Position eyes in the middle of the hat base
    leftEye.position.set(-0.15, 4.1, 0.25);
    rightEye.position.set(0.15, 4.1, 0.25);
    
    // Add subtle glow animation
    leftEye.userData.baseIntensity = 2.0;
    rightEye.userData.baseIntensity = 2.0;
    
    necro.add(leftEye);
    necro.add(rightEye);
    
    // Store eye references for animation
    necro.eyes = {
        left: leftEye,
        right: rightEye,
        material: eyeMaterial
    };
    
    necro.add(hatGroup);

    // Ethereal flowing arms
    const createEtherealLimb = (isLeft, isArm = true) => {
        const segments = 4;
        const limbGroup = new THREE.Group();
        const segmentSize = isArm ? 0.5 : 0.7;
        const baseWidth = isArm ? 0.25 : 0.3;
        
        for (let i = 0; i < segments; i++) {
            const segmentGeometry = new THREE.BoxGeometry(
                baseWidth * (1 - i * 0.15),
                segmentSize,
                baseWidth * (1 - i * 0.15)
            );
            const segment = new THREE.Mesh(segmentGeometry, new THREE.MeshStandardMaterial({
                color: 0x8794a3,
                transparent: true,
                opacity: 1 - (i * 0.2),
                roughness: 0.4,
                metalness: 0.6
            }));
            
            segment.position.y = -segmentSize * i;
            limbGroup.add(segment);
        }
        
        if (isArm) {
            limbGroup.position.set(isLeft ? -0.7 : 0.7, 3.5, 0);
            limbGroup.rotation.z = isLeft ? Math.PI / 6 : -Math.PI / 6;
        } else {
            limbGroup.position.set(isLeft ? -0.3 : 0.3, 1.8, 0);
        }
        
        return limbGroup;
    };

    // Add ethereal limbs
    const leftArm = createEtherealLimb(true, true);
    const rightArm = createEtherealLimb(false, true);
    const leftLeg = createEtherealLimb(true, false);
    const rightLeg = createEtherealLimb(false, false);
    
    necro.add(leftArm);
    necro.add(rightArm);
    necro.add(leftLeg);
    necro.add(rightLeg);

    // Position the necrofiend
    necro.position.set(position.x, 0, position.z);
    
    // Log the creation
    logger.info('enemyspawner', `Creating necrofiend at ${position.x.toFixed(2)},${position.z.toFixed(2)}`);
    
    // Set properties
    necro.mesh = necro;
    necro.enemyType = 'necrofiend';
    necro.health = 400; // High health for a boss type
    // Set points value for this enemy type
    necro.points = necro.health/10; // Base points for regular zombie
    necro.speed = baseSpeed * 0.7; // Slower than standard zombies
    necro.mass = 3.0; // Heavy
    necro.nextSummonTime = Date.now() + 5000; // First summon after 5 seconds
    necro.animationTime = 0; // For limb animations
    
    // Scale the necrofiend according to scale parameter
    necro.scale.copy(scale);
    
    // Store limb references for animation
    necro.limbs = {
        leftArm,
        rightArm,
        leftLeg,
        rightLeg
    };
    
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
        
        // Animate ethereal limbs
        necro.animationTime += delta * 2;
        
        // Animate eye glow
        const glowPulse = (Math.sin(necro.animationTime * 1.5) * 0.5 + 1.5) * necro.eyes.left.userData.baseIntensity;
        necro.eyes.material.emissiveIntensity = glowPulse;
        
        // Gentle floating motion for arms
        necro.limbs.leftArm.rotation.z = Math.PI / 6 + Math.sin(necro.animationTime) * 0.1;
        necro.limbs.rightArm.rotation.z = -Math.PI / 6 + Math.sin(necro.animationTime) * 0.1;
        
        // Subtle leg movement
        necro.limbs.leftLeg.rotation.x = Math.sin(necro.animationTime) * 0.05;
        necro.limbs.rightLeg.rotation.x = Math.sin(necro.animationTime + Math.PI) * 0.05;
        
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
                        const thisSize = necro.mass;
                        const otherSize = otherZombie.mesh.mass;
                        
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

