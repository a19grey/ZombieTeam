/**
 * Zombie Module - Handles zombie creation and AI behavior
 * 
 * This module contains functions for creating Minecraft-style low-poly zombies and updating their
 * positions to chase the player.
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.132.2/build/three.module.js';
import { checkCollision, pushAway } from './physics.js'; // Import physics helpers

/**
 * Creates a Minecraft-style low-poly zombie character
 * @param {Object} position - The initial position of the zombie
 * @returns {THREE.Group} The zombie object
 */
export const createZombie = (position) => {
    const zombie = new THREE.Group();

    // Head (cube with "scary" offset eyes)
    const headGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const headMaterial = new THREE.MeshStandardMaterial({
        color: 0x2e8b57, // Green zombie skin
        roughness: 0.9
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1.5; // Top of zombie at y=2
    head.castShadow = true;
    zombie.add(head);

    // Eyes (small red blocks for a menacing look)
    const eyeGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    const eyeMaterial = new THREE.MeshStandardMaterial({
        color: 0xff0000, // Red glowing eyes
        emissive: 0xff0000,
        emissiveIntensity: 0.5
    });
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.15, 1.55, 0.25); // Front left of face
    zombie.add(leftEye);
    
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.15, 1.55, 0.25); // Front right of face
    zombie.add(rightEye);

    // Body (rectangular prism)
    const bodyGeometry = new THREE.BoxGeometry(0.5, 0.75, 0.25);
    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: 0x1a3c34, // Darker green torn shirt
        roughness: 0.9
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.75; // Center of body
    body.castShadow = true;
    zombie.add(body);

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
    zombie.add(leftArm);

    // Right Arm
    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(0.375, 0.75, 0.125); // Slightly forward
    rightArm.rotation.x = Math.PI / 6; // Forward tilt
    rightArm.castShadow = true;
    zombie.add(rightArm);

    // Left Leg
    const legGeometry = new THREE.BoxGeometry(0.25, 0.5, 0.25);
    const legMaterial = new THREE.MeshStandardMaterial({
        color: 0x1a3c34, // Dark green pants
        roughness: 0.9
    });
    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-0.125, 0.25, 0);
    leftLeg.castShadow = true;
    zombie.add(leftLeg);

    // Right Leg
    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(0.125, 0.25, 0);
    rightLeg.castShadow = true;
    zombie.add(rightLeg);

    // Set initial position
    zombie.position.set(position.x, 0, position.z);
    
    // Store mesh reference for updateZombies compatibility
    zombie.mesh = zombie;

    return zombie;
};

/**
 * Updates the positions of all zombies to chase the player (unchanged from original)
 * @param {Array} zombies - Array of zombie objects
 * @param {THREE.Vector3} playerPosition - The player's current position
 * @param {number} delta - Time delta between frames
 */
export const updateZombies = (zombies, playerPosition, delta = 1/60) => {
    if (!zombies || !playerPosition) {
        console.warn("Missing required parameters for updateZombies");
        return;
    }
    
    const COLLISION_DISTANCE = 1.0;
    const DAMAGE_DISTANCE = 1.2;
    const DAMAGE_PER_SECOND = 20;
    
    zombies.forEach(zombie => {
        if (!zombie || !zombie.mesh || !zombie.mesh.position) {
            return;
        }
        
        try {
            const direction = new THREE.Vector3(
                playerPosition.x - zombie.mesh.position.x,
                0,
                playerPosition.z - zombie.mesh.position.z
            );
            
            const distance = direction.length();
            if (distance > 0) {
                direction.normalize();
                
                const moveDistance = zombie.speed * delta * 60;
                const intendedPosition = new THREE.Vector3()
                    .copy(zombie.mesh.position)
                    .addScaledVector(direction, moveDistance);
                
                if (checkCollision(intendedPosition, playerPosition, COLLISION_DISTANCE)) {
                    const newPosition = pushAway(intendedPosition, playerPosition, COLLISION_DISTANCE);
                    zombie.mesh.position.x = newPosition.x;
                    zombie.mesh.position.z = newPosition.z;
                    
                    if (checkCollision(zombie.mesh.position, playerPosition, DAMAGE_DISTANCE)) {
                        const damageAmount = DAMAGE_PER_SECOND * delta;
                        if (zombie.gameState) {
                            damagePlayer(zombie.gameState, damageAmount);
                        }
                    }
                } else {
                    zombie.mesh.position.copy(intendedPosition);
                }
                
                zombie.mesh.rotation.y = Math.atan2(direction.x, direction.z);
            }
        } catch (error) {
            console.error("Error updating zombie:", error);
        }
    });
};

/**
 * Damages the player and handles related effects (unchanged from original)
 * @param {Object} gameState - The game state object containing player data
 * @param {number} damageAmount - Amount of damage to apply
 */
export const damagePlayer = (gameState, damageAmount) => {
    if (!gameState || !gameState.player) return;
    
    gameState.player.health -= damageAmount;
    
    if (gameState.player.health < 0) {
        gameState.player.health = 0;
    }
    
    if (gameState.player.health <= 0 && typeof gameState.handleGameOver === 'function') {
        gameState.handleGameOver();
    }
};

/**
 * Damages a zombie and checks if it's dead (unchanged from original)
 * @param {Object} zombie - The zombie object
 * @param {number} damage - Amount of damage to apply
 * @returns {Object} Updated zombie object
 */
export const damageZombie = (zombie, damage) => {
    if (!zombie) return zombie;
    
    const updatedZombie = {
        ...zombie,
        health: zombie.health - damage
    };
    
    return updatedZombie;
};

/**
 * Checks if a zombie is dead (unchanged from original)
 * @param {Object} zombie - The zombie object
 * @returns {boolean} True if the zombie is dead
 */
export const isZombieDead = (zombie) => {
    if (!zombie) return false;
    
    return zombie.health <= 0;
};