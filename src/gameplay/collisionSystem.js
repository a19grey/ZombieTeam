/**
 * Unified Collision System - Centralizes all collision detection and handling
 * 
 * This module combines the collision detection and handling functionality from
 * both physics.js and combat.js to create a single, optimized system for all
 * collision detection in the game. This will allow for better performance and
 * easier maintenance.
 * 
 * Example usage:
 *   import { handleCollisions } from './gameplay/collisionSystem.js';
 *   
 *   // In game loop
 *   handleCollisions(scene, gameState, delta);
 */

import * as THREE from 'three';
import { logger } from '../utils/logger.js';
import { createExplosion } from './zombieUtils.js';
import { damageZombie, isZombieDead } from './zombie.js';
import { createSmokeTrail } from './powerups2.js';
import { showMessage } from '../ui/ui.js';
import { playSound } from './audio.js';
import { damagePowerup } from './powerupSpawner.js';
import { createBullet } from './weapons.js';
import { processDismemberment } from './dismemberment.js';

// Reusable objects for ray-based collision detection
const raycaster = new THREE.Raycaster();
const tempMatrix = new THREE.Matrix4();
const tempVector = new THREE.Vector3();
const intersectionPoint = new THREE.Vector3();

/**
 * Collision object types for optimized collision detection
 * Using bitmasks to allow multiple type assignments for a single object
 */
export const CollisionType = {
    NONE: 0,
    PLAYER: 1 << 0,      // 1
    ZOMBIE: 1 << 1,      // 2
    BULLET: 1 << 2,      // 4
    POWERUP: 1 << 3,     // 8
    OBSTACLE: 1 << 4,    // 16
    PROJECTILE: 1 << 5,  // 32
    MINE: 1 << 6,        // 64
    PORTAL: 1 << 7       // 128
};

/**
 * Collision groups for filtering what objects should collide with each other
 * Using bitmasks to allow efficient collision filtering
 */
export const CollisionGroup = {
    NONE: 0,
    DEFAULT: 0xFFFFFFFF,  // Collide with everything by default
    PLAYER: CollisionType.ZOMBIE | CollisionType.POWERUP | CollisionType.OBSTACLE | CollisionType.PORTAL,
    ZOMBIE: CollisionType.PLAYER | CollisionType.BULLET | CollisionType.ZOMBIE | CollisionType.MINE,
    BULLET: CollisionType.ZOMBIE | CollisionType.OBSTACLE | CollisionType.POWERUP,
    POWERUP: CollisionType.PLAYER | CollisionType.BULLET,
    PORTAL: CollisionType.PLAYER
};

/**
 * Spatial grid for optimized collision detection
 * Divides the game world into cells for faster spatial queries
 */
class SpatialGrid {
    constructor(cellSize = 10, worldSize = 1000) {
        this.cellSize = cellSize;
        this.worldSize = worldSize;
        this.grid = new Map(); // Maps cell coordinates to arrays of objects
    }
    
    /**
     * Get cell coordinates for a position
     * @param {THREE.Vector3} position - The position to get cell for
     * @returns {string} Cell key in format "x,z"
     */
    getCell(position) {
        const cellX = Math.floor(position.x / this.cellSize);
        const cellZ = Math.floor(position.z / this.cellSize);
        return `${cellX},${cellZ}`;
    }
    
    /**
     * Add an object to the grid
     * @param {Object} object - The object to add
     * @param {THREE.Vector3} position - Position of the object
     */
    addObject(object, position) {
        const cell = this.getCell(position);
        
        if (!this.grid.has(cell)) {
            this.grid.set(cell, []);
        }
        
        this.grid.get(cell).push(object);
    }
    
    /**
     * Remove an object from the grid
     * @param {Object} object - The object to remove
     * @param {THREE.Vector3} position - Position of the object
     */
    removeObject(object, position) {
        const cell = this.getCell(position);
        
        if (this.grid.has(cell)) {
            const cellObjects = this.grid.get(cell);
            const index = cellObjects.indexOf(object);
            
            if (index !== -1) {
                cellObjects.splice(index, 1);
            }
            
            // Remove empty cells
            if (cellObjects.length === 0) {
                this.grid.delete(cell);
            }
        }
    }
    
    /**
     * Update an object's position in the grid
     * @param {Object} object - The object to update
     * @param {THREE.Vector3} oldPosition - Previous position
     * @param {THREE.Vector3} newPosition - New position
     */
    updateObject(object, oldPosition, newPosition) {
        const oldCell = this.getCell(oldPosition);
        const newCell = this.getCell(newPosition);
        
        // Only update if the object has moved to a different cell
        if (oldCell !== newCell) {
            this.removeObject(object, oldPosition);
            this.addObject(object, newPosition);
        }
    }
    
    /**
     * Get objects in neighboring cells
     * @param {THREE.Vector3} position - Position to query
     * @param {number} radius - Radius in cells to check
     * @returns {Array} Array of objects in neighboring cells
     */
    getNearbyObjects(position, radius = 1) {
        const centerX = Math.floor(position.x / this.cellSize);
        const centerZ = Math.floor(position.z / this.cellSize);
        const objects = [];
        
        // Get all objects in the area
        for (let x = centerX - radius; x <= centerX + radius; x++) {
            for (let z = centerZ - radius; z <= centerZ + radius; z++) {
                const cell = `${x},${z}`;
                
                if (this.grid.has(cell)) {
                    objects.push(...this.grid.get(cell));
                }
            }
        }
        
        return objects;
    }
    
    /**
     * Clear the entire grid
     */
    clear() {
        this.grid.clear();
    }
}

// Create a spatial grid for the game world
const spatialGrid = new SpatialGrid(20, 2000); // 20 unit cells, 2000 unit world size

/**
 * Register object with the collision system
 * @param {Object} object - The object to register
 * @param {number} type - The collision type (from CollisionType)
 * @param {number} group - The collision group (from CollisionGroup)
 */
export const registerCollisionObject = (object, type = CollisionType.NONE, group = CollisionGroup.DEFAULT) => {
    // Skip if object is not defined
    if (!object) return;
    
    // Set collision properties
    object.collisionType = type;
    object.collisionGroup = group;
    
    // Add to spatial grid if position is available
    if (object.position || (object.mesh && object.mesh.position)) {
        const position = object.position || object.mesh.position;
        spatialGrid.addObject(object, position);
    }
};

/**
 * Unregister object from the collision system
 * @param {Object} object - The object to unregister
 */
export const unregisterCollisionObject = (object) => {
    // Skip if object is not defined
    if (!object) return;
    
    // Remove from spatial grid if position is available
    if (object.position || (object.mesh && object.mesh.position)) {
        const position = object.position || object.mesh.position;
        spatialGrid.removeObject(object, position);
    }
    
    // Clear collision properties
    object.collisionType = null;
    object.collisionGroup = null;
};

/**
 * Update spatial partitioning data when objects move
 * @param {Object} gameState - The game state with all objects
 */
export const updateSpatialPartitioning = (gameState) => {
    // Skip if gameState is not available
    if (!gameState) return;
    
    // We'll gradually transition to spatial partitioning in a future update
    // For now, just prepare the interface
    
    // This is a placeholder for future actual implementation
    // At that time, we'll populate the spatial grid more actively
};

/**
 * Simple distance-based collision detection between two points
 * 
 * @param {THREE.Vector3} pos1 - Position of the first object
 * @param {THREE.Vector3} pos2 - Position of the second object
 * @param {number} threshold - Distance threshold for collision
 * @returns {boolean} True if the objects are colliding
 */
export const checkCollision = (pos1, pos2, threshold) => {
    // Safety check for undefined positions
    if (!pos1 || !pos2 || typeof pos1.x !== 'number' || typeof pos2.x !== 'number') {
        return false;
    }
    
    const dx = pos1.x - pos2.x;
    const dz = pos1.z - pos2.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    return distance < threshold;
};

/**
 * Ray-based collision detection for spheres
 * 
 * @param {THREE.Vector3} rayOrigin - Start point of ray
 * @param {THREE.Vector3} rayDirection - Direction of ray (normalized)
 * @param {THREE.Vector3} sphereCenter - Center of sphere
 * @param {number} sphereRadius - Radius of sphere
 * @param {THREE.Vector3} intersectionPoint - Output parameter for storing intersection point
 * @returns {boolean} True if ray intersects sphere
 */
export const rayIntersectsSphere = (rayOrigin, rayDirection, sphereCenter, sphereRadius, intersectionPoint) => {
    // Vector from ray origin to sphere center
    const L = new THREE.Vector3().subVectors(sphereCenter, rayOrigin);
    
    // Project L onto ray direction to get closest point on ray
    const tca = L.dot(rayDirection);
    
    // If negative, sphere is behind ray
    if (tca < 0) return false;
    
    // Distance squared from sphere center to ray
    const d2 = L.dot(L) - tca * tca;
    
    // If greater than radius squared, no intersection
    const radiusSquared = sphereRadius * sphereRadius;
    if (d2 > radiusSquared) return false;
    
    // Half chord distance squared
    const thc = Math.sqrt(radiusSquared - d2);
    
    // Calculate intersection distances
    const t0 = tca - thc;
    const t1 = tca + thc;
    
    // Make sure at least one intersection is in positive ray direction
    if (t0 < 0 && t1 < 0) return false;
    
    // Get first positive intersection
    const t = t0 >= 0 ? t0 : t1;
    
    // Calculate intersection point if requested
    if (intersectionPoint) {
        intersectionPoint.copy(rayOrigin).addScaledVector(rayDirection, t);
    }
    
    return true;
};

/**
 * Prevents objects from overlapping by pushing them apart
 * 
 * @param {THREE.Vector3} objPos - Position of the object to push
 * @param {THREE.Vector3} fromPos - Position to push away from
 * @param {number} minDistance - Minimum distance to maintain
 * @returns {THREE.Vector3} New position for the object
 */
export const pushAway = (objPos, fromPos, minDistance) => {
    // Calculate direction vector
    const dx = objPos.x - fromPos.x;
    const dz = objPos.z - fromPos.z;
    
    // Calculate current distance
    const currentDistance = Math.sqrt(dx * dx + dz * dz);
    
    // If already at minimum distance or further, no need to push
    if (currentDistance >= minDistance) {
        return objPos;
    }
    
    // Normalize direction
    const normalizedDx = dx / currentDistance;
    const normalizedDz = dz / currentDistance;
    
    // Calculate new position
    return {
        x: fromPos.x + normalizedDx * minDistance,
        y: objPos.y,
        z: fromPos.z + normalizedDz * minDistance
    };
};

/**
 * Creates a hit effect at the specified position
 * 
 * @param {THREE.Scene} scene - The scene to add the effect to
 * @param {THREE.Vector3} position - Position for the effect
 * @param {number} size - Size of the effect
 */
export const createHitEffect = (scene, position, size = 0.5) => {
    // Create a small particle effect
    const geometry = new THREE.SphereGeometry(size, 8, 8);
    const material = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.8
    });
    
    const effect = new THREE.Mesh(geometry, material);
    effect.position.copy(position);
    scene.add(effect);
    
    // Animate and remove the effect
    let scale = 1;
    const fadeOut = () => {
        scale -= 0.1;
        effect.scale.set(scale, scale, scale);
        effect.material.opacity = scale;
        
        if (scale > 0) {
            requestAnimationFrame(fadeOut);
        } else {
            scene.remove(effect);
            effect.geometry.dispose();
            effect.material.dispose();
        }
    };
    
    fadeOut();
};

/**
 * Updates smoke trails for grenade projectiles
 * 
 * @param {THREE.Scene} scene - The scene to add smoke particles to
 * @param {Array} bullets - Array of bullet objects
 */
export const updateGrenadeTrails = (scene, bullets) => {
    let grenadesWithTrails = 0;
    
    for (let i = 0; i < bullets.length; i++) {
        const bullet = bullets[i];
        if (bullet.isGrenade && bullet.mesh) {
            grenadesWithTrails++;
            // Create smoke trail
            const smokeParticle = createSmokeTrail(bullet.mesh.position.clone());
            scene.add(smokeParticle);
            bullet.smokeTrail.push(smokeParticle);
            
            // Update existing smoke particles
            for (let j = bullet.smokeTrail.length - 1; j >= 0; j--) {
                const smoke = bullet.smokeTrail[j];
                smoke.position.y += 0.01;
                smoke.material.opacity -= smoke.userData.fadeRate;
                
                if (smoke.material.opacity <= 0) {
                    scene.remove(smoke);
                    bullet.smokeTrail.splice(j, 1);
                }
            }
        }
    }
    
    if (grenadesWithTrails > 0) {
        logger.debug('grenadelauncher', `Updating ${grenadesWithTrails} grenade smoke trails in collisionSystem.js`);
    }
};

/**
 * Comprehensive bullet collision detection and handling function
 * 
 * This function is the heart of Step 3 in the collision system unification.
 * It combines both ray-based collision detection (from combat.js) and
 * distance-based collision detection (from physics.js) into a single system
 * that handles both bullet-zombie and bullet-powerup collisions.
 * 
 * @param {THREE.Scene} scene - The Three.js scene
 * @param {Object} gameState - The game state object
 * @param {Object} player - The player object
 * @param {boolean} handleResponse - Whether to apply actual collision responses or just detect
 * @returns {Object} Statistics about processed collisions
 */
export const handleBulletCollisions = (scene, gameState, player, handleResponse) => {
    // Create a stats object to track and compare with original systems
    const stats = {
        bulletsProcessed: 0,
        zombieHits: 0,
        powerupHits: 0,
        zombiesKilled: 0,
        grenadesProcessed: 0,
        bulletsRemoved: 0
    };
    
    if (!gameState || !scene) {
        logger.warn('collision', 'L: Missing parameters');
        return stats;
    }
    
    const { bullets, zombies } = gameState;
    if (!bullets || !zombies) {
        logger.warn('collision', 'N: Bullet or zombie array missing');   
        return stats;
    }
    
    // Get powerups array safely
    const powerups = gameState.powerups || [];
    
    // Update grenade smoke trails (migrated from combat.js)
    updateGrenadeTrails(scene, bullets);
    
    // Process each bullet
    logger.info('collision', `O: Processing bullets`, { 
        bulletCount: bullets.length 
    });
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        logger.info('collision', `P: Processing bullet ${i}`, { 
            bulletExists: !!bullet, 
            bulletType: bullet ? bullet.type : 'N/A'
        });
        if (!bullet) continue;
        logger.info('collision', `Q: Bullet ${i} exists`, { 
            bulletExists: !!bullet, 
            bulletType: bullet ? bullet.type : 'N/A',
            bulletToRemove: bullet.toRemove
        });
        stats.bulletsProcessed++;
        
        // Skip if bullet is already marked for removal
        // if (bullet.toRemove) continue;
        
        // Get bullet position - handle both tracer and non-tracer bullets
        const bulletPosition = bullet.mesh ? bullet.mesh.position : bullet.position;
        if (!bulletPosition) continue;
        
        // Track if this bullet is a grenade
        if (bullet.isGrenade) {
            stats.grenadesProcessed++;
            logger.debug('grenadelauncher', 'Processing grenade bullet collision in unified system', {
                position: [bulletPosition.x.toFixed(2), bulletPosition.y.toFixed(2), bulletPosition.z.toFixed(2)]
            });
        }
        
        let bulletHit = false; // Tracks if bullet hit anything
        
        // FIRST PART: RAY-BASED ZOMBIE COLLISION DETECTION (from combat.js)
        // Only do ray-casting if we have previousPosition data
        logger.debug('collision', `N: Checking bullet collision vs zombies`, { 
            bulletExists: !!bullet, 
            bulletPosition: bullet.previousPosition 
        });
        if (bullet.previousPosition) {
            // Create a ray from the previous position to the current position
            const rayOrigin = bullet.previousPosition;
            const rayDirection = new THREE.Vector3().subVectors(bulletPosition, rayOrigin).normalize();
            const rayLength = bulletPosition.distanceTo(rayOrigin);
            
            // Variables to store closest intersection
            let closestIntersection = null;
            let closestDistance = Infinity;
            let hitZombieIndex = -1;
            
            // Check each zombie for intersection with the ray
            for (let j = zombies.length - 1; j >= 0; j--) {
                const zombie = zombies[j];
                logger.debug('collision', `M: Checking bullet collision vs zombie ${j}`, { 
                    health: zombie.health, 
                    meshExists: !!zombie.mesh, 
                    position: [zombie.mesh.position.x.toFixed(1), zombie.mesh.position.y.toFixed(1), zombie.mesh.position.z.toFixed(1)] 
                });
                // --- DEBUG LOGGING ---
                // Log the state of the zombie *before* the skip check
                if (zombie && zombie.mesh) {
                    logger.debug('collision', `A: Checking bullet collision vs zombie ${j}`, { 
                        health: zombie.health, 
                        meshExists: !!zombie.mesh, 
                        position: [zombie.mesh.position.x.toFixed(1), zombie.mesh.position.y.toFixed(1), zombie.mesh.position.z.toFixed(1)] 
                    });
                } else {
                    logger.debug('collision', `B: Checking bullet collision vs zombie ${j}`, { 
                        zombieExists: !!zombie, 
                        meshExists: zombie ? !!zombie.mesh : false, 
                        health: zombie ? zombie.health : 'N/A' 
                    });
                }
                // --- END DEBUG LOGGING ---
                
                // Skip if zombie is already dead or invalid
                if (!zombie || !zombie.mesh || zombie.health <= 0) continue;
                
                // Check collision with ray
                const zombieIntersectionPoint = new THREE.Vector3();
                const zombieCollisionRadius = 1.5; // Adjust based on zombie size
                
                if (rayIntersectsSphere(
                    rayOrigin, 
                    rayDirection, 
                    zombie.mesh.position, 
                    zombieCollisionRadius, 
                    zombieIntersectionPoint
                )) {
                    // Calculate distance to intersection
                    const distToIntersection = rayOrigin.distanceTo(zombieIntersectionPoint);
                    
                    // Make sure intersection is within ray length and is closest
                    if (distToIntersection <= rayLength && distToIntersection < closestDistance) {
                        closestDistance = distToIntersection;
                        closestIntersection = zombieIntersectionPoint.clone();
                        hitZombieIndex = j;
                    }
                }
            }
            
            // If we found an intersection, handle the zombie hit
            if (closestIntersection && hitZombieIndex !== -1) {
                const zombie = zombies[hitZombieIndex];
                stats.zombieHits++;
                bulletHit = true;
                
                // Log collision
                logger.info('collision', 'K: Unified system: Ray-based bullet hit zombie', {
                    bulletPos: [bulletPosition.x.toFixed(2), bulletPosition.y.toFixed(2), bulletPosition.z.toFixed(2)],
                    zombiePos: [zombie.mesh.position.x.toFixed(2), zombie.mesh.position.y.toFixed(2), zombie.mesh.position.z.toFixed(2)],
                    damage: bullet.damage || 0
                });
                
                if (handleResponse) {
                    // Apply damage to zombie
                    const damageAmount = bullet.damage || 0; // Ensure damage is a number
                    zombie.health -= damageAmount;
                    
                    // Process dismemberment based on the damage dealt by the bullet
                    if (damageAmount > 0 && scene) {
                        processDismemberment(zombie, damageAmount, scene);
                    }
                    
                    // Move bullet to the intersection point
                    if (bullet.mesh) {
                        bullet.mesh.position.copy(closestIntersection);
                    }
                    bullet.position.copy(closestIntersection);
                    
                    // Mark bullet for removal
                    bullet.toRemove = true;
                    
                    // Handle explosive bullets (grenades)
                    if (bullet.isExplosive || bullet.isGrenade) {
                        logger.info('grenadelauncher', 'Grenade impact detected in collisionSystem.js - creating explosion');
                        // Keep radius at 3 but prevent player damage
                        const explosionRadius = 3; // Standard radius for grenades
                        const explosionDamage = bullet.isGrenade ? 75 : 50; // More damage for grenades
                        
                        createExplosion(
                            scene, 
                            bullet.position.clone(), 
                            explosionRadius,
                            explosionDamage,
                            gameState.zombies, 
                            player, 
                            gameState,
                            'player' // Specify 'player' as source to prevent self-damage
                        );
                    }
                    
                    // Check if zombie is dead
                    if (zombie.health <= 0) {
                        stats.zombiesKilled++;
                        
                        // Award points based on enemy's points property
                        const pointsAwarded = zombie.mesh.points || 10; // Default to 10 if points not set
                        gameState.score += pointsAwarded;
                        
                        // Handle special death effects
                        if (zombie.type === 'exploder' && zombie.mesh.isExploding) {
                            createExplosion(
                                scene, 
                                zombie.mesh.position.clone(), 
                                3, // radius
                                50, // damage
                                gameState.zombies, 
                                player, 
                                gameState,
                                'zombie' // This explosion should damage the player since it's from a zombie
                            );
                        }
                        
                        // Increment kill counter
                        gameState.stats.zombiesKilled++;
                        
                        // Remove zombie from scene
                        scene.remove(zombie.mesh);
                        
                        // Remove zombie from array
                        zombies.splice(hitZombieIndex, 1);
                    }
                }
            }
        }
        
        // SECOND PART: DISTANCE-BASED POWERUP COLLISION DETECTION (from physics.js)
        // Check for bullet-powerup collisions
        for (let p = 0; p < powerups.length; p++) {
            const powerup = powerups[p];
            
            // Skip if powerup is not active or already unlocked
            if (!powerup || !powerup.active || powerup.unlocked) continue;
            
            // Skip if bullet already hit a zombie
            if (bulletHit) break;
            
            // Using a larger collision distance for better hit detection
            const POWERUP_COLLISION_DISTANCE = 2.0;
            
            // Check if bullet hits powerup using distance-based collision
            if (checkCollision(bulletPosition, powerup.mesh.position, POWERUP_COLLISION_DISTANCE)) {
                stats.powerupHits++;
                bulletHit = true;
                
                // Get bullet damage
                const bulletDamage = bullet.damage || bullet.userData?.damage || 20;
                
                // Log collision
                logger.info('collision', 'Unified system: Bullet hit powerup', {
                    bulletPos: [bulletPosition.x.toFixed(2), bulletPosition.y.toFixed(2), bulletPosition.z.toFixed(2)],
                    powerupPos: [powerup.mesh.position.x.toFixed(2), powerup.mesh.position.y.toFixed(2), powerup.mesh.position.z.toFixed(2)],
                    powerupType: powerup.type,
                    damage: bulletDamage
                });
                
                if (handleResponse) {
                    // Damage the powerup and pass gameState and scene for activation
                    const isUnlocked = damagePowerup(powerup, bulletDamage, gameState, scene);
                    
                    // Log powerup hit
                    logger.info('powerup', `Unified system: Powerup hit by bullet`, {
                        type: powerup.type,
                        damage: bulletDamage,
                        remainingHealth: powerup.health,
                        unlocked: powerup.unlocked,
                        active: powerup.active
                    });
                    
                    // Create a small hit effect
                    createHitEffect(scene, bulletPosition.clone(), 0.3);
                    
                    // Remove the bullet
                    if (bullet.mesh) {
                        scene.remove(bullet.mesh);
                    }
                    bullets.splice(i, 1);
                    stats.bulletsRemoved++;
                }
                
                break; // A bullet can only hit one powerup
            }
        }
        
        // If bullet didn't hit anything and we're handling responses, check for removal
        if (handleResponse && bullet.toRemove) {
            // Clean up smoke trail if it's a grenade
            if (bullet.isGrenade && bullet.smokeTrail) {
                logger.debug('grenadelauncher', 'Removing grenade and smoke trail in collisionSystem.js');
                for (const smoke of bullet.smokeTrail) {
                    scene.remove(smoke);
                }
            }
            
            // Only remove mesh from scene if it exists
            if (bullet.mesh) {
                scene.remove(bullet.mesh);
            }
            bullets.splice(i, 1);
            stats.bulletsRemoved++;
        }
    }
   
    // Log overall stats
    if (handleResponse) {
        logger.info('collision', 'G: Bullet handled:', stats);
    } else {
        logger.info('collision', 'H: Bullet detected:', stats);
    }
    
    return stats;
};

/**
 * Simple test function to verify the collision system is working
 * This is used to prove the module works as part of Step 2 of the transition
 * 
 * @param {Object} gameState - The game state object with objects to test
 * @returns {Object} Test results with collision counts
 */
export const testCollisionSystem = (gameState) => {
    if (!gameState) {
        logger.warn('collision', 'Cannot test collision system: gameState is missing');
        return { status: 'error', reason: 'gameState missing' };
    }
    
    const results = {
        status: 'success',
        distanceCollisions: 0,
        rayCollisions: 0
    };
    
    try {
        // Test distance-based collisions
        if (gameState.zombies && gameState.zombies.length > 0 && gameState.player) {
            for (const zombie of gameState.zombies) {
                if (zombie && zombie.mesh && checkCollision(zombie.mesh.position, gameState.player.position, 5)) {
                    results.distanceCollisions++;
                }
            }
        }
        
        // Test ray-based collisions
        if (gameState.zombies && gameState.zombies.length > 0) {
            const testRayOrigin = new THREE.Vector3(0, 1, 0);
            const testRayDirection = new THREE.Vector3(1, 0, 0).normalize();
            
            for (const zombie of gameState.zombies) {
                if (zombie && zombie.mesh) {
                    if (rayIntersectsSphere(
                        testRayOrigin,
                        testRayDirection,
                        zombie.mesh.position,
                        2,
                        new THREE.Vector3()
                    )) {
                        results.rayCollisions++;
                    }
                }
            }
        }
        
        logger.info('collision', 'Collision system test completed', results);
        return results;
    } catch (error) {
        logger.error('collision', 'Error testing collision system', error);
        return {
            status: 'error',
            reason: error.message || 'Unknown error'
        };
    }
};

/**
 * Main collision detection and handling function
 * 
 * @param {THREE.Scene} scene - The Three.js scene
 * @param {Object} gameState - The game state object
 * @param {number} delta - Time delta for frame-rate independent movement
 * @param {boolean} handleResponse - Whether to handle actual collision responses or just detect
 */
export const handleCollisions = (scene, gameState, delta, handleResponse = true) => {
    // Only log every few frames to avoid spamming the console
    const shouldLogThisFrame = Math.random() < 0.05; // Log roughly 5% of frames
    
    // Update spatial partitioning data (preparation for future optimization)
    updateSpatialPartitioning(gameState);
    
    // Run the unified bullet collision system 
    if (scene && gameState) {
        // Handle all types of collisions in a specific order
        // 1. First handle bullet collisions (can remove zombies)
        const bulletStats = handleBulletCollisions(scene, gameState, gameState.playerObject, handleResponse);
        
        // 2. Then handle zombie-zombie collisions (with remaining zombies)
        const zombieZombieStats = handleZombieZombieCollisions(scene, gameState, handleResponse);
        
        // 3. Finally handle player-zombie collisions
        const playerZombieStats = handlePlayerZombieCollisions(scene, gameState, gameState.playerObject, handleResponse);
        
        // Log comprehensive stats occasionally
        if (shouldLogThisFrame) {
            logger.info('collision', 'Unified collision system stats', {
                bullets: bulletStats.bulletsProcessed,
                zombieHits: bulletStats.zombieHits,
                powerupHits: bulletStats.powerupHits,
                zombiesKilled: bulletStats.zombiesKilled,
                playerZombieCollisions: playerZombieStats.playerZombieCollisions,
                zombieZombieCollisions: zombieZombieStats.zombieZombieCollisions,
                timestamp: Date.now()
            });
        }
    }
};

/**
 * Handles player-zombie collisions (damage effects, pushing, etc.)
 * 
 * @param {THREE.Scene} scene - The Three.js scene
 * @param {Object} gameState - The game state object
 * @param {Object} player - The player object
 * @param {boolean} handleResponse - Whether to apply actual collision responses or just detect
 * @returns {Object} Statistics about processed collisions
 */
export const handlePlayerZombieCollisions = (scene, gameState, player, handleResponse = true) => {
    const stats = {
        playerZombieCollisions: 0,
        damageDealt: 0
    };
    
    if (!gameState || !player || !gameState.zombies) {
        return stats;
    }
    
    const zombies = gameState.zombies;
    const DAMAGE_DISTANCE = 1.2;
    
    // Check player-zombie damage collisions
    for (let i = 0; i < zombies.length; i++) {
        const zombie = zombies[i];
        if (!zombie || !zombie.mesh || !zombie.mesh.position) continue;
        
        if (checkCollision(player.position, zombie.mesh.position, DAMAGE_DISTANCE)) {
            stats.playerZombieCollisions++;
            
            if (handleResponse) {
                // Visual effects for damage
                
                // Show damage indicator occasionally
                if (Math.random() < 0.2 && gameState.camera) {
                    // This would be the createDamageIndicator function from physics.js
                    // For now, we'll just log it
                    logger.debug('collision', 'Player damaged by zombie');
                    stats.damageDealt += 1; // Typical damage amount
                }
                
                // Visual feedback for damage - red flash
                try {
                    if (!player.userData.damageEffect) {
                        // Store original materials
                        if (!player.userData.originalMaterials) {
                            player.userData.originalMaterials = [];
                            player.traverse((child) => {
                                if (child.isMesh && child.material) {
                                    player.userData.originalMaterials.push({
                                        mesh: child,
                                        material: child.material.clone()
                                    });
                                }
                            });
                        }
                        
                        // Apply red material to all player meshes
                        player.traverse((child) => {
                            if (child.isMesh && child.material) {
                                child.material = new THREE.MeshStandardMaterial({
                                    color: 0xff0000,
                                    emissive: 0xff0000,
                                    emissiveIntensity: 0.5
                                });
                            }
                        });
                        
                        // Set damage effect flag
                        player.userData.damageEffect = true;
                        
                        // Reset after a short time
                        setTimeout(() => {
                            try {
                                // Restore original materials
                                if (player.userData.originalMaterials) {
                                    player.userData.originalMaterials.forEach((item) => {
                                        item.mesh.material = item.material;
                                    });
                                }
                                player.userData.damageEffect = false;
                            } catch (error) {
                                logger.error('Error restoring player materials:', error);
                            }
                        }, 100);
                    }
                } catch (error) {
                    logger.error('Error applying damage effect to player:', error);
                }
                
                // Visual feedback for damage - screen flash (would normally be in UI code)
                if (Math.random() < 0.1) { // Only occasionally to avoid spam
                    logger.debug(`Player damaged by zombie! Health: ${gameState.player.health.toFixed(1)}`);
                }
                
                // Update UI after damage
                if (typeof gameState.updateUI === 'function') {
                    gameState.updateUI(gameState);
                }
            }
        }
    }
    
    return stats;
};

/**
 * Handles zombie-zombie collisions (prevent overlapping)
 * 
 * @param {THREE.Scene} scene - The Three.js scene
 * @param {Object} gameState - The game state object
 * @param {boolean} handleResponse - Whether to apply actual collision responses or just detect
 * @returns {Object} Statistics about processed collisions
 */
export const handleZombieZombieCollisions = (scene, gameState, handleResponse) => {
    const stats = {
        zombieZombieCollisions: 0
    };
    
    if (!gameState || !gameState.zombies) {
        return stats;
    }
    
    const zombies = gameState.zombies;
    const ZOMBIE_COLLISION_DISTANCE = 1.0;
    
    // Prevent zombies from overlapping with each other
    for (let i = 0; i < zombies.length; i++) {
        const zombie1 = zombies[i];
        if (!zombie1 || !zombie1.mesh || !zombie1.mesh.position) continue;
        
        for (let j = i + 1; j < zombies.length; j++) {
            const zombie2 = zombies[j];
            if (!zombie2 || !zombie2.mesh || !zombie2.mesh.position) continue;
            
            if (checkCollision(zombie1.mesh.position, zombie2.mesh.position, ZOMBIE_COLLISION_DISTANCE)) {
                stats.zombieZombieCollisions++;
                
                if (handleResponse) {
                    // Push zombies away from each other
                    const newZombie2Pos = pushAway(zombie2.mesh.position, zombie1.mesh.position, ZOMBIE_COLLISION_DISTANCE);
                    zombie2.mesh.position.x = newZombie2Pos.x;
                    zombie2.mesh.position.z = newZombie2Pos.z;
                }
            }
        }
    }
    
    return stats;
}; 