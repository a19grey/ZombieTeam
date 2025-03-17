/**
 * Exploder Module - Creates an explosive enemy that detonates near players
 * 
 * This module contains the function to create an exploder enemy inspired by Minecraft's
 * creeper. The exploder is a mid-level enemy that rushes toward the player and
 * explodes when in close proximity, dealing area damage. It has a distinctive
 * bright green blocky body with a frowning face.
 * 
 * Example usage:
 *   import { createExploder } from './enemies/exploder.js';
 *   
 *   // Create an exploder at position (15, 0, 10) with speed 0.05
 *   const exploder = createExploder({x: 15, z: 10}, 0.05);
 *   scene.add(exploder);
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.132.2/build/three.module.js';

export const createExploder = (position, baseSpeed ) => {
    const exploder = new THREE.Group();

    // Blocky head/body combo
    const bodyGeometry = new THREE.BoxGeometry(0.6, 1.2, 0.6);
    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: 0x00cc00, // Bright green
        roughness: 0.9
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.6;
    body.castShadow = true;
    exploder.add(body);

    // Face (black eyes and mouth)
    const featureGeometry = new THREE.BoxGeometry(0.15, 0.15, 0.1);
    const featureMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
    const leftEye = new THREE.Mesh(featureGeometry, featureMaterial);
    leftEye.position.set(-0.15, 0.9, 0.31);
    exploder.add(leftEye);
    const rightEye = new THREE.Mesh(featureGeometry, featureMaterial);
    rightEye.position.set(0.15, 0.9, 0.31);
    exploder.add(rightEye);
    const mouth = new THREE.Mesh(featureGeometry, featureMaterial);
    mouth.scale.set(1, 2, 1);
    mouth.position.set(0, 0.6, 0.31);
    exploder.add(mouth);

    // Stubby legs
    const legGeometry = new THREE.BoxGeometry(0.25, 0.4, 0.25);
    const leftLeg = new THREE.Mesh(legGeometry, bodyMaterial);
    leftLeg.position.set(-0.15, 0.2, 0);
    exploder.add(leftLeg);
    const rightLeg = new THREE.Mesh(legGeometry, bodyMaterial);
    rightLeg.position.set(0.15, 0.2, 0);
    exploder.add(rightLeg);

    exploder.position.set(position.x, 0, position.z);
    exploder.mesh = exploder;
    
    // Set enemy type for special behavior
    exploder.enemyType = 'exploder';
    exploder.isExploding = false;
    exploder.explosionTimer = 0;
    
    // Set speed relative to baseSpeed (slightly slower than standard zombie)
    exploder.speed = baseSpeed * 0.9; // 90% of base speed
    
    return exploder;
};
