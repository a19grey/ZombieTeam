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
import * as THREE from 'three';
import { logger } from '../utils/logger.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Add 'enemy' to logger sections if not already included
logger.addSection('enemy');
logger.addSection('enemyspawner');

export const createZombieKing = (position, baseSpeed) => {
    // Configuration parameters
    const scale = new THREE.Vector3(1,1,1); // Scale vector for easy adjustment
    const kingScale = 1.65; // Scale for the 3D model
    
    const king = new THREE.Group();
    
    // Try to load the zombie king 3D model first
    const loader = new GLTFLoader();
    
    // Promise-based loading to handle fallback
    const loadZombieKingModel = () => {
        return new Promise((resolve, reject) => {
            // Attempt to load the model
            loader.load('./zombieking.glb', 
                (gltf) => {
                    logger.info('enemy', 'Successfully loaded zombieking.glb model');
                    
                    // Add the loaded model to the king group
                    const model = gltf.scene;
                    model.scale.set(kingScale, kingScale, kingScale); // Scale appropriately
                    model.position.y = kingScale; // Position at ground level
                    
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
                                material.color.multiplyScalar(1.9);
                                
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
                    
                    king.add(model);
                    
                    // Store model loaded status in userData for other functions to reference
                    king.userData.kingModelLoaded = true;
                    resolve(true);
                },
                (xhr) => {
                    logger.debug('enemy', `Zombie King model loading: ${(xhr.loaded / xhr.total * 100).toFixed(2)}%`);
                },
                (error) => {
                    logger.warn('enemy', 'Failed to load zombieking.glb model', { error: error.message });
                    reject(error);
                }
            );
        });
    };

    // Position the king
    king.position.set(position.x, 0, position.z);
    king.mesh = king;
    
    // Set enemy type for special behavior
    king.enemyType = 'zombieKing';
    king.summonCooldown = 0; // For tracking when the king can summon minions
    
    // Set initial speed relative to baseSpeed (slower than standard zombie, but will increase over time)
    king.speed = baseSpeed * 0.85; // 70% of base speed initially
    
    // Set mass for physics calculations - zombieKing is heavy
    king.mass = 2.0;
    
    // Set default health - zombie king has high health
    king.health = 650;
    
    // Set points value for this enemy type
    king.points = king.health/100; // High points for boss enemy
    
    // Try to load the 3D model first, then fall back to original geometry if it fails
    loadZombieKingModel().catch(() => {
        logger.info('enemy', 'Falling back to default geometry zombie king model');
        createDefaultZombieKingGeometry(king);
    });
    
    // Scale the zombie king according to scale parameter
    // Only scale the default geometry version, as the 3D model is already scaled
    if (!king.userData.kingModelLoaded) {
        king.scale.copy(scale);
    }
    
    /**
     * Updates the zombie king's position and behavior
     * @param {Object} context - The update context containing all necessary information
     */
    king.update = (context) => {
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
        
        // Special zombie king behavior - can summon minions
        king.summonCooldown -= delta;
        
        // Summon minions logic would go here if cooldown reached zero
        // Example:
        // if (king.summonCooldown <= 0 && gameState && typeof gameState.spawnMinion === 'function') {
        //     gameState.spawnMinion(king.position, 3); // Spawn 3 minions
        //     king.summonCooldown = 15; // Reset cooldown to 15 seconds
        // }
        
        // Calculate direction to player
        const direction = new THREE.Vector3(
            playerPosition.x - king.position.x,
            0,
            playerPosition.z - king.position.z
        );
        
        const distance = direction.length();
        const finalDirection = direction.clone().normalize();
        
        // Add slight randomness to movement (less than normal zombies)
        const randomFactor = Math.min(0.05, distance * 0.003); // Kings are more focused
        const randomAngle = (Math.random() - 0.5) * Math.PI * randomFactor;
        finalDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), randomAngle);
        
        // Calculate intended position
        const moveDistance = king.speed * delta * 60;
        const intendedPosition = new THREE.Vector3()
            .copy(king.position)
            .addScaledVector(finalDirection, moveDistance);
        
        // Player collision
        const { COLLISION_DISTANCE, DAMAGE_DISTANCE, DAMAGE_PER_SECOND, ZOMBIE_COLLISION_DISTANCE } = collisionSettings;
        
        if (checkCollision(intendedPosition, playerPosition, COLLISION_DISTANCE)) {
            const newPosition = pushAway(intendedPosition, playerPosition, COLLISION_DISTANCE);
            intendedPosition.x = newPosition.x;
            intendedPosition.z = newPosition.z;
            
            if (checkCollision(intendedPosition, playerPosition, DAMAGE_DISTANCE)) {
                // Zombie King deals double damage
                const damageAmount = DAMAGE_PER_SECOND * delta * 2;
                if (gameState) damagePlayer(gameState, damageAmount);
            }
        }
        
        // Zombie collisions - Kings push other zombies away
        for (let i = 0; i < nearbyZombies.length; i++) {
            const otherZombie = nearbyZombies[i];
            if (!otherZombie || !otherZombie.mesh || otherZombie.mesh.isExploding) continue;
            
            if (checkCollision(intendedPosition, otherZombie.mesh.position, ZOMBIE_COLLISION_DISTANCE)) {
                const thisSize = king.mass || 2.0;
                const otherSize = otherZombie.mesh.mass || 1.0;
                
                // Zombie King is stronger and pushes others away more forcefully
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
        king.position.copy(intendedPosition);
        king.rotation.y = Math.atan2(finalDirection.x, finalDirection.z);
    };
    
    // Add logging statements at appropriate places
    logger.info('enemyspawner', `Creating zombie king at ${position.x.toFixed(2)},${position.z.toFixed(2)}`);
    
    return king;
};

/**
 * Creates the default zombie king geometry using primitives (original implementation)
 * @param {THREE.Group} king - The zombie king group to add geometry to
 */
function createDefaultZombieKingGeometry(king) {
    // Larger head with crown
    const headGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
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
    const bodyGeometry = new THREE.BoxGeometry(0.8, 1.7, 0.4);
    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: 0x1a3c34,
        roughness: 0.9
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 1.35;
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
}