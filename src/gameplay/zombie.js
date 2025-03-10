/**
 * Zombie Module - Handles zombie creation and AI behavior
 * 
 * This module contains functions for creating Minecraft-style low-poly zombies and updating their
 * positions to chase the player.
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.132.2/build/three.module.js';
import { checkCollision, pushAway } from './physics.js'; // Import physics helpers

/**
 * Creates a Minecraft-style low-poly zombie character
 * @param {Object} position - The initial position of the zombie
 * @returns {THREE.Group} The zombie object
 */
export const createZombie = (position) => {
    const zombie = new THREE.Group();

    // Head (cube with "scary" offset eyes)
    const headGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const headMaterial = new THREE.MeshStandardMaterial({
        color: 0x2e8b57, // Green zombie skin
        roughness: 0.9
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1.5; // Top of zombie at y=2
    head.castShadow = true;
    zombie.add(head);

    // Eyes (small red blocks for a menacing look)
    const eyeGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    const eyeMaterial = new THREE.MeshStandardMaterial({
        color: 0xff0000, // Red glowing eyes
        emissive: 0xff0000,
        emissiveIntensity: 0.5
    });
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.15, 1.55, 0.25); // Front left of face
    zombie.add(leftEye);
    
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.15, 1.55, 0.25); // Front right of face
    zombie.add(rightEye);

    // Body (rectangular prism)
    const bodyGeometry = new THREE.BoxGeometry(0.5, 0.75, 0.25);
    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: 0x1a3c34, // Darker green torn shirt
        roughness: 0.9
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.75; // Center of body
    body.castShadow = true;
    zombie.add(body);

    // Left Arm (slightly longer and angled for zombie posture)
    const armGeometry = new THREE.BoxGeometry(0.25, 0.75, 0.25);
    const armMaterial = new THREE.MeshStandardMaterial({
        color: 0x2e8b57, // Green skin
        roughness: 0.9
    });
    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-0.375, 0.75, 0.125); // Slightly forward
    leftArm.rotation.x = Math.PI / 6; // Forward tilt
    leftArm.castShadow = true;
    zombie.add(leftArm);

    // Right Arm
    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(0.375, 0.75, 0.125); // Slightly forward
    rightArm.rotation.x = Math.PI / 6; // Forward tilt
    rightArm.castShadow = true;
    zombie.add(rightArm);

    // Left Leg
    const legGeometry = new THREE.BoxGeometry(0.25, 0.5, 0.25);
    const legMaterial = new THREE.MeshStandardMaterial({
        color: 0x1a3c34, // Dark green pants
        roughness: 0.9
    });
    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-0.125, 0.25, 0);
    leftLeg.castShadow = true;
    zombie.add(leftLeg);

    // Right Leg
    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(0.125, 0.25, 0);
    rightLeg.castShadow = true;
    zombie.add(rightLeg);

    // Set initial position
    zombie.position.set(position.x, 0, position.z);
    
    // Store mesh reference for updateZombies compatibility
    zombie.mesh = zombie;
    
    // Set enemy type for special behavior
    zombie.enemyType = 'zombie';

    return zombie;
};

/**
 * Creates a skeleton archer enemy (mid-level ranged enemy)
 * @param {Object} position - The initial position of the skeleton
 * @returns {THREE.Group} The skeleton object
 */
export const createSkeletonArcher = (position) => {
    const skeleton = new THREE.Group();

    // Head with hollow eyes
    const headGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const boneMaterial = new THREE.MeshStandardMaterial({
        color: 0xdcdcdc, // Bone white
        roughness: 0.8
    });
    const head = new THREE.Mesh(headGeometry, boneMaterial);
    head.position.y = 1.5;
    head.castShadow = true;
    skeleton.add(head);

    // Black eye sockets
    const eyeGeometry = new THREE.BoxGeometry(0.15, 0.15, 0.1);
    const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.15, 1.55, 0.25);
    skeleton.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.15, 1.55, 0.25);
    skeleton.add(rightEye);

    // Body (thinner than zombie)
    const bodyGeometry = new THREE.BoxGeometry(0.4, 0.75, 0.2);
    const body = new THREE.Mesh(bodyGeometry, boneMaterial);
    body.position.y = 0.75;
    body.castShadow = true;
    skeleton.add(body);

    // Bow (simple representation)
    const bowGeometry = new THREE.BoxGeometry(0.1, 0.8, 0.1);
    const bowMaterial = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
    const bow = new THREE.Mesh(bowGeometry, bowMaterial);
    bow.position.set(0.3, 0.75, 0.2);
    bow.rotation.x = Math.PI / 4;
    skeleton.add(bow);

    // Arms and legs similar to zombie but thinner
    const limbGeometry = new THREE.BoxGeometry(0.2, 0.75, 0.2);
    const leftArm = new THREE.Mesh(limbGeometry, boneMaterial);
    leftArm.position.set(-0.3, 0.75, 0);
    leftArm.rotation.x = Math.PI / 6;
    skeleton.add(leftArm);
    
    const rightArm = new THREE.Mesh(limbGeometry, boneMaterial);
    rightArm.position.set(0.3, 0.75, 0);
    rightArm.rotation.x = -Math.PI / 6; // Bow-holding position
    skeleton.add(rightArm);

    const legGeometry = new THREE.BoxGeometry(0.2, 0.5, 0.2);
    const leftLeg = new THREE.Mesh(legGeometry, boneMaterial);
    leftLeg.position.set(-0.1, 0.25, 0);
    skeleton.add(leftLeg);
    const rightLeg = new THREE.Mesh(legGeometry, boneMaterial);
    rightLeg.position.set(0.1, 0.25, 0);
    skeleton.add(rightLeg);

    skeleton.position.set(position.x, 0, position.z);
    skeleton.mesh = skeleton;
    
    // Set enemy type for special behavior
    skeleton.enemyType = 'skeletonArcher';
    skeleton.lastShotTime = 0; // For tracking when the skeleton last shot an arrow
    
    return skeleton;
};

/**
 * Creates a creeper-inspired explosive enemy (mid-level)
 * @param {Object} position - The initial position of the exploder
 * @returns {THREE.Group} The exploder object
 */
export const createExploder = (position) => {
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
    
    return exploder;
};

/**
 * Creates a zombie king boss enemy
 * @param {Object} position - The initial position of the zombie king
 * @returns {THREE.Group} The zombie king object
 */
export const createZombieKing = (position) => {
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
    
    return king;
};

/**
 * Updates the positions of all zombies to chase the player (unchanged from original)
 * @param {Array} zombies - Array of zombie objects
 * @param {THREE.Vector3} playerPosition - The player's current position
 * @param {number} delta - Time delta between frames
 */
export const updateZombies = (zombies, playerPosition, delta = 1/60) => {
    if (!zombies || !playerPosition) {
        console.warn("Missing required parameters for updateZombies");
        return;
    }
    
    const COLLISION_DISTANCE = 1.0;
    const DAMAGE_DISTANCE = 1.2;
    const DAMAGE_PER_SECOND = 20;
    const ZOMBIE_COLLISION_DISTANCE = 0.8; // Distance to maintain between zombies
    
    zombies.forEach((zombie, index) => {
        if (!zombie || !zombie.mesh || !zombie.mesh.position) {
            return;
        }
        
        try {
            const direction = new THREE.Vector3(
                playerPosition.x - zombie.mesh.position.x,
                0,
                playerPosition.z - zombie.mesh.position.z
            );
            
            const distance = direction.length();
            
            // Handle special enemy behaviors based on type
            switch (zombie.mesh.enemyType) {
                case 'skeletonArcher':
                    // Archers try to maintain distance from player
                    if (distance < 8) {
                        // Move away from player if too close
                        direction.negate();
                    } else if (distance > 15) {
                        // Move toward player if too far
                        // Direction already points to player
                    } else {
                        // At good range, don't move, just shoot
                        return;
                    }
                    break;
                    
                case 'exploder':
                    // If close to player, start explosion sequence
                    if (distance < 3 && !zombie.mesh.isExploding) {
                        zombie.mesh.isExploding = true;
                        zombie.mesh.explosionTimer = 1.5; // 1.5 seconds until explosion
                        
                        // Change color to indicate explosion imminent
                        zombie.mesh.children.forEach(child => {
                            if (child.material && child.material.color) {
                                child.material.color.set(0xff0000); // Red
                                if (child.material.emissive) {
                                    child.material.emissive.set(0xff0000);
                                    child.material.emissiveIntensity = 0.5;
                                }
                            }
                        });
                        
                        return; // Don't move while exploding
                    } else if (zombie.mesh.isExploding) {
                        // Count down explosion timer
                        zombie.mesh.explosionTimer -= delta;
                        
                        // Flash faster as explosion approaches
                        const flashSpeed = Math.max(0.1, zombie.mesh.explosionTimer / 3);
                        const flashIntensity = Math.sin(Date.now() * 0.01 / flashSpeed) * 0.5 + 0.5;
                        
                        zombie.mesh.children.forEach(child => {
                            if (child.material && child.material.emissiveIntensity !== undefined) {
                                child.material.emissiveIntensity = flashIntensity;
                            }
                        });
                        
                        return; // Don't move while exploding
                    }
                    break;
                    
                case 'zombieKing':
                    // King moves slower but has more health
                    // Summon minions periodically
                    zombie.mesh.summonCooldown -= delta;
                    break;
            }
            
            if (distance > 0) {
                direction.normalize();
                
                // Calculate intended position
                const moveDistance = zombie.speed * delta * 60;
                const intendedPosition = new THREE.Vector3()
                    .copy(zombie.mesh.position)
                    .addScaledVector(direction, moveDistance);
                
                // Check for collision with player
                if (checkCollision(intendedPosition, playerPosition, COLLISION_DISTANCE)) {
                    const newPosition = pushAway(intendedPosition, playerPosition, COLLISION_DISTANCE);
                    intendedPosition.x = newPosition.x;
                    intendedPosition.z = newPosition.z;
                    
                    if (checkCollision(intendedPosition, playerPosition, DAMAGE_DISTANCE)) {
                        // Different enemies do different damage
                        let damageAmount = DAMAGE_PER_SECOND * delta;
                        
                        if (zombie.mesh.enemyType === 'zombieKing') {
                            damageAmount *= 2; // King does double damage
                        }
                        
                        if (zombie.gameState) {
                            damagePlayer(zombie.gameState, damageAmount);
                        }
                    }
                }
                
                // Check for collisions with other zombies
                let hasZombieCollision = false;
                for (let i = 0; i < zombies.length; i++) {
                    if (i !== index && zombies[i] && zombies[i].mesh) {
                        const otherZombie = zombies[i];
                        
                        // Skip if the other zombie is exploding
                        if (otherZombie.mesh.isExploding) continue;
                        
                        if (checkCollision(intendedPosition, otherZombie.mesh.position, ZOMBIE_COLLISION_DISTANCE)) {
                            // Push away from other zombie
                            const avoidancePosition = pushAway(
                                intendedPosition, 
                                otherZombie.mesh.position, 
                                ZOMBIE_COLLISION_DISTANCE
                            );
                            
                            // Apply avoidance, but with reduced effect to prevent gridlock
                            intendedPosition.x = (intendedPosition.x + avoidancePosition.x) * 0.5;
                            intendedPosition.z = (intendedPosition.z + avoidancePosition.z) * 0.5;
                            
                            hasZombieCollision = true;
                        }
                    }
                }
                
                // Apply final position
                zombie.mesh.position.copy(intendedPosition);
                
                // Face the direction of movement
                zombie.mesh.rotation.y = Math.atan2(direction.x, direction.z);
            }
        } catch (error) {
            console.error("Error updating zombie:", error);
        }
    });
};

/**
 * Damages the player and handles related effects (unchanged from original)
 * @param {Object} gameState - The game state object containing player data
 * @param {number} damageAmount - Amount of damage to apply
 */
export const damagePlayer = (gameState, damageAmount) => {
    if (!gameState || !gameState.player) return;
    
    gameState.player.health -= damageAmount;
    
    if (gameState.player.health < 0) {
        gameState.player.health = 0;
    }
    
    if (gameState.player.health <= 0 && typeof gameState.handleGameOver === 'function') {
        gameState.handleGameOver();
    }
};

/**
 * Damages a zombie and checks if it's dead (unchanged from original)
 * @param {Object} zombie - The zombie object
 * @param {number} damage - Amount of damage to apply
 * @returns {Object} Updated zombie object
 */
export const damageZombie = (zombie, damage) => {
    if (!zombie) return zombie;
    
    const updatedZombie = {
        ...zombie,
        health: zombie.health - damage
    };
    
    return updatedZombie;
};

/**
 * Checks if a zombie is dead (unchanged from original)
 * @param {Object} zombie - The zombie object
 * @returns {boolean} True if the zombie is dead
 */
export const isZombieDead = (zombie) => {
    if (!zombie) return false;
    
    return zombie.health <= 0;
};

/**
 * Creates an explosion effect at the specified position
 * @param {THREE.Scene} scene - The scene to add the explosion to
 * @param {THREE.Vector3} position - The position of the explosion
 * @param {number} radius - The radius of the explosion
 * @param {number} damage - The damage the explosion deals
 * @param {Array} zombies - Array of all zombies to check for damage
 * @param {Object} player - The player object to check for damage
 * @param {Object} gameState - The game state object
 */
export const createExplosion = (scene, position, radius = 3, damage = 100, zombies = [], player, gameState) => {
    // Create explosion visual effect
    const explosionGeometry = new THREE.SphereGeometry(radius, 16, 16);
    const explosionMaterial = new THREE.MeshBasicMaterial({
        color: 0xff5500,
        transparent: true,
        opacity: 0.8
    });
    const explosion = new THREE.Mesh(explosionGeometry, explosionMaterial);
    explosion.position.copy(position);
    scene.add(explosion);
    
    // Check for player in explosion radius
    const playerDistance = player.position.distanceTo(position);
    if (playerDistance < radius) {
        // Calculate damage based on distance (more damage closer to center)
        const playerDamage = damage * (1 - playerDistance / radius);
        damagePlayer(gameState, playerDamage);
    }
    
    // Check for zombies in explosion radius
    zombies.forEach(zombie => {
        if (zombie && zombie.mesh) {
            const zombieDistance = zombie.mesh.position.distanceTo(position);
            if (zombieDistance < radius) {
                // Calculate damage based on distance
                const zombieDamage = damage * (1 - zombieDistance / radius);
                damageZombie(zombie, zombieDamage);
            }
        }
    });
    
    // Animate explosion and remove after a short time
    let scale = 0.1;
    const expandSpeed = 0.15;
    
    const animateExplosion = () => {
        scale += expandSpeed;
        explosion.scale.set(scale, scale, scale);
        explosion.material.opacity = Math.max(0, 0.8 - scale * 0.2);
        
        if (scale < 1.5) {
            requestAnimationFrame(animateExplosion);
        } else {
            scene.remove(explosion);
            explosion.geometry.dispose();
            explosion.material.dispose();
        }
    };
    
    animateExplosion();
};