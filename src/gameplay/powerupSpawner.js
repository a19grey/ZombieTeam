/**
 * Powerup Spawner Module - Handles spawning of powerups in the game
 * 
 * This module contains functions for spawning powerups behind the player,
 * just out of view. It ensures powerups spawn in pairs to create strategic
 * gameplay choices between different powerup types. When one powerup is
 * collected, all others will disappear, encouraging team coordination in
 * multiplayer.
 * 
 * Powerups now have health that must be depleted (by shooting them) before
 * they can be collected. A visual ring indicator shows the unlock progress.
 * 
 * Example usage:
 * ```
 * // In your game loop
 * if (shouldSpawnPowerup(gameState, currentTime)) {
 *   spawnPowerupBehindPlayer(scene, gameState, player);
 * }
 * ```
 */

import * as THREE from 'three';
import { createRapidFirePowerup, createShotgunBlastPowerup, createExplosionPowerup, createLaserShotPowerup, createGrenadeLauncherPowerup } from './powerups2.js';
import { logger } from '../utils/logger.js';
import { playSound } from './audio.js';
import { showMessage } from '../ui/ui.js';
import { activatePowerup } from '../gameplay/physics.js';

// Constants for powerup spawning
const POWERUP_MIN_DISTANCE = 10; // Minimum distance from player
const POWERUP_MAX_DISTANCE = 20; // Maximum distance from player
const POWERUP_SPAWN_CHANCE_PER_SECOND = 0.5; // 30% chance per second to spawn a powerup
const POWERUP_TYPES = ['rapidFire', 'shotgunBlast', 'explosion', 'laserShot', 'grenadeLauncher'];
const MIN_TIME_BETWEEN_POWERUPS = 300; // Minimum time between powerup spawns (10 seconds)

// Constants for powerup health
const DEFAULT_POWERUP_HEALTH = 100; // Default health for powerups
const POWERUP_HEALTH_BY_TYPE = {
    'rapidFire': 80*3,        // Easier to unlock
    'shotgunBlast': 100*3,
    'explosion': 150*3,       // Harder to unlock
    'laserShot': 120*3,
    'grenadeLauncher': 130*3
};

/**
 * Determines if a powerup should spawn based on time and probability
 * @param {Object} gameState - The current game state
 * @param {number} currentTime - Current game time in milliseconds
 * @returns {boolean} Whether a powerup should spawn
 */
export const shouldSpawnPowerup = (gameState, currentTime) => {
    // Use the main gameState.powerupSpawnRate 
    const spawnRate = gameState.powerupSpawnRate;
    logger.debug('powerup', 'Current time vs last powerup spawn time delta', { delta: currentTime - gameState.lastPowerupSpawnTime });
    
    // Initialize lastPowerupSpawnTime and lastPowerupCheckTime if they don't exist
    if (!gameState.lastPowerupSpawnTime) {
        gameState.lastPowerupSpawnTime = currentTime - spawnRate;
        gameState.lastPowerupCheckTime = currentTime;
        logger.debug('powerup', 'Initializing lastPowerupSpawnTime', { time: gameState.lastPowerupSpawnTime });
        return false;
    }
    
    // Don't spawn if we've spawned recently
    if (currentTime - gameState.lastPowerupSpawnTime < MIN_TIME_BETWEEN_POWERUPS) {
        logger.debug('powerup', 'Too soon to spawn another powerup', { 
            timeSinceLastSpawn: currentTime - gameState.lastPowerupSpawnTime,
            minimumTime: MIN_TIME_BETWEEN_POWERUPS 
        });
        return false;
    }
    
    // Always spawn if enough time has passed (guaranteed spawn after 1.5x the spawn rate)
    if (currentTime - gameState.lastPowerupSpawnTime > spawnRate * 1.5) {
        logger.debug('powerup', 'Forcing powerup spawn after extended time without spawn', { 
            timeSinceLastSpawn: currentTime - gameState.lastPowerupSpawnTime
        });
        gameState.lastPowerupCheckTime = currentTime;
        return true;
    }
    
    // Calculate time since last check in seconds
    const timeSinceLastCheck = (currentTime - (gameState.lastPowerupCheckTime || 0)) / 1000;
    logger.debug('powerup', 'Time since last powerup check', { seconds: timeSinceLastCheck });
    
    // Update last check time
    gameState.lastPowerupCheckTime = currentTime;
    
    // Skip if time since last check is too small (prevents multiple checks in short time periods)
    if (timeSinceLastCheck < 0.1) {
        return false;
    }
    
    // Calculate spawn probability based on time passed
    const spawnProbability = POWERUP_SPAWN_CHANCE_PER_SECOND * timeSinceLastCheck;
    
    // Log check with adjusted probability
    logger.debug('powerup', 'Checking powerup spawn probability', { 
        chance: (spawnProbability * 100).toFixed(2) + '%', 
        timeElapsed: timeSinceLastCheck.toFixed(2) + 's' 
    });
    
    // Random chance to spawn based on time passed
    return Math.random() < spawnProbability;
};

/**
 * Gets a position behind the player in absolute world coordinates (positive Z direction in this game)
 * @param {THREE.Object3D} player - The player object
 * @param {number} zDistance - Distance from player in Z direction
 * @param {boolean} isRightSide - Whether to position on right side (positive X) or left side (negative X)
 * @returns {THREE.Vector3} The spawn position
 */
export const getPositionBehindPlayer = (player, zDistance, isRightSide = false) => {
    // Horizontal offset for positioning powerups on either side
    const xOffset = 5.0; // Increased from 2.5 to 5.0 for wider separation
    
    // Create the spawn position in absolute world coordinates
    const spawnPosition = new THREE.Vector3();
    
    // Start at player's position
    spawnPosition.copy(player.position);
    
    // Calculate the z position - In this game, POSITIVE Z is behind the player
    // Add the zDistance to player's Z to place powerup behind them
    const playerZ = player.position.z; 
    spawnPosition.z = playerZ + zDistance;
    
    // Apply X offset based on left/right side
    spawnPosition.x += isRightSide ? xOffset : -xOffset;
    
    // Ensure y-coordinate is at ground level
    spawnPosition.y = 0;
    
    logger.debug('powerup', 'Calculating powerup spawn position', {
        playerPos: player.position.toArray(),
        spawnPos: spawnPosition.toArray(), 
        zDistance,
        relativeZ: spawnPosition.z - playerZ,
        xOffset: isRightSide ? xOffset : -xOffset,
        side: isRightSide ? 'right' : 'left'
    });
    
    return spawnPosition;
};

/**
 * Creates a health ring indicator for the powerup
 * @param {THREE.Object3D} powerupMesh - The powerup mesh
 * @param {string} powerupType - The type of powerup
 * @param {number} maxHealth - The maximum health of the powerup
 * @returns {Object} The health ring object
 */
const createHealthRing = (powerupMesh, powerupType, maxHealth) => {
    // Determine color based on powerup type
    let ringColor;
    switch (powerupType) {
        case 'rapidFire':
            ringColor = 0xffa500; // Orange
            break;
        case 'shotgunBlast':
            ringColor = 0x4682b4; // Steel blue
            break;
        case 'explosion':
            ringColor = 0xff0000; // Red
            break;
        case 'laserShot':
            ringColor = 0x00ffff; // Cyan
            break;
        case 'grenadeLauncher':
            ringColor = 0x228b22; // Forest green
            break;
        default:
            ringColor = 0xffffff; // White default
    }
    
    // Create an empty ring geometry initially (0 angle)
    const ringGeometry = new THREE.RingGeometry(0.8, 1.0, 32, 1, 0, 0.001);
    const ringMaterial = new THREE.MeshBasicMaterial({
        color: ringColor,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide
    });
    
    const healthRing = new THREE.Mesh(ringGeometry, ringMaterial);
    healthRing.rotation.x = -Math.PI / 2; // Lay flat
    healthRing.position.y = 0.05; // Just above ground
    
    // Add to powerup
    powerupMesh.add(healthRing);
    
    return {
        mesh: healthRing,
        maxHealth: maxHealth,
        currentHealth: maxHealth,
        update: function(currentHealth) {
            // Remove old geometry
            this.mesh.geometry.dispose();
            
            // Calculate angle based on health percentage
            const healthPercent = 1 - (currentHealth / this.maxHealth);
            const angle = healthPercent * Math.PI * 2;
            
            // Create new geometry with updated angle
            this.mesh.geometry = new THREE.RingGeometry(0.8, 1.0, 32, 1, 0, angle);
            
            // Update current health
            this.currentHealth = currentHealth;
            
            // Return if powerup is unlocked
            return currentHealth <= 0;
        }
    };
};

/**
 * Creates a powerup of specified type
 * @param {THREE.Scene} scene - The Three.js scene
 * @param {THREE.Vector3} position - Position to spawn the powerup
 * @param {Object} gameState - The current game state
 * @param {string} powerupType - The type of powerup to create
 * @returns {Object} The created powerup object
 */
export const createPowerup = (scene, position, gameState, powerupType) => {
    // Create the powerup based on type
    let powerupMesh;
    switch (powerupType) {
        case 'rapidFire':
            powerupMesh = createRapidFirePowerup(position);
            break;
        case 'shotgunBlast':
            powerupMesh = createShotgunBlastPowerup(position);
            break;
        case 'explosion':
            powerupMesh = createExplosionPowerup(position);
            break;
        case 'laserShot':
            powerupMesh = createLaserShotPowerup(position);
            break;
        case 'grenadeLauncher':
            powerupMesh = createGrenadeLauncherPowerup(position);
            break;
        default:
            powerupMesh = createRapidFirePowerup(position);
    }
    
    // Add to scene
    scene.add(powerupMesh);
    
    // Set health based on powerup type
    const maxHealth = POWERUP_HEALTH_BY_TYPE[powerupType];
    
    // Create health ring indicator
    const healthRing = createHealthRing(powerupMesh, powerupType, maxHealth);
    
    // Create powerup object for tracking
    const powerup = {
        mesh: powerupMesh,
        type: powerupType,
        active: true,
        createdAt: Date.now(),
        spawnGroup: gameState.currentPowerupGroup || Date.now(), // Group identifier
        health: maxHealth,
        maxHealth: maxHealth,
        healthRing: healthRing,
        unlocked: false
    };
    
    // Add to gameState
    gameState.powerups.push(powerup);
    
    // Log powerup creation
    logger.info('powerup', `Spawned powerup ${powerupType}`, { 
        position: { x: position.x.toFixed(2), z: position.z.toFixed(2) },
        health: maxHealth
    });
    
    return powerup;
};

/**
 * Damages a powerup and updates its health ring
 * @param {Object} powerup - The powerup object
 * @param {number} damage - Amount of damage to apply
 * @param {Object} gameState - The game state
 * @param {THREE.Scene} scene - The Three.js scene
 * @returns {boolean} Whether the powerup is now unlocked
 */
export const damagePowerup = (powerup, damage, gameState, scene) => {
    // Skip if already unlocked
    if (powerup.unlocked) return true;
    
    // Apply damage
    powerup.health -= damage;
    
    // Track last hit time for visual effects
    powerup.lastHitTime = Date.now();
    
    // Prevent negative health
    if (powerup.health < 0) powerup.health = 0;
    
    // Update health ring
    const unlocked = powerup.healthRing.update(powerup.health);
    
    // Mark the health ring material for identification in visual effects
    if (powerup.healthRing && powerup.healthRing.mesh && powerup.healthRing.mesh.material) {
        powerup.healthRing.mesh.material._isHealthRing = true;
    }
    
    // If newly unlocked, update powerup state and apply effect
    if (unlocked) {
        powerup.unlocked = true;
        
        // Apply powerup effect immediately when unlocked
        if (gameState && gameState.player) {
            // Activate the powerup
            logger.info('powerup', `Z: Auto-activating powerup type/unlock/active: ${powerup.type},${powerup.unlocked},${powerup.active}`);
            
            // Activate the powerup
            activatePowerup(gameState, powerup.type, 'unlock', scene);
            
            // Direct property assignment as backup
            gameState.player.activePowerup = powerup.type;
            gameState.player.powerupDuration = 10;
            
            // Play powerup pickup sound
            playSound('powerupPickup');
            
            // Show message
            showMessage(`${powerup.type} activated!`, 2000);
            
            // Remove all other powerups from the same spawn group
            removeOtherPowerups(scene, gameState, powerup);
            
            // Remove this powerup from scene
            scene.remove(powerup.mesh);
            powerup.active = false;
        }
        
        // Add a visual effect for unlock
        if (powerup.mesh) {
            // Create a pulse effect
            const pulseGeometry = new THREE.RingGeometry(0.8, 1.2, 32);
            const pulseMaterial = new THREE.MeshBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.8,
                side: THREE.DoubleSide
            });
            
            const pulse = new THREE.Mesh(pulseGeometry, pulseMaterial);
            pulse.rotation.x = -Math.PI / 2; // Lay flat
            pulse.position.y = 0.05; // Just above ground
            
            powerup.mesh.add(pulse);
            
            // Animate the pulse
            let scale = 1.0;
            const animatePulse = () => {
                scale += 0.05;
                pulse.scale.set(scale, scale, 1);
                pulse.material.opacity = 1 - (scale - 1) / 1.5;
                
                if (scale < 2.5 && powerup.mesh) {
                    requestAnimationFrame(animatePulse);
                } else if (powerup.mesh) {
                    powerup.mesh.remove(pulse);
                    pulse.geometry.dispose();
                    pulse.material.dispose();
                }
            };
            
            animatePulse();
        }
        
        logger.info('powerup', `A: Powerup unlocked ${powerup.type}`);
    }
    
    return unlocked;
};

/**
 * Spawns a pair of different powerups behind the player, to the left and right sides
 * @param {THREE.Scene} scene - The Three.js scene
 * @param {Object} gameState - The current game state
 * @param {THREE.Object3D} player - The player object
 */
export const spawnPowerupBehindPlayer = (scene, gameState, player) => {
    // Update last spawn time
    gameState.lastPowerupSpawnTime = Date.now();
    
    // Create a unique group ID for this spawn event
    const spawnGroupId = Date.now();
    gameState.currentPowerupGroup = spawnGroupId;
    
    // Get two different random powerup types
    const availableTypes = [...POWERUP_TYPES];
    
    // First powerup type
    const firstTypeIndex = Math.floor(Math.random() * availableTypes.length);
    const firstType = availableTypes[firstTypeIndex];
    availableTypes.splice(firstTypeIndex, 1); // Remove this type from available options
    
    // Second powerup type - now guaranteed to be different since we removed the first type
    const secondTypeIndex = Math.floor(Math.random() * availableTypes.length);
    const secondType = availableTypes[secondTypeIndex];
    
    // Log the selected types for debugging
    logger.debug('powerup', 'Selected powerup types', { 
        firstType, 
        secondType,
        availableTypes: availableTypes.length
    });
    
    // Calculate a single random distance for both powerups to ensure they're on the same Z plane
    const zDistance = POWERUP_MIN_DISTANCE + Math.random() * (POWERUP_MAX_DISTANCE - POWERUP_MIN_DISTANCE);
    
    // Get positions behind player on the left and right sides (using the same Z distance)
    const leftPosition = getPositionBehindPlayer(
        player, 
        zDistance,
        false // Left side
    );
    
    const rightPosition = getPositionBehindPlayer(
        player, 
        zDistance,
        true // Right side
    );
    
    // Create powerups
    createPowerup(scene, leftPosition, gameState, firstType);
    createPowerup(scene, rightPosition, gameState, secondType);
    
    logger.info('powerup', `Spawned powerup pair`, { 
        types: [firstType, secondType], 
        zDistance: zDistance.toFixed(2), 
        groupId: spawnGroupId 
    });
};

/**
 * Removes all powerups from the same spawn group except the collected one
 * @param {THREE.Scene} scene - The Three.js scene
 * @param {Object} gameState - The current game state
 * @param {Object} collectedPowerup - The powerup that was collected
 */
export const removeOtherPowerups = (scene, gameState, collectedPowerup) => {
    const groupId = collectedPowerup.spawnGroup;
    logger.debug('powerup', `Starting removal of other powerups from group`, { groupId });
    
    // Find all powerups from the same group that need to be removed
    const powerupsToRemove = gameState.powerups.filter(powerup => 
        powerup !== collectedPowerup && 
        powerup.spawnGroup === groupId &&
        powerup.active
    );
    
    if (powerupsToRemove.length === 0) {
        logger.debug('powerup', 'No other powerups found in the same group', { groupId });
        return;
    }
    
    logger.debug('powerup', `Found powerups to remove from group`, { 
        count: powerupsToRemove.length, 
        groupId,
        types: powerupsToRemove.map(p => p.type)
    });
    
    // Process each powerup to remove
    powerupsToRemove.forEach(powerup => {
        // Mark as inactive immediately to prevent collecting during fade-out
        powerup.active = false;
        
        // Ensure the mesh has material and can be faded
        if (powerup.mesh && powerup.mesh.material) {
            // Force material to be transparent
            powerup.mesh.material.transparent = true;
            let opacity = 1.0;
            
            // Use a separate function for the fade effect
            const fadeOut = () => {
                if (!powerup.mesh || !scene.children.includes(powerup.mesh)) return;
                
                opacity -= 0.1;
                powerup.mesh.material.opacity = opacity;
                powerup.mesh.scale.multiplyScalar(0.9);
                
                if (opacity > 0) {
                    // Continue fading
                    requestAnimationFrame(fadeOut);
                } else {
                    // Complete removal
                    scene.remove(powerup.mesh);
                    
                    // Find and remove from the gameState array
                    const index = gameState.powerups.indexOf(powerup);
                    if (index !== -1) {
                        gameState.powerups.splice(index, 1);
                    }
                    
                    logger.debug('powerup', `Completed removal of powerup from group`, {
                        type: powerup.type,
                        groupId
                    });
                }
            };
            
            // Start the fade out effect
            fadeOut();
        } else {
            // If no mesh or material, remove immediately
            if (powerup.mesh) {
                scene.remove(powerup.mesh);
            }
            
            // Remove from the gameState array
            const index = gameState.powerups.indexOf(powerup);
            if (index !== -1) {
                gameState.powerups.splice(index, 1);
            }
            
            logger.debug('powerup', `Immediately removed powerup without mesh/material`, {
                type: powerup.type,
                groupId
            });
        }
    });
};

/**
 * Cleans up old powerups that haven't been collected
 * @param {THREE.Scene} scene - The Three.js scene
 * @param {Object} gameState - The current game state
 * @param {number} maxAge - Maximum age in milliseconds before removal
 */
export const cleanupOldPowerups = (scene, gameState, maxAge = 30000) => {
    const currentTime = Date.now();
    let removedCount = 0;
    
    for (let i = gameState.powerups.length - 1; i >= 0; i--) {
        const powerup = gameState.powerups[i];
        
        // Skip if not active
        if (!powerup.active) {
            gameState.powerups.splice(i, 1);
            removedCount++;
            continue;
        }
        
        // Check if powerup is too old
        if (currentTime - powerup.createdAt > maxAge) {
            // Remove from scene
            scene.remove(powerup.mesh);
            
            // Remove from array
            gameState.powerups.splice(i, 1);
            removedCount++;
            
            logger.debug('powerup', `Removed old powerup due to age`, {
                type: powerup.type,
                age: currentTime - powerup.createdAt,
                maxAge
            });
        }
    }
    
    if (removedCount > 0) {
        logger.debug('powerup', `Cleanup removed powerups`, { count: removedCount });
    }
}; 