/**
 * Zombie Module - Handles zombie creation and AI behavior
 * 
 * This module contains functions for creating zombies and updating their
 * positions to chase the player.
 * 
 * Example usage:
 * import { createZombie, updateZombies } from './gameplay/zombie.js';
 * const zombie = createZombie({ x: 10, z: 10 });
 * updateZombies(zombies, playerPosition);
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.132.2/build/three.module.js';
import { checkCollision, pushAway } from './physics.js'; // Import physics helpers

/**
 * Creates a zombie character
 * @param {Object} position - The initial position of the zombie
 * @returns {THREE.Group} The zombie object
 */
export const createZombie = (position) => {
    const zombie = new THREE.Group();
    
    // Zombie body
    const bodyGeometry = new THREE.CylinderGeometry(0.5, 0.5, 1.8, 32);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x2e8b57 }); // Green
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.9; // Half height
    body.castShadow = true;
    
    // Zombie head
    const headGeometry = new THREE.SphereGeometry(0.3, 32, 32);
    const headMaterial = new THREE.MeshStandardMaterial({ color: 0x2e8b57 }); // Green
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1.9; // Position on top of body
    head.castShadow = true;
    
    // Add body parts to zombie group
    zombie.add(body);
    zombie.add(head);
    
    // Set initial position
    zombie.position.set(position.x, 0, position.z);
    
    return zombie;
};

/**
 * Updates the positions of all zombies to chase the player
 * @param {Array} zombies - Array of zombie objects
 * @param {THREE.Vector3} playerPosition - The player's current position
 * @param {number} delta - Time delta between frames
 */
export const updateZombies = (zombies, playerPosition, delta = 1/60) => {
    // Safety check for undefined parameters
    if (!zombies || !playerPosition) {
        console.warn("Missing required parameters for updateZombies");
        return;
    }
    
    // Use the same collision distance as in physics.js
    const COLLISION_DISTANCE = 1.0; // Physical collision distance (reduced from 1.5)
    
    zombies.forEach(zombie => {
        // Safety check for zombie object
        if (!zombie || !zombie.mesh || !zombie.mesh.position) {
            return;
        }
        
        try {
            // Calculate direction to player
            const direction = new THREE.Vector3(
                playerPosition.x - zombie.mesh.position.x,
                0,
                playerPosition.z - zombie.mesh.position.z
            );
            
            // Normalize direction (avoid division by zero)
            const distance = direction.length();
            if (distance > 0) {
                direction.normalize();
                
                // Calculate intended movement
                const moveDistance = zombie.speed * delta * 60; // Normalize to 60 FPS
                const intendedPosition = new THREE.Vector3()
                    .copy(zombie.mesh.position)
                    .addScaledVector(direction, moveDistance);
                
                // Check collision with player before moving
                if (checkCollision(intendedPosition, playerPosition, COLLISION_DISTANCE)) {
                    // Stop at boundary
                    const newPosition = pushAway(intendedPosition, playerPosition, COLLISION_DISTANCE);
                    zombie.mesh.position.x = newPosition.x;
                    zombie.mesh.position.z = newPosition.z;
                } else {
                    // Move normally
                    zombie.mesh.position.copy(intendedPosition);
                }
                
                // Rotate zombie to face player
                zombie.mesh.rotation.y = Math.atan2(direction.x, direction.z);
            }
        } catch (error) {
            console.error("Error updating zombie:", error);
        }
    });
};

/**
 * Damages a zombie and checks if it's dead
 * @param {Object} zombie - The zombie object
 * @param {number} damage - Amount of damage to apply
 * @returns {Object} Updated zombie object
 */
export const damageZombie = (zombie, damage) => {
    // Safety check
    if (!zombie) return zombie;
    
    const updatedZombie = {
        ...zombie,
        health: zombie.health - damage
    };
    
    return updatedZombie;
};

/**
 * Checks if a zombie is dead
 * @param {Object} zombie - The zombie object
 * @returns {boolean} True if the zombie is dead
 */
export const isZombieDead = (zombie) => {
    // Safety check
    if (!zombie) return false;
    
    return zombie.health <= 0;
}; 