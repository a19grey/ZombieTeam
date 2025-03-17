/**
 * Zombie King Module - Creates a powerful zombie boss enemy
 * 
 * This module contains the function to create a Zombie King, a boss-level enemy
 * with enhanced abilities. The Zombie King is larger than normal zombies, wears
 * a golden crown, and has glowing purple eyes. It can summon minion zombies to
 * fight alongside it and grows stronger as the battle progresses.
 * 
 * Example usage:
 *   import { createZombieKing } from './enemies/zombieKing.js';
 *   
 *   // Create a Zombie King at position (25, 0, 25) with speed 0.05
 *   const king = createZombieKing({x: 25, z: 25}, 0.05);
 *   scene.add(king);
 */

/**
 * Creates a zombie king boss enemy
 * @param {Object} position - The initial position of the zombie king
 * @param {number} baseSpeed - Base movement speed
 * @returns {THREE.Group} The zombie king object
 */

// src/enemies/zombie.js
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.132.2/build/three.module.js';

export const createZombieKing = (position, baseSpeed) => {
    const king = new THREE.Group();

    // Larger head with crown
    const headGeometry = new THREE.BoxGeometry(0.7, 0.7, 0.7);
    const headMaterial = new THREE.MeshStandardMaterial({
        color: 0x2e8b57,
        roughness: 0.9
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 2.2;
    head.castShadow = true;
    king.add(head);

    // Crown
    const crownGeometry = new THREE.BoxGeometry(0.8, 0.2, 0.8);
    const crownMaterial = new THREE.MeshStandardMaterial({
        color: 0xffd700,
        metalness: 0.8
    });
    const crown = new THREE.Mesh(crownGeometry, crownMaterial);
    crown.position.y = 2.55;
    king.add(crown);

    // Glowing purple eyes
    const eyeGeometry = new THREE.BoxGeometry(0.15, 0.15, 0.15);
    const eyeMaterial = new THREE.MeshStandardMaterial({
        color: 0x800080,
        emissive: 0x800080,
        emissiveIntensity: 0.8
    });
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.2, 2.25, 0.36);
    king.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.2, 2.25, 0.36);
    king.add(rightEye);

    // Larger body
    const bodyGeometry = new THREE.BoxGeometry(0.8, 1.0, 0.4);
    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: 0x1a3c34,
        roughness: 0.9
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 1.0;
    body.castShadow = true;
    king.add(body);

    // Beefy arms
    const armGeometry = new THREE.BoxGeometry(0.4, 1.0, 0.4);
    const leftArm = new THREE.Mesh(armGeometry, headMaterial);
    leftArm.position.set(-0.6, 1.0, 0.2);
    leftArm.rotation.x = Math.PI / 4;
    king.add(leftArm);
    const rightArm = new THREE.Mesh(armGeometry, headMaterial);
    rightArm.position.set(0.6, 1.0, 0.2);
    rightArm.rotation.x = Math.PI / 4;
    king.add(rightArm);

    // Strong legs
    const legGeometry = new THREE.BoxGeometry(0.35, 0.7, 0.35);
    const leftLeg = new THREE.Mesh(legGeometry, bodyMaterial);
    leftLeg.position.set(-0.2, 0.35, 0);
    king.add(leftLeg);
    const rightLeg = new THREE.Mesh(legGeometry, bodyMaterial);
    rightLeg.position.set(0.2, 0.35, 0);
    king.add(rightLeg);

    king.position.set(position.x, 0, position.z);
    king.mesh = king;
    
    // Set enemy type for special behavior
    king.enemyType = 'zombieKing';
    king.summonCooldown = 0; // For tracking when the king can summon minions
    
    // Set initial speed relative to baseSpeed (slower than standard zombie, but will increase over time)
    king.speed = baseSpeed * 0.7; // 70% of base speed initially
    
    // Set mass for physics calculations - zombieKing is heavy
    king.mass = 2.0;
    
    return king;
};