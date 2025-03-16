/**
 * Zombie Module - Handles zombie creation and AI behavior
 * 
 * This module contains functions for creating Minecraft-style low-poly zombies and updating their
 * positions to chase the player.
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.132.2/build/three.module.js';
import { checkCollision, pushAway } from './physics.js'; // Import physics helpers
import { setupDismemberment, processDismemberment } from './dismemberment.js'; // Import dismemberment system
import { playSound } from './audio.js'; // Import audio system
import { logger } from '../utils/logger.js'; // Import logger for debugging

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
 * Updates the positions of all zombies to chase the player with extended enemy behaviors
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
    
    // First, update zombie king speeds
    zombies.forEach(zombie => {
        if (zombie.type === 'zombieKing') {
            const maxSpeed = 0.03;
            const speedIncreaseFactor = 0.0001;
            zombie.speed = Math.min(maxSpeed, zombie.speed + speedIncreaseFactor * delta * 60);
        }
    });
    
    // Calculate zombie sizes for pushing mechanics
    const zombieSizes = {};
    zombies.forEach((zombie, index) => {
        if (zombie.type === 'zombieKing') {
            zombieSizes[index] = 2.0;
        } else if (zombie.type === 'exploder') {
            zombieSizes[index] = 1.2;
        } else if (zombie.type === 'skeletonArcher') {
            zombieSizes[index] = 0.8;
        } else {
            zombieSizes[index] = 1.0;
        }
    });
    
    // Create spatial partitioning for zombies
    const gridSize = 5;
    const grid = {};
    
    // Add zombies to spatial grid
    zombies.forEach((zombie, index) => {
        if (!zombie || !zombie.mesh || !zombie.mesh.position) return;
        
        const gridX = Math.floor(zombie.mesh.position.x / gridSize);
        const gridZ = Math.floor(zombie.mesh.position.z / gridSize);
        const key = `${gridX},${gridZ}`;
        
        if (!grid[key]) {
            grid[key] = [];
        }
        
        grid[key].push(index);
    });
    
    // Get nearby zombies from spatial grid
    const getNearbyZombies = (position, excludeIndex) => {
        const gridX = Math.floor(position.x / gridSize);
        const gridZ = Math.floor(position.z / gridSize);
        const nearby = [];
        
        // Check 3x3 grid cells around the zombie
        for (let x = gridX - 1; x <= gridX + 1; x++) {
            for (let z = gridZ - 1; z <= gridZ + 1; z++) {
                const key = `${x},${z}`;
                if (grid[key]) {
                    grid[key].forEach(index => {
                        if (index !== excludeIndex) {
                            nearby.push(index);
                        }
                    });
                }
            }
        }
        
        return nearby;
    };
    
    // Function to push object away from another
    const pushAway = (position, fromPosition, minDistance) => {
        const dx = position.x - fromPosition.x;
        const dz = position.z - fromPosition.z;
        const distanceSquared = dx * dx + dz * dz;
        
        if (distanceSquared < 0.0001) {
            // Objects are too close, push in random direction
            const angle = Math.random() * Math.PI * 2;
            return {
                x: fromPosition.x + Math.cos(angle) * minDistance,
                z: fromPosition.z + Math.sin(angle) * minDistance
            };
        }
        
        const distance = Math.sqrt(distanceSquared);
        if (distance < minDistance) {
            const factor = minDistance / distance;
            return {
                x: fromPosition.x + dx * factor,
                z: fromPosition.z + dz * factor
            };
        }
        
        return { x: position.x, z: position.z };
    };
    
    // Create a random but stable update order to prevent bias
    const updateOrder = Array.from({ length: zombies.length }, (_, i) => i);
    updateOrder.sort(() => Math.random() - 0.5);
    
    // Update zombies in random order
    updateOrder.forEach(index => {
        const zombie = zombies[index];
        if (!zombie || !zombie.mesh || !zombie.mesh.position) return;
        
        try {
            // Calculate direct direction to player (no prediction/leading)
            const direction = new THREE.Vector3(
                playerPosition.x - zombie.mesh.position.x,
                0,
                playerPosition.z - zombie.mesh.position.z
            );
            
            const distance = direction.length();
            
            // Normalize direction
            const finalDirection = direction.clone().normalize();
            
            // Add slight randomness to movement (much less than before)
            const randomFactor = Math.min(0.1, distance * 0.005);
            const randomAngle = (Math.random() - 0.5) * Math.PI * randomFactor;
            finalDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), randomAngle);
            
            // Handle special enemy behaviors
            switch (zombie.mesh.enemyType) {
                case 'skeletonArcher':
                    if (distance < 8) {
                        finalDirection.negate(); // Run away when close
                    } else if (distance > 15) {
                        // Move toward player
                    } else {
                        return; // Stand still and shoot
                    }
                    break;
                    
                case 'exploder':
                    if (distance < 3 && !zombie.mesh.isExploding) {
                        zombie.mesh.isExploding = true;
                        zombie.mesh.explosionTimer = 1.5;
                        zombie.mesh.children.forEach(child => {
                            if (child.material && child.material.color) {
                                child.material.color.set(0xff0000);
                                if (child.material.emissive) {
                                    child.material.emissive.set(0xff0000);
                                    child.material.emissiveIntensity = 0.5;
                                }
                            }
                        });
                        return;
                    } else if (zombie.mesh.isExploding) {
                        zombie.mesh.explosionTimer -= delta;
                        const flashSpeed = Math.max(0.1, zombie.mesh.explosionTimer / 3);
                        const flashIntensity = Math.sin(Date.now() * 0.01 / flashSpeed) * 0.5 + 0.5;
                        zombie.mesh.children.forEach(child => {
                            if (child.material && child.material.emissiveIntensity !== undefined) {
                                child.material.emissiveIntensity = flashIntensity;
                            }
                        });
                        return;
                    }
                    break;
                    
                case 'zombieKing':
                    zombie.mesh.summonCooldown -= delta;
                    break;
            }
            
            if (distance > 0) {
                const moveDistance = zombie.speed * delta * 60;
                const intendedPosition = new THREE.Vector3()
                    .copy(zombie.mesh.position)
                    .addScaledVector(finalDirection, moveDistance);
                
                // Player collision
                if (checkCollision(intendedPosition, playerPosition, COLLISION_DISTANCE)) {
                    const newPosition = pushAway(intendedPosition, playerPosition, COLLISION_DISTANCE);
                    intendedPosition.x = newPosition.x;
                    intendedPosition.z = newPosition.z;
                    
                    if (checkCollision(intendedPosition, playerPosition, DAMAGE_DISTANCE)) {
                        let damageAmount = DAMAGE_PER_SECOND * delta;
                        if (zombie.mesh.enemyType === 'zombieKing') damageAmount *= 2;
                        if (zombie.gameState) damagePlayer(zombie.gameState, damageAmount);
                    }
                }
                
                // Zombie collisions
                const nearbyZombies = getNearbyZombies(zombie.mesh.position, index);
                for (let i = 0; i < nearbyZombies.length; i++) {
                    const otherIndex = nearbyZombies[i];
                    const otherZombie = zombies[otherIndex];
                    if (!otherZombie || !otherZombie.mesh || otherZombie.mesh.isExploding) continue;
                    
                    if (checkCollision(intendedPosition, otherZombie.mesh.position, ZOMBIE_COLLISION_DISTANCE)) {
                        const thisSize = zombieSizes[index] || 1.0;
                        const otherSize = zombieSizes[otherIndex] || 1.0;
                        
                        if (thisSize > otherSize * 1.3) {
                            const pushDirection = new THREE.Vector3()
                                .subVectors(otherZombie.mesh.position, intendedPosition)
                                .normalize();
                            otherZombie.mesh.position.addScaledVector(pushDirection, moveDistance * 0.5);
                            const avoidancePosition = pushAway(
                                intendedPosition, 
                                otherZombie.mesh.position, 
                                ZOMBIE_COLLISION_DISTANCE * 0.5
                            );
                            intendedPosition.x = (intendedPosition.x * 0.8 + avoidancePosition.x * 0.2);
                            intendedPosition.z = (intendedPosition.z * 0.8 + avoidancePosition.z * 0.2);
                        } else {
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
                
                // Environment collisions
                if (window.gameState && window.gameState.environmentObjects) {
                    for (const object of window.gameState.environmentObjects) {
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
                zombie.mesh.position.copy(intendedPosition);
                zombie.mesh.rotation.y = Math.atan2(finalDirection.x, finalDirection.z);
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
    
    // Add a damage animation effect to the health halo
    if (gameState.player.health > 0 && gameState.playerObject && gameState.playerObject.userData) {
        const halo = gameState.playerObject.userData.healthHalo;
        const glowHalo = gameState.playerObject.userData.glowHalo;
        
        /*if (halo) { // disabled it was confusing during playing the halo changinc color
            // Flash the halo red briefly
            const originalColor = halo.material.color.getHex();
            halo.material.color.set(0xff0000);
            
            // Reset after a short time
            setTimeout(() => {
                if (halo.material) {
                    halo.material.color.set(originalColor);
                }
            }, 150);
        }*/
        
        if (glowHalo) {
            // Make the glow halo briefly larger
            const originalScale = glowHalo.scale.x;
            glowHalo.scale.set(1.3, 1.3, 1);
            
            // Reset after a short time
            setTimeout(() => {
                if (glowHalo.scale) {
                    glowHalo.scale.set(originalScale, originalScale, 1);
                }
            }, 150);
        }
    }
};

/**
 * Damages a zombie and checks if it's dead
 * @param {Object} zombie - The zombie object
 * @param {number} damage - Amount of damage to apply
 * @param {THREE.Scene} scene - The scene for visual effects
 * @returns {Object} Updated zombie object
 */
export const damageZombie = (zombie, damage, scene) => {
    if (!zombie) return zombie;
    
    // Create a copy of the zombie with updated health
    const updatedZombie = {
        ...zombie,
        health: zombie.health - damage
    };
    
    // Debug logging with error handling
    try {
        logger.debug(`Zombie ${zombie.type} took ${damage.toFixed(1)} damage, health: ${updatedZombie.health.toFixed(1)}/${zombie.dismemberment?.maxHealth || 'unknown'}`);
    } catch (error) {
        console.log(`Zombie ${zombie.type} took ${damage.toFixed(1)} damage, health: ${updatedZombie.health.toFixed(1)}`);
    }
    
    // Process dismemberment if we have the scene and the system is set up
    if (scene && zombie.dismemberment) {
        // Process dismemberment based on new damage
        const particles = processDismemberment(updatedZombie, damage, scene);
        
        // Add particles to game state for animation
        if (particles.length > 0 && zombie.gameState) {
            if (!zombie.gameState.dismembermentParticles) {
                zombie.gameState.dismembermentParticles = [];
            }
            zombie.gameState.dismembermentParticles.push(...particles);
            try {
                logger.debug(`Added ${particles.length} colorful particles`);
            } catch (error) {
                console.log(`Added ${particles.length} colorful particles`);
            }
        }
    } else if (!zombie.dismemberment) {
        logger.debug(`Zombie ${zombie.type} has no dismemberment system set up`);
    } else if (!scene) {
        logger.debug(`No scene provided for dismemberment effects`);
    }
    
    return updatedZombie;
};

/**
 * Checks if a zombie is dead
 * @param {Object} zombie - The zombie object to check
 * @returns {boolean} True if the zombie is dead
 */
export const isZombieDead = (zombie) => {
    return zombie && zombie.health <= 0;
};

/**
 * Creates an explosion effect at the given position
 * @param {THREE.Scene} scene - The scene to add the explosion to
 * @param {THREE.Vector3} position - The position of the explosion
 * @param {number} radius - The radius of the explosion
 * @param {number} damage - The damage dealt by the explosion
 * @param {Array} zombies - Array of zombies to check for damage
 * @param {THREE.Object3D} player - The player object
 * @param {Object} gameState - The game state
 */
export const createExplosion = (scene, position, radius = 3, damage = 100, zombies = [], player, gameState) => {
    try {
        console.log("Creating explosion at", position, "with radius", radius, "and damage", damage);
        
        // Safety check for required parameters
        if (!scene) {
            console.error("Explosion creation failed: scene is undefined");
            return;
        }
        
        if (!position) {
            console.error("Explosion creation failed: position is undefined");
            return;
        }
        
        // Create explosion visual effect
        const explosionGeometry = new THREE.SphereGeometry(radius, 16, 16);
        const explosionMaterial = new THREE.MeshBasicMaterial({
            color: 0xff5500,
            transparent: true,
            opacity: 0.8
        });
        const explosion = new THREE.Mesh(explosionGeometry, explosionMaterial);
        explosion.position.copy(position);
        explosion.scale.set(0.1, 0.1, 0.1); // Start small
        scene.add(explosion);
        
        // Play explosion sound at the explosion position
        try {
            playSound('explosion', position);
        } catch (soundError) {
            console.warn("Could not play explosion sound:", soundError);
        }
        
        // Add a point light for glow effect
        const light = new THREE.PointLight(0xff5500, 2, radius * 2);
        light.position.copy(position);
        scene.add(light);
        
        // Check for player in explosion radius
        if (player && player.position) {
            const playerDistance = player.position.distanceTo(position);
            if (playerDistance < radius) {
                // Calculate damage based on distance (more damage closer to center)
                const playerDamage = Math.round(damage * (1 - playerDistance / radius));
                console.log("Player in explosion radius, dealing", playerDamage, "damage");
                try {
                    damagePlayer(gameState, playerDamage);
                } catch (playerDamageError) {
                    console.error("Failed to damage player:", playerDamageError);
                }
            }
        }
        
        // Check for zombies in explosion radius and damage them
        const zombiesToDamage = [];
        
        if (zombies && zombies.length > 0) {
            for (let i = 0; i < zombies.length; i++) {
                const zombie = zombies[i];
                if (zombie && zombie.mesh && zombie.mesh.position) {
                    const zombieDistance = zombie.mesh.position.distanceTo(position);
                    if (zombieDistance < radius) {
                        // Calculate damage based on distance
                        const zombieDamage = Math.round(damage * (1 - zombieDistance / radius));
                        console.log("Zombie in explosion radius, dealing", zombieDamage, "damage");
                        zombiesToDamage.push({ zombie, damage: zombieDamage });
                    }
                }
            }
        }
        
        // Apply damage to zombies after checking all of them
        zombiesToDamage.forEach(({ zombie, damage }) => {
            try {
                damageZombie(zombie, damage, scene);
            } catch (zombieDamageError) {
                console.error("Failed to damage zombie:", zombieDamageError);
            }
        });
        
        // Animation variables
        let scale = 0.1;
        let opacity = 0.8;
        const expandSpeed = 0.15;
        const fadeSpeed = 0.05;
        
        // Animation function
        function animate() {
            // Increase scale
            scale += expandSpeed;
            explosion.scale.set(scale, scale, scale);
            
            // Decrease opacity
            opacity -= fadeSpeed;
            explosion.material.opacity = Math.max(0, opacity);
            light.intensity = Math.max(0, opacity * 2);
            
            // Continue animation until fully faded
            if (opacity > 0) {
                requestAnimationFrame(animate);
            } else {
                // Clean up when animation is complete
                scene.remove(explosion);
                scene.remove(light);
                explosion.geometry.dispose();
                explosion.material.dispose();
            }
        }
        
        // Start animation
        requestAnimationFrame(animate);
        
        // Backup cleanup - force remove after 3 seconds
        setTimeout(() => {
            if (explosion.parent) {
                scene.remove(explosion);
                scene.remove(light);
                explosion.geometry.dispose();
                explosion.material.dispose();
            }
        }, 3000);
        
    } catch (error) {
        console.error('Error creating explosion:', error);
    }
};

/**
 * Creates a Plague Titan boss - a colossal zombie that slams the ground
 * @param {Object} position - The initial position of the titan
 * @returns {THREE.Group} The Plague Titan object
 */
export const createPlagueTitan = (position) => {
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
    titan.speed = 0.015; // Slow movement
    titan.health = 500; // High health
    titan.slamCooldown = 0; // For ground slam timing

    return titan;
};

/**
 * Creates a Necrofiend boss - a tall zombie that spawns minions
 * @param {Object} position - The initial position of the necrofiend
 * @returns {THREE.Group} The Necrofiend object
 */
export const createNecrofiend = (position) => {
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
    necro.speed = 0.04; // Faster than regular zombies
    necro.health = 300; // Moderate health
    necro.spawnCooldown = 0; // For minion spawning

    return necro;
};

/**
 * Creates a Rot Behemoth boss - a bloated zombie with toxic projectiles
 * @param {Object} position - The initial position of the behemoth
 * @returns {THREE.Group} The Rot Behemoth object
 */
export const createRotBehemoth = (position) => {
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
    behemoth.speed = 0.02; // Slow movement
    behemoth.health = 400; // High health
    behemoth.shootCooldown = 0; // For projectile timing

    return behemoth;
};

/**
 * Creates a Skittercrab - a small, fast crab-like zombie
 * @param {Object} position - The initial position of the skittercrab
 * @returns {THREE.Group} The Skittercrab object
 */
export const createSkittercrab = (position) => {
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
    crab.speed = 0.08; // Very fast
    crab.health = 50; // Low health

    return crab;
};

