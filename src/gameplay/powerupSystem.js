/**
 * Powerup System - Centralized powerup management
 * 
 * This module provides a clean API for creating and applying powerups,
 * reducing code duplication and improving maintainability. It separates
 * the visual representation of powerups from their gameplay effects.
 * 
 * Example usage:
 * import { createPowerup, applyPowerupEffect } from './gameplay/powerupSystem.js';
 * 
 * // Create a powerup at a position
 * const powerup = createPowerup('rapidFire', position);
 * scene.add(powerup);
 * 
 * // Apply a powerup effect when shooting
 * applyPowerupEffect(gameState.player.activePowerup, gameState, position, direction, scene);
 */

import * as THREE from 'three';
import { logger } from '../utils/logger.js';
import { playSound } from './audio.js';
import { showMessage } from '../ui/ui.js';

// Helper function to create a halo
const createHalo = (color, radius = 0.6) => {
    const haloGeometry = new THREE.CircleGeometry(radius, 32);
    const haloMaterial = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide
    });
    const halo = new THREE.Mesh(haloGeometry, haloMaterial);
    halo.rotation.x = -Math.PI / 2; // Lay flat
    halo.position.y = 0.01; // Slightly above ground
    return halo;
};

// ===================== POWERUP CREATION FUNCTIONS =====================

/**
 * Creates a Rapid Fire powerup
 */
const createRapidFirePowerup = (position) => {
    const powerup = new THREE.Group();

    // Machine gun model
    const gunBodyGeometry = new THREE.BoxGeometry(0.7, 0.2, 0.2);
    const gunMaterial = new THREE.MeshStandardMaterial({
        color: 0xffa500,
        emissive: 0xffa500,
        emissiveIntensity: 0.5,
        roughness: 0.5
    });
    const gunBody = new THREE.Mesh(gunBodyGeometry, gunMaterial);
    gunBody.position.y = 0.3;
    gunBody.castShadow = true;
    powerup.add(gunBody);

    // Barrel
    const barrelGeometry = new THREE.CylinderGeometry(0.07, 0.07, 0.5, 8);
    const barrel = new THREE.Mesh(barrelGeometry, gunMaterial);
    barrel.rotation.z = Math.PI / 2;
    barrel.position.set(0.6, 0.3, 0);
    barrel.castShadow = true;
    powerup.add(barrel);

    // Handle
    const handleGeometry = new THREE.BoxGeometry(0.15, 0.25, 0.15);
    const handle = new THREE.Mesh(handleGeometry, gunMaterial);
    handle.position.set(-0.2, 0.15, 0);
    handle.castShadow = true;
    powerup.add(handle);

    // Orange halo
    const halo = createHalo(0xffa500, 0.8);
    powerup.add(halo);

    powerup.position.set(position.x, 0, position.z);
    powerup.userData.type = 'rapidFire';
    powerup.userData.health = 100;
    return powerup;
};

/**
 * Creates a Shotgun Blast powerup
 */
const createShotgunBlastPowerup = (position) => {
    const powerup = new THREE.Group();

    // Shotgun body
    const bodyGeometry = new THREE.BoxGeometry(0.8, 0.25, 0.3);
    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: 0x4682b4,
        emissive: 0x4682b4,
        emissiveIntensity: 0.5,
        roughness: 0.5
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.3;
    body.castShadow = true;
    powerup.add(body);

    // Double barrels
    const barrelGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.6, 8);
    const barrelMaterial = new THREE.MeshStandardMaterial({
        color: 0x666666,
        emissive: 0x333333,
        emissiveIntensity: 0.3,
        roughness: 0.6
    });
    const barrel1 = new THREE.Mesh(barrelGeometry, barrelMaterial);
    barrel1.rotation.z = Math.PI / 2;
    barrel1.position.set(0.7, 0.3, -0.07);
    barrel1.castShadow = true;
    powerup.add(barrel1);

    const barrel2 = new THREE.Mesh(barrelGeometry, barrelMaterial);
    barrel2.rotation.z = Math.PI / 2;
    barrel2.position.set(0.7, 0.3, 0.07);
    barrel2.castShadow = true;
    powerup.add(barrel2);

    // Grip
    const gripGeometry = new THREE.BoxGeometry(0.2, 0.3, 0.2);
    const grip = new THREE.Mesh(gripGeometry, bodyMaterial);
    grip.position.set(-0.25, 0.15, 0);
    grip.castShadow = true;
    powerup.add(grip);

    // Blue halo
    const halo = createHalo(0x4682b4, 0.8);
    powerup.add(halo);

    powerup.position.set(position.x, 0, position.z);
    powerup.userData.type = 'shotgunBlast';
    powerup.userData.health = 150;
    return powerup;
};

/**
 * Creates an Explosion powerup
 */
const createExplosionPowerup = (position) => {
    const powerup = new THREE.Group();

    // Bomb body
    const bombGeometry = new THREE.SphereGeometry(0.35, 12, 12);
    const bombMaterial = new THREE.MeshStandardMaterial({
        color: 0xff0000,
        emissive: 0xff0000,
        emissiveIntensity: 0.6,
        roughness: 0.5
    });
    const bomb = new THREE.Mesh(bombGeometry, bombMaterial);
    bomb.position.y = 0.35;
    bomb.castShadow = true;
    powerup.add(bomb);

    // Spikes
    const spikeGeometry = new THREE.ConeGeometry(0.08, 0.2, 8);
    const spikeMaterial = new THREE.MeshStandardMaterial({
        color: 0x000000,
        emissive: 0x111111,
        emissiveIntensity: 0.3
    });
    for (let i = 0; i < 8; i++) {
        const spike = new THREE.Mesh(spikeGeometry, spikeMaterial);
        const angle = (i / 8) * Math.PI * 2;
        spike.position.set(
            Math.cos(angle) * 0.35,
            0.35,
            Math.sin(angle) * 0.35
        );
        spike.rotation.x = Math.PI / 2;
        spike.castShadow = true;
        powerup.add(spike);
    }

    // Fuse
    const fuseGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.4, 8);
    const fuse = new THREE.Mesh(fuseGeometry, new THREE.MeshStandardMaterial({
        color: 0xffff00,
        emissive: 0xffff00,
        emissiveIntensity: 0.9
    }));
    fuse.position.y = 0.65;
    fuse.castShadow = true;
    powerup.add(fuse);

    // Red halo
    const halo = createHalo(0xff0000, 0.9);
    powerup.add(halo);

    powerup.position.set(position.x, 0, position.z);
    powerup.userData.type = 'explosion';
    powerup.userData.health = 200;
    return powerup;
};

/**
 * Creates a Laser Shot powerup
 */
const createLaserShotPowerup = (position) => {
    const powerup = new THREE.Group();

    // Laser emitter
    const emitterGeometry = new THREE.CylinderGeometry(0.35, 0.35, 0.7, 12);
    const emitterMaterial = new THREE.MeshStandardMaterial({
        color: 0x00ffff,
        emissive: 0x00ffff,
        emissiveIntensity: 1.0,
        roughness: 0.2
    });
    const emitter = new THREE.Mesh(emitterGeometry, emitterMaterial);
    emitter.position.y = 0.35;
    emitter.castShadow = true;
    powerup.add(emitter);

    // Glowing tip
    const tipGeometry = new THREE.SphereGeometry(0.25, 16, 16);
    const tipMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xffffff,
        emissiveIntensity: 1.5,
        roughness: 0.2
    });
    const tip = new THREE.Mesh(tipGeometry, tipMaterial);
    tip.position.y = 0.7;
    tip.castShadow = true;
    powerup.add(tip);

    // Energy rings
    const ringGeometry = new THREE.RingGeometry(0.3, 0.4, 24);
    const ringMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide
    });
    const ring1 = new THREE.Mesh(ringGeometry, ringMaterial);
    ring1.rotation.x = Math.PI / 2;
    ring1.position.y = 0.5;
    powerup.add(ring1);

    const ring2 = ring1.clone();
    ring2.position.y = 0.3;
    powerup.add(ring2);

    const ring3 = ring1.clone();
    ring3.position.y = 0.1;
    powerup.add(ring3);

    // Cyan halo
    const halo = createHalo(0x00ffff, 1.0);
    powerup.add(halo);

    powerup.position.set(position.x, 0, position.z);
    powerup.userData.type = 'laserShot';
    powerup.userData.health = 180;
    return powerup;
};

/**
 * Creates a Grenade Launcher powerup
 */
const createGrenadeLauncherPowerup = (position) => {
    const powerup = new THREE.Group();

    // Launcher body
    const bodyGeometry = new THREE.BoxGeometry(0.8, 0.25, 0.35);
    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: 0x228b22,
        emissive: 0x228b22,
        emissiveIntensity: 0.5,
        roughness: 0.5
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.3;
    body.castShadow = true;
    powerup.add(body);

    // Barrel
    const barrelGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.6, 12);
    const barrelMaterial = new THREE.MeshStandardMaterial({
        color: 0x333333,
        emissive: 0x111111,
        emissiveIntensity: 0.3,
        roughness: 0.6
    });
    const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
    barrel.rotation.z = Math.PI / 2;
    barrel.position.set(0.7, 0.3, 0);
    barrel.castShadow = true;
    powerup.add(barrel);

    // Mini grenade
    const grenadeGeometry = new THREE.SphereGeometry(0.18, 12, 12);
    const grenadeMaterial = new THREE.MeshStandardMaterial({
        color: 0x555555,
        emissive: 0x111111,
        emissiveIntensity: 0.3,
        roughness: 0.6
    });
    const grenade = new THREE.Mesh(grenadeGeometry, grenadeMaterial);
    grenade.position.set(0, 0.5, 0);
    grenade.castShadow = true;
    powerup.add(grenade);

    // Pin detail
    const pinGeometry = new THREE.BoxGeometry(0.07, 0.14, 0.07);
    const pin = new THREE.Mesh(pinGeometry, new THREE.MeshStandardMaterial({
        color: 0xffff00,
        emissive: 0xffff00,
        emissiveIntensity: 0.5
    }));
    pin.position.set(0, 0.65, 0);
    pin.castShadow = true;
    powerup.add(pin);

    // Red band
    const bandGeometry = new THREE.TorusGeometry(0.18, 0.04, 8, 16);
    const bandMaterial = new THREE.MeshStandardMaterial({
        color: 0xff0000,
        emissive: 0xff0000,
        emissiveIntensity: 0.5
    });
    const band = new THREE.Mesh(bandGeometry, bandMaterial);
    band.rotation.x = Math.PI / 2;
    grenade.add(band);

    // Green halo
    const halo = createHalo(0x228b22, 0.9);
    powerup.add(halo);

    powerup.position.set(position.x, 0, position.z);
    powerup.userData.type = 'grenadeLauncher';
    powerup.userData.health = 175;
    return powerup;
};

/**
 * Creates a smoke trail particle for grenades
 */
export const createSmokeTrail = (position) => {
    const smokeGeometry = new THREE.SphereGeometry(0.05, 4, 4);
    const smokeMaterial = new THREE.MeshBasicMaterial({
        color: 0x888888,
        transparent: true,
        opacity: 0.6
    });
    const smokeParticle = new THREE.Mesh(smokeGeometry, smokeMaterial);
    smokeParticle.position.copy(position);
    smokeParticle.userData = {
        lifetime: 0.5,
        fadeRate: 0.02
    };
    return smokeParticle;
};

// ===================== POWERUP EFFECT FUNCTIONS =====================

/**
 * Applies the Rapid Fire powerup effect
 */
const applyRapidFireEffect = (gameState, position, direction, scene) => {
    // Validate parameters
    if (!gameState || !position || !direction || !scene) {
        logger.error('powerup', 'Missing parameters in applyRapidFireEffect');
        return;
    }
    
    try {
        // Create a single faster bullet with standard damage
        const bullet = createBullet(
            position.clone(),
            direction.clone(),
            gameState.player?.damage || 25, // Fall back to 25 if player.damage is unavailable
            1.8, // Faster bullet speed
            0xffa500 // Orange color
        );
        
        if (!bullet || !bullet.mesh) {
            logger.error('powerup', 'Failed to create bullet in applyRapidFireEffect');
            return;
        }
        
        if (!gameState.bullets) {
            gameState.bullets = [];
        }
        
        gameState.bullets.push(bullet);
        scene.add(bullet.mesh);
        
        logger.debug('powerup', 'Rapid fire bullet fired successfully');
    } catch (error) {
        logger.error('powerup', 'Error in applyRapidFireEffect:', error);
    }
};

/**
 * Applies the Shotgun Blast powerup effect
 */
const applyShotgunBlastEffect = (gameState, position, direction, scene) => {
    // Validate parameters
    if (!gameState || !position || !direction || !scene) {
        logger.error('powerup', 'Missing parameters in applyShotgunBlastEffect');
        return;
    }
    
    try {
        // Create 8 bullets in a spread pattern
        const shotgunSpread = Math.PI / 8; // 22.5 degrees
        const numPellets = 8;
        
        logger.debug('powerup', `Creating ${numPellets} shotgun pellets with spread ${shotgunSpread}`);
        
        if (!gameState.bullets) {
            gameState.bullets = [];
        }
        
        let pelletCount = 0;
        
        for (let i = 0; i < numPellets; i++) {
            try {
                // Calculate angle for this pellet
                const angle = (i / (numPellets - 1) - 0.5) * 2 * shotgunSpread;
                
                // Create direction vector with spread
                const pelletDir = direction.clone();
                pelletDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
                
                // Create bullet with reduced damage
                const pellet = createBullet(
                    position.clone(),
                    pelletDir,
                    (gameState.player?.damage || 25) * 0.6, // Less damage per pellet
                    1.5, // Standard speed
                    0x4682b4 // Steel blue color
                );
                
                if (pellet && pellet.mesh) {
                    gameState.bullets.push(pellet);
                    scene.add(pellet.mesh);
                    pelletCount++;
                } else {
                    logger.warn('powerup', `Failed to create pellet ${i} - null pellet or mesh`);
                }
            } catch (pelletError) {
                logger.error('powerup', `Error creating pellet ${i}:`, pelletError);
            }
        }
        
        logger.debug('powerup', `Shotgun blast fired with ${pelletCount} pellets created successfully`);
    } catch (error) {
        logger.error('powerup', 'Error in applyShotgunBlastEffect:', error);
    }
};

/**
 * Applies the Laser Shot powerup effect
 */
const applyLaserShotEffect = (gameState, position, direction, scene) => {
    // Validate parameters
    if (!gameState || !position || !direction || !scene) {
        logger.error('powerup', 'Missing parameters in applyLaserShotEffect');
        return;
    }
    
    try {
        // Create a laser beam (long, thin bullet with high damage)
        const laserBullet = createBullet(
            position.clone(),
            direction.clone(),
            (gameState.player?.damage || 25) * 2, // Double damage
            3.0, // Very fast
            0x00ffff // Cyan color for laser
        );
        
        if (!laserBullet || !laserBullet.mesh) {
            logger.error('powerup', 'Failed to create laser bullet');
            return;
        }
        
        // Make laser longer and thinner
        laserBullet.mesh.scale.set(0.05, 0.05, 3.0);
        
        if (!gameState.bullets) {
            gameState.bullets = [];
        }
        
        gameState.bullets.push(laserBullet);
        scene.add(laserBullet.mesh);
        
        // Add laser light effect
        try {
            const laserLight = new THREE.PointLight(0x00ffff, 1, 5);
            laserLight.position.copy(position);
            scene.add(laserLight);
            
            // Remove light after a short time
            setTimeout(() => {
                scene.remove(laserLight);
            }, 100);
        } catch (lightError) {
            logger.warn('powerup', 'Failed to create laser light effect:', lightError);
        }
        
        logger.debug('powerup', 'Laser shot fired successfully');
    } catch (error) {
        logger.error('powerup', 'Error in applyLaserShotEffect:', error);
    }
};

/**
 * Applies the Grenade Launcher powerup effect
 */
const applyGrenadeLauncherEffect = (gameState, position, direction, scene) => {
    // Validate parameters
    if (!gameState || !position || !direction || !scene) {
        logger.error('powerup', 'Missing parameters in applyGrenadeLauncherEffect');
        return;
    }
    
    try {
        // Create a grenade (slower moving bullet that explodes on impact)
        const grenadeBullet = createBullet(
            position.clone(),
            direction.clone(),
            0, // No direct damage, damage is from explosion
            0.8, // Slower speed
            0x228b22 // Green color
        );
        
        if (!grenadeBullet || !grenadeBullet.mesh) {
            logger.error('powerup', 'Failed to create grenade bullet');
            return;
        }
        
        // Make grenade larger and spherical
        grenadeBullet.mesh.scale.set(0.3, 0.3, 0.3);
        
        // Add grenade properties
        grenadeBullet.isGrenade = true;
        grenadeBullet.smokeTrail = [];
        
        if (!gameState.bullets) {
            gameState.bullets = [];
        }
        
        gameState.bullets.push(grenadeBullet);
        scene.add(grenadeBullet.mesh);
        
        logger.debug('powerup', 'Grenade launched successfully');
    } catch (error) {
        logger.error('powerup', 'Error in applyGrenadeLauncherEffect:', error);
    }
};

/**
 * Applies the Explosion powerup effect
 */
const applyExplosionEffect = (gameState, position, direction, scene) => {
    // Validate parameters
    if (!gameState || !position || !direction || !scene) {
        logger.error('powerup', 'Missing parameters in applyExplosionEffect');
        return;
    }
    
    try {
        // Create an explosion effect that damages all zombies within range
        const EXPLOSION_RADIUS = 10;
        const EXPLOSION_DAMAGE = 100;
        
        logger.debug('powerup', `Creating explosion with radius ${EXPLOSION_RADIUS} and damage ${EXPLOSION_DAMAGE}`);
        
        // Visual effect - simple flash
        const explosionLight = new THREE.PointLight(0xff5500, 2, EXPLOSION_RADIUS * 2);
        if (gameState.player && gameState.player.position) {
            explosionLight.position.copy(gameState.player.position);
            explosionLight.position.y = 1;
            scene.add(explosionLight);
            
            // Remove light after a short time
            setTimeout(() => {
                scene.remove(explosionLight);
            }, 500);
        }
        
        // Damage all zombies within range
        const zombiesToRemove = [];
        
        if (gameState.zombies && Array.isArray(gameState.zombies)) {
            gameState.zombies.forEach((zombie, index) => {
                if (!zombie || !zombie.mesh || !zombie.mesh.position) return;
                if (!gameState.player || !gameState.player.position) return;
                
                const dx = gameState.player.position.x - zombie.mesh.position.x;
                const dz = gameState.player.position.z - zombie.mesh.position.z;
                const distance = Math.sqrt(dx * dx + dz * dz);
                
                if (distance <= EXPLOSION_RADIUS) {
                    // Calculate damage based on distance (more damage closer to center)
                    const damageMultiplier = 1 - (distance / EXPLOSION_RADIUS);
                    const damage = Math.floor(EXPLOSION_DAMAGE * damageMultiplier);
                    
                    logger.debug('powerup', `Explosion damaging zombie at distance ${distance.toFixed(2)} with ${damage} damage`);
                    
                    // Apply damage
                    zombie.health -= damage;
                    
                    // Check if zombie is dead
                    if (zombie.health <= 0) {
                        zombiesToRemove.push(index);
                    }
                }
            });
            
            // Remove dead zombies (in reverse order to avoid index issues)
            let removedCount = 0;
            for (let i = zombiesToRemove.length - 1; i >= 0; i--) {
                const index = zombiesToRemove[i];
                const zombie = gameState.zombies[index];
                
                if (zombie && zombie.mesh) {
                    scene.remove(zombie.mesh);
                    removedCount++;
                }
                
                gameState.zombies.splice(index, 1);
            }
            
            logger.debug('powerup', `Explosion powerup activated, damaged/killed ${zombiesToRemove.length} zombies`);
        } else {
            logger.warn('powerup', 'No zombies array found in gameState');
        }
    } catch (error) {
        logger.error('powerup', 'Error in applyExplosionEffect:', error);
    }
};

/**
 * Creates a bullet with the specified properties
 * Helper function for powerup effects
 */
const createBullet = (position, direction, damage = 25, speed = 1.5, color = 0xffff00) => {
    // Create bullet geometry
    const bulletGeometry = new THREE.SphereGeometry(0.2, 8, 8);
    const bulletMaterial = new THREE.MeshBasicMaterial({ color: color });
    const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
    
    // Set initial position
    bullet.position.copy(position);
    
    // Store direction and other properties
    bullet.userData = {
        direction: direction.normalize(),
        speed: speed,
        distance: 0,
        maxDistance: 50,
        damage: damage
    };
    
    return {
        mesh: bullet,
        position: bullet.position,
        userData: bullet.userData,
        damage: damage
    };
};

// ===================== POWERUP ANIMATION FUNCTIONS =====================

/**
 * Animates powerups (floating, spinning, etc.)
 */
export const animatePowerup = (powerup, time) => {
    if (!powerup) return;
    
    powerup.position.y = Math.sin(time * 2) * 0.1 + 0.25;
    powerup.rotation.y += 0.02;
    
    // Pulse halo - more robust detection
    for (let i = 0; i < powerup.children.length; i++) {
        const child = powerup.children[i];
        
        // Look for the halo by checking if it's a mesh with CircleGeometry
        if (child instanceof THREE.Mesh && 
            child.geometry instanceof THREE.CircleGeometry) {
            child.scale.setScalar(1 + Math.sin(time * 3) * 0.1);
        }
        
        // Optional: Pulse laser tip
        if (powerup.userData.type === 'laserShot' && 
            child instanceof THREE.Mesh && 
            child.geometry instanceof THREE.SphereGeometry) {
            child.scale.setScalar(1 + Math.sin(time * 5) * 0.05);
        }
    }
};

// ===================== DICTIONARY MAPPINGS =====================

/**
 * Dictionary of powerup creator functions
 */
const POWERUP_CREATORS = {
    'rapidFire': createRapidFirePowerup,
    'shotgunBlast': createShotgunBlastPowerup,
    'explosion': createExplosionPowerup,
    'laserShot': createLaserShotPowerup,
    'grenadeLauncher': createGrenadeLauncherPowerup
};

/**
 * Dictionary of powerup effect functions
 */
const POWERUP_EFFECTS = {
    'rapidFire': applyRapidFireEffect,
    'shotgunBlast': applyShotgunBlastEffect,
    'laserShot': applyLaserShotEffect,
    'grenadeLauncher': applyGrenadeLauncherEffect,
    'explosion': applyExplosionEffect
};

// ===================== PUBLIC API =====================

/**
 * Creates a powerup of the specified type at the given position
 * @param {string} type - The type of powerup to create
 * @param {THREE.Vector3} position - The position to create the powerup at
 * @returns {THREE.Object3D} The created powerup object
 */
export const createPowerup = (type, position) => {
    const creator = POWERUP_CREATORS[type];
    if (!creator) {
        logger.error(`Unknown powerup type: ${type}`);
        return null;
    }
    return creator(position);
};

/**
 * Applies the effect of a powerup
 * @param {string} type - The type of powerup to apply
 * @param {THREE.Vector3} position - The position to apply the effect from
 * @param {THREE.Vector3} direction - The direction to apply the effect in
 * @param {THREE.Scene} scene - The scene to add any created objects to
 * @param {Object} gameState - The game state
 * @returns {boolean} - Whether the effect was successfully applied
 */
export const applyPowerupEffect = (type, position, direction, scene, gameState) => {
    logger.debug('powerup', `applyPowerupEffect called with type: ${type || 'undefined'}`);
    
    // Parameter validation with detailed logging
    const paramChecks = {
        type: !!type,
        position: !!position,
        direction: !!direction,
        scene: !!scene,
        gameState: !!gameState
    };
    
    if (!paramChecks.type || !paramChecks.position || !paramChecks.direction || !paramChecks.scene || !paramChecks.gameState) {
        logger.error('powerup', `Invalid parameters for applyPowerupEffect: ${JSON.stringify(paramChecks)}`);
        return false;
    }
    
    // More detailed parameter logging
    logger.debug('powerup', `Parameters: type=${type}, position=(${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)}), direction=(${direction.x.toFixed(2)}, ${direction.y.toFixed(2)}, ${direction.z.toFixed(2)})`);
    
    // Ensure bullets array exists
    if (!gameState.bullets) {
        logger.warn('powerup', 'gameState.bullets does not exist, creating it');
        gameState.bullets = [];
    }
    
    try {
        // Get the appropriate effect function for this powerup type
        const effectFunction = POWERUP_EFFECTS[type];
        
        if (!effectFunction) {
            logger.error('powerup', `Unknown powerup effect function for type: ${type}`);
            
            // Create fallback bullet if no valid powerup type
            logger.debug('powerup', 'Creating fallback bullet due to unknown powerup type');
            const fallbackBullet = createBullet(
                position.clone(), 
                direction.clone(),
                25, // Default damage
                1.5, // Default speed
                0xFFFFFF // Default color (white)
            );
            
            if (fallbackBullet && fallbackBullet.mesh) {
                gameState.bullets.push(fallbackBullet);
                scene.add(fallbackBullet.mesh);
                logger.debug('powerup', 'Fallback bullet created successfully');
                return true;
            } else {
                logger.error('powerup', 'Failed to create fallback bullet');
                return false;
            }
        }
        
        logger.debug('powerup', `Found effect function for powerup type: ${type}`);
        
        // Call the effect function with all required parameters
        try {
            effectFunction(gameState, position, direction, scene);
            logger.debug('powerup', `Successfully applied powerup effect: ${type}`);
            return true;
        } catch (effectError) {
            logger.error('powerup', `Error applying powerup effect function for ${type}:`, effectError);
            logger.debug('powerup', `Error stack: ${effectError.stack || 'No stack available'}`);
            return false;
        }
    } catch (error) {
        logger.error('powerup', `Error in applyPowerupEffect:`, error);
        logger.debug('powerup', `Error stack: ${error.stack || 'No stack available'}`);
        return false;
    }
};

/**
 * Activates a powerup for the player
 * @param {Object} gameState - The game state
 * @param {string} powerupType - The type of powerup to activate
 * @param {string} activationMethod - How the powerup was activated ('walk', 'unlock', etc.)
 */
export const activatePowerup = (gameState, powerupType, activationMethod = 'walk') => {
    try {
        // Safety check
        if (!gameState || !gameState.player) {
            logger.error('powerup', 'Cannot activate powerup: gameState or player is null');
            return;
        }
        
        // Log activation
        logger.info('powerup', `Activating powerup: ${powerupType} via ${activationMethod}`);
        
        // Set active powerup
        gameState.player.activePowerup = powerupType;
        
        // Set duration based on powerup type
        switch (powerupType) {
            case 'rapidFire':
                gameState.player.powerupDuration = 10; // 10 seconds
                break;
            case 'shotgunBlast':
                gameState.player.powerupDuration = 15; // 15 seconds
                break;
            case 'explosion':
                gameState.player.powerupDuration = 12; // 12 seconds
                break;
            case 'laserShot':
                gameState.player.powerupDuration = 8; // 8 seconds
                break;
            case 'grenadeLauncher':
                gameState.player.powerupDuration = 10; // 10 seconds
                break;
            default:
                gameState.player.powerupDuration = 10; // Default duration
        }
        
        // Play activation sound if available
        try {
            playSound('powerup');
        } catch (error) {
            logger.warn('powerup', 'Could not play powerup sound', { error: error.message });
        }
        
        // Show message
        const messageMap = {
            'rapidFire': 'Rapid Fire activated! Shoot faster!',
            'shotgunBlast': 'Shotgun Blast activated! Multiple projectiles!',
            'explosion': 'Explosion activated! Area damage!',
            'laserShot': 'Laser Shot activated! Piercing shots!',
            'grenadeLauncher': 'Grenade Launcher activated! Explosive ammo!'
        };
        
        const message = messageMap[powerupType] || `${powerupType} activated!`;
        showMessage(message, 3000);
        
        // Apply visual effect to player
        if (gameState.player.model) {
            try {
                // Store original materials if not already stored
                if (!gameState.player.originalMaterials) {
                    gameState.player.originalMaterials = [];
                    gameState.player.model.traverse((child) => {
                        if (child.isMesh && child.material) {
                            gameState.player.originalMaterials.push({
                                mesh: child,
                                material: child.material.clone()
                            });
                        }
                    });
                }
                
                // Get color based on powerup type
                let powerupColor;
                switch (powerupType) {
                    case 'rapidFire':
                        powerupColor = 0xffa500; // Orange
                        break;
                    case 'shotgunBlast':
                        powerupColor = 0x4682b4; // Steel blue
                        break;
                    case 'explosion':
                        powerupColor = 0xff0000; // Red
                        break;
                    case 'laserShot':
                        powerupColor = 0x00ffff; // Cyan
                        break;
                    case 'grenadeLauncher':
                        powerupColor = 0x228b22; // Forest green
                        break;
                    default:
                        powerupColor = 0xffffff; // White default
                }
                
                // Apply glowing material to all player meshes
                gameState.player.model.traverse((child) => {
                    if (child.isMesh && child.material) {
                        // Create new material with powerup color
                        const newMaterial = new THREE.MeshStandardMaterial({
                            color: child.material.color.clone(),
                            emissive: powerupColor,
                            emissiveIntensity: 0.5
                        });
                        
                        // Store original material if needed later
                        child._originalMaterial = child.material;
                        
                        // Apply new material
                        child.material = newMaterial;
                    }
                });
                
                // Restore original materials when powerup expires
                const checkExpired = setInterval(() => {
                    if (!gameState.player.activePowerup) {
                        clearInterval(checkExpired);
                        
                        // Restore original materials
                        if (gameState.player.originalMaterials) {
                            gameState.player.originalMaterials.forEach((item) => {
                                item.mesh.material = item.material.clone();
                            });
                        }
                    }
                }, 1000);
            } catch (error) {
                logger.error('powerup', 'Error applying visual effect to player', { error: error.message });
            }
        }
        
        logger.info('powerup', `Powerup ${powerupType} activated successfully`);
    } catch (error) {
        logger.error('powerup', 'Error activating powerup', { 
            powerupType, 
            error: error.message,
            stack: error.stack 
        });
    }
};

/**
 * Damages a powerup and handles unlocking it when health reaches zero
 * @param {Object} powerup - The powerup object
 * @param {number} damage - Amount of damage to apply
 * @returns {boolean} Whether the powerup is now unlocked
 */
export const damagePowerup = (powerup, damage) => {
    if (!powerup || powerup.unlocked) return false;
    
    // Apply damage
    powerup.health -= damage;
    
    // Ensure we have the type property set
    if (!powerup.type && powerup.userData && powerup.userData.type) {
        powerup.type = powerup.userData.type;
    }
    
    // Update the health ring if it exists
    if (powerup.healthRing) {
        powerup.healthRing.update(powerup.health);
    }
    
    // Check if powerup is unlocked
    if (powerup.health <= 0) {
        // Unlock the powerup
        powerup.unlocked = true;
        
        // Change appearance to indicate unlocked state
        if (powerup.mesh) {
            powerup.mesh.traverse((child) => {
                if (child.isMesh) {
                    // Make it glow more intensely
                    if (child.material.emissive) {
                        child.material.emissiveIntensity *= 2;
                    }
                    
                    // Add transparency effect
                    child.material.transparent = true;
                    child.material.opacity = 0.8;
                }
            });
        }
        
        // Log powerup unlocked
        logger.info('powerup', `Powerup unlocked: ${powerup.type || powerup.userData?.type}`);
        
        // Show message
        showMessage(`${powerup.type || powerup.userData?.type} unlocked! Pick it up!`, 2000);
        
        return true;
    }
    
    return false;
};

/**
 * Removes other powerups when one is collected
 * @param {THREE.Scene} scene - The scene to remove powerups from
 * @param {Object} gameState - The game state object
 * @param {Object} collectedPowerup - The powerup that was collected
 */
export const removeOtherPowerups = (scene, gameState, collectedPowerup) => {
    if (!gameState.powerups) return;
    
    // Get the spawn group ID
    const spawnGroup = collectedPowerup.spawnGroup;
    
    // Remove all other powerups from the same spawn group
    for (let i = gameState.powerups.length - 1; i >= 0; i--) {
        const powerup = gameState.powerups[i];
        
        // Skip if this is the collected powerup or not in the same spawn group
        if (!powerup || powerup === collectedPowerup || powerup.spawnGroup !== spawnGroup) {
            continue;
        }
        
        // Remove from scene
        scene.remove(powerup.mesh);
        powerup.active = false;
        
        // Log removal
        logger.debug('powerup', `Removed powerup: ${powerup.type} from spawn group ${spawnGroup}`);
    }
};

/**
 * Updates powerup duration and handles expiration
 * @param {Object} gameState - The game state object
 * @param {number} delta - Time delta in seconds
 */
export const updatePowerupDuration = (gameState, delta) => {
    if (!gameState || !gameState.player || !gameState.player.activePowerup) {
        return;
    }
    
    // Decrease powerup duration
    gameState.player.powerupDuration -= delta;
    
    // Check if powerup has expired
    if (gameState.player.powerupDuration <= 0) {
        // Log powerup expiration
        logger.info('powerup', `Powerup expired: ${gameState.player.activePowerup}`);
        
        // Remove powerup
        gameState.player.activePowerup = null;
        gameState.player.powerupDuration = 0;
        
        // Show message
        showMessage("Powerup expired!", 1500);
    }
}; 