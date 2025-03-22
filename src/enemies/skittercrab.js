/**
 * Skittercrab Module - Creates a fast, agile zombie variant
 * 
 * This module contains the function to create a Skittercrab, a unique enemy type
 * that moves very quickly but has low health. The Skittercrab is a small, hunched
 * zombie with crab-like features that can rapidly close the distance to players
 * and attack with quick strikes.
 * 
 * Example usage:
 *   import { createSkittercrab } from './enemies/skittercrab.js';
 *   
 *   // Create a Skittercrab at position (15, 0, 20) with speed 0.05
 *   const crab = createSkittercrab({x: 15, z: 20}, 0.05);
 *   scene.add(crab);
 */

/**
 * Creates a Skittercrab - a small, fast crab-like zombie
 * @param {Object} position - The initial position of the skittercrab
 * @param {number} baseSpeed - Base movement speed
 * @returns {THREE.Group} The Skittercrab object
 */

// src/enemies/zombie.js
import * as THREE from 'three';
import { logger } from '../utils/logger.js';

// Add 'enemy' to logger sections if not already included
logger.addSection('enemy');

export const createSkittercrab = (position, baseSpeed) => {
    // Configuration parameters
    const scale = new THREE.Vector3(1.0, 1.0, 1.0); // Scale vector for easy adjustment
    
    const crab = new THREE.Group();

    // Low, wide body
    const bodyGeometry = new THREE.BoxGeometry(1, 0.5, 0.8);
    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: 0x696969, // Dark gray carapace
        roughness: 0.9
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.25;
    body.castShadow = true;
    crab.add(body);

    // Spiky shell
    const spikeGeometry = new THREE.BoxGeometry(0.2, 0.4, 0.2);
    const spikeMaterial = new THREE.MeshStandardMaterial({
        color: 0x8b0000, // Dark red spikes
        roughness: 0.9
    });
    const spike1 = new THREE.Mesh(spikeGeometry, spikeMaterial);
    spike1.position.set(0, 0.65, 0);
    crab.add(spike1);
    const spike2 = new THREE.Mesh(spikeGeometry, spikeMaterial);
    spike2.position.set(0.3, 0.55, 0);
    crab.add(spike2);

    // Pincer legs
    const pincerGeometry = new THREE.BoxGeometry(0.3, 0.3, 0.6);
    const leftPincer = new THREE.Mesh(pincerGeometry, bodyMaterial);
    leftPincer.position.set(-0.65, 0.15, 0.2);
    leftPincer.rotation.z = Math.PI / 4;
    leftPincer.castShadow = true;
    crab.add(leftPincer);
    const rightPincer = new THREE.Mesh(pincerGeometry, bodyMaterial);
    rightPincer.position.set(0.65, 0.15, 0.2);
    rightPincer.rotation.z = -Math.PI / 4;
    rightPincer.castShadow = true;
    crab.add(rightPincer);

    // Back legs
    const legGeometry = new THREE.BoxGeometry(0.2, 0.3, 0.4);
    const leftLeg = new THREE.Mesh(legGeometry, bodyMaterial);
    leftLeg.position.set(-0.4, 0.15, -0.2);
    leftLeg.castShadow = true;
    crab.add(leftLeg);
    const rightLeg = new THREE.Mesh(legGeometry, bodyMaterial);
    rightLeg.position.set(0.4, 0.15, -0.2);
    rightLeg.castShadow = true;
    crab.add(rightLeg);

    // Position the skittercrab
    crab.position.set(position.x, 0, position.z);

    // Log the creation
    logger.info('enemy', `Creating skittercrab at ${position.x.toFixed(2)},${position.z.toFixed(2)}`);

    // Set properties
    crab.mesh = crab;
    crab.enemyType = 'skittercrab';
    crab.health = 50; // Low health
    crab.speed = baseSpeed * 2.0; // Very fast
    crab.mass = 0.5; // Very light
    crab.lastDashTime = 0;
    crab.dashCooldown = 3000; // 3 seconds between dashes
    
    // Scale the skittercrab according to scale parameter
    crab.scale.copy(scale);

    // Update method
    crab.update = (context) => {
        logger.verbose('enemy', `Skittercrab update at ${crab.position.x.toFixed(2)},${crab.position.z.toFixed(2)}`);
        
        const { playerPosition, delta } = context;
        
        // Special dash ability
        const now = Date.now();
        if (now - crab.lastDashTime > crab.dashCooldown) {
            // Calculate distance to player
            const distanceToPlayer = new THREE.Vector3(
                playerPosition.x - crab.position.x,
                0,
                playerPosition.z - crab.position.z
            ).length();
            
            // Dash when at medium range
            if (distanceToPlayer > 5 && distanceToPlayer < 10) {
                logger.info('enemy', `Skittercrab performing dash attack toward player`);
                crab.lastDashTime = now;
                // Dash logic - move quickly toward player
                // ...
            }
        }
        
        // Regular movement is already fast
        // ...
    };
    
    return crab;
};

