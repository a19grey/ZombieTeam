/**
 * Exploder Module - Creates an explosive enemy that detonates near players
 * 
 * This module contains the function to create an exploder enemy inspired by Minecraft's
 * creeper. The exploder is a mid-level enemy that rushes toward the player and
 * explodes when in close proximity, dealing area damage. It has a distinctive
 * bright green blocky body with a frowning face.
 * 
 * Example usage:
 *   import { createExploder } from './enemies/exploder.js';
 *   
 *   // Create an exploder at position (15, 0, 10) with speed 0.05
 *   const exploder = createExploder({x: 15, z: 10}, 0.05);
 *   scene.add(exploder);
 */

import * as THREE from 'three';
import { createExplosion } from '../gameplay/zombieUtils.js'; // Import explosion utility
import { logger } from '../utils/logger.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Add 'enemy' to logger sections if not already included
logger.addSection('enemy');
logger.addSection('enemyspawner');

export const createExploder = (position, baseSpeed ) => {
    // Configuration parameters
    const scale = new THREE.Vector3(1.0, 1.0, 1.0); // Scale vector for easy adjustment
    const exploderScale = 1.0; // Scale for the 3D model
    
    const exploder = new THREE.Group();
    
    // Try to load the exploder 3D model first
    const loader = new GLTFLoader();
    
    // Promise-based loading to handle fallback
    const loadExploderModel = () => {
        return new Promise((resolve, reject) => {
            // Attempt to load the model
            loader.load('./exploder.glb', 
                (gltf) => {
                    logger.info('enemy', 'Successfully loaded exploder.glb model');
                    
                    // Add the loaded model to the exploder group
                    const model = gltf.scene;
                    model.scale.set(exploderScale, exploderScale*1.5, exploderScale); // Scale appropriately
                    model.position.y = exploderScale; // Position at ground level
                    
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
                                material.color.multiplyScalar(1.7);
                                
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
                    
                    exploder.add(model);
                    
                    // Store model loaded status in userData for other functions to reference
                    exploder.userData.exploderModelLoaded = true;
                    resolve(true);
                },
                (xhr) => {
                    logger.debug('enemy', `Exploder model loading: ${(xhr.loaded / xhr.total * 100).toFixed(2)}%`);
                },
                (error) => {
                    logger.warn('enemy', 'Failed to load exploder.glb model', { error: error.message });
                    reject(error);
                }
            );
        });
    };

    // Position the exploder
    exploder.position.set(position.x, 0, position.z);
    
    // Debug log for exploder creation
    logger.debug('enemyspawner', `Creating exploder at ${position.x.toFixed(2)},${position.z.toFixed(2)}`);
    
    exploder.mesh = exploder;
    
    // Set enemy type for special behavior
    exploder.enemyType = 'exploder';
    exploder.isExploding = false;
    exploder.explosionTimer = 0;
    
    // Set speed relative to baseSpeed (slightly slower than standard zombie)
    exploder.speed = baseSpeed * 0.9;
    
    // Set mass for physics calculations - exploder is medium-weight
    exploder.mass = 1.2;
    
    // Set default health
    exploder.health = 100;
    // Set points value for this enemy type
    exploder.points = exploder.health/10; // Points for exploder type
    
    // Try to load the 3D model first, then fall back to original geometry if it fails
    loadExploderModel().catch(() => {
        logger.info('enemy', 'Falling back to default geometry exploder model');
        createDefaultExploderGeometry(exploder);
    });
    
    // Scale the exploder according to scale parameter
    // Only scale the default geometry version, as the 3D model is already scaled
    if (!exploder.userData.exploderModelLoaded) {
        exploder.scale.copy(scale);
    }
    
    /**
     * Updates the exploder's position and behavior
     * @param {Object} context - The update context containing all necessary information
     */
    exploder.update = (context) => {
        // Explosion configuration parameters
        const EXPLOSION_RADIUS = 3.5;      // Radius of the explosion effect and damage area
        const EXPLOSION_DAMAGE = 30;       // Base damage dealt by the explosion
        const EXPLOSION_HEIGHT = 0.5;      // Height at which the explosion occurs
        const EXPLOSION_COUNTDOWN = 1.5;   // Time in seconds before detonation
        const EXPLOSION_TRIGGER_DISTANCE = 3.0; // Distance to player that triggers explosion
        
        // Debug log update call
        logger.verbose('enemy', `Exploder update method called (at ${exploder.position.x.toFixed(2)},${exploder.position.z.toFixed(2)}), isExploding: ${exploder.isExploding}`);
        
        const { 
            playerPosition, 
            delta, 
            collisionSettings,
            environmentObjects,
            nearbyZombies,
            gameState,
            checkCollision,
            pushAway
        } = context;
        
        // Special exploder behavior - explodes when close to player
        const direction = new THREE.Vector3(
            playerPosition.x - exploder.position.x,
            0,
            playerPosition.z - exploder.position.z
        );
        
        const distance = direction.length();
        
        // Debug distance to player
        logger.verbose('enemy', `Exploder distance to player: ${distance.toFixed(2)}`);
        
        // Exploder specific behavior - start exploding when close to player
        if (distance < EXPLOSION_TRIGGER_DISTANCE && !exploder.isExploding) {
            logger.debug('enemy', `Exploder starting explosion sequence`);
            
            exploder.isExploding = true;
            exploder.explosionTimer = EXPLOSION_COUNTDOWN; // Time before exploding
            
            // Change color to red - handle differently based on model type
            if (exploder.userData.exploderModelLoaded) {
                // For 3D model - traverse the model to change all materials
                exploder.traverse(child => {
                    if (child.isMesh && child.material) {
                        const materials = Array.isArray(child.material) ? child.material : [child.material];
                        
                        materials.forEach(material => {
                            material.color.set(0xff0000);
                            if (material.emissive) {
                                material.emissive.set(0xff0000);
                                material.emissiveIntensity = 0.5;
                            }
                        });
                    }
                });
            } else {
                // For geometric model - access children directly
                exploder.children.forEach(child => {
                    if (child.material && child.material.color) {
                        child.material.color.set(0xff0000);
                        if (child.material.emissive) {
                            child.material.emissive.set(0xff0000);
                            child.material.emissiveIntensity = 0.5;
                        }
                    }
                });
            }
            
            return; // Don't move once exploding starts
        } else if (exploder.isExploding) {
            // Update explosion timer and flashing effect
            exploder.explosionTimer -= delta;
            
            logger.verbose('enemy', `Exploder explosion timer: ${exploder.explosionTimer.toFixed(2)}`);
            
            const flashSpeed = Math.max(0.1, exploder.explosionTimer / 3);
            const flashIntensity = Math.sin(Date.now() * 0.01 / flashSpeed) * 0.5 + 0.5;
            
            // Make it flash red/yellow as countdown progresses
            if (exploder.userData.exploderModelLoaded) {
                // For 3D model
                exploder.traverse(child => {
                    if (child.isMesh && child.material) {
                        const materials = Array.isArray(child.material) ? child.material : [child.material];
                        
                        materials.forEach(material => {
                            // Flash between red and yellow
                            const r = 1.0;
                            const g = flashIntensity * 0.8;
                            const b = 0;
                            material.color.setRGB(r, g, b);
                            
                            if (material.emissive) {
                                material.emissive.setRGB(r * 0.5, g * 0.5, 0);
                                material.emissiveIntensity = 0.5 + flashIntensity * 0.5;
                            }
                        });
                    }
                });
            } else {
                // For geometric model
                exploder.children.forEach(child => {
                    if (child.material && child.material.color) {
                        // Flash between red and yellow
                        const r = 1.0;
                        const g = flashIntensity * 0.8;
                        const b = 0;
                        child.material.color.setRGB(r, g, b);
                        
                        if (child.material.emissive) {
                            child.material.emissive.setRGB(r * 0.5, g * 0.5, 0);
                            child.material.emissiveIntensity = 0.5 + flashIntensity * 0.5;
                        }
                    }
                });
            }
            
            // Wobble/shake the exploder as it's about to explode
            const wobbleIntensity = Math.min(0.05, (1.5 - exploder.explosionTimer) * 0.1);
            exploder.position.x += (Math.random() - 0.5) * wobbleIntensity;
            exploder.position.z += (Math.random() - 0.5) * wobbleIntensity;
            
            // Explode when timer runs out
            if (exploder.explosionTimer <= 0) {
                logger.info('enemy', `Exploder detonating at ${exploder.position.x.toFixed(2)},${exploder.position.z.toFixed(2)}`);
                
                // Create explosion effect using the centralized explosion function in zombieUtils.js
                createExplosion(
                    context.scene,
                    new THREE.Vector3(
                        exploder.position.x,
                        EXPLOSION_HEIGHT, // Height of explosion
                        exploder.position.z
                    ),
                    EXPLOSION_RADIUS, // Explosion radius
                    EXPLOSION_DAMAGE, // Explosion damage
                    nearbyZombies, 
                    context.playerObject || playerPosition,
                    gameState,
                    'zombie' // Source is zombie
                );
                
                // All explosion effects, damage calculations, and cleanup are handled by the createExplosion function
                
                // Remove this exploder from the scene
                if (context.scene) {
                    context.scene.remove(exploder);
                }
                
                // Mark for cleanup
                exploder.markedForDeletion = true;
                exploder.health = 0;
                
                return;
            }
            
            return; // Don't move while exploding
        }
        
        // Standard movement when not exploding (normalized for consistent speed)
        const finalDirection = direction.clone().normalize();
        
        // Add slight jitter to movement
        const randomFactor = Math.min(0.15, distance * 0.005);
        const randomAngle = (Math.random() - 0.5) * Math.PI * randomFactor;
        finalDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), randomAngle);
        
        // Calculate movement
        const moveDistance = exploder.speed * delta * 60;
        const intendedPosition = new THREE.Vector3()
            .copy(exploder.position)
            .addScaledVector(finalDirection, moveDistance);
        
        // Player collision
        const { COLLISION_DISTANCE, ZOMBIE_COLLISION_DISTANCE } = collisionSettings;
        
        if (checkCollision(intendedPosition, playerPosition, COLLISION_DISTANCE)) {
            const newPosition = pushAway(intendedPosition, playerPosition, COLLISION_DISTANCE);
            intendedPosition.x = newPosition.x;
            intendedPosition.z = newPosition.z;
        }
        
        // Zombie collisions
        for (let i = 0; i < nearbyZombies.length; i++) {
            const otherZombie = nearbyZombies[i];
            if (!otherZombie || !otherZombie.mesh || otherZombie === exploder) continue;
            
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
        exploder.position.copy(intendedPosition);
        exploder.rotation.y = Math.atan2(finalDirection.x, finalDirection.z);
    };

    return exploder;
}

/**
 * Creates the default exploder geometry using primitives (original implementation)
 * @param {THREE.Group} exploder - The exploder group to add geometry to
 */
function createDefaultExploderGeometry(exploder) {
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
}
