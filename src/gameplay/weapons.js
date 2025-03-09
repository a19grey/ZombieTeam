/**
 * Weapons Module - Handles bullet creation and movement
 * 
 * This module contains functions for creating bullets and updating their
 * positions as they travel through the scene.
 * 
 * Example usage:
 * import { createBullet, updateBullets } from './gameplay/weapons.js';
 * const bullet = createBullet(playerPosition, playerRotation);
 * updateBullets(bullets, scene);
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.132.2/build/three.module.js';

// Track when the last bullet was fired to prevent too rapid firing
let lastBulletTime = 0;
const BULLET_COOLDOWN = 250; // milliseconds

/**
 * Creates a bullet projectile
 * @param {THREE.Vector3} position - Starting position of the bullet
 * @param {THREE.Euler} rotation - Rotation of the shooter
 * @returns {Object} The bullet object or null if on cooldown
 */
export const createBullet = (position, rotation) => {
    const currentTime = Date.now();
    
    // Check if enough time has passed since the last bullet (cooldown)
    if (currentTime - lastBulletTime < BULLET_COOLDOWN) {
        return null;
    }
    
    lastBulletTime = currentTime;
    
    // Create bullet geometry
    const bulletGeometry = new THREE.SphereGeometry(0.2, 8, 8);
    const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
    
    // Get direction based on player rotation
    const direction = new THREE.Vector3(0, 0, 1).applyEuler(rotation);
    
    // Set initial position (slightly in front of the player)
    bullet.position.set(
        position.x + direction.x * 1.0,
        position.y + 0.5, // Bullet height
        position.z + direction.z * 1.0
    );
    
    // Store direction and other properties
    bullet.userData = {
        direction: direction,
        speed: 1.0, // Increased speed
        distance: 0,
        maxDistance: 50,
        damage: 25
    };
    
    // Log bullet creation for debugging
    console.log("Bullet created at", bullet.position);
    
    return bullet;
};

/**
 * Updates the positions of all bullets and removes those that have traveled too far
 * @param {Array} bullets - Array of bullet objects
 * @param {THREE.Scene} scene - The scene to remove bullets from
 */
export const updateBullets = (bullets, scene) => {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        if (!bullet || !bullet.userData) continue;
        
        // Move bullet in its direction
        bullet.position.x += bullet.userData.direction.x * bullet.userData.speed;
        bullet.position.z += bullet.userData.direction.z * bullet.userData.speed;
        
        // Update distance traveled
        bullet.userData.distance += bullet.userData.speed;
        
        // Remove bullet if it has traveled too far
        if (bullet.userData.distance > bullet.userData.maxDistance) {
            scene.remove(bullet);
            bullets.splice(i, 1);
        }
    }
}; 