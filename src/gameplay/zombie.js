/**
 * Zombie Module - Handles zombie creation and AI behavior
 * 
 * This module contains functions for creating Minecraft-style low-poly zombies and updating their
 * positions to chase the player.
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.132.2/build/three.module.js';
import { checkCollision, pushAway } from './physics.js'; // Import physics helpers
import { setupDismemberment, processDismemberment } from './dismemberment.js'; // Import dismemberment system

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
 * Updates the positions of all zombies to chase the player
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
    
    // Calculate player velocity for leading behavior
    // This would normally come from the player object, but we'll estimate it
    // based on the difference between current and previous position
    const playerVelocity = new THREE.Vector3();
    if (window.previousPlayerPosition) {
        playerVelocity.subVectors(playerPosition, window.previousPlayerPosition);
        playerVelocity.multiplyScalar(1 / delta); // Scale to units per second
    }
    window.previousPlayerPosition = playerPosition.clone();
    
    // First, update zombie king speeds
    zombies.forEach(zombie => {
        if (zombie.type === 'zombieKing') {
            // Gradually increase zombie king speed over time
            // Start at baseSpeed and increase up to regular zombie speed
            const maxSpeed = 0.03; // Regular zombie speed
            const speedIncreaseFactor = 0.0001; // How quickly speed increases
            
            zombie.speed = Math.min(maxSpeed, zombie.speed + speedIncreaseFactor * delta * 60);
        }
    });
    
    // Calculate zombie sizes for pushing mechanics
    const zombieSizes = {};
    zombies.forEach((zombie, index) => {
        if (zombie.type === 'zombieKing') {
            zombieSizes[index] = 2.0; // King is largest
        } else if (zombie.type === 'exploder') {
            zombieSizes[index] = 1.2; // Exploders are medium-large
        } else if (zombie.type === 'skeletonArcher') {
            zombieSizes[index] = 0.8; // Archers are smaller
        } else {
            zombieSizes[index] = 1.0; // Regular zombies are medium
        }
    });
    
    // Create spatial partitioning for zombies to reduce O(n²) collision checks
    const gridSize = 5; // Size of each grid cell
    const grid = {};
    
    // Place zombies in grid cells
    zombies.forEach((zombie, index) => {
        if (!zombie || !zombie.mesh || !zombie.mesh.position) return;
        
        const cellX = Math.floor(zombie.mesh.position.x / gridSize);
        const cellZ = Math.floor(zombie.mesh.position.z / gridSize);
        const cellKey = `${cellX},${cellZ}`;
        
        if (!grid[cellKey]) {
            grid[cellKey] = [];
        }
        
        grid[cellKey].push(index);
    });
    
    // Function to get nearby zombies using grid
    const getNearbyZombies = (position, index) => {
        const cellX = Math.floor(position.x / gridSize);
        const cellZ = Math.floor(position.z / gridSize);
        const nearby = [];
        
        // Check current cell and 8 surrounding cells
        for (let x = cellX - 1; x <= cellX + 1; x++) {
            for (let z = cellZ - 1; z <= cellZ + 1; z++) {
                const cellKey = `${x},${z}`;
                if (grid[cellKey]) {
                    grid[cellKey].forEach(otherIndex => {
                        if (otherIndex !== index) {
                            nearby.push(otherIndex);
                        }
                    });
                }
            }
        }
        
        return nearby;
    };
    
    // Randomize zombie update order to prevent clustering in a line
    const updateOrder = zombies.map((_, index) => index);
    for (let i = updateOrder.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [updateOrder[i], updateOrder[j]] = [updateOrder[j], updateOrder[i]];
    }
    
    // Update zombies in random order
    updateOrder.forEach(index => {
        const zombie = zombies[index];
        if (!zombie || !zombie.mesh || !zombie.mesh.position) {
            return;
        }
        
        try {
            // Calculate base direction to player
            const direction = new THREE.Vector3(
                playerPosition.x - zombie.mesh.position.x,
                0,
                playerPosition.z - zombie.mesh.position.z
            );
            
            const distance = direction.length();
            
            // Calculate a leading target position based on player velocity
            const leadingFactor = 1.0; // How much to lead the player (higher = more leading)
            const leadingPosition = new THREE.Vector3().copy(playerPosition);
            
            // Only lead if player is moving and zombie is far enough away
            if (playerVelocity.length() > 0.1 && distance > 5) {
                // Predict where the player will be in the future
                // The further away the zombie, the more it should lead
                const leadTime = Math.min(distance * 0.1, 2.0); // Cap at 2 seconds of leading
                leadingPosition.add(playerVelocity.clone().multiplyScalar(leadTime * leadingFactor));
            }
            
            // Calculate direction to leading position
            const leadingDirection = new THREE.Vector3(
                leadingPosition.x - zombie.mesh.position.x,
                0,
                leadingPosition.z - zombie.mesh.position.z
            ).normalize();
            
            // Add some randomness to movement to prevent line formation
            // More randomness for zombies that are further away from player
            const randomFactor = Math.min(0.3, distance * 0.01); // More randomness at greater distances
            const randomAngle = (Math.random() - 0.5) * Math.PI * randomFactor;
            const randomDirection = leadingDirection.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), randomAngle);
            
            // Handle special enemy behaviors based on type
            switch (zombie.mesh.enemyType) {
                case 'skeletonArcher':
                    // Archers try to maintain distance from player
                    if (distance < 8) {
                        // Move away from player if too close
                        leadingDirection.negate();
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
                // Mix in some randomness to prevent line formation
                // Use more direct path when closer to player
                const directPathFactor = Math.min(0.9, 0.5 + (15 - Math.min(distance, 15)) / 15 * 0.4);
                const finalDirection = new THREE.Vector3()
                    .addScaledVector(leadingDirection, directPathFactor)
                    .addScaledVector(randomDirection, 1 - directPathFactor)
                    .normalize();
                
                const moveDistance = zombie.speed * delta * 60;
                const intendedPosition = new THREE.Vector3()
                    .copy(zombie.mesh.position)
                    .addScaledVector(finalDirection, moveDistance);
                
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
                
                // Check for collisions with nearby zombies only (using spatial grid)
                let hasZombieCollision = false;
                const nearbyZombies = getNearbyZombies(zombie.mesh.position, index);
                
                for (let i = 0; i < nearbyZombies.length; i++) {
                    const otherIndex = nearbyZombies[i];
                    const otherZombie = zombies[otherIndex];
                    
                    if (!otherZombie || !otherZombie.mesh) continue;
                    
                    // Skip if the other zombie is exploding
                    if (otherZombie.mesh.isExploding) continue;
                    
                    if (checkCollision(intendedPosition, otherZombie.mesh.position, ZOMBIE_COLLISION_DISTANCE)) {
                        // Compare sizes to determine pushing behavior
                        const thisSize = zombieSizes[index] || 1.0;
                        const otherSize = zombieSizes[otherIndex] || 1.0;
                        
                        // If this zombie is significantly bigger, it can push the other zombie
                        if (thisSize > otherSize * 1.3) {
                            // Bigger zombie pushes smaller one
                            const pushDirection = new THREE.Vector3()
                                .subVectors(otherZombie.mesh.position, intendedPosition)
                                .normalize();
                            
                            // Move the smaller zombie
                            otherZombie.mesh.position.addScaledVector(pushDirection, moveDistance * 0.5);
                            
                            // This zombie can continue on its path with minimal adjustment
                            const avoidancePosition = pushAway(
                                intendedPosition, 
                                otherZombie.mesh.position, 
                                ZOMBIE_COLLISION_DISTANCE * 0.5 // Reduced collision distance
                            );
                            
                            intendedPosition.x = (intendedPosition.x * 0.8 + avoidancePosition.x * 0.2);
                            intendedPosition.z = (intendedPosition.z * 0.8 + avoidancePosition.z * 0.2);
                        } else {
                            // Normal collision avoidance
                            const avoidancePosition = pushAway(
                                intendedPosition, 
                                otherZombie.mesh.position, 
                                ZOMBIE_COLLISION_DISTANCE
                            );
                            
                            // Apply avoidance, but with reduced effect to prevent gridlock
                            intendedPosition.x = (intendedPosition.x + avoidancePosition.x) * 0.5;
                            intendedPosition.z = (intendedPosition.z + avoidancePosition.z) * 0.5;
                        }
                        
                        hasZombieCollision = true;
                    }
                }
                
                // Check for collisions with environment objects (buildings, rocks, etc.)
                if (window.gameState && window.gameState.environmentObjects) {
                    for (const object of window.gameState.environmentObjects) {
                        if (object && object.isObstacle) {
                            const dx = zombie.mesh.position.x - object.position.x;
                            const dz = zombie.mesh.position.z - object.position.z;
                            const distance = Math.sqrt(dx * dx + dz * dz);
                            
                            // If zombie is colliding with an environment object
                            if (distance < (object.boundingRadius || 2.5)) {
                                // Push zombie away from the object
                                const pushDirection = new THREE.Vector3(dx, 0, dz).normalize();
                                const pushDistance = (object.boundingRadius || 2.5) - distance + 0.1;
                                
                                zombie.mesh.position.x += pushDirection.x * pushDistance;
                                zombie.mesh.position.z += pushDirection.z * pushDistance;
                                break; // Only handle one collision at a time
                            }
                        }
                    }
                }
                
                // Apply final position
                zombie.mesh.position.copy(intendedPosition);
                
                // Face the direction of movement
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
        
        if (halo) {
            // Flash the halo red briefly
            const originalColor = halo.material.color.getHex();
            halo.material.color.set(0xff0000);
            
            // Reset after a short time
            setTimeout(() => {
                if (halo.material) {
                    halo.material.color.set(originalColor);
                }
            }, 150);
        }
        
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
    
    // Debug logging
    logger.debug(`Zombie ${zombie.type} took ${damage.toFixed(1)} damage, health: ${updatedZombie.health.toFixed(1)}/${zombie.dismemberment?.maxHealth || 'unknown'}`);
    
    // Process dismemberment if we have the scene and the system is set up
    if (scene && zombie.dismemberment) {
        // Process dismemberment based on new damage
        const bloodParticles = processDismemberment(updatedZombie, damage, scene);
        
        // Add blood particles to game state for animation
        if (bloodParticles.length > 0 && zombie.gameState) {
            if (!zombie.gameState.bloodParticles) {
                zombie.gameState.bloodParticles = [];
            }
            zombie.gameState.bloodParticles.push(...bloodParticles);
            logger.debug(`Added ${bloodParticles.length} blood particles`);
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
        
        // Add a point light for glow effect
        const light = new THREE.PointLight(0xff5500, 2, radius * 2);
        light.position.copy(position);
        scene.add(light);
        
        // Check for player in explosion radius
        if (player && player.position) {
            const playerDistance = player.position.distanceTo(position);
            if (playerDistance < radius) {
                // Calculate damage based on distance (more damage closer to center)
                const playerDamage = damage * (1 - playerDistance / radius);
                console.log("Player in explosion radius, dealing", playerDamage, "damage");
                damagePlayer(gameState, playerDamage);
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
                        const zombieDamage = damage * (1 - zombieDistance / radius);
                        console.log("Zombie in explosion radius, dealing", zombieDamage, "damage");
                        zombiesToDamage.push({ zombie, damage: zombieDamage });
                    }
                }
            }
        }
        
        // Apply damage to zombies after checking all of them
        zombiesToDamage.forEach(({ zombie, damage }) => {
            damageZombie(zombie, damage, scene);
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