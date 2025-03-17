/**
 * Entity Spawner Module - Handles spawning of game entities
 * 
 * This module contains functions for spawning various entities in the game world,
 * including environment objects (buildings, rocks, trees) and enemies (zombies, archers, etc.).
 * It centralizes entity creation logic to keep the main game loop and initialization clean.
 * 
 * Example usage:
 *   import { spawnEnvironmentObjects, spawnEnemy } from './gameplay/entitySpawners.js';
 *   
 *   // Spawn initial environment
 *   spawnEnvironmentObjects(scene, gameState);
 *   
 *   // Spawn a new enemy
 *   spawnEnemy(player.position, scene, gameState);
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.132.2/build/three.module.js';
import { createbaseZombie, createSkeletonArcher, createExploder, createZombieKing } from '../enemies/enemyindex.js';
import { createBuilding, createRock, createDeadTree } from '../rendering/environment.js';
import { setupDismemberment } from './dismemberment.js';
import { playSound } from './audio.js';
import { logger } from '../utils/logger.js';

/**
 * Spawns environment objects (buildings, rocks, trees) in the game world
 * 
 * @param {THREE.Scene} scene - The Three.js scene to add objects to
 * @param {Object} gameState - The game state object to track environment objects
 */
const spawnEnvironmentObjects = (scene, gameState) => {
    // Create buildings in the distance
    for (let i = 0; i < 15; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = 40 + Math.random() * 60;
        const position = {
            x: Math.sin(angle) * distance,
            z: Math.cos(angle) * distance
        };
        
        // Randomly choose between building, rock, or tree
        const objectType = Math.random();
        let environmentObject;
        
        if (objectType < 0.4) {
            // Create building with random size
            const width = 4 + Math.random() * 6;
            const height = 6 + Math.random() * 10;
            const depth = 4 + Math.random() * 6;
            environmentObject = createBuilding(position, width, height, depth);
        } else if (objectType < 0.7) {
            // Create rock with random size
            const size = 1 + Math.random() * 2;
            environmentObject = createRock(position, size);
        } else {
            // Create dead tree
            environmentObject = createDeadTree(position);
        }
        
        scene.add(environmentObject);
        gameState.environmentObjects.push(environmentObject);
    }
    
    logger.debug('Environment objects spawned');
};

/**
 * Spawns a new enemy based on game state
 * 
 * @param {Object} playerPos - The player's position {x, z}
 * @param {THREE.Scene} scene - The Three.js scene to add enemies to
 * @param {Object} gameState - The game state object
 * @returns {Object|null} The created enemy object or null if max zombies reached
 */
const spawnEnemy = (playerPos, scene, gameState) => {
    // Don't spawn more zombies if we've reached the maximum
    if (gameState.zombies.length >= gameState.maxZombies) {
        return null;
    }
    
    // Generate a position away from the player, primarily in front of the player
    let position;
    let tooClose = true;
    
    // Keep trying until we find a suitable position
    while (tooClose) {
        // Generate a random angle, biased towards the front of the player
        // Front is considered to be the positive Z direction (top of screen)
        let theta;
        
        // Rejection sampling for angle - higher probability in front of player
        // This will generate angles primarily in the range of π/2 to 3π/2 (top half)
        do {
            theta = Math.random() * 2 * Math.PI; // Random angle between 0 and 2π
        } while (Math.random() > (1 + Math.cos(theta + Math.PI)) / 2); // Rejection sampling with flipped direction
        
        // Calculate position based on angle and distance
        const distance = 20 + Math.random() * 10; // Distance from player
        position = {
            x: playerPos.x + distance * Math.sin(theta),
            z: playerPos.z + distance * Math.cos(theta)
        };
        
        // Check if position is far enough from player
        const dx = position.x - playerPos.x;
        const dz = position.z - playerPos.z;
        const distanceToPlayer = Math.sqrt(dx * dx + dz * dz);
        
        if (distanceToPlayer > 15) {
            tooClose = false;
        }
    }
    
    // Determine which enemy type to spawn based on game state
    let enemyObj;
    const enemyTypeRoll = Math.random();
    
    if (enemyTypeRoll < 0.6) {
        // Regular zombie (60% chance)
        const baseSpeed = 0.03 + Math.random() * 0.02;
        const zombie = createbaseZombie(position, baseSpeed);
        enemyObj = {
            mesh: zombie,
            health: 50,
            speed: baseSpeed,
            gameState: gameState,
            baseSpeed: baseSpeed,
            type: 'zombie'
        };
    } else if (enemyTypeRoll < 0.8) {
        // Skeleton Archer (20% chance)
        const baseSpeed = 0.04;
        const skeletonArcher = createSkeletonArcher(position, baseSpeed);
        enemyObj = {
            mesh: skeletonArcher,
            health: 40, // Less health than zombie
            speed: baseSpeed, // Faster but keeps distance
            gameState: gameState,
            baseSpeed: baseSpeed,
            type: 'skeletonArcher',
            lastShotTime: 0
        };
    } else if (enemyTypeRoll < 0.95) {
        // Exploder (15% chance)
        const baseSpeed = 0.05;
        const exploder = createExploder(position, baseSpeed);
        enemyObj = {
            mesh: exploder,
            health: 30, // Less health
            speed: baseSpeed, // Faster to get close to player
            gameState: gameState,
            baseSpeed: baseSpeed,
            type: 'exploder'
        };
    } else {
        // Zombie King (5% chance - rare but powerful)
        const baseSpeed = 0.02;
        const zombieKing = createZombieKing(position, baseSpeed);
        enemyObj = {
            mesh: zombieKing,
            health: 200, // Reduced from 500 to make dismemberment more visible
            speed: baseSpeed, // Slower but powerful
            gameState: gameState,
            baseSpeed: baseSpeed,
            type: 'zombieKing'
        };
    }
    
    // Ensure the mesh has the same type property for consistency
    enemyObj.mesh.type = enemyObj.type;
    
    // Set up dismemberment system for this zombie
    setupDismemberment(enemyObj);
    
    gameState.zombies.push(enemyObj);
    scene.add(enemyObj.mesh);
    
    // Play zombie growl sound at the zombie's position given by the enemyObj
    playSound('zombie-growl', enemyObj.mesh.position);
    
    logger.debug(`New ${enemyObj.type} spawned`, { position });
    
    return enemyObj;
};

export { spawnEnvironmentObjects, spawnEnemy }; 