/**
 * Necrofiend Module - Creates a tall boss enemy that can summon minions
 * 
 * This module contains the function to create a Necrofiend, a boss-level enemy
 * with minion-summoning abilities. The Necrofiend is an elongated, ghastly zombie
 * with a gaping maw and long limbs. It moves at a moderate pace, has substantial
 * health, and can periodically summon lesser zombies to fight for it.
 * 
 * Example usage:
 *   import { createNecrofiend } from './enemies/necrofiend.js';
 *   
 *   // Create a Necrofiend at position (25, 0, 25) with speed 0.05
 *   const necrofiend = createNecrofiend({x: 25, z: 25}, 0.05);
 *   scene.add(necrofiend);
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.132.2/build/three.module.js';

export const createNecrofiend = (position, baseSpeed) => {
    const necro = new THREE.Group();

    // Elongated body
    const bodyGeometry = new THREE.BoxGeometry(0.8, 4, 0.6);
    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: 0x483c32, // Dark grayish-brown
        roughness: 0.9
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 2;
    body.castShadow = true;
    necro.add(body);

    // Head with gaping maw
    const headGeometry = new THREE.BoxGeometry(0.6, 0.8, 0.6);
    const headMaterial = new THREE.MeshStandardMaterial({
        color: 0x2e8b57, // Greenish decay
        roughness: 0.9
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 5;
    head.castShadow = true;
    necro.add(head);
    const mouth = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.4, 0.1),
        new THREE.MeshStandardMaterial({ color: 0x000000 })
    );
    mouth.position.set(0, 4.8, 0.31);
    necro.add(mouth);

    // Claw-like arms
    const armGeometry = new THREE.BoxGeometry(0.3, 2, 0.3);
    const leftArm = new THREE.Mesh(armGeometry, bodyMaterial);
    leftArm.position.set(-0.6, 3, 0.2);
    leftArm.rotation.x = Math.PI / 3;
    leftArm.castShadow = true;
    necro.add(leftArm);
    const rightArm = new THREE.Mesh(armGeometry, bodyMaterial);
    rightArm.position.set(0.6, 3, 0.2);
    rightArm.rotation.x = Math.PI / 3;
    rightArm.castShadow = true;
    necro.add(rightArm);

    // Legs
    const legGeometry = new THREE.BoxGeometry(0.4, 2, 0.4);
    const leftLeg = new THREE.Mesh(legGeometry, bodyMaterial);
    leftLeg.position.set(-0.2, 1, 0);
    leftLeg.castShadow = true;
    necro.add(leftLeg);
    const rightLeg = new THREE.Mesh(legGeometry, bodyMaterial);
    rightLeg.position.set(0.2, 1, 0);
    rightLeg.castShadow = true;
    necro.add(rightLeg);

    necro.position.set(position.x, 0, position.z);
    necro.mesh = necro;
    necro.enemyType = 'necrofiend';
    
    // Set speed relative to baseSpeed (slightly faster than standard zombie)
    necro.speed = baseSpeed * 1.2; // 120% of base speed
    
    // Set mass for physics calculations - necrofiend is medium-weight
    necro.mass = 1.3;
    
    necro.health = 300; // Moderate health
    necro.spawnCooldown = 0; // For minion spawning

    return necro;
};

