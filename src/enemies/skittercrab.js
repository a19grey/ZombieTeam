/**
 * Skittercrab Module - Creates a fast, agile zombie variant
 * 
 * This module contains the function to create a Skittercrab, a unique enemy type
 * that moves very quickly but has low health. The Skittercrab is a small, hunched
 * zombie with crab-like features that can rapidly close the distance to players
 * and attack with quick strikes.
 * 
 * Example usage:
 *   import { createSkittercrab } from './enemies/skittercrab.js';
 *   
 *   // Create a Skittercrab at position (15, 0, 20) with speed 0.05
 *   const crab = createSkittercrab({x: 15, z: 20}, 0.05);
 *   scene.add(crab);
 */

/**
 * Creates a Skittercrab - a small, fast crab-like zombie
 * @param {Object} position - The initial position of the skittercrab
 * @param {number} baseSpeed - Base movement speed
 * @returns {THREE.Group} The Skittercrab object
 */

// src/enemies/zombie.js
import * as THREE from 'three';
import { logger } from '../utils/logger.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Add 'enemy' to logger sections if not already included
logger.addSection('enemy');
logger.addSection('enemyspawner');

export const createSkittercrab = (position, baseSpeed) => {
    // Configuration parameters
    const scale = new THREE.Vector3(1,1,1); // Scale vector for easy adjustment
    const crabScale = 1.3; // Scale for the 3D model
    
    const crab = new THREE.Group();
    
    // Try to load the skittercrab 3D model first
    const loader = new GLTFLoader();
    
    // Promise-based loading to handle fallback
    const loadSkittercrabModel = () => {
        return new Promise((resolve, reject) => {
            // Attempt to load from the models directory
            loader.load('./skittercrab.glb', 
                (gltf) => {
                    logger.info('enemy', 'Successfully loaded skittercrab.glb model');
                    
                    // Add the loaded model to the skittercrab group
                    const model = gltf.scene;
                    model.scale.set(crabScale, crabScale, crabScale); // Scale appropriately
                    model.position.y = 0; // Position at ground level
                    
                    // Brighten up the model by traversing all meshes and adjusting their materials
                    model.traverse((node) => {
                        if (node.isMesh && node.material) {
                            // Handle both single material and material array
                            const materials = Array.isArray(node.material) ? node.material : [node.material];
                            
                            materials.forEach((material) => {
                                // Add emissive properties to brighten the model
                                material.emissive = material.color.clone().multiplyScalar(0.3);
                                material.emissiveIntensity = 0.0;
                                
                                // Increase base color brightness
                                material.color.multiplyScalar(1.3);
                                
                                // Reduce metalness and increase roughness for better visibility
                                if (material.metalness !== undefined) {
                                    material.metalness = Math.max(0, material.metalness - 0.3);
                                }
                                
                                if (material.roughness !== undefined) {
                                    material.roughness = Math.min(1, material.roughness + 0.2);
                                }
                                
                                // Ensure materials receive shadows properly
                                material.needsUpdate = true;
                            });
                            
                            // Make sure model casts and receives shadows
                            node.castShadow = true;
                            node.receiveShadow = true;
                        }
                    });
                    
                    crab.add(model);
                    
                    // Store model loaded status in userData for other functions to reference
                    crab.userData.crabModelLoaded = true;
                    resolve(true);
                },
                (xhr) => {
                    logger.debug('enemy', `Skittercrab model loading: ${(xhr.loaded / xhr.total * 100).toFixed(2)}%`);
                },
                (error) => {
                    logger.warn('enemy', 'Failed to load skittercrab.glb model', { error: error.message });
                    reject(error);
                }
            );
        });
    };

    // Position the skittercrab
    crab.position.set(position.x, 0, position.z);

    // Log the creation
    logger.info('enemyspawner', `Creating skittercrab at ${position.x.toFixed(2)},${position.z.toFixed(2)}`);

    // Set properties
    crab.mesh = crab;
    crab.enemyType = 'skittercrab';
    crab.health = 10; // Low health
    crab.points = crab.health/10; // Base points for regular zombie
    crab.speed = baseSpeed * 1.5; // Very fast
    crab.mass = 0.5; // Very light
    crab.lastDashTime = 0;
    crab.dashCooldown = 3000; // 3 seconds between dashes
    crab.animationTime = 0; // Track time for leg animation
    
    // Try to load the 3D model first, then fall back to original geometry if it fails
    loadSkittercrabModel().catch(() => {
        logger.info('enemy', 'Falling back to default geometry skittercrab model');
        createDefaultSkittercrabGeometry(crab);
    });
    
    // Scale the skittercrab according to scale parameter
    // Only scale the default geometry version, as the 3D model is already scaled
    if (!crab.userData.crabModelLoaded) {
        crab.scale.copy(scale);
    }

    // Update method
    crab.update = (context) => {
        logger.verbose('enemy', `Skittercrab update at ${crab.position.x.toFixed(2)},${crab.position.z.toFixed(2)}`);
        
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
        
        // Only animate the geometry legs if we're using the default geometry model
        if (!crab.userData.crabModelLoaded) {
            // Animate legs
            crab.animationTime += delta * 5;
            const legPairs = crab.userData.legPairs || [];
            legPairs.forEach((pair, index) => {
                const offset = index * (Math.PI / 4); // Phase offset for each pair
                const leftHeight = Math.sin(crab.animationTime + offset) * 0.1;
                const rightHeight = Math.sin(crab.animationTime + offset + Math.PI) * 0.1;
                
                pair.left.position.y = 0.15 + leftHeight;
                pair.right.position.y = 0.15 + rightHeight;
            });
            
            // Animate pincers slightly
            if (crab.userData.pincers) {
                const pincerWave = Math.sin(crab.animationTime * 0.5) * 0.1;
                crab.userData.pincers.leftArm.rotation.z = pincerWave;
                crab.userData.pincers.rightArm.rotation.z = -pincerWave;
            }
        } else {
            // For 3D model, we might add different animations here
            // This would depend on the model's rigging/animation system
            crab.animationTime += delta * 5;
        }
        
        // Calculate direction to player
        const direction = new THREE.Vector3(
            playerPosition.x - crab.position.x,
            0,
            playerPosition.z - crab.position.z
        );
        
        const distanceToPlayer = direction.length();
        let finalDirection = direction.clone().normalize();
        
        // Special dash ability
        let moveSpeed = crab.speed;
        const now = Date.now();
        if (now - crab.lastDashTime > crab.dashCooldown) {
            // Dash when at medium range
            if (distanceToPlayer > 5 && distanceToPlayer < 10) {
                logger.info('enemy', `Skittercrab performing dash attack toward player`);
                crab.lastDashTime = now;
                // Dash gives temporary speed boost
                moveSpeed = crab.speed * 3.0;
            }
        }
        
        // Add slight randomness to movement (less than zombie because crabs are more precise)
        const randomFactor = Math.min(0.05, distanceToPlayer * 0.003);
        const randomAngle = (Math.random() - 0.5) * Math.PI * randomFactor;
        finalDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), randomAngle);
        
        // Calculate intended position
        const moveDistance = moveSpeed * delta * 60;
        const intendedPosition = new THREE.Vector3()
            .copy(crab.position)
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
        crab.position.copy(intendedPosition);
        crab.rotation.y = Math.atan2(finalDirection.x, finalDirection.z);
    };
    
    return crab;
};

/**
 * Creates the default skittercrab geometry using primitives (original implementation)
 * @param {THREE.Group} crab - The skittercrab group to add geometry to
 */
function createDefaultSkittercrabGeometry(crab) {
    // Low, wide body - made slightly wider and more oval-shaped
    const bodyGeometry = new THREE.BoxGeometry(1.2, 0.5, 1);
    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: 0x696969, // Dark gray carapace
        roughness: 0.9
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.25;
    body.castShadow = true;
    crab.add(body);

    // Spiky shell with more details
    const spikeGeometry = new THREE.ConeGeometry(0.1, 0.4, 4);
    const spikeMaterial = new THREE.MeshStandardMaterial({
        color: 0x8b0000, // Dark red spikes
        roughness: 0.9
    });
    
    // Add multiple spikes in a pattern
    const spikePositions = [
        {x: 0, y: 0.65, z: 0},
        {x: 0.3, y: 0.55, z: 0.2},
        {x: -0.3, y: 0.55, z: 0.2},
        {x: 0.2, y: 0.55, z: -0.2},
        {x: -0.2, y: 0.55, z: -0.2}
    ];
    
    spikePositions.forEach(pos => {
        const spike = new THREE.Mesh(spikeGeometry, spikeMaterial);
        spike.position.set(pos.x, pos.y, pos.z);
        crab.add(spike);
    });

    // Create leg pairs (4 pairs total = 8 legs)
    const legPairs = [];
    const legGeometry = new THREE.BoxGeometry(0.15, 0.3, 0.6);
    
    // Define leg positions - each entry is [x-offset, z-position]
    const legPositions = [
        [0.8, 0.4],  // Front legs
        [0.7, 0.1],  // Mid-front legs
        [0.7, -0.1], // Mid-back legs
        [0.6, -0.4]  // Back legs
    ];

    for (let i = 0; i < 4; i++) {
        const leftLeg = new THREE.Mesh(legGeometry, bodyMaterial);
        const rightLeg = new THREE.Mesh(legGeometry, bodyMaterial);
        
        const xOffset = legPositions[i][0];
        const zOffset = legPositions[i][1];
        
        leftLeg.position.set(-xOffset, 0.15, zOffset);
        rightLeg.position.set(xOffset, 0.15, zOffset);
        
        leftLeg.rotation.z = Math.PI / 4;
        rightLeg.rotation.z = -Math.PI / 4;
        
        leftLeg.castShadow = true;
        rightLeg.castShadow = true;
        
        crab.add(leftLeg);
        crab.add(rightLeg);
        
        legPairs.push({left: leftLeg, right: rightLeg});
    }
    
    // Store legPairs in userData for animation access
    crab.userData.legPairs = legPairs;

    // Main pincer arm
    const pincerArmGeometry = new THREE.BoxGeometry(0.4, 0.2, 0.8);
    const leftPincerArm = new THREE.Mesh(pincerArmGeometry, bodyMaterial);
    const rightPincerArm = new THREE.Mesh(pincerArmGeometry, bodyMaterial);
    
    // Pincer claw
    const pincerClawGeometry = new THREE.BoxGeometry(0.3, 0.25, 0.4);
    const leftPincerClaw = new THREE.Mesh(pincerClawGeometry, spikeMaterial);
    const rightPincerClaw = new THREE.Mesh(pincerClawGeometry, spikeMaterial);
    
    // Position pincers
    leftPincerArm.position.set(-0.9, 0.3, 0.4);
    rightPincerArm.position.set(0.9, 0.3, 0.4);
    leftPincerClaw.position.set(-1.2, 0.3, 0.6);
    rightPincerClaw.position.set(1.2, 0.3, 0.6);
    
    leftPincerArm.rotation.y = -Math.PI / 6;
    rightPincerArm.rotation.y = Math.PI / 6;
    leftPincerClaw.rotation.y = -Math.PI / 4;
    rightPincerClaw.rotation.y = Math.PI / 4;
    
    crab.add(leftPincerArm);
    crab.add(rightPincerArm);
    crab.add(leftPincerClaw);
    crab.add(rightPincerClaw);
    
    // Store pincer references for animation
    crab.userData.pincers = {
        leftArm: leftPincerArm,
        rightArm: rightPincerArm,
        leftClaw: leftPincerClaw,
        rightClaw: rightPincerClaw
    };
}

