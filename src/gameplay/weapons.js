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
const BULLET_COOLDOWN = 100; // milliseconds - reduced by 50% for faster firing

// Counter for tracer bullets (only show every 2nd bullet)
let bulletCounter = 0;

/**
 * Creates a bullet projectile
 * @param {THREE.Vector3} position - Starting position of the bullet
 * @param {THREE.Vector3} direction - Direction the bullet should travel
 * @param {number} damage - Amount of damage the bullet does
 * @param {number} speed - Speed of the bullet (default: 1.0)
 * @param {number} color - Color of the bullet (default: yellow)
 * @returns {Object} The bullet object or null for non-tracer bullets
 */
export const createBullet = (position, direction, damage = 25, speed = 1.0, color = 0xffff00) => {
    // Increment bullet counter
    bulletCounter = (bulletCounter + 1) % 2;
    
    // Only create visible bullet for every 2nd shot (tracer)
    const isTracer = bulletCounter === 0;
    
    // For non-tracer bullets, still create the bullet object but without visible mesh
    if (!isTracer) {
        return {
            mesh: null, // No visible mesh
            direction: direction.clone().normalize(),
            speed: speed,
            distance: 0,
            maxDistance: 50,
            damage: damage,
            position: position.clone(), // Need to clone position since we don't have a mesh
            toRemove: false,
            isTracer: false,
            userData: { damage: damage } // Ensure damage is in userData for consistency
        };
    }
    
    // Create elliptical bullet geometry (smaller than before)
    const bulletGeometry = new THREE.SphereGeometry(0.15, 8, 8);
    const bulletMaterial = new THREE.MeshBasicMaterial({ color: color });
    const bulletMesh = new THREE.Mesh(bulletGeometry, bulletMaterial);
    
    // Set initial position
    bulletMesh.position.copy(position);
    
    // Scale to make it elliptical in the direction of travel
    bulletMesh.scale.set(0.5, 0.5, 2.0); // Stretched in z-direction
    
    // Rotate to align with direction of travel
    const bulletDirection = direction.clone().normalize();
    if (bulletDirection.length() > 0) {
        // Create a rotation that aligns the bullet with its direction
        const rotationMatrix = new THREE.Matrix4();
        const up = new THREE.Vector3(0, 1, 0);
        const axis = new THREE.Vector3().crossVectors(up, bulletDirection).normalize();
        const angle = Math.acos(up.dot(bulletDirection));
        
        if (axis.length() > 0) {
            rotationMatrix.makeRotationAxis(axis, angle);
            bulletMesh.quaternion.setFromRotationMatrix(rotationMatrix);
        }
    }
    
    // Create bullet object with mesh and properties
    const bullet = {
        mesh: bulletMesh,
        direction: bulletDirection,
        speed: speed,
        distance: 0,
        maxDistance: 50,
        damage: damage,
        position: bulletMesh.position,
        toRemove: false,
        isTracer: true,
        userData: { damage: damage } // Ensure damage is in userData for consistency
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
        
        if (bullet.isTracer && bullet.mesh) {
            // Update mesh position for tracer bullets
            bullet.mesh.position.addScaledVector(bullet.direction, moveDistance);
        } else {
            // Update virtual position for non-tracer bullets
            bullet.position.addScaledVector(bullet.direction, moveDistance);
        }
        
        // Update distance traveled
        bullet.distance += moveDistance;
        
        // Mark for removal if it has traveled too far
        if (bullet.distance > bullet.maxDistance) {
            bullet.toRemove = true;
        }
    }
}; 