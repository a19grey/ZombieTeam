/**
 * Rot Behemoth Module - Creates a bloated boss enemy that fires toxic projectiles
 * 
 * This module contains the function to create a Rot Behemoth, a large boss-level
 * enemy with ranged attack capabilities. The Rot Behemoth is a massive, bloated
 * zombie with multiple heads and a sickly green appearance. It moves slowly but
 * has high health and can fire toxic projectiles at players from a distance.
 * 
 * Example usage:
 *   import { createRotBehemoth } from './enemies/rotBehemoth.js';
 *   
 *   // Create a Rot Behemoth at position (25, 0, 30) with speed 0.05
 *   const behemoth = createRotBehemoth({x: 25, z: 30}, 0.05);
 *   scene.add(behemoth);
 */

// src/enemies/zombie.js
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.132.2/build/three.module.js';

export const createRotBehemoth = (position, baseSpeed) => {
    const behemoth = new THREE.Group();

    // Bloated body
    const bodyGeometry = new THREE.BoxGeometry(2, 4, 2);
    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: 0x556b2f, // Olive green rot
        roughness: 0.9
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 2;
    body.castShadow = true;
    behemoth.add(body);

    // Multiple heads
    const headGeometry = new THREE.BoxGeometry(0.7, 0.7, 0.7);
    const head1 = new THREE.Mesh(headGeometry, bodyMaterial);
    head1.position.set(-0.5, 5, 0);
    head1.castShadow = true;
    behemoth.add(head1);
    const head2 = new THREE.Mesh(headGeometry, bodyMaterial);
    head2.position.set(0.5, 5, 0);
    head2.castShadow = true;
    behemoth.add(head2);

    // Tentacle arms
    const tentacleGeometry = new THREE.BoxGeometry(0.4, 3, 0.4);
    const leftTentacle = new THREE.Mesh(tentacleGeometry, bodyMaterial);
    leftTentacle.position.set(-1.2, 3, 0.3);
    leftTentacle.rotation.x = Math.PI / 4;
    leftTentacle.castShadow = true;
    behemoth.add(leftTentacle);
    const rightTentacle = new THREE.Mesh(tentacleGeometry, bodyMaterial);
    rightTentacle.position.set(1.2, 3, 0.3);
    rightTentacle.rotation.x = Math.PI / 4;
    rightTentacle.castShadow = true;
    behemoth.add(rightTentacle);

    // Legs
    const legGeometry = new THREE.BoxGeometry(0.8, 4, 0.8);
    const leftLeg = new THREE.Mesh(legGeometry, bodyMaterial);
    leftLeg.position.set(-0.6, 2, 0);
    leftLeg.castShadow = true;
    behemoth.add(leftLeg);
    const rightLeg = new THREE.Mesh(legGeometry, bodyMaterial);
    rightLeg.position.set(0.6, 2, 0);
    rightLeg.castShadow = true;
    behemoth.add(rightLeg);

    behemoth.position.set(position.x, 0, position.z);
    behemoth.mesh = behemoth;
    behemoth.enemyType = 'rotBehemoth';
    
    // Set speed relative to baseSpeed (much slower than standard zombie due to size)
    behemoth.speed = baseSpeed * 0.4; // 40% of base speed
    
    // Set mass for physics calculations - behemoth is extremely heavy
    behemoth.mass = 3.0;
    
    behemoth.health = 400; // High health
    behemoth.shootCooldown = 0; // For projectile timing

    return behemoth;
};
