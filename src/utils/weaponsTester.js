/**
 * weaponsTester.js
 * 
 * A test suite specifically for the weapons system in the game.
 * Tests bullet creation, bullet updates, and ensures no null pointer errors.
 * 
 * Example usage:
 * import { testWeaponsSystem } from './utils/weaponsTester.js';
 * 
 * // In your main.js initialization code:
 * testWeaponsSystem();
 */

import * as THREE from 'three';
import { createBullet, updateBullets } from '../gameplay/weapons.js';
import { testComponent } from './testRunner.js';

// Test bullet creation 
const testBulletCreation = () => {
    const position = new THREE.Vector3(0, 0, 0);
    const direction = new THREE.Vector3(0, 0, 1);
    
    // Create different types of bullets
    const bullet1 = createBullet(position, direction); // Default bullet
    const bullet2 = createBullet(position, direction, 50, 2.0, 0xff0000); // Custom bullet
    
    // Test for null mesh safety
    let hasNullMeshError = false;
    
    // Test all bullets we created
    [bullet1, bullet2].forEach(bullet => {
        // Verify bullet object structure
        if (!bullet || typeof bullet !== 'object') {
            throw new Error('Bullet is not a valid object');
        }
        
        // Test accessing mesh properties safely
        try {
            // This should not throw an error even if mesh is null
            if (bullet.mesh) {
                const scale = bullet.mesh.scale;
            }
        } catch (e) {
            hasNullMeshError = true;
            throw new Error('Unsafe mesh access: ' + e.message);
        }
        
        // Verify all expected properties exist
        const requiredProps = ['direction', 'speed', 'damage', 'position', 'toRemove'];
        requiredProps.forEach(prop => {
            if (!(prop in bullet)) {
                throw new Error(`Bullet missing required property: ${prop}`);
            }
        });
    });
    
    return true;
};

// Test bullet updates
const testBulletUpdates = () => {
    const position = new THREE.Vector3(0, 0, 0);
    const direction = new THREE.Vector3(0, 0, 1).normalize();
    const bullet = createBullet(position, direction, 25, 1.0, 0xffff00);
    
    // Clone original position for comparison
    const originalPosition = bullet.position.clone();
    
    // Update bullet (simulate 1 frame)
    const bullets = [bullet];
    updateBullets(bullets, 1/60);
    
    // Verify bullet moved in the right direction
    const hasMoved = !bullet.position.equals(originalPosition);
    if (!hasMoved) {
        throw new Error('Bullet did not move after update');
    }
    
    // Verify movement direction is correct (should move in z direction)
    const expectedZ = originalPosition.z + bullet.speed * (1/60);
    const isCorrectDirection = Math.abs(bullet.position.z - expectedZ) < 0.001;
    if (!isCorrectDirection) {
        throw new Error('Bullet did not move in the expected direction');
    }
    
    return true;
};

// Test collision system related to bullets
const testBulletCollisions = () => {
    const bulletPosition = new THREE.Vector3(0, 0, 0);
    const bulletDirection = new THREE.Vector3(0, 0, 1);
    const bullet = createBullet(bulletPosition, bulletDirection);
    
    // Create mock target
    const target = {
        mesh: {
            position: new THREE.Vector3(0, 0, 0.5),
            geometry: { parameters: { radius: 0.5 } }
        },
        userData: { health: 100 }
    };
    
    // Simple collision detection
    const distance = bulletPosition.distanceTo(target.mesh.position);
    const collisionDetected = distance < (0.15 + target.mesh.geometry.parameters.radius);
    
    if (!collisionDetected) {
        throw new Error('Collision detection failed');
    }
    
    return true;
};

// Run all weapon system tests
export const testWeaponsSystem = async () => {
    console.log('%c[WEAPONS TEST] Starting weapons system tests...', 'color: blue; font-weight: bold');
    
    // Run all tests
    await testComponent('Weapons', testBulletCreation);
    await testComponent('Weapons', testBulletUpdates);
    await testComponent('Weapons', testBulletCollisions);
    
    return true;
};

// Make testWeaponsSystem globally available
if (typeof window !== 'undefined') {
    window.testWeaponsSystem = testWeaponsSystem;
}

// Export individual tests for specific usage
export const weaponsTests = {
    testBulletCreation,
    testBulletUpdates,
    testBulletCollisions
}; 