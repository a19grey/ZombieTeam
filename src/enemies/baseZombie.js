/**
 * Base Zombie Module - Creates a standard zombie enemy
 * 
 * This module contains the function to create a Minecraft-style low-poly zombie,
 * which serves as the basic enemy in the game. The zombie follows the player
 * directly with simple movement AI and has the standard appearance of a green,
 * blocky undead character with red eyes.
 * 
 * Example usage:
 *   import { createbaseZombie } from './enemies/baseZombie.js';
 *   
 *   // Create a zombie at position (10, 0, 15) with speed 0.05
 *   const zombie = createbaseZombie({x: 10, z: 15}, 0.05);
 *   scene.add(zombie);
 */

// src/enemies/zombie.js
import * as THREE from 'three';
import { logger } from '../utils/logger.js';

// Add 'enemy' to logger sections if not already included
logger.addSection('enemy');

export const createbaseZombie = (position, baseSpeed) => {
/**
 * Creates a Minecraft-style low-poly zombie character
 * @param {Object} position - The initial position of the zombie
 * @param {number} baseSpeed - Base movement speed (zombie will move at exactly this speed)
 * @returns {THREE.Group} The zombie object
 */
    // Configuration parameters
    const scale = new THREE.Vector3(1.0, 1.0, 1.0); // Scale vector for easy adjustment
    
    const basezombie = new THREE.Group();
    
    // Head (cube with "scary" offset eyes)
    const headGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const headMaterial = new THREE.MeshStandardMaterial({
        color: 0x2e8b57, // Green zombie skin
        roughness: 0.9
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1.5; // Top of zombie at y=2
    head.castShadow = true;
    basezombie.add(head);

    // Eyes (small red blocks for a menacing look)
    const eyeGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    const eyeMaterial = new THREE.MeshStandardMaterial({
        color: 0xff0000, // Red glowing eyes
        emissive: 0xff0000,
        emissiveIntensity: 0.5
    });
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.15, 1.55, 0.25); // Front left of face
    basezombie.add(leftEye);
    
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.15, 1.55, 0.25); // Front right of face
    basezombie.add(rightEye);

    // Body (rectangular prism)
    const bodyGeometry = new THREE.BoxGeometry(0.5, 0.75, 0.25);
    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: 0x1a3c34, // Darker green torn shirt
        roughness: 0.9
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.75; // Center of body
    body.castShadow = true;
    basezombie.add(body);

    // Left Arm (slightly longer and angled for zombie posture)
    const armGeometry = new THREE.BoxGeometry(0.25, 0.75, 0.25);
    const armMaterial = new THREE.MeshStandardMaterial({
        color: 0x2e8b57, // Green skin
        roughness: 0.9
    });
    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-0.375, 0.75, 0.125); // Slightly forward
    leftArm.rotation.x = Math.PI / 6; // Forward tilt
    leftArm.castShadow = true;
    basezombie.add(leftArm);

    // Right Arm
    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(0.375, 0.75, 0.125); // Slightly forward
    rightArm.rotation.x = Math.PI / 6; // Forward tilt
    rightArm.castShadow = true;
    basezombie.add(rightArm);

    // Left Leg
    const legGeometry = new THREE.BoxGeometry(0.25, 0.5, 0.25);
    const legMaterial = new THREE.MeshStandardMaterial({
        color: 0x1a3c34, // Dark green pants
        roughness: 0.9
    });
    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-0.125, 0.25, 0);
    leftLeg.castShadow = true;
    basezombie.add(leftLeg);

    // Right Leg
    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(0.125, 0.25, 0);
    rightLeg.castShadow = true;
    basezombie.add(rightLeg);

    // Set initial position
    basezombie.position.set(position.x, 0, position.z);
    
    // Debug log for zombie creation
    logger.debug('enemy', `Creating base zombie at ${position.x.toFixed(2)},${position.z.toFixed(2)}`);
    
    // Store mesh reference for updateZombies compatibility
    basezombie.mesh = basezombie;
    
    // Set enemy type for special behavior
    basezombie.enemyType = 'zombie';
    
    // Set speed to exactly baseSpeed (standard zombie is the baseline)
    basezombie.speed = baseSpeed;
    
    // Set mass for physics calculations
    basezombie.mass = 1.0;
    
    // Set default health
    basezombie.health = 100;

    // Scale the zombie according to scale parameter
    basezombie.scale.copy(scale);

    /**
     * Updates the zombie's position and behavior
     * @param {Object} context - The update context containing all necessary information
     */
    basezombie.update = (context) => {
        // Debug log update call
        logger.verbose('enemy', `Base zombie update method called (at ${basezombie.position.x.toFixed(2)},${basezombie.position.z.toFixed(2)})`);
        
        // Additional debugging to inspect context
        logger.verbose('enemy', `Context check:`, {
            hasPlayerPosition: !!context.playerPosition,
            playerPos: context.playerPosition ? 
                `${context.playerPosition.x.toFixed(2)},${context.playerPosition.z.toFixed(2)}` : 'missing',
            delta: context.delta,
            speed: basezombie.speed,
            hasCollisionSettings: !!context.collisionSettings,
            hasNearbyZombies: Array.isArray(context.nearbyZombies)
        });
        
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
        
        // Calculate direction to player
        const direction = new THREE.Vector3(
            playerPosition.x - basezombie.position.x,
            0,
            playerPosition.z - basezombie.position.z
        );
        
        const distance = direction.length();
        const finalDirection = direction.clone().normalize();
        
        // Add slight randomness to movement
        const randomFactor = Math.min(0.1, distance * 0.005);
        const randomAngle = (Math.random() - 0.5) * Math.PI * randomFactor;
        finalDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), randomAngle);
        
        // Calculate intended position
        const moveDistance = basezombie.speed * delta * 60;
        const intendedPosition = new THREE.Vector3()
            .copy(basezombie.position)
            .addScaledVector(finalDirection, moveDistance);
        
        // Debug log position change
        logger.verbose('enemy', `Base zombie moving from ${basezombie.position.x.toFixed(2)},${basezombie.position.z.toFixed(2)} to ${intendedPosition.x.toFixed(2)},${intendedPosition.z.toFixed(2)}`);
        
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
                const thisSize = basezombie.mass || 1.0;
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
        basezombie.position.copy(intendedPosition);
        basezombie.rotation.y = Math.atan2(finalDirection.x, finalDirection.z);
        
        // Debug position confirmation
        logger.verbose('enemy', `Base zombie position updated to ${basezombie.position.x.toFixed(2)},${basezombie.position.z.toFixed(2)}`);
    };

    return basezombie;
};