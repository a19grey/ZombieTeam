/**
 * Skeleton Archer Module - Creates a ranged skeleton enemy
 * 
 * This module contains the function to create a skeleton archer, a mid-level
 * ranged enemy that fires arrows at the player from a distance. The skeleton
 * has a bone-white appearance with black hollow eyes and carries a bow.
 * It moves faster than the standard zombie but maintains distance from the player.
 * 
 * Example usage:
 *   import { createSkeletonArcher } from './enemies/skeletonArcher.js';
 *   
 *   // Create a skeleton archer at position (20, 0, 15) with speed 0.05
 *   const archer = createSkeletonArcher({x: 20, z: 15}, 0.05);
 *   scene.add(archer);
 */

// src/enemies/zombie.js
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.132.2/build/three.module.js';

// Check if we're in development mode
const isDev = window.NODE_ENV !== 'production';

export const createSkeletonArcher = (position, baseSpeed) => {
    const skeleton = new THREE.Group();

    // Head with hollow eyes
    const headGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const boneMaterial = new THREE.MeshStandardMaterial({
        color: 0xdcdcdc, // Bone white
        roughness: 0.8
    });
    const head = new THREE.Mesh(headGeometry, boneMaterial);
    head.position.y = 1.5;
    head.castShadow = true;
    skeleton.add(head);

    // Black eye sockets
    const eyeGeometry = new THREE.BoxGeometry(0.15, 0.15, 0.1);
    const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.15, 1.55, 0.25);
    skeleton.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.15, 1.55, 0.25);
    skeleton.add(rightEye);

    // Body (thinner than zombie)
    const bodyGeometry = new THREE.BoxGeometry(0.4, 0.75, 0.2);
    const body = new THREE.Mesh(bodyGeometry, boneMaterial);
    body.position.y = 0.75;
    body.castShadow = true;
    skeleton.add(body);

    // Bow (simple representation)
    const bowGeometry = new THREE.BoxGeometry(0.1, 0.8, 0.1);
    const bowMaterial = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
    const bow = new THREE.Mesh(bowGeometry, bowMaterial);
    bow.position.set(0.3, 0.75, 0.2);
    bow.rotation.x = Math.PI / 4;
    skeleton.add(bow);

    // Arms and legs similar to zombie but thinner
    const limbGeometry = new THREE.BoxGeometry(0.2, 0.75, 0.2);
    const leftArm = new THREE.Mesh(limbGeometry, boneMaterial);
    leftArm.position.set(-0.3, 0.75, 0);
    leftArm.rotation.x = Math.PI / 6;
    skeleton.add(leftArm);
    
    const rightArm = new THREE.Mesh(limbGeometry, boneMaterial);
    rightArm.position.set(0.3, 0.75, 0);
    rightArm.rotation.x = -Math.PI / 6; // Bow-holding position
    skeleton.add(rightArm);

    const legGeometry = new THREE.BoxGeometry(0.2, 0.5, 0.2);
    const leftLeg = new THREE.Mesh(legGeometry, boneMaterial);
    leftLeg.position.set(-0.1, 0.25, 0);
    skeleton.add(leftLeg);
    const rightLeg = new THREE.Mesh(legGeometry, boneMaterial);
    rightLeg.position.set(0.1, 0.25, 0);
    skeleton.add(rightLeg);

    skeleton.position.set(position.x, 0, position.z);
    skeleton.mesh = skeleton;
    
    // Set enemy type for special behavior
    skeleton.enemyType = 'skeletonArcher';
    skeleton.lastShotTime = 0; // For tracking when the skeleton last shot an arrow
    
    // Set speed relative to baseSpeed (faster than standard zombie)
    skeleton.speed = baseSpeed * 1.1; // 110% of base speed
    
    // Set mass for physics calculations - archers are lighter
    skeleton.mass = 0.8;
    
    // Set default health
    skeleton.health = 100;
    
    /**
     * Updates the skeleton archer's position and behavior
     * @param {Object} context - The update context containing all necessary information
     */
    skeleton.update = (context) => {
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
            playerPosition.x - skeleton.position.x,
            0,
            playerPosition.z - skeleton.position.z
        );
        
        const distance = direction.length();
        const finalDirection = direction.clone().normalize();
        
        // Special archer behavior - run away when too close, stand still at medium range
        if (distance < 8) {
            finalDirection.negate(); // Run away when close
        } else if (distance > 15) {
            // Move toward player (normal behavior)
        } else {
            // Stand still and shoot
            // Shooting logic would go here - creating an arrow projectile, etc.
            const currentTime = Date.now();
            if (currentTime - skeleton.lastShotTime > 2000) { // Shoot every 2 seconds
                skeleton.lastShotTime = currentTime;
                // Fire arrow logic would go here
                // Example: createArrow(skeleton.position, playerPosition, gameState);
            }
            return; // Don't move while shooting
        }
        
        // Add slight randomness to movement
        const randomFactor = Math.min(0.1, distance * 0.005);
        const randomAngle = (Math.random() - 0.5) * Math.PI * randomFactor;
        finalDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), randomAngle);
        
        // Calculate intended position
        const moveDistance = skeleton.speed * delta * 60;
        const intendedPosition = new THREE.Vector3()
            .copy(skeleton.position)
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
                const thisSize = skeleton.mass || 1.0;
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
        skeleton.position.copy(intendedPosition);
        skeleton.rotation.y = Math.atan2(finalDirection.x, finalDirection.z);
    };
    
    return skeleton;
};
