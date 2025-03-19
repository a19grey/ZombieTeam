/**
 * Enemy Index Module - Central export point for all enemy creation functions
 * 
 * This module serves as a centralized entry point for importing all enemy creation
 * functions in the game. It exports each enemy creator function from their respective
 * modules, allowing for a clean import syntax when creating different enemy types
 * throughout the game.
 * 
 * Example usage:
 *   import { 
 *     createZombie, 
 *     createSkeletonArcher, 
 *     createExploder 
 *   } from './enemies/enemyindex.js';
 *   
 *   // Create different enemy types
 *   const zombie = createZombie({x: 10, z: 15}, 0.05);
 *   const archer = createSkeletonArcher({x: 20, z: 25}, 0.05);
 *   const exploder = createExploder({x: 15, z: 10}, 0.05);
 *   
 *   scene.add(zombie);
 *   scene.add(archer);
 *   scene.add(exploder);
 */

// src/enemies/index.js

import * as THREE from 'three';
import { logger } from '../utils/logger.js';

// Add 'enemy' to logger sections if not already included
logger.addSection('enemy');

// Export all enemy creation functions
export { createbaseZombie } from './baseZombie.js';
export { createSkeletonArcher } from './skeletonArcher.js';
export { createExploder } from './exploder.js';
export { createZombieKing } from './zombieKing.js';
export { createPlagueTitan } from './plagueTitan.js';
export { createNecrofiend } from './necrofiend.js';
export { createRotBehemoth } from './rotBehemoth.js';
export { createSkittercrab } from './skittercrab.js';

// Log that the enemy module is initialized
logger.info('enemy', 'Enemy module initialized with all enemy types');