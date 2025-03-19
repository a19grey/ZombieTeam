/**
 * Powerup Spawner Module - Handles spawning of powerups in the game
 * 
 * This module contains functions for spawning powerups behind the player,
 * just out of view. It ensures powerups spawn in pairs to create strategic
 * gameplay choices between different powerup types. When one powerup is
 * collected, all others will disappear, encouraging team coordination in
 * multiplayer.
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

// Constants for powerup spawning
const POWERUP_MIN_DISTANCE = 10; // Minimum distance from player
const POWERUP_MAX_DISTANCE = 20; // Maximum distance from player
const POWERUP_SPAWN_CHANCE_PER_SECOND = 0.1; // 30% chance per second to spawn a powerup
const POWERUP_TYPES = ['rapidFire', 'shotgunBlast', 'explosion', 'laserShot', 'grenadeLauncher','shotgunBlast'];
const MIN_TIME_BETWEEN_POWERUPS = 1000; // Minimum time between powerup spawns (10 seconds)

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
        logger.info('powerup', 'Forcing powerup spawn after extended time without spawn', { 
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
    
    // Create powerup object for tracking
    const powerup = {
        mesh: powerupMesh,
        type: powerupType,
        active: true,
        createdAt: Date.now(),
        spawnGroup: gameState.currentPowerupGroup || Date.now() // Group identifier
    };
    
    // Add to gameState
    gameState.powerups.push(powerup);
    
    // Log powerup creation
    logger.info('powerup', `Spawned ${powerupType} powerup`, { 
        position: { x: position.x.toFixed(2), z: position.z.toFixed(2) }
    });
    
    return powerup;
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
    
    // Second powerup type
    const secondTypeIndex = Math.floor(Math.random() * availableTypes.length);
    const secondType = availableTypes[secondTypeIndex];
    
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