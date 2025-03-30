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
    // Configuration parameters
    const scale = new THREE.Vector3(1.0, 1.0, 1.0); // Increased scale for more imposing presence
    
    const titan = new THREE.Group();

    // Create base humanoid structure
    const bodyGroup = new THREE.Group();
    titan.add(bodyGroup);

    // Torso - deformed and asymmetrical
    const torsoGeometry = new THREE.SphereGeometry(1.5, 16, 16);
    const torsoMaterial = new THREE.MeshStandardMaterial({
        color: 0x3c2f2f, // Dark reddish-brown
        roughness: 0.9,
        metalness: 0.2,
        bumpScale: 0.5
    });
    const torso = new THREE.Mesh(torsoGeometry, torsoMaterial);
    torso.position.y = 3.5;
    torso.scale.set(1.2, 1.5, 1.0); // Asymmetrical scaling
    torso.castShadow = true;
    bodyGroup.add(torso);

    // Secondary torso growth - asymmetrical bulbous growth
    const growth1Geometry = new THREE.SphereGeometry(1.2, 16, 16);
    const growthMaterial = new THREE.MeshStandardMaterial({
        color: 0x2e8b57, // Greenish decay
        roughness: 0.7,
        metalness: 0.1,
        transparent: true,
        opacity: 0.9
    });
    const growth1 = new THREE.Mesh(growth1Geometry, growthMaterial);
    growth1.position.set(-0.8, 3.8, 0.5);
    growth1.scale.set(1.1, 0.8, 0.9);
    growth1.castShadow = true;
    bodyGroup.add(growth1);

    // Third bulbous growth
    const growth2Geometry = new THREE.SphereGeometry(0.9, 16, 16);
    const growth2 = new THREE.Mesh(growth2Geometry, growthMaterial);
    growth2.position.set(0.7, 4.2, -0.4);
    growth2.scale.set(0.9, 1.1, 0.8);
    growth2.castShadow = true;
    bodyGroup.add(growth2);

    // Deformed head with multiple features
    const headGeometry = new THREE.SphereGeometry(1, 16, 16);
    const headMaterial = new THREE.MeshStandardMaterial({
        color: 0x2e6b47, // Darker greenish decay
        roughness: 0.8,
        metalness: 0.2
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 6.5;
    head.scale.set(1.2, 1.3, 1.1);
    head.castShadow = true;
    bodyGroup.add(head);

    // Second deformed head-like growth (conjoined twin effect)
    const head2Geometry = new THREE.SphereGeometry(0.7, 16, 16);
    const head2 = new THREE.Mesh(head2Geometry, headMaterial);
    head2.position.set(-0.6, 6.3, 0.4);
    head2.scale.set(0.8, 0.7, 0.6);
    head2.castShadow = true;
    bodyGroup.add(head2);

    // Eyes - glowing and ominous
    const eyeGeometry = new THREE.SphereGeometry(0.3, 8, 8); // Increased size
    const eyeMaterial = new THREE.MeshStandardMaterial({
        color: 0x00ff00, // Bright green color
        emissive: 0x00ff00, // Bright green emissive
        emissiveIntensity: 1.0
    });
    
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.3, 6.7, 0.8);
    bodyGroup.add(leftEye);
    
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.3, 6.7, 0.8);
    bodyGroup.add(rightEye);
    
    // Smaller eyes on second head
    const smallEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    smallEye.position.set(-0.7, 6.4, 0.9);
    smallEye.scale.set(0.7, 0.7, 0.7);
    bodyGroup.add(smallEye);

    // Mouth - misshapen and gaping
    const jawGeometry = new THREE.BoxGeometry(0.8, 0.4, 0.5);
    const jawMaterial = new THREE.MeshStandardMaterial({
        color: 0x330000,
        roughness: 1.0,
        metalness: 0.0
    });
    const jaw = new THREE.Mesh(jawGeometry, jawMaterial);
    jaw.position.set(0, 6.1, 0.7);
    bodyGroup.add(jaw);

    // Teeth - jagged and deformed
    const teethGeometry = new THREE.ConeGeometry(0.08, 0.2, 3);
    const teethMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffcc,
        roughness: 0.5
    });
    
    for (let i = 0; i < 6; i++) {
        const tooth = new THREE.Mesh(teethGeometry, teethMaterial);
        const position = [-0.3 + i * 0.12, 6.0 + (Math.random() * 0.1), 0.7 + (Math.random() * 0.1)];
        tooth.position.set(...position);
        tooth.rotation.set(Math.random() * 0.5, Math.random() * 0.5, Math.random() * 0.5);
        bodyGroup.add(tooth);
    }

    // Glowing sores and boils all over body
    const soreGeometry = new THREE.SphereGeometry(0.2, 8, 8);
    const soreMaterial = new THREE.MeshStandardMaterial({
        color: 0xffff00, // Yellow pus
        emissive: 0xffff00,
        emissiveIntensity: 0.8,
        transparent: true,
        opacity: 0.9
    });
    
    // Add multiple sores across the body
    const sorePositions = [
        [0.8, 4.5, 0.8],
        [-0.8, 2.8, 0.8],
        [0.6, 3.6, -0.7],
        [-0.6, 5.2, -0.5],
        [1.0, 5.0, 0.4],
        [-0.3, 4.2, 0.9],
        [0.4, 3.0, -0.3],
        [-1.1, 3.5, 0.2]
    ];
    
    const sores = [];
    for (const pos of sorePositions) {
        const sore = new THREE.Mesh(soreGeometry, soreMaterial);
        sore.position.set(...pos);
        const randomScale = 0.7 + Math.random() * 0.6;
        sore.scale.set(randomScale, randomScale, randomScale);
        bodyGroup.add(sore);
        sores.push(sore);
    }

    // Arms - asymmetrical and mutated
    // Left arm - massive and club-like
    const leftArmGeometry = new THREE.CylinderGeometry(0.6, 0.9, 3.5, 8);
    const armMaterial = new THREE.MeshStandardMaterial({
        color: 0x3c2f2f,
        roughness: 0.9,
        metalness: 0.1
    });
    const leftArm = new THREE.Mesh(leftArmGeometry, armMaterial);
    leftArm.position.set(-1.8, 4, 0);
    leftArm.rotation.set(Math.PI / 3, 0, Math.PI / 12);
    leftArm.castShadow = true;
    bodyGroup.add(leftArm);
    
    // Left hand - mutated claw
    const leftHandGeometry = new THREE.BoxGeometry(1.2, 0.8, 1.2);
    const leftHand = new THREE.Mesh(leftHandGeometry, headMaterial);
    leftHand.position.set(-2.8, 2.5, 0.8);
    leftHand.rotation.set(Math.PI / 6, Math.PI / 8, 0);
    leftHand.castShadow = true;
    bodyGroup.add(leftHand);
    
    // Left hand claws
    const clawGeometry = new THREE.ConeGeometry(0.15, 0.6, 4);
    const clawMaterial = new THREE.MeshStandardMaterial({
        color: 0x222222,
        roughness: 0.7,
        metalness: 0.3
    });
    
    for (let i = 0; i < 3; i++) {
        const claw = new THREE.Mesh(clawGeometry, clawMaterial);
        claw.position.set(-3.0 - (i * 0.2), 2.3 - (i * 0.15), 1.0 + (i * 0.1));
        claw.rotation.set(Math.PI / 2, 0, Math.PI / 4);
        bodyGroup.add(claw);
    }
    
    // Right arm - elongated and tentacle-like
    const rightArmGeometry = new THREE.CylinderGeometry(0.3, 0.5, 4.5, 8);
    const rightArm = new THREE.Mesh(rightArmGeometry, growthMaterial);
    rightArm.position.set(1.8, 4.2, 0);
    rightArm.rotation.set(Math.PI / 4, 0, -Math.PI / 6);
    rightArm.castShadow = true;
    bodyGroup.add(rightArm);
    
    // Right arm additional segment
    const rightForearmGeometry = new THREE.CylinderGeometry(0.25, 0.3, 3, 8);
    const rightForearm = new THREE.Mesh(rightForearmGeometry, growthMaterial);
    rightForearm.position.set(2.6, 2.5, 1.0);
    rightForearm.rotation.set(Math.PI / 3, Math.PI / 10, -Math.PI / 8);
    rightForearm.castShadow = true;
    bodyGroup.add(rightForearm);
    
    // Tentacle-like fingers on right hand
    const tentacleGeometry = new THREE.CylinderGeometry(0.1, 0.05, 1.5, 6);
    
    for (let i = 0; i < 5; i++) {
        const tentacle = new THREE.Mesh(tentacleGeometry, growthMaterial);
        const angle = (i / 5) * Math.PI;
        tentacle.position.set(
            3.0 + Math.cos(angle) * 0.3,
            1.5 - (i % 2) * 0.2,
            1.5 + Math.sin(angle) * 0.3
        );
        tentacle.rotation.set(Math.PI / 2 + (Math.random() - 0.5) * 0.4, 0, angle);
        bodyGroup.add(tentacle);
    }

    // Legs - thick and powerful
    const leftLegGeometry = new THREE.CylinderGeometry(0.5, 0.4, 3, 8);
    const legMaterial = new THREE.MeshStandardMaterial({
        color: 0x2a1f1f,
        roughness: 0.8
    });
    const leftLeg = new THREE.Mesh(leftLegGeometry, legMaterial);
    leftLeg.position.set(-0.8, 1.5, 0);
    leftLeg.castShadow = true;
    bodyGroup.add(leftLeg);
    
    // Left foot
    const leftFootGeometry = new THREE.BoxGeometry(0.7, 0.4, 1.1);
    const leftFoot = new THREE.Mesh(leftFootGeometry, legMaterial);
    leftFoot.position.set(-0.8, 0.2, 0.3);
    leftFoot.castShadow = true;
    bodyGroup.add(leftFoot);
    
    const rightLegGeometry = new THREE.CylinderGeometry(0.5, 0.4, 3, 8);
    const rightLeg = new THREE.Mesh(rightLegGeometry, legMaterial);
    rightLeg.position.set(0.8, 1.5, 0);
    rightLeg.castShadow = true;
    bodyGroup.add(rightLeg);
    
    // Right foot
    const rightFootGeometry = new THREE.BoxGeometry(0.7, 0.4, 1.1);
    const rightFoot = new THREE.Mesh(rightFootGeometry, legMaterial);
    rightFoot.position.set(0.8, 0.2, 0.3);
    rightFoot.castShadow = true;
    bodyGroup.add(rightFoot);

    // Toxic aura effect - particle-like geometries in a cloud
    const auraGroup = new THREE.Group();
    const auraParticleGeometry = new THREE.SphereGeometry(0.15, 4, 4);
    const auraMaterial = new THREE.MeshStandardMaterial({
        color: 0x00ff00,
        emissive: 0x00ff00,
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0.4
    });
    
    // Create multiple aura particles
    for (let i = 0; i < 40; i++) {
        const particle = new THREE.Mesh(auraParticleGeometry, auraMaterial);
        const radius = 2 + Math.random() * 3;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        
        particle.position.set(
            radius * Math.sin(phi) * Math.cos(theta),
            2 + Math.random() * 5,
            radius * Math.sin(phi) * Math.sin(theta)
        );
        
        const particleScale = 0.5 + Math.random() * 1.5;
        particle.scale.set(particleScale, particleScale, particleScale);
        auraGroup.add(particle);
    }
    
    titan.add(auraGroup);

    // Position the titan
    titan.position.set(position.x, 0, position.z);

    // Log the creation
    logger.info('enemyspawner', `Creating plague titan at ${position.x.toFixed(2)},${position.z.toFixed(2)}`);

    // Set properties
    titan.mesh = titan;
    titan.enemyType = 'plagueTitan';
    titan.health = 1000; // Increased health for a truly challenging boss
    titan.points = titan.health/10; // Base points for regular zombie
    titan.speed = baseSpeed * 0.95; // Much slower than standard zombies
    titan.mass = 6.0; // Very heavy
    titan.poisonRadius = 8.0; // Increased radius of poison effect
    titan.poisonDamage = 15; // Increased damage per second from poison
    
    // Scale the plague titan according to scale parameter
    titan.scale.copy(scale);

    // Animation properties
    titan.animationTime = 0;
    
    // Animations and special effects
    const updateAnimations = (delta) => {
        // Update animation time
        titan.animationTime += delta;
        
        // Pulsating body effect
        const pulseScale = 1.0 + Math.sin(titan.animationTime * 2) * 0.05;
        torso.scale.set(1.2 * pulseScale, 1.5 * pulseScale, 1.0 * pulseScale);
        
        // Breathing effect on growths
        const breatheScale = 1.0 + Math.sin(titan.animationTime * 3) * 0.08;
        growth1.scale.set(1.1 * breatheScale, 0.8 * breatheScale, 0.9 * breatheScale);
        growth2.scale.set(0.9 * breatheScale, 1.1 * breatheScale, 0.8 * breatheScale);
        
        // Eyes pulsating
        const eyePulse = 1.0 + Math.sin(titan.animationTime * 5) * 0.2;
        eyeMaterial.emissiveIntensity = eyePulse;
        
        // Sores pulsating
        sores.forEach((sore, i) => {
            const soreScale = 1.0 + Math.sin(titan.animationTime * 4 + i) * 0.15;
            soreMaterial.emissiveIntensity = 0.8 + Math.sin(titan.animationTime * 3) * 0.2;
            sore.scale.set(soreScale, soreScale, soreScale);
        });
        
        // Toxic aura movement
        auraGroup.children.forEach((particle, i) => {
            // Orbit around the titan
            const orbitSpeed = 0.2 + (i % 5) * 0.05;
            const orbitRadius = 2 + (i % 3);
            const heightPhase = titan.animationTime * 0.5 + (i * 0.1);
            
            particle.position.x = Math.sin(titan.animationTime * orbitSpeed + i) * orbitRadius;
            particle.position.z = Math.cos(titan.animationTime * orbitSpeed + i) * orbitRadius;
            particle.position.y = 2 + Math.sin(heightPhase) * 2.5;
            
            // Fade in and out
            particle.material.opacity = 0.2 + Math.sin(titan.animationTime * 2 + i) * 0.2;
        });
        
        // Swinging arm animations
        leftArm.rotation.x = Math.PI / 3 + Math.sin(titan.animationTime * 0.8) * 0.2;
        rightArm.rotation.x = Math.PI / 4 + Math.cos(titan.animationTime * 0.8) * 0.3;
        
        // Tentacle wiggling
        for (let i = 0; i < 5; i++) {
            if (bodyGroup.children[25 + i]) {
                const tentacle = bodyGroup.children[25 + i];
                tentacle.rotation.z = (i / 5) * Math.PI + Math.sin(titan.animationTime * 2 + i) * 0.5;
            }
        }
    };

    // Update method
    titan.update = (context) => {
        logger.verbose('enemy', `Plague titan update at ${titan.position.x.toFixed(2)},${titan.position.z.toFixed(2)}`);
        
        // Get context variables
        const { 
            playerPosition, 
            delta, 
            collisionSettings,
            environmentObjects,
            nearbyZombies,
            gameState,
            checkCollision,
            pushAway,
            damagePlayer
        } = context;
        
        // Update animations
        updateAnimations(delta);
        
        // Calculate direction to player
        const direction = new THREE.Vector3(
            playerPosition.x - titan.position.x,
            0,
            playerPosition.z - titan.position.z
        );
        
        const distance = direction.length();
        const finalDirection = direction.clone().normalize();
        
        // Add slight randomness to movement
        const randomFactor = Math.min(0.1, distance * 0.005);
        const randomAngle = (Math.random() - 0.5) * Math.PI * randomFactor;
        finalDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), randomAngle);
        
        // Calculate intended position
        const moveDistance = titan.speed * delta * 60;
        const intendedPosition = new THREE.Vector3()
            .copy(titan.position)
            .addScaledVector(finalDirection, moveDistance);
        
        // Handle collisions if collision settings are available
        if (collisionSettings) {
            const { COLLISION_DISTANCE, DAMAGE_DISTANCE, DAMAGE_PER_SECOND, ZOMBIE_COLLISION_DISTANCE } = collisionSettings;
            
            if (checkCollision && pushAway) {
                if (checkCollision(intendedPosition, playerPosition, COLLISION_DISTANCE)) {
                    const newPosition = pushAway(intendedPosition, playerPosition, COLLISION_DISTANCE);
                    intendedPosition.x = newPosition.x;
                    intendedPosition.z = newPosition.z;
                    
                    if (checkCollision(intendedPosition, playerPosition, DAMAGE_DISTANCE)) {
                        const damageAmount = DAMAGE_PER_SECOND * delta;
                        if (gameState) damagePlayer(gameState, damageAmount);
                    }
                }
            }
            
            // Zombie collisions
            if (nearbyZombies && checkCollision && pushAway) {
                for (let i = 0; i < nearbyZombies.length; i++) {
                    const otherZombie = nearbyZombies[i];
                    if (!otherZombie || !otherZombie.mesh || otherZombie.mesh.isExploding) continue;
                    
                    if (checkCollision(intendedPosition, otherZombie.mesh.position, ZOMBIE_COLLISION_DISTANCE)) {
                        const thisSize = titan.mass;
                        const otherSize = otherZombie.mesh.mass;
                        
                        const avoidancePosition = pushAway(
                            intendedPosition, 
                            otherZombie.mesh.position, 
                            ZOMBIE_COLLISION_DISTANCE
                        );
                        intendedPosition.x = (intendedPosition.x + avoidancePosition.x) * 0.5;
                        intendedPosition.z = (intendedPosition.z + avoidancePosition.z) * 0.5;
                    }
                }
            }
        }
        
        // Environment collisions
        if (environmentObjects) {
            for (const object of environmentObjects) {
                if (object && object.isObstacle) {
                    const dx = intendedPosition.x - object.position.x;
                    const dz = intendedPosition.z - object.position.z;
                    const distance = Math.sqrt(dx * dx + dz * dz);
                    if (distance < (object.boundingRadius || 2.5)) {
                        const pushDirection = new THREE.Vector3(dx, 0, dz).normalize();
                        const pushDistance = (object.boundingRadius || 2.5) - distance + 0.1;
                        intendedPosition.x += pushDirection.x * pushDistance;
                        intendedPosition.z += pushDirection.z * pushDistance;
                        break;
                    }
                }
            }
        }
        
        // Apply final position and rotation
        titan.position.copy(intendedPosition);
        titan.rotation.y = Math.atan2(finalDirection.x, finalDirection.z);
        
        // Poison effect
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

