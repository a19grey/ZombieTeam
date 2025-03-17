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

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.132.2/build/three.module.js';
import { createRapidFirePowerup, createShotgunBlastPowerup, createExplosionPowerup, createLaserShotPowerup, createGrenadeLauncherPowerup } from './powerups2.js';
import { logger } from '../utils/logger.js';

// Constants for powerup spawning
const POWERUP_MIN_DISTANCE = 10; // Minimum distance from player
const POWERUP_MAX_DISTANCE = 20; // Maximum distance from player
const POWERUP_SPAWN_CHANCE = 0.005; // Chance to spawn a powerup each frame (0.5%)
const POWERUP_TYPES = ['rapidFire', 'shotgunBlast', 'explosion', 'laserShot', 'grenadeLauncher'];
const MIN_TIME_BETWEEN_POWERUPS = 10000; // Minimum time between powerup spawns (10 seconds)

/**
 * Determines if a powerup should spawn based on time and probability
 * @param {Object} gameState - The current game state
 * @param {number} currentTime - Current game time in milliseconds
 * @returns {boolean} Whether a powerup should spawn
 */
export const shouldSpawnPowerup = (gameState, currentTime) => {
    // Use the main gameState.powerupSpawnRate or fallback to debug settings or constant
    const spawnRate = gameState.powerupSpawnRate || 
        (gameState.debug && gameState.debug.powerupSpawnRate) || 
        MIN_TIME_BETWEEN_POWERUPS;
    
    // Initialize lastPowerupSpawnTime if it doesn't exist
    if (!gameState.lastPowerupSpawnTime) {
        gameState.lastPowerupSpawnTime = currentTime - spawnRate;
        return false;
    }
    
    // Don't spawn if we've spawned recently
    if (currentTime - gameState.lastPowerupSpawnTime < spawnRate) {
        return false;
    }
    
    // Always spawn if enough time has passed
    if (currentTime - gameState.lastPowerupSpawnTime > spawnRate * 1.5) {
        return true;
    }
    
    // Random chance to spawn
    return Math.random() < POWERUP_SPAWN_CHANCE;
};

/**
 * Gets a position behind the player in absolute world coordinates (negative Z direction)
 * @param {THREE.Object3D} player - The player object
 * @param {number} zDistance - Exact distance from player in Z direction
 * @param {boolean} isRightSide - Whether to position on right side (positive X) or left side (negative X)
 * @returns {THREE.Vector3} The spawn position
 */
export const getPositionBehindPlayer = (player, zDistance, isRightSide = false) => {
    // Fixed X offset for horizontal positioning
    const xOffset = 2.5; // Distance from center in X direction
    
    // Create the spawn position in absolute world coordinates
    const spawnPosition = new THREE.Vector3();
    
    // Start at player's position
    spawnPosition.copy(player.position);
    
    // Move south (negative Z) by the specified distance
    spawnPosition.z = zDistance;
    
    // Apply X offset based on left/right side
    spawnPosition.x += isRightSide ? xOffset : -xOffset;
    
    // Ensure y-coordinate is at ground level
    spawnPosition.y = 0;
    
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
    logger.debug(`Spawned ${powerupType} powerup at position (${position.x.toFixed(2)}, ${position.z.toFixed(2)})`);
    
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
    
    logger.debug(`Spawned powerup pair: ${firstType} and ${secondType} at Z-distance ${zDistance.toFixed(2)} with group ID ${spawnGroupId}`);
};

/**
 * Removes all powerups from the same spawn group except the collected one
 * @param {THREE.Scene} scene - The Three.js scene
 * @param {Object} gameState - The current game state
 * @param {Object} collectedPowerup - The powerup that was collected
 */
export const removeOtherPowerups = (scene, gameState, collectedPowerup) => {
    const groupId = collectedPowerup.spawnGroup;
    logger.debug(`Attempting to remove powerups from group ${groupId}`);
    
    // Find all powerups from the same group that need to be removed
    const powerupsToRemove = gameState.powerups.filter(powerup => 
        powerup !== collectedPowerup && 
        powerup.spawnGroup === groupId &&
        powerup.active
    );
    
    if (powerupsToRemove.length === 0) {
        logger.debug('No other powerups found in the same group');
        return;
    }
    
    logger.debug(`Found ${powerupsToRemove.length} other powerups to remove from group ${groupId}`);
    
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
                    
                    logger.debug(`Completed removal of ${powerup.type} powerup from group ${groupId}`);
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
            
            logger.debug(`Immediately removed ${powerup.type} powerup without mesh/material from group ${groupId}`);
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
    
    for (let i = gameState.powerups.length - 1; i >= 0; i--) {
        const powerup = gameState.powerups[i];
        
        // Skip if not active
        if (!powerup.active) {
            gameState.powerups.splice(i, 1);
            continue;
        }
        
        // Check if powerup is too old
        if (currentTime - powerup.createdAt > maxAge) {
            // Remove from scene
            scene.remove(powerup.mesh);
            
            // Remove from array
            gameState.powerups.splice(i, 1);
            
            logger.debug(`Removed old ${powerup.type} powerup`);
        }
    }
}; 