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
const BULLET_COOLDOWN = 150; // milliseconds - reduced for faster firing

/**
 * Creates a bullet projectile
 * @param {THREE.Vector3} position - Starting position of the bullet
 * @param {THREE.Vector3} direction - Direction the bullet should travel
 * @param {number} damage - Amount of damage the bullet does
 * @param {number} speed - Speed of the bullet (default: 1.0)
 * @param {number} color - Color of the bullet (default: yellow)
 * @returns {Object} The bullet object
 */
export const createBullet = (position, direction, damage = 25, speed = 1.0, color = 0xffff00) => {
    // Create bullet geometry
    const bulletGeometry = new THREE.SphereGeometry(0.2, 8, 8);
    const bulletMaterial = new THREE.MeshBasicMaterial({ color: color });
    const bulletMesh = new THREE.Mesh(bulletGeometry, bulletMaterial);
    
    // Set initial position
    bulletMesh.position.copy(position);
    
    // Create bullet object with mesh and properties
    const bullet = {
        mesh: bulletMesh,
        direction: direction.clone().normalize(),
        speed: speed,
        distance: 0,
        maxDistance: 50,
        damage: damage,
        position: bulletMesh.position,
        toRemove: false
    };
    
    return bullet;
};

/**
 * Updates the positions of all bullets and removes those that have traveled too far
 * @param {Array} bullets - Array of bullet objects
 * @param {number} delta - Time delta for frame-rate independent movement
 */
export const updateBullets = (bullets, delta = 1/60) => {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        if (!bullet || bullet.toRemove) continue;
        
        // Move bullet in its direction (scaled by delta for consistent speed)
        const moveDistance = bullet.speed * delta * 60;
        bullet.mesh.position.addScaledVector(bullet.direction, moveDistance);
        
        // Update distance traveled
        bullet.distance += moveDistance;
        
        // Mark for removal if it has traveled too far
        if (bullet.distance > bullet.maxDistance) {
            bullet.toRemove = true;
        }
    }
}; 