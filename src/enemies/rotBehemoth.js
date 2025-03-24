/**
 * Rot Behemoth Module - Creates a massive tanky boss enemy
 * 
 * This module contains the function to create a Rot Behemoth, a huge boss-level
 * enemy with enormous health and defense. The Rot Behemoth is an oversized zombie
 * with layers of rotting flesh that can absorb significant damage. It moves very
 * slowly but deals devastating damage when it manages to hit a player.
 * 
 * Example usage:
 *   import { createRotBehemoth } from './enemies/rotBehemoth.js';
 *   
 *   // Create a Rot Behemoth at position (25, 0, 25) with speed 0.05
 *   const behemoth = createRotBehemoth({x: 25, z: 25}, 0.05);
 *   scene.add(behemoth);
 */

// src/enemies/zombie.js
import * as THREE from 'three';
import { logger } from '../utils/logger.js';

// Add 'enemy' to logger sections if not already included
logger.addSection('enemy');
logger.addSection('enemyspawner');

export const createRotBehemoth = (position, baseSpeed) => {
    // Configuration parameters
    const scale = new THREE.Vector3(1.5, 1.5, 1.5); // Increased scale for truly massive presence
    
    const behemoth = new THREE.Group();
    
    // Main body container
    const bodyGroup = new THREE.Group();
    behemoth.add(bodyGroup);

    // Core body - massive and imposing
    const bodyGeometry = new THREE.SphereGeometry(2.0, 20, 20);
    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: 0x556b2f, // Base olive green rot
        roughness: 0.9,
        metalness: 0.1,
        bumpScale: 0.3
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 2.2;
    body.scale.set(1.2, 1.0, 1.1);
    body.castShadow = true;
    bodyGroup.add(body);

    // Layers of rotting flesh - asymmetrical growths
    const fleshGeometry1 = new THREE.SphereGeometry(0.8, 8, 8);
    const fleshMaterial = new THREE.MeshStandardMaterial({
        color: 0x4d592a, // Darker rot
        roughness: 1.0,
        metalness: 0.05,
        transparent: true,
        opacity: 0.95
    });
    
    // Add multiple flesh layers for a grotesque appearance
    const fleshPositions = [
        [1.2, 1.8, 0.7, 1.5, 1.2, 1.3],
        [-1.3, 2.2, 0.5, 1.2, 1.0, 1.4],
        [0.8, 3.1, -0.6, 1.3, 0.9, 1.1],
        [-0.9, 1.5, -0.8, 1.1, 1.4, 1.0],
        [0.2, 2.6, 1.2, 1.0, 1.1, 1.6]
    ];
    
    const fleshLayers = [];
    for (const [x, y, z, sx, sy, sz] of fleshPositions) {
        const flesh = new THREE.Mesh(fleshGeometry1, fleshMaterial);
        flesh.position.set(x, y, z);
        flesh.scale.set(sx, sy, sz);
        flesh.rotation.set(Math.random() * 0.5, Math.random() * 0.5, Math.random() * 0.5);
        flesh.castShadow = true;
        bodyGroup.add(flesh);
        fleshLayers.push(flesh);
    }
    
    // Secondary flesh blobs with different color
    const fleshGeometry2 = new THREE.SphereGeometry(0.7, 8, 8);
    const fleshMaterial2 = new THREE.MeshStandardMaterial({
        color: 0x664228, // Brown rotten color
        roughness: 0.8,
        metalness: 0.1,
        transparent: true,
        opacity: 0.9
    });
    
    const secondaryFleshPositions = [
        [1.4, 2.5, 0.4, 1.0, 1.2, 0.9],
        [-1.0, 2.8, 0.7, 1.1, 0.8, 1.0],
        [0.3, 1.8, -1.1, 0.9, 1.1, 1.2],
        [-0.5, 3.2, -0.6, 1.2, 0.9, 1.0]
    ];
    
    const secondaryFleshLayers = [];
    for (const [x, y, z, sx, sy, sz] of secondaryFleshPositions) {
        const flesh = new THREE.Mesh(fleshGeometry2, fleshMaterial2);
        flesh.position.set(x, y, z);
        flesh.scale.set(sx, sy, sz);
        flesh.rotation.set(Math.random() * 0.5, Math.random() * 0.5, Math.random() * 0.5);
        flesh.castShadow = true;
        bodyGroup.add(flesh);
        secondaryFleshLayers.push(flesh);
    }

    // Central head - larger and more detailed
    const headGeometry = new THREE.SphereGeometry(1.2, 16, 16);
    const headMaterial = new THREE.MeshStandardMaterial({
        color: 0x5d6d35, // Slightly different tone
        roughness: 0.85,
        metalness: 0.1
    });
    const centralHead = new THREE.Mesh(headGeometry, headMaterial);
    centralHead.position.set(0, 4.5, 0.3);
    centralHead.scale.set(1.0, 1.2, 1.1);
    centralHead.castShadow = true;
    bodyGroup.add(centralHead);
    
    // Jaw for central head
    const jawGeometry = new THREE.BoxGeometry(0.9, 0.5, 0.8);
    const jawMaterial = new THREE.MeshStandardMaterial({
        color: 0x4d592a,
        roughness: 0.9
    });
    const jaw = new THREE.Mesh(jawGeometry, jawMaterial);
    jaw.position.set(0, 4.0, 0.6);
    bodyGroup.add(jaw);
    
    // Additional smaller heads fused to the body
    const smallHeadGeometry = new THREE.SphereGeometry(0.6, 12, 12);
    
    // Multiple fused heads
    const additionalHeadPositions = [
        [-1.1, 4.2, 0.4, 0.8, 0.7, 0.8, 0.3],
        [1.1, 4.3, 0.2, 0.7, 0.6, 0.7, -0.3],
        [0.8, 3.7, -0.5, 0.6, 0.6, 0.6, 0.2],
        [-0.7, 3.8, -0.4, 0.5, 0.5, 0.5, -0.2]
    ];
    
    const additionalHeads = [];
    for (const [x, y, z, sx, sy, sz, rot] of additionalHeadPositions) {
        const smallHead = new THREE.Mesh(smallHeadGeometry, headMaterial);
        smallHead.position.set(x, y, z);
        smallHead.scale.set(sx, sy, sz);
        smallHead.rotation.y = rot;
        smallHead.castShadow = true;
        bodyGroup.add(smallHead);
        additionalHeads.push(smallHead);
    }
    
    // Eyes - glowing and menacing
    const eyeGeometry = new THREE.SphereGeometry(0.15, 8, 8);
    const eyeMaterial = new THREE.MeshStandardMaterial({
        color: 0xff3300, 
        emissive: 0xff3300, 
        emissiveIntensity: 0.7
    });
    
    // Main eyes on central head
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.4, 4.7, 1.0);
    leftEye.scale.set(1.2, 1.2, 1.2);
    bodyGroup.add(leftEye);
    
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.4, 4.7, 1.0);
    rightEye.scale.set(1.2, 1.2, 1.2);
    bodyGroup.add(rightEye);
    
    // Additional eyes on smaller heads
    const additionalEyes = [];
    for (let i = 0; i < additionalHeadPositions.length; i++) {
        const [x, y, z] = additionalHeadPositions[i];
        const eye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        eye.position.set(x + (Math.random() * 0.2 - 0.1), y + 0.2, z + 0.4);
        eye.scale.set(0.8, 0.8, 0.8);
        bodyGroup.add(eye);
        additionalEyes.push(eye);
    }
    
    // Exposed bones and ribs protruding from the flesh
    const boneGeometry = new THREE.BoxGeometry(0.15, 0.6, 0.15);
    const boneMaterial = new THREE.MeshStandardMaterial({
        color: 0xf5f5dc, // Bone color
        roughness: 0.7,
        metalness: 0.1
    });
    
    // Create ribs protruding from the body
    const ribPositions = [
        [1.3, 2.3, 0.6, 0.2, 0.1, 0.7],
        [-1.2, 2.2, 0.5, -0.3, 0.2, 0.6],
        [1.0, 2.6, -0.4, 0.3, 0.15, 0.5],
        [-0.9, 2.5, -0.5, -0.25, 0.1, 0.4],
        [0.7, 1.9, 0.7, 0.1, 0.05, 0.3],
        [-0.6, 1.8, 0.8, -0.15, 0.2, 0.5]
    ];
    
    for (const [x, y, z, rx, ry, rz] of ribPositions) {
        const bone = new THREE.Mesh(boneGeometry, boneMaterial);
        bone.position.set(x, y, z);
        bone.rotation.set(rx, ry, rz);
        bone.scale.set(1.0 + Math.random() * 0.5, 1.0 + Math.random() * 1.0, 1.0 + Math.random() * 0.5);
        bodyGroup.add(bone);
    }

    // Position the behemoth
    behemoth.position.set(position.x, 0, position.z);

    // Log the creation
    logger.info('enemyspawner', `Creating rot behemoth at ${position.x.toFixed(2)},${position.z.toFixed(2)}`);

    // Set properties
    behemoth.mesh = behemoth;
    behemoth.enemyType = 'rotBehemoth';
    behemoth.health = 800; // Extremely high health
    behemoth.speed = baseSpeed * 0.9; // Extremely slow
    behemoth.mass = 5.0; // Extremely heavy
    behemoth.damageMultiplier = 3.0; // Deals 3x normal damage
    
    // Scale the rot behemoth according to scale parameter
    behemoth.scale.copy(scale);

    // Update method
    behemoth.update = (context) => {
        logger.verbose('enemy', `Rot behemoth update at ${behemoth.position.x.toFixed(2)},${behemoth.position.z.toFixed(2)}`);
        
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
            playerPosition.x - behemoth.position.x,
            0,
            playerPosition.z - behemoth.position.z
        );
        
        const distance = direction.length();
        const finalDirection = direction.clone().normalize();
        
        // Add slight randomness to movement (less than normal due to massive size)
        const randomFactor = Math.min(0.05, distance * 0.002);
        const randomAngle = (Math.random() - 0.5) * Math.PI * randomFactor;
        finalDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), randomAngle);
        
        // Calculate intended position
        const moveDistance = behemoth.speed * delta * 60;
        const intendedPosition = new THREE.Vector3()
            .copy(behemoth.position)
            .addScaledVector(finalDirection, moveDistance);
        
        // Debug log position change
        logger.verbose('enemy', `Rot behemoth moving from ${behemoth.position.x.toFixed(2)},${behemoth.position.z.toFixed(2)} to ${intendedPosition.x.toFixed(2)},${intendedPosition.z.toFixed(2)}`);
        
        // Handle collisions if collision settings are available
        if (collisionSettings) {
            const { COLLISION_DISTANCE, DAMAGE_DISTANCE, DAMAGE_PER_SECOND, ZOMBIE_COLLISION_DISTANCE } = collisionSettings;
            
            if (checkCollision && pushAway) {
                if (checkCollision(intendedPosition, playerPosition, COLLISION_DISTANCE)) {
                    const newPosition = pushAway(intendedPosition, playerPosition, COLLISION_DISTANCE);
                    intendedPosition.x = newPosition.x;
                    intendedPosition.z = newPosition.z;
                    
                    if (checkCollision(intendedPosition, playerPosition, DAMAGE_DISTANCE)) {
                        // Use regular damage when not close enough for heavy attack
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
                        const thisSize = behemoth.mass || 1.0;
                        const otherSize = otherZombie.mesh.mass || 1.0;
                        
                        // Behemoth pushes other zombies away more due to mass
                        const massRatio = thisSize / (thisSize + otherSize);
                        const avoidancePosition = pushAway(
                            intendedPosition, 
                            otherZombie.mesh.position, 
                            ZOMBIE_COLLISION_DISTANCE
                        );
                        
                        // Apply less avoidance due to behemoth's size
                        intendedPosition.x = intendedPosition.x * massRatio + avoidancePosition.x * (1 - massRatio);
                        intendedPosition.z = intendedPosition.z * massRatio + avoidancePosition.z * (1 - massRatio);
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
        behemoth.position.copy(intendedPosition);
        behemoth.rotation.y = Math.atan2(finalDirection.x, finalDirection.z);
        
        // Heavy attack effect
        const distanceToPlayer = new THREE.Vector3(
            playerPosition.x - behemoth.position.x,
            0,
            playerPosition.z - behemoth.position.z
        ).length();
        
        // Devastating melee attack if very close
        if (distanceToPlayer < 2.0) {
            const attackDamage = 30 * delta; // Base damage is very high
            if (gameState) {
                logger.info('enemy', `Rot behemoth attacking player for ${attackDamage.toFixed(2)} damage`);
                damagePlayer(gameState, attackDamage);
            }
        }
    };
    
    return behemoth;
};
