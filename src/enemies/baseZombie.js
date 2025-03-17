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
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.132.2/build/three.module.js';

export const createbaseZombie = (position, baseSpeed) => {
/**
 * Creates a Minecraft-style low-poly zombie character
 * @param {Object} position - The initial position of the zombie
 * @param {number} baseSpeed - Base movement speed (zombie will move at exactly this speed)
 * @returns {THREE.Group} The zombie object
 */
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
    
    // Store mesh reference for updateZombies compatibility
    basezombie.mesh = basezombie;
    
    // Set enemy type for special behavior
    basezombie.enemyType = 'zombie';
    
    // Set speed to exactly baseSpeed (standard zombie is the baseline)
    basezombie.speed = baseSpeed;

    // Update method
    basezombie.update = (playerPosition, delta, nearbyZombies) => {
        const direction = new THREE.Vector3(
            playerPosition.x - basezombie.position.x,
            0,
            playerPosition.z - basezombie.position.z
        ).normalize();
        const moveDistance = basezombie.speed * delta * 60;
        basezombie.position.addScaledVector(direction, moveDistance);
        basezombie.rotation.y = Math.atan2(direction.x, direction.z);
    };

    return basezombie;
};