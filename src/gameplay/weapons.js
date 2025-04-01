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

import * as THREE from 'three';

// Track when the last bullet was fired to prevent too rapid firing
let lastBulletTime = 0;
const BULLET_COOLDOWN = 100; // milliseconds - reduced by 50% for faster firing

/**
 * Creates a bullet projectile
 * @param {THREE.Vector3} position - Starting position of the bullet
 * @param {THREE.Vector3} direction - Direction the bullet should travel
 * @param {number} damage - Amount of damage the bullet does
 * @param {number} speed - Speed of the bullet (default: 1.0)
 * @param {number} color - Color of the bullet (default: yellow)
 * @returns {Object} The bullet object
 */
export const createBullet = (position, direction, damage, speed, color = 0xffff00) => {
    // Ensure position and direction are valid objects
    if (!position || !direction) {
        console.error('Invalid position or direction provided to createBullet');
        // Return a dummy bullet that won't cause errors
        return {
            mesh: null,
            direction: new THREE.Vector3(0, 0, 1),
            speed: speed,
            distance: 0,
            maxDistance: 50,
            damage: damage,
            position: new THREE.Vector3(),
            previousPosition: new THREE.Vector3(), // Add previous position
            toRemove: true, // Mark for immediate removal
            userData: { damage: damage }
        };
    }
    
    // Clone position and direction to avoid accidental modification
    const positionClone = position.clone();
    const directionClone = direction.clone().normalize();
    
    try {
        // Create elliptical bullet geometry
        const bulletGeometry = new THREE.SphereGeometry(0.15, 8, 8);
        const bulletMaterial = new THREE.MeshBasicMaterial({ color: color });
        const bulletMesh = new THREE.Mesh(bulletGeometry, bulletMaterial);
        
        // Set initial position
        bulletMesh.position.copy(positionClone);
        
        // Scale to make it elliptical in the direction of travel
        bulletMesh.scale.set(0.5, 0.5, 2.0); // Stretched in z-direction
        
        // Rotate to align with direction of travel
        if (directionClone.length() > 0) {
            // Create a rotation that aligns the bullet with its direction
            const rotationMatrix = new THREE.Matrix4();
            const up = new THREE.Vector3(0, 1, 0);
            const axis = new THREE.Vector3().crossVectors(up, directionClone).normalize();
            const angle = Math.acos(up.dot(directionClone));
            
            if (axis.length() > 0) {
                rotationMatrix.makeRotationAxis(axis, angle);
                bulletMesh.quaternion.setFromRotationMatrix(rotationMatrix);
            }
        }
        
        // Store direction and other properties on the bullet object
        return {
            mesh: bulletMesh,
            direction: directionClone,
            speed: speed,
            distance: 0,
            maxDistance: 50, // How far the bullet can travel before being removed
            damage: damage,
            position: positionClone,
            previousPosition: positionClone.clone(), // Store previous position initially as the same
            toRemove: false,
            userData: { damage: damage }
        };
    } catch (error) {
        console.error('Error creating bullet mesh:', error);
        
        // Return a bullet with no mesh to avoid errors
        return {
            mesh: null,
            direction: directionClone,
            speed: speed,
            distance: 0,
            maxDistance: 50,
            damage: damage,
            position: positionClone,
            previousPosition: positionClone.clone(), // Add previous position
            toRemove: false,
            userData: { damage: damage }
        };
    }
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
        
        // Save current position as previous position before moving
        bullet.previousPosition.copy(bullet.position);
        
        // Move bullet in its direction (scaled by delta for consistent speed)
        const moveDistance = bullet.speed * delta * 60;
        
        // Update mesh position
        if (bullet.mesh) {
            bullet.mesh.position.addScaledVector(bullet.direction, moveDistance);
        }
        
        // Update virtual position
        bullet.position.addScaledVector(bullet.direction, moveDistance);
        
        // Update distance traveled
        bullet.distance += moveDistance;
        
        // Mark for removal if it has traveled too far
        if (bullet.distance > bullet.maxDistance) {
            bullet.toRemove = true;
        }
    }
}; 