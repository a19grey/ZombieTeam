/**
 * Powerup Spawner Module - Handles spawning of powerups in the game
 * 
 * This module contains functions for spawning powerups behind the player,
 * just out of view. It ensures powerups spawn within a reasonable distance
 * from the player to create interesting gameplay choices between pursuing
 * powerups or focusing on zombies.
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
import { createTripleShotPowerup, createShotgunBlastPowerup, createExplosionPowerup } from './powerups.js';
import { logger } from '../utils/logger.js';

// Constants for powerup spawning
const POWERUP_MIN_DISTANCE = 10; // Minimum distance from player
const POWERUP_MAX_DISTANCE = 20; // Maximum distance from player
const POWERUP_SPAWN_CHANCE = 0.005; // Chance to spawn a powerup each frame (0.5%)
const POWERUP_TYPES = ['tripleShot', 'shotgunBlast', 'explosion'];
const MULTI_POWERUP_CHANCE = 0.3; // 30% chance to spawn a second powerup
const MIN_TIME_BETWEEN_POWERUPS = 10000; // Minimum time between powerup spawns (10 seconds)

/**
 * Determines if a powerup should spawn based on time and probability
 * @param {Object} gameState - The current game state
 * @param {number} currentTime - Current game time in milliseconds
 * @returns {boolean} Whether a powerup should spawn
 */
export const shouldSpawnPowerup = (gameState, currentTime) => {
    // Get spawn rate from debug settings if available
    const spawnRate = gameState.debug && gameState.debug.powerupSpawnRate 
        ? gameState.debug.powerupSpawnRate 
        : MIN_TIME_BETWEEN_POWERUPS;
    
    // Don't spawn if we've spawned recently
    if (gameState.lastPowerupSpawnTime && 
        currentTime - gameState.lastPowerupSpawnTime < spawnRate) {
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
 * Gets a position behind the player, just out of view
 * @param {THREE.Object3D} player - The player object
 * @param {number} minDistance - Minimum distance from player
 * @param {number} maxDistance - Maximum distance from player
 * @param {boolean} isSecondPowerup - Whether this is a second powerup being spawned
 * @returns {THREE.Vector3} The spawn position
 */
export const getPositionBehindPlayer = (player, minDistance, maxDistance, isSecondPowerup = false) => {
    // Get player's forward direction (negative Z in our coordinate system)
    const playerDirection = new THREE.Vector3(0, 0, -1);
    playerDirection.applyQuaternion(player.quaternion);
    
    // Reverse the direction to get "behind" the player
    const behindDirection = playerDirection.clone().negate();
    
    // Add some randomness to the angle (within a 90-degree arc behind player)
    const angleOffset = (Math.random() - 0.5) * Math.PI / 2; // -45 to +45 degrees
    
    // Create a rotation matrix for the angle offset
    const rotationMatrix = new THREE.Matrix4().makeRotationY(angleOffset);
    behindDirection.applyMatrix4(rotationMatrix);
    
    // If this is a second powerup, add more angle to separate them
    if (isSecondPowerup) {
        const secondPowerupAngle = Math.random() > 0.5 ? Math.PI / 4 : -Math.PI / 4; // 45 degrees left or right
        const secondRotationMatrix = new THREE.Matrix4().makeRotationY(secondPowerupAngle);
        behindDirection.applyMatrix4(secondRotationMatrix);
    }
    
    // Calculate random distance within range
    const distance = minDistance + Math.random() * (maxDistance - minDistance);
    
    // Calculate final position
    const spawnPosition = new THREE.Vector3();
    spawnPosition.copy(player.position);
    spawnPosition.add(behindDirection.multiplyScalar(distance));
    
    // Ensure y-coordinate is at ground level
    spawnPosition.y = 0;
    
    return spawnPosition;
};

/**
 * Creates a powerup of random type
 * @param {THREE.Scene} scene - The Three.js scene
 * @param {THREE.Vector3} position - Position to spawn the powerup
 * @param {Object} gameState - The current game state
 * @returns {Object} The created powerup object
 */
export const createRandomPowerup = (scene, position, gameState) => {
    // Select random powerup type
    const powerupType = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
    
    // Create the powerup based on type
    let powerupMesh;
    switch (powerupType) {
        case 'tripleShot':
            powerupMesh = createTripleShotPowerup(position);
            break;
        case 'shotgunBlast':
            powerupMesh = createShotgunBlastPowerup(position);
            break;
        case 'explosion':
            powerupMesh = createExplosionPowerup(position);
            break;
        default:
            powerupMesh = createTripleShotPowerup(position);
    }
    
    // Add to scene
    scene.add(powerupMesh);
    
    // Create powerup object for tracking
    const powerup = {
        mesh: powerupMesh,
        type: powerupType,
        active: true,
        createdAt: Date.now()
    };
    
    // Add to gameState
    gameState.powerups.push(powerup);
    
    // Log powerup creation
    logger.debug(`Spawned ${powerupType} powerup at position (${position.x.toFixed(2)}, ${position.z.toFixed(2)})`);
    
    return powerup;
};

/**
 * Spawns a powerup behind the player, just out of view
 * @param {THREE.Scene} scene - The Three.js scene
 * @param {Object} gameState - The current game state
 * @param {THREE.Object3D} player - The player object
 */
export const spawnPowerupBehindPlayer = (scene, gameState, player) => {
    // Update last spawn time
    gameState.lastPowerupSpawnTime = Date.now();
    
    // Get position behind player
    const position = getPositionBehindPlayer(
        player, 
        POWERUP_MIN_DISTANCE, 
        POWERUP_MAX_DISTANCE
    );
    
    // Create first powerup
    createRandomPowerup(scene, position, gameState);
    
    // Chance to spawn a second powerup
    if (Math.random() < MULTI_POWERUP_CHANCE) {
        const secondPosition = getPositionBehindPlayer(
            player, 
            POWERUP_MIN_DISTANCE, 
            POWERUP_MAX_DISTANCE,
            true // This is a second powerup
        );
        
        createRandomPowerup(scene, secondPosition, gameState);
        logger.debug('Spawned a second powerup to create player choice');
    }
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