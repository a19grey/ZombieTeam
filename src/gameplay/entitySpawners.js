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

import * as THREE from 'three';
import { createbaseZombie, createSkeletonArcher, createExploder, createZombieKing, createPlagueTitan, createNecrofiend, createRotBehemoth, createSkittercrab } from '../enemies/enemyindex.js';
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
            const width = 2 + Math.random() * 3;
            const height = 3 + Math.random() * 5;
            const depth = 2 + Math.random() * 3;
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
    
    //logger.debug('Environment objects spawned');
};

/**
 * Enemy registry containing all enemy types with their spawn configuration
 * This makes it easy to add new enemy types and adjust spawn probabilities
 */
const enemyRegistry = [
    {
        type: 'zombie',
        chance: 45,  // Reduced from 60%
        createFn: createbaseZombie,
        speedVariation: 0.04,  // +/- 0.02 variation
        playSpawnSfx: false
    },
    {
        type: 'skeletonArcher',
        chance: 4,  // Reduced from 20%
        createFn: createSkeletonArcher,
        speedVariation: 0.02,  // +/- 0.01 variation
        playSpawnSfx: false,
        additionalProps: {
            lastShotTime: 0
        }
    },
    {
        type: 'exploder',
        chance: 10,  // Reduced from 15%
        createFn: createExploder,
        speedVariation: 0.03,  // +/- 0.015 variation
        playSpawnSfx: false
    },
    {
        type: 'zombieKing',
        chance: 2,  // Reduced from 5%
        createFn: createZombieKing,
        speedVariation: 0.02,  // +/- 0.01 variation
        playSpawnSfx: true
    },
    {
        type: 'plagueTitan',
        chance: 0.05,  // New enemy
        createFn: createPlagueTitan,
        speedVariation: 0.02,
        playSpawnSfx: true
    },
    {
        type: 'necrofiend',
        chance: 1,  // New enemy
        createFn: createNecrofiend,
        speedVariation: 0.03,
        playSpawnSfx: true
    },
    {
        type: 'rotBehemoth',
        chance: 0.1,  // New enemy - rare/powerful
        createFn: createRotBehemoth,
        speedVariation: 0.02,
        playSpawnSfx: true
    },
    {
        type: 'skittercrab',
        chance: 2,  // New enemy
        createFn: createSkittercrab,
        speedVariation: 0.05,  // More variation for fast erratic movement
        playSpawnSfx: false
    }
];

/**
 * Selects an enemy type based on relative spawn chances
 * 
 * @returns {Object} The selected enemy configuration
 */
const selectEnemyType = () => {
    // Calculate total chance sum
    const totalChance = enemyRegistry.reduce((sum, enemy) => sum + enemy.chance, 0);
    
    // Generate a random number between 0 and totalChance
    const roll = Math.random() * totalChance;
    
    // Find which enemy type this roll selects
    let cumulativeChance = 0;
    
    for (const enemy of enemyRegistry) {
        cumulativeChance += enemy.chance;
        if (roll < cumulativeChance) {
            return enemy;
        }
    }
    
    // Fallback to first enemy type (should never happen unless totalChance is 0)
    logger.warn('spawn', 'Failed to select enemy type, using default');
    return enemyRegistry[0];
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
    const minDistanceToPlayer = 15; // Minimum distance from player
    
    // Generate a random angle, biased towards the front of the player
    // Front is considered to be the positive Z direction (top of screen)
    let theta;
    let acceptanceProb;
    

    // Rejection sampling for angle - higher probability in front of player
    do {
        theta = Math.random() * 2 * Math.PI;
    } while (
        Math.abs(theta - Math.PI) < (2 * Math.PI / 3) || 
        Math.random() > (1 + Math.cos(theta + Math.PI)) / 2
    );
    
    theta = theta - Math.PI; // Flip the angle to be in the FRONT of the player our game is a bit backwards somehow
    const spawnjitter = 10 ;
    // Calculate position with guaranteed minimum distance
    const distance = minDistanceToPlayer + Math.abs(Math.random()) * spawnjitter; // units from player
    position = {
        x: playerPos.x + distance * Math.sin(theta),
        z: playerPos.z + distance * Math.cos(theta)
    };
    
    // Get the base speed from gameState with a small random variation
    const globalBaseSpeed = gameState.baseSpeed;
    logger.debug('speed', `Using global base speed: ${globalBaseSpeed} for enemy spawn`);
    
    // Select enemy type based on chances
    const selectedEnemy = selectEnemyType();
    
    // Create the enemy mesh
    const enemyMesh = selectedEnemy.createFn(position, globalBaseSpeed);
    
    // Add small random variation to speed
    const variation = selectedEnemy.speedVariation || 0.02;
    const baseSpeed = enemyMesh.speed + (Math.random() * variation - variation/2);
    
    // Create the enemy object with common properties
    const enemyObj = {
        mesh: enemyMesh,
        health: selectedEnemy.healthOverride || enemyMesh.health,
        speed: baseSpeed,
        gameState: gameState,
        baseSpeed: baseSpeed,
        type: selectedEnemy.type,
        playSpawnSfx: selectedEnemy.playSpawnSfx || false
    };
    
    // Add any additional properties specific to this enemy type
    if (selectedEnemy.additionalProps) {
        Object.assign(enemyObj, selectedEnemy.additionalProps);
    }
    
    logger.debug('speed', `${selectedEnemy.type} spawned with speed: ${baseSpeed}`);
    
    // Ensure the mesh has the same type property for consistency
    enemyObj.mesh.type = enemyObj.type;
    
    // Set up dismemberment system for this zombie
    setupDismemberment(enemyObj);
    
    gameState.zombies.push(enemyObj);
    scene.add(enemyObj.mesh);
    
    // Only play the zombie growl sound if the enemy has playSpawnSfx set to true
    if (enemyObj.playSpawnSfx === true) {
        logger.debug('audio', `Playing spawn sound for ${enemyObj.type}`);
        playSound('zombie-growl', enemyObj.mesh.position);
    }
    
    //logger.debug(`New ${enemyObj.type} spawned`, { position });
    
    return enemyObj;
};

export { spawnEnvironmentObjects, spawnEnemy }; 