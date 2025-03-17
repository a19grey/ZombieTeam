/**
 * Skittercrab Module - Creates a small, fast-moving crab-like enemy
 * 
 * This module contains the function to create a Skittercrab, a unique enemy
 * that resembles a mutated crab zombie. The Skittercrab is much smaller than
 * other enemies but moves significantly faster. It has a dark gray carapace
 * with red spikes and pincers that can quickly overwhelm players if not
 * dealt with promptly.
 * 
 * Example usage:
 *   import { createSkittercrab } from './enemies/skittercrab.js';
 *   
 *   // Create a Skittercrab at position (15, 0, 15) with speed 0.05
 *   const crab = createSkittercrab({x: 15, z: 15}, 0.05);
 *   scene.add(crab);
 */

/**
 * Creates a Skittercrab - a small, fast crab-like zombie
 * @param {Object} position - The initial position of the skittercrab
 * @param {number} baseSpeed - Base movement speed
 * @returns {THREE.Group} The Skittercrab object
 */

// src/enemies/zombie.js
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.132.2/build/three.module.js';


export const createSkittercrab = (position, baseSpeed) => {
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

    crab.position.set(position.x, 0, position.z);
    crab.mesh = crab;
    crab.enemyType = 'skittercrab';
    
    // Set speed relative to baseSpeed (much faster than standard zombie)
    crab.speed = baseSpeed * 1.6; // 160% of base speed
    
    crab.health = 50; // Low health

    return crab;
};

