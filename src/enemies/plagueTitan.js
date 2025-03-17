/**
 * Plague Titan Module - Creates a massive boss enemy that uses ground slams
 * 
 * This module contains the function to create a Plague Titan, a colossal boss-level
 * enemy with devastating abilities. The Plague Titan is a hulking zombie with festering
 * sores and massive limbs. It moves slowly but has high health and can perform
 * ground slam attacks that damage players in a wide area.
 * 
 * Example usage:
 *   import { createPlagueTitan } from './enemies/plagueTitan.js';
 *   
 *   // Create a Plague Titan at position (30, 0, 30) with speed 0.05
 *   const titan = createPlagueTitan({x: 30, z: 30}, 0.05);
 *   scene.add(titan);
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.132.2/build/three.module.js';
export const createPlagueTitan = (position, baseSpeed) => {
    const titan = new THREE.Group();

    // Massive body
    const bodyGeometry = new THREE.BoxGeometry(2, 6, 1.5);
    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: 0x3c2f2f, // Dark reddish-brown, festering flesh
        roughness: 0.9
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 3;
    body.castShadow = true;
    titan.add(body);

    // Head with oozing sores
    const headGeometry = new THREE.BoxGeometry(1, 1, 1);
    const headMaterial = new THREE.MeshStandardMaterial({
        color: 0x2e8b57, // Greenish decay
        roughness: 0.9
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 7;
    head.castShadow = true;
    titan.add(head);

    // Glowing sores (emissive)
    const soreGeometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
    const soreMaterial = new THREE.MeshStandardMaterial({
        color: 0xffff00, // Yellow pus
        emissive: 0xffff00,
        emissiveIntensity: 0.5
    });
    const sore1 = new THREE.Mesh(soreGeometry, soreMaterial);
    sore1.position.set(0.8, 4, 0.8);
    titan.add(sore1);
    const sore2 = new THREE.Mesh(soreGeometry, soreMaterial);
    sore2.position.set(-0.8, 2, 0.8);
    titan.add(sore2);

    // Club-like arms
    const armGeometry = new THREE.BoxGeometry(1, 3, 1);
    const leftArm = new THREE.Mesh(armGeometry, bodyMaterial);
    leftArm.position.set(-1.5, 4, 0);
    leftArm.rotation.x = Math.PI / 4;
    leftArm.castShadow = true;
    titan.add(leftArm);
    const rightArm = new THREE.Mesh(armGeometry, bodyMaterial);
    rightArm.position.set(1.5, 4, 0);
    rightArm.rotation.x = Math.PI / 4;
    rightArm.castShadow = true;
    titan.add(rightArm);

    // Legs
    const legGeometry = new THREE.BoxGeometry(0.8, 4, 0.8);
    const leftLeg = new THREE.Mesh(legGeometry, bodyMaterial);
    leftLeg.position.set(-0.6, 2, 0);
    leftLeg.castShadow = true;
    titan.add(leftLeg);
    const rightLeg = new THREE.Mesh(legGeometry, bodyMaterial);
    rightLeg.position.set(0.6, 2, 0);
    rightLeg.castShadow = true;
    titan.add(rightLeg);

    titan.position.set(position.x, 0, position.z);
    titan.mesh = titan;
    titan.enemyType = 'plagueTitan';
    
    // Set speed relative to baseSpeed (much slower than standard zombie)
    titan.speed = baseSpeed * 0.3; // 30% of base speed
    
    titan.health = 500; // High health
    titan.slamCooldown = 0; // For ground slam timing

    return titan;
};

