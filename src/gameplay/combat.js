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
import { createExplosion } from './zombie.js';
import { checkCollision } from './physics.js';
import { safeCall } from '../utils/safeAccess.js';
import { createSmokeTrail } from './powerups2.js';
import { logger } from '../utils/logger.js';

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
        
        // Offset slightly in the direction the player is facing (reduced offset for closer bullets)
        bulletPosition.add(direction.clone().multiplyScalar(0.2));
    } else {
        // Fallback to position in front of player
        bulletPosition = new THREE.Vector3(
            player.position.x + direction.x * 0.2,
            player.position.y + 0.5, // Bullet height
            player.position.z + direction.z * 0.2
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
            1.8 // Faster bullet speed for rapid fire
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
                1.5
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
            3.0, // Very fast
            0x00ffff // Cyan color for laser
        );
        
        // Use safeCall instead of direct access to avoid null errors
        safeCall(laserBullet, 'mesh.scale.set', [0.05, 0.05, 3.0]);
        
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
        // Create a grenade (slower moving bullet that explodes on impact)
        const grenadeBullet = createBullet(
            bulletPosition,
            direction,
            0, // No direct damage, damage is from explosion
            0.8, // Slower speed
            0x228b22 // Green color
        );
        
        // Use safeCall instead of direct access to avoid null errors
        safeCall(grenadeBullet, 'mesh.scale.set', [0.2, 0.2, 0.2]);
        
        if (grenadeBullet.mesh) {
            scene.add(grenadeBullet.mesh);
        }
        
        // Add grenade properties
        grenadeBullet.isGrenade = true;
        grenadeBullet.smokeTrail = [];
        
        gameState.bullets.push(grenadeBullet);
    } else if (gameState.player.activePowerup === 'explosion') {
        // Create an explosive bullet
        const explosiveBullet = createBullet(
            bulletPosition,
            direction,
            gameState.player.damage,
            1.5
        );
        
        // Use safeCall instead of direct access to avoid null errors
        safeCall(explosiveBullet, 'mesh.scale.set', [0.15, 0.15, 0.3]);
        
        // Add explosive property
        explosiveBullet.isExplosive = true;
        
        if (explosiveBullet.mesh) {
            // Make it slightly larger and red-tinted
            explosiveBullet.mesh.material.color.set(0xff6666);
            scene.add(explosiveBullet.mesh);
        }
        
        gameState.bullets.push(explosiveBullet);
    } else {
        // Standard bullet
        const bullet = createBullet(
            bulletPosition,
            direction,
            gameState.player.damage,
            1.5 // Faster bullet speed
        );
        
        // Only add mesh to scene if it's a tracer bullet
        if (bullet.mesh) {
            scene.add(bullet.mesh);
        }
        gameState.bullets.push(bullet);
    }
    
    // Add muzzle flash effect
    const muzzleFlash = new THREE.PointLight(0xffff00, 1, 3);
    muzzleFlash.position.copy(bulletPosition);
    scene.add(muzzleFlash);
    
    // Remove muzzle flash after a short time
    setTimeout(() => {
        scene.remove(muzzleFlash);
    }, 50);
};

/**
 * Handles grenade smoke trails and updates them
 * 
 * @param {THREE.Scene} scene - The scene to add smoke particles to
 * @param {Array} bullets - Array of bullet objects
 */
const updateGrenadeTrails = (scene, bullets) => {
    for (let i = 0; i < bullets.length; i++) {
        const bullet = bullets[i];
        if (bullet.isGrenade && bullet.mesh) {
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
        
        // Skip if bullet is already marked for removal
        if (bullet.toRemove) continue;
        
        for (let j = gameState.zombies.length - 1; j >= 0; j--) {
            const zombie = gameState.zombies[j];
            
            // Skip if zombie is already dead
            if (zombie.health <= 0) continue;
            
            // Use bullet.position for both tracer and non-tracer bullets
            // Increased collision threshold from 1.0 to 1.5 to better detect nearby enemies
            if (checkCollision(bullet.position, zombie.mesh.position, 1.5)) {
                // Apply damage to zombie
                zombie.health -= bullet.damage;
                
                // Mark bullet for removal
                bullet.toRemove = true;
                
                // Handle explosive bullets
                if (bullet.isExplosive || bullet.isGrenade) {
                    createExplosion(
                        scene, 
                        bullet.position.clone(), 
                        3, // radius
                        50, // damage
                        gameState.zombies, 
                        player, 
                        gameState
                    );
                }
                
                // Check if zombie is dead
                if (zombie.health <= 0) {
                    // Award points based on enemy type
                    let pointsAwarded = 10; // Base points for regular zombie
                    
                    if (zombie.type === 'skeletonArcher') {
                        pointsAwarded = 20;
                    } else if (zombie.type === 'exploder') {
                        pointsAwarded = 25;
                        
                        // Only create explosion if the exploder was already in explosion sequence
                        // NOT when it's shot and killed directly
                        if (zombie.mesh.isExploding) {
                            createExplosion(
                                scene, 
                                zombie.mesh.position.clone(), 
                                3, // radius
                                50, // damage
                                gameState.zombies, 
                                player, 
                                gameState
                            );
                        }
                    } else if (zombie.type === 'zombieKing') {
                        pointsAwarded = 200;
                    }
                    
                    gameState.score += pointsAwarded;
                    
                    // Remove zombie from scene
                    scene.remove(zombie.mesh);
                    
                    // Remove zombie from array
                    gameState.zombies.splice(j, 1);
                }
                
                break; // Bullet can only hit one zombie
            }
        }
    }
    
    // Remove bullets marked for removal
    for (let i = gameState.bullets.length - 1; i >= 0; i--) {
        if (gameState.bullets[i].toRemove) {
            // Clean up smoke trail if it's a grenade
            if (gameState.bullets[i].isGrenade && gameState.bullets[i].smokeTrail) {
                for (const smoke of gameState.bullets[i].smokeTrail) {
                    scene.remove(smoke);
                }
            }
            
            // Only remove mesh from scene if it's a tracer bullet
            if (gameState.bullets[i].mesh) {
                scene.remove(gameState.bullets[i].mesh);
            }
            gameState.bullets.splice(i, 1);
        }
    }
};

export { shootBullet, handleCombatCollisions, updateGrenadeTrails }; 