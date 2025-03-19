/**
 * Plague Titan Module - Creates a poison-based boss enemy
 * 
 * This module contains the function to create a Plague Titan, a boss-level enemy
 * that can poison players in its vicinity. The Plague Titan is a massive, bloated
 * zombie with a sickly green aura that deals damage over time to players who get
 * too close to it.
 * 
 * Example usage:
 *   import { createPlagueTitan } from './enemies/plagueTitan.js';
 *   
 *   // Create a Plague Titan at position (25, 0, 25) with speed 0.05
 *   const titan = createPlagueTitan({x: 25, z: 25}, 0.05);
 *   scene.add(titan);
 */

import * as THREE from 'three';
import { logger } from '../utils/logger.js';

// Add 'enemy' to logger sections if not already included
logger.addSection('enemy');

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

    // Position the titan
    titan.position.set(position.x, 0, position.z);

    // Log the creation
    logger.info('enemy', `Creating plague titan at ${position.x.toFixed(2)},${position.z.toFixed(2)}`);

    // Set properties
    titan.mesh = titan;
    titan.enemyType = 'plagueTitan';
    titan.health = 500; // Very high health
    titan.speed = baseSpeed * 0.5; // Much slower than standard zombies
    titan.mass = 4.0; // Very heavy
    titan.poisonRadius = 5.0; // Radius of poison effect
    titan.poisonDamage = 10; // Damage per second from poison

    // Update method
    titan.update = (context) => {
        logger.verbose('enemy', `Plague titan update at ${titan.position.x.toFixed(2)},${titan.position.z.toFixed(2)}`);
        
        // Standard movement behavior
        // ...
        
        // Poison effect
        const { playerPosition, delta, damagePlayer, gameState } = context;
        const distanceToPlayer = new THREE.Vector3(
            playerPosition.x - titan.position.x,
            0,
            playerPosition.z - titan.position.z
        ).length();
        
        if (distanceToPlayer < titan.poisonRadius) {
            const poisonAmount = titan.poisonDamage * delta;
            if (gameState) {
                logger.info('enemy', `Plague titan poisoning player for ${poisonAmount.toFixed(2)} damage`);
                damagePlayer(gameState, poisonAmount);
            }
        }
    };
    
    return titan;
};

