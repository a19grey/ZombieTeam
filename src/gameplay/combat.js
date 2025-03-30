/**
 * Combat Module - Handles shooting and combat-related collision detection
 * 
 * This module contains functions for shooting bullets and handling combat-related
 * collisions between bullets, zombies, and the player. It centralizes combat logic
 * to keep the main game loop clean and focused.
 * 
 * Example usage:
 *   import { shootBullet, handleCombatCollisions } from './gameplay/combat.js';
 *   
 *   // Handle player shooting
 *   if (gameState.mouseDown) {
 *     shootBullet(scene, player, gameState);
 *   }
 *   
 *   // Handle combat collisions in game loop
 *   handleCombatCollisions(scene, player, gameState, delta);
 */

import * as THREE from 'three';
import { createBullet } from './weapons.js';
import { playSound } from './audio.js';
import { createExplosion, isZombieDead, handleZombieDeath, damageZombie } from './zombieUtils.js';
import { checkCollision } from './physics.js';
import { safeCall } from '../utils/safeAccess.js';
import { createSmokeTrail } from './powerups2.js';
import { logger } from '../utils/logger.js';

// Add THREE.Ray for ray-based collision detection
const raycaster = new THREE.Raycaster();
const tempMatrix = new THREE.Matrix4();

// Pre-create reusable muzzle flash light to avoid shader recompilation
const muzzleFlashLight = new THREE.PointLight(0xffff00, 1, 3);
muzzleFlashLight.visible = false;
let muzzleFlashTimeout = null;

/**
 * Initializes combat system and adds reusable objects to the scene
 * 
 * This function should be called once during game initialization to setup
 * reusable objects needed for combat effects.
 * 
 * @param {THREE.Scene} scene - The Three.js scene
 */
const initCombatSystem = (scene) => {
    // Add pre-created muzzle flash light to scene
    scene.add(muzzleFlashLight);
    logger.info('combat', 'Combat system initialized with reusable effects');
};

/**
 * Shoots a bullet from the player's weapon
 * 
 * This function handles creating bullets with different properties based on
 * the player's active powerup. It also manages cooldown between shots and
 * plays appropriate sound effects.
 * 
 * @param {THREE.Scene} scene - The Three.js scene to add bullets to
 * @param {THREE.Object3D} player - The player object
 * @param {Object} gameState - The game state object
 */
const shootBullet = (scene, player, gameState) => {
    // Check if enough time has passed since the last shot
    const currentTime = Date.now();
    // Use debug gun fire rate if available
    const fireRateCooldown = gameState.debug && gameState.debug.gunFireRate ? gameState.debug.gunFireRate : 100;
    
    // Apply rapid fire powerup effect if active
    let actualFireRate = fireRateCooldown;
    if (gameState.player.activePowerup === 'rapidFire') {
        actualFireRate = fireRateCooldown / 3; // 3x faster fire rate
        logger.info('combat', 'Rapid fire powerup active! Fire rate boosted');
    }
    
    if (currentTime - gameState.lastShotTime < actualFireRate) {
        return; // Still in cooldown
    }
    
    gameState.lastShotTime = currentTime;
    
    // Log active powerup when shooting
    if (gameState.player.activePowerup) {
        logger.info('combat', `Shooting with active powerup: ${gameState.player.activePowerup}, duration: ${gameState.player.powerupDuration.toFixed(2)}`);
    }
    
    // Play gunshot 
    playSound('gunshot');
    
    // Get player's forward direction - now using positive Z as forward
    const direction = new THREE.Vector3(0, 0, 1);
    direction.applyQuaternion(player.quaternion);
    
    // Get weapon mount position if available
    let bulletPosition;
    if (player.userData.weaponMount) {
        bulletPosition = new THREE.Vector3();
        player.userData.weaponMount.getWorldPosition(bulletPosition);
        
        // Reduced offset for bullets to hit closer enemies
        bulletPosition.add(direction.clone().multiplyScalar(0.05));
    } else {
        // Fallback to position in front of player with reduced offset
        bulletPosition = new THREE.Vector3(
            player.position.x + direction.x * 0.01,
            player.position.y + 0.5, // Bullet height
            player.position.z + direction.z * 0.01
        );
    }
    
    // Apply powerup effects
    if (gameState.player.activePowerup === 'rapidFire') {
        // Rapid fire is handled by reducing the cooldown above
        // Create a single bullet with standard damage
        const bullet = createBullet(
            bulletPosition,
            direction,
            gameState.player.damage,
            0.8*(1+Math.random()*0.15) // Faster bullet speed for rapid fire
        );
        
        if (bullet.mesh) {
            scene.add(bullet.mesh);
        }
        gameState.bullets.push(bullet);
    } else if (gameState.player.activePowerup === 'shotgunBlast') {
        // Create 8 bullets in a spread pattern
        for (let i = 0; i < 8; i++) {
            const spreadDirection = direction.clone().applyAxisAngle(
                new THREE.Vector3(0, 1, 0),
                (Math.random() - 0.5) * Math.PI / 4
            );
            
            const spreadBullet = createBullet(
                bulletPosition.clone(),
                spreadDirection,
                gameState.player.damage * 0.6, // Less damage per pellet
                0.5*(1+Math.random()*0.15)
            );
            
            if (spreadBullet.mesh) {
                scene.add(spreadBullet.mesh);
            }
            gameState.bullets.push(spreadBullet);
        }
    } else if (gameState.player.activePowerup === 'laserShot') {
        // Create a laser beam (long, thin bullet with high damage)
        const laserBullet = createBullet(
            bulletPosition,
            direction,
            gameState.player.damage * 2, // Double damage
            1.0*(1+Math.random()*0.15), // Very fast
            0x00ff00 // Bright green color for laser
        );
        
        // Use safeCall instead of direct access to avoid null errors
        safeCall(laserBullet, 'mesh.scale.set', [.5, .5, 5.0]);
        
        if (laserBullet.mesh) {
            scene.add(laserBullet.mesh);
        }
        gameState.bullets.push(laserBullet);
        
        // Add laser light effect
        const laserLight = new THREE.PointLight(0x00ffff, 1, 5);
        laserLight.position.copy(bulletPosition);
        scene.add(laserLight);
        
        // Remove light after a short time
        setTimeout(() => {
            scene.remove(laserLight);
        }, 100);
    } else if (gameState.player.activePowerup === 'grenadeLauncher') {
        /**
         * PRIMARY IMPLEMENTATION OF GRENADE LAUNCHER
         * 
         * This is the centralized implementation of the grenade launcher powerup.
         * It creates a grenade projectile that:
         * - Moves slower than normal bullets
         * - Has a smoke trail
         * - Explodes on impact with enemies or environment
         * - Causes area damage rather than direct hit damage
         * 
         * Collision detection is handled in handleCombatCollisions and in physics.js handleCollisions
         */
        logger.info('grenadelauncher', 'Creating grenade from combat.js shootBullet');
        const grenadeBullet = createBullet(
            bulletPosition,
            direction,
            75, // Set damage equal to explosion damage for powerup interaction
            0.5*(1+Math.random()*0.15), // Slower speed
            0x9b111e // Ruby red color
        );
        
        // Use safeCall instead of direct access to avoid null errors
        safeCall(grenadeBullet, 'mesh.scale.set', [0.5, 0.5, 0.]);
        logger.debug('grenadelauncher', 'Applied scale to grenade mesh in combat.js');
        
        if (grenadeBullet.mesh) {
            scene.add(grenadeBullet.mesh);
        }
        
        // Add grenade properties
        grenadeBullet.isGrenade = true;
        grenadeBullet.smokeTrail = [];
        logger.debug('grenadelauncher', 'Set isGrenade=true and initialized smokeTrail array in combat.js');
        
        gameState.bullets.push(grenadeBullet);
    } else {
        // Standard bullet
        const bullet = createBullet(
            bulletPosition,
            direction,
            gameState.player.damage,
            0.8*(1+Math.random()*0.15)// Faster bullet speed
        );
        
        if (bullet.mesh) {
            scene.add(bullet.mesh);
        }
        gameState.bullets.push(bullet);
    }
    
    // Use the pre-created muzzle flash light
    muzzleFlashLight.position.copy(bulletPosition);
    muzzleFlashLight.visible = true;
    
    // Clear existing timeout if it exists
    if (muzzleFlashTimeout !== null) {
        clearTimeout(muzzleFlashTimeout);
    }
    
    // Set timeout to hide the muzzle flash
    muzzleFlashTimeout = setTimeout(() => {
        muzzleFlashLight.visible = false;
        muzzleFlashTimeout = null;
    }, 50);
};

/**
 * Handles grenade smoke trails and updates them
 * 
 * This is the primary implementation for grenade smoke trails.
 * All grenades created with isGrenade=true will have smoke trails managed here.
 * 
 * @param {THREE.Scene} scene - The scene to add smoke particles to
 * @param {Array} bullets - Array of bullet objects
 */
const updateGrenadeTrails = (scene, bullets) => {
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
        logger.debug('grenadelauncher', `Updating ${grenadesWithTrails} grenade smoke trails in combat.js`);
    }
};

/**
 * Check if a ray intersects a zombie's collision sphere
 * 
 * @param {THREE.Vector3} rayOrigin - Start point of ray
 * @param {THREE.Vector3} rayDirection - Direction of ray
 * @param {THREE.Vector3} sphereCenter - Center of sphere (zombie position)
 * @param {number} sphereRadius - Radius of sphere (zombie collision size)
 * @param {THREE.Vector3} intersectionPoint - Output parameter for storing intersection point
 * @returns {boolean} True if ray intersects sphere
 */
const rayIntersectsSphere = (rayOrigin, rayDirection, sphereCenter, sphereRadius, intersectionPoint) => {
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
 * Handles combat-related collisions (bullet-zombie, etc.)
 * 
 * @param {THREE.Scene} scene - The Three.js scene
 * @param {THREE.Object3D} player - The player object
 * @param {Object} gameState - The game state object
 * @param {number} delta - Time delta for frame-rate independent movement
 */
const handleCombatCollisions = (scene, player, gameState, delta) => {
    // Handle grenade smoke trails
    updateGrenadeTrails(scene, gameState.bullets);
    
    // Check for bullet collisions with zombies
    for (let i = gameState.bullets.length - 1; i >= 0; i--) {
        const bullet = gameState.bullets[i];
        
        // Skip if bullet is already marked for removal or has no mesh
        if (bullet.toRemove || !bullet.mesh) continue; 
        
        // Create a ray from the previous position to the current position
        // Ensure previousPosition is valid
        if (!bullet.previousPosition) {
            bullet.previousPosition = bullet.mesh.position.clone(); // Initialize if missing
            logger.warn('combat', 'Bullet previousPosition was missing, initialized.');
        }
        const rayOrigin = bullet.previousPosition;
        const rayDirection = new THREE.Vector3().subVectors(bullet.mesh.position, bullet.previousPosition).normalize();
        const rayLength = bullet.mesh.position.distanceTo(bullet.previousPosition);
        
        // Log if this is a grenade
        if (bullet.isGrenade) {
            logger.debug('grenadelauncher', 'Processing grenade bullet collision checks in combat.js', {
                position: [bullet.mesh.position.x.toFixed(2), bullet.mesh.position.y.toFixed(2), bullet.mesh.position.z.toFixed(2)],
                hasTrail: Array.isArray(bullet.smokeTrail)
            });
        }
        
        // Variable to store closest intersection details
        let closestIntersection = null;
        let closestDistance = Infinity;
        let hitZombieIndex = -1;
        let hitZombie = null;
        
        // Check each zombie for intersection with the ray
        for (let j = gameState.zombies.length - 1; j >= 0; j--) {
            const zombie = gameState.zombies[j];
            
            // Skip if zombie is already dead or has no mesh
            if (!zombie || !zombie.mesh || zombie.health <= 0 || zombie.isDead) continue;
            
            // Check collision with ray
            const intersectionPoint = new THREE.Vector3();
            const zombieCollisionRadius = zombie.collisionRadius || 1.0; // Use zombie specific radius or default
            
            if (rayIntersectsSphere(rayOrigin, rayDirection, zombie.mesh.position, zombieCollisionRadius, intersectionPoint)) {
                // Calculate distance to intersection
                const distToIntersection = rayOrigin.distanceTo(intersectionPoint);
                
                // Make sure intersection is within ray length and is closest
                if (distToIntersection <= rayLength && distToIntersection < closestDistance) {
                    closestDistance = distToIntersection;
                    closestIntersection = intersectionPoint.clone();
                    hitZombieIndex = j;
                    hitZombie = zombie; // Store the hit zombie
                }
            }
        }
        
        // If we found an intersection, handle it
        if (closestIntersection && hitZombieIndex !== -1 && hitZombie) {
            // Move bullet to the intersection point
            if (bullet.mesh) {
                bullet.mesh.position.copy(closestIntersection);
            }
            // Update the logical position as well
            // bullet.position.copy(closestIntersection); // This might be redundant if mesh.position is the source of truth
            
            // Mark bullet for removal
            bullet.toRemove = true;
            
            // Apply damage to zombie using the centralized function
            // This function now also handles dismemberment internally
            if (!bullet.isGrenade) { // Grenades deal damage via explosion, not direct impact
                 logger.debug('combat', `Bullet hit zombie ${hitZombieIndex}, dealing ${bullet.damage} damage.`);
                 damageZombie(hitZombie, bullet.damage, scene); // Pass scene for dismemberment
            } else {
                 logger.debug('combat', `Grenade hit zombie ${hitZombieIndex}, triggering explosion.`);
            }

            // Handle explosive bullets (including grenades now)
            if (bullet.isExplosive || bullet.isGrenade) {
                logger.info('combat', 'Bullet/Grenade impact detected - creating explosion');
                const explosionRadius = bullet.isGrenade ? 3 : 2; // Grenades have larger radius
                // Grenades deal damage via explosion, direct damage was set to 0
                // Use a standard explosion damage, potentially higher for grenades
                const explosionDamage = bullet.isGrenade ? 75 : 50; 
                
                createExplosion(
                    scene, 
                    closestIntersection, // Explode at impact point
                    explosionRadius,
                    explosionDamage,
                    gameState.zombies, 
                    player, 
                    gameState,
                    'player' // Source is player weapon
                );
                // Note: createExplosion now handles zombie death checks internally
                // So, we don't need the isZombieDead check here IF the damage was dealt by explosion.
                // However, for non-grenade explosive bullets, direct damage IS applied above.
                // We need to check for death *after* direct damage, before explosion potentially kills others.

            }
            
             // Check if the zombie died from the *direct* hit (if applicable)
             // This check should happen *after* direct damage is applied, but potentially before the explosion
             // logic if we want the direct hit kill registered first.
             // Let's use the centralized check:
             if (isZombieDead(hitZombie) && !hitZombie.isDead) { // Check isDead flag to prevent double processing
                  logger.debug('combat', `Zombie ${hitZombieIndex} died from direct bullet hit.`);
                  // Use the centralized death handler
                  handleZombieDeath(hitZombie, scene, gameState, gameState.zombies);
                  
                  // Remove zombie from the main array *immediately* after handling death
                  // Since we iterate backwards, this should be safe.
                  gameState.zombies.splice(hitZombieIndex, 1);
                  
                  // Continue to next bullet as this zombie is gone
                  continue; 
             }
            
            // If the bullet was a grenade or explosive, the explosion handles subsequent damage/death
            // If it was a normal bullet, the death check above handled it.
        }
    }
    
    // Remove bullets marked for removal
    for (let i = gameState.bullets.length - 1; i >= 0; i--) {
        if (gameState.bullets[i].toRemove) {
            const bullet = gameState.bullets[i];
            // Clean up smoke trail if it's a grenade
            if (bullet.isGrenade && bullet.smokeTrail) {
                logger.debug('grenadelauncher', 'Removing grenade and smoke trail in combat.js');
                for (const smoke of bullet.smokeTrail) {
                    if(smoke && smoke.parent) scene.remove(smoke); // Safely remove smoke
                }
                 bullet.smokeTrail = []; // Clear the array
            }
            
            // Only remove mesh from scene if it exists
            if (bullet.mesh && bullet.mesh.parent) { // Check parent before removing
                scene.remove(bullet.mesh);
            }
            gameState.bullets.splice(i, 1);
        }
    }
};

export { shootBullet, handleCombatCollisions, updateGrenadeTrails, initCombatSystem }; 