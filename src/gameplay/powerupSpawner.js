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
 * This module also handles magical portals that can transport players to
 * other games in the connected universe.
 * 
 * Example usage:
 * ```
 * // In your game loop
 * if (shouldSpawnPowerup(gameState, currentTime)) {
 *   spawnPowerupBehindPlayer(scene, gameState, player);
 * }
 * 
 * // For portals
 * if (shouldSpawnExitPortal(gameState, currentTime)) {
 *   createExitPortal(scene, gameState, player);
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
const POWERUP_SPAWN_CHANCE_PER_SECOND = 0.04; // 30% chance per second to spawn a powerup
const POWERUP_TYPES = ['rapidFire', 'shotgunBlast', 'explosion', 'laserShot', 'grenadeLauncher'];
const MIN_TIME_BETWEEN_POWERUPS = 800; // Minimum time between powerup spawns (10 seconds)

// Constants for powerup health
const DEFAULT_POWERUP_HEALTH = 100; // Default health for powerups
const POWERUP_HEALTH_BY_TYPE = {
    'rapidFire': 80*3,        // Easier to unlock
    'shotgunBlast': 100*3,
    'explosion': 150*3,       // Harder to unlock
    'laserShot': 120*3,
    'grenadeLauncher': 130*3
};

// Constants for exit portal spawning
const PORTAL_SPAWN_CHANCE_PER_SECOND = 0.5; // 1% chance per second (much rarer than powerups)
const MIN_TIME_BETWEEN_PORTALS = .3; // Minimum time between portal spawns (5 minutes)
const PORTAL_MIN_DISTANCE = 24; // Minimum distance from player
const PORTAL_MAX_DISTANCE = 25; // Maximum distance from player
const PORTAL_LIFETIME = 120000; // Portal lifetime in milliseconds (60 seconds)

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
            gameState.player.powerupDuration = 15;
            
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

/**
 * Determines if an exit portal should spawn based on time and probability
 * @param {Object} gameState - The current game state
 * @param {number} currentTime - Current game time in milliseconds
 * @returns {boolean} Whether a portal should spawn
 */
export const shouldSpawnExitPortal = (gameState, currentTime) => {

    logger.debug('portal', 'Checking if exit portal should spawn', { currentTime });
    // Initialize portal-related properties if they don't exist
    if (!gameState.lastPortalSpawnTime) {
        gameState.lastPortalSpawnTime = currentTime - MIN_TIME_BETWEEN_PORTALS;
        gameState.lastPortalCheckTime = currentTime;
        logger.debug('portal', 'Initializing lastPortalSpawnTime', { time: gameState.lastPortalSpawnTime });
        return false;
    }
    
    // First, clean up any expired portals to allow new ones to spawn
    const activePortalsCount = cleanupOldPortals(gameState, currentTime);
    
    // Don't spawn if we've spawned recently or if there are too many active portals
    // Changed to allow up to 2 active portals at once
    if (currentTime - gameState.lastPortalSpawnTime < MIN_TIME_BETWEEN_PORTALS || 
        activePortalsCount >= 2) {
        return false;
    }
    
    // Calculate time since last check in seconds
    const timeSinceLastCheck = (currentTime - (gameState.lastPortalCheckTime)) / 1000;
    gameState.lastPortalCheckTime = currentTime;
    
    // Skip if time since last check is too small
    if (timeSinceLastCheck < 0.5) {
        return false;
    }
    
    // Calculate spawn probability based on time passed
    const spawnProbability = PORTAL_SPAWN_CHANCE_PER_SECOND * timeSinceLastCheck;
    
    // Log check with adjusted probability
    logger.debug('portal', 'Checking portal spawn probability', { 
        chance: (spawnProbability * 100).toFixed(2) + '%', 
        timeElapsed: timeSinceLastCheck.toFixed(2) + 's',
        activePortals: activePortalsCount
    });
    
    // Random chance to spawn based on time passed
    return Math.random() < spawnProbability;
};

/**
 * Cleans up old portals that have exceeded their lifetime
 * @param {Object} gameState - The current game state
 * @param {number} currentTime - Current time in milliseconds
 * @returns {number} Number of remaining active portals
 */
export const cleanupOldPortals = (gameState, currentTime) => {
    if (!gameState.portals || gameState.portals.length === 0) {
        return 0;
    }

    let removedCount = 0;
    
    // Process each portal
    for (let i = gameState.portals.length - 1; i >= 0; i--) {
        const portal = gameState.portals[i];
        
        // Skip if already inactive
        if (!portal.active) {
            gameState.portals.splice(i, 1);
            removedCount++;
            continue;
        }
        
        // Check if portal has exceeded its lifetime
        if (currentTime - portal.createdAt > PORTAL_LIFETIME) {
            logger.info('portal', 'Portal expired after lifetime', { 
                age: (currentTime - portal.createdAt) / 1000,
                maxAge: PORTAL_LIFETIME / 1000
            });
            
            // Fade out and remove the portal
            fadeOutPortal(portal, gameState, i);
            removedCount++;
        }
    }
    
    if (removedCount > 0) {
        logger.debug('portal', `Cleanup removed ${removedCount} portals due to age`);
    }
    
    return gameState.portals.length;
};

/**
 * Fades out a portal and removes it from the game
 * @param {Object} portal - The portal to fade out
 * @param {Object} gameState - The game state
 * @param {number} portalIndex - Index of the portal in the gameState.portals array
 */
function fadeOutPortal(portal, gameState, portalIndex) {
    // Mark as inactive immediately
    portal.active = false;
    
    // Remove from array
    if (portalIndex !== undefined) {
        gameState.portals.splice(portalIndex, 1);
    }
    
    // Fade out visually if the portal group exists
    if (portal.group) {
        let opacity = 1.0;
        const fadeInterval = setInterval(() => {
            opacity -= 0.05;
            
            // Apply opacity to all materials in the portal
            portal.group.traverse((child) => {
                if (child.material) {
                    if (!child.material.originalOpacity) {
                        child.material.originalOpacity = child.material.opacity || 1.0;
                    }
                    child.material.opacity = child.material.originalOpacity * opacity;
                }
            });
            
            // Shrink the portal
            portal.group.scale.multiplyScalar(0.95);
            
            // When completely faded
            if (opacity <= 0) {
                clearInterval(fadeInterval);
                
                // Remove from scene (if we have access to scene)
                if (portal.scene) {
                    portal.scene.remove(portal.group);
                }
                
                // If we don't have scene access, the portal will just be invisible
                // and will be garbage collected when the gameState.portals reference is removed
            }
        }, 50);
    }
}

/**
 * Creates an exit portal at the specified position
 * @param {THREE.Scene} scene - The Three.js scene
 * @param {THREE.Vector3} position - Position to spawn the portal
 * @param {Object} gameState - The current game state
 * @returns {Object} The created portal object
 */
export const createExitPortal = (scene, position, gameState) => {
    logger.info('portal', 'Creating exit portal at', position);
    const portaltext = 'TO VIBEVERSE';
    // Create portal group to hold all portal elements
    const portalGroup = new THREE.Group();
    portalGroup.position.copy(position);
    
    // Portal ring
    const portalRingGeometry = new THREE.TorusGeometry(2, 0.3, 16, 50);
    const portalRingMaterial = new THREE.MeshPhongMaterial({
        color: 0x00ff00, // Green for exit portals
        emissive: 0x00ff00,
        transparent: true,
        opacity: 0.8
    });
    const portalRing = new THREE.Mesh(portalRingGeometry, portalRingMaterial);
    portalRing.rotation.x = Math.PI / 2; // Make it horizontal (flat on ground)
    portalGroup.add(portalRing);
    
    // Portal inner effect
    const portalInnerGeometry = new THREE.CircleGeometry(1.7, 32);
    const portalInnerMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ff00, // Green for exit portals
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide
    });
    const portalInner = new THREE.Mesh(portalInnerGeometry, portalInnerMaterial);
    portalInner.rotation.x = Math.PI / 2; // Flat on ground
    portalInner.position.y = 0.1; // Slightly above ground
    portalGroup.add(portalInner);
    
    // Create "VIBEVERSE PORTAL" label
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 512;
    canvas.height = 128; // Increased height for better background
    
    // Make canvas transparent by default
    context.clearRect(0, 0, canvas.width, canvas.height);
    
    // Create rainbow gradient for text
    const gradient = context.createLinearGradient(0, 0, canvas.width, 0);
    gradient.addColorStop(0, '#ff0000'); // Red
    gradient.addColorStop(0.2, '#ffff00'); // Yellow
    gradient.addColorStop(0.4, '#00ff00'); // Green
    gradient.addColorStop(0.6, '#00ffff'); // Cyan
    gradient.addColorStop(0.8, '#0000ff'); // Blue
    gradient.addColorStop(1, '#ff00ff'); // Magenta
    
    // Add glow effect to text
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    
    // Larger, bolder text
    context.font = 'bold 50px Arial, sans-serif';
    
    // Draw white outline for extra visibility
    context.lineWidth = 8;
    context.strokeStyle = 'black';
    context.strokeText(portaltext, canvas.width / 2, canvas.height / 2);
    
    // Draw main text with gradient fill
    context.fillStyle = gradient; // Use the rainbow gradient for the text
    context.fillText(portaltext, canvas.width / 2, canvas.height / 2);
    
    const texture = new THREE.CanvasTexture(canvas);
    const labelGeometry = new THREE.PlaneGeometry(5, 1); // Larger geometry for bigger label
    const labelMaterial = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide,
        alphaTest: 0.1 // Helps with transparency artifacts
    });
    
    // Create label with glow effect around edges
    const label = new THREE.Mesh(labelGeometry, labelMaterial);
    label.position.y = 2.5; // Height above ground
    label.position.z = -2.0; // Position in front of the portal
    label.rotation.x = 0; // No x rotation for vertical orientation
    
    // Add subtle animation to the label
    const labelAnimation = () => {
        label.position.y = 2.5 + Math.sin(Date.now() * 0.001) * 0.1; // Less dramatic bobbing
        label.rotation.y = Math.sin(Date.now() * 0.0005) * 0.05; // Gentle swaying
        
        if (portal && portal.active) {
            requestAnimationFrame(labelAnimation);
        }
    };
    requestAnimationFrame(labelAnimation);
    
    portalGroup.add(label);
    
    // Create particle system for portal effects
    const particleCount = 500;
    const portalParticles = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount * 3; i += 3) {
        // Create particles in a ring pattern around the portal
        const angle = Math.random() * Math.PI * 2;
        const radius = 1.7 + (Math.random() - 0.5) * 0.6;
        particlePositions[i] = Math.cos(angle) * radius;
        particlePositions[i + 1] = (Math.random() - 0.5) * 0.5; // Vertical spread
        particlePositions[i + 2] = Math.sin(angle) * radius;
        
        // Greenish particle colors
        particleColors[i] = 0;
        particleColors[i + 1] = 0.8 + Math.random() * 0.2;
        particleColors[i + 2] = 0;
    }
    
    portalParticles.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    portalParticles.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));
    
    const particleMaterial = new THREE.PointsMaterial({
        size: 0.05,
        vertexColors: true,
        transparent: true,
        opacity: 0.6
    });
    
    const particleSystem = new THREE.Points(portalParticles, particleMaterial);
    portalGroup.add(particleSystem);
    
    // Create collision box for portal
    const collisionBox = new THREE.Box3().setFromObject(portalGroup);
    
    // Add portal to scene
    scene.add(portalGroup);
    
    // Create portal object for tracking
    const portal = {
        group: portalGroup,
        ring: portalRing,
        inner: portalInner,
        particles: particleSystem,
        particlesGeometry: portalParticles,
        box: collisionBox,
        active: true,
        createdAt: Date.now(),
        scene: scene // Store reference to scene for cleanup
    };
    
    // Initialize portals array if it doesn't exist
    if (!gameState.portals) {
        gameState.portals = [];
    }
    
    // Add to gameState
    gameState.portals.push(portal);
    gameState.lastPortalSpawnTime = Date.now();
    
    // Play portal creation sound
    playSound('powerupPickup'); // Use existing sound for now
    
    // Show message about portal appearance
    showMessage('A portal to the Vibeverse has appeared!', 4000);
    
    // Log portal creation
    logger.info('portal', 'Exit portal created', { position });
    
    return portal;
};

/**
 * Spawns an exit portal behind the player
 * @param {THREE.Scene} scene - The Three.js scene
 * @param {Object} gameState - The current game state
 * @param {THREE.Object3D} player - The player object
 */
export const spawnExitPortalBehindPlayer = (scene, gameState, player) => {
    // Update last spawn time
    gameState.lastPortalSpawnTime = Date.now();
    
    // Calculate a random distance
    const zDistance = PORTAL_MIN_DISTANCE + Math.random() * (PORTAL_MAX_DISTANCE - PORTAL_MIN_DISTANCE);
    
    // Determine if portal should be on left or right side
    const isRightSide = Math.random() > 0.5;
    
    // Get position behind player
    const portalPosition = getPositionBehindPlayer(
        player, 
        zDistance,
        isRightSide
    );

    portalPosition.x = portalPosition.x*1.5 ; 

    // Create the portal
    createExitPortal(scene, portalPosition, gameState);
    
    logger.info('portal', 'Spawned exit portal', { 
        position: { x: portalPosition.x.toFixed(2), z: portalPosition.z.toFixed(2) },
        distance: zDistance.toFixed(2) 
    });
};

/**
 * Updates portal animations and effects
 * @param {Array} portals - Array of portal objects
 * @param {number} elapsedTime - Elapsed game time for animations
 * @param {THREE.Scene} scene - The Three.js scene
 */
export const updatePortals = (portals, elapsedTime, scene) => {
    if (!portals || portals.length === 0) return;
    
    for (const portal of portals) {
        if (!portal.active || !portal.group) continue;
        
        // Update particle positions for swirling effect
        if (portal.particlesGeometry && portal.particlesGeometry.attributes.position) {
            const positions = portal.particlesGeometry.attributes.position.array;
            
            for (let i = 0; i < positions.length; i += 3) {
                // Create swirling effect
                const x = positions[i];
                const z = positions[i + 2];
                const distance = Math.sqrt(x * x + z * z);
                const angle = Math.atan2(z, x) + 0.01 * Math.sin(elapsedTime + distance);
                const newRadius = distance * (1 + 0.02 * Math.sin(elapsedTime * 2 + distance * 3));
                
                positions[i] = Math.cos(angle) * newRadius;
                positions[i + 2] = Math.sin(angle) * newRadius;
                positions[i + 1] += 0.005 * Math.sin(elapsedTime * 5 + i);
            }
            
            portal.particlesGeometry.attributes.position.needsUpdate = true;
        }
        
        // Rotate the portal ring slightly for effect
        if (portal.ring) {
            portal.ring.rotation.z += 0.001;
        }
        
        // Pulsing effect for the inner circle
        if (portal.inner) {
            const scale = 1 + 0.1 * Math.sin(elapsedTime * 2);
            portal.inner.scale.set(scale, scale, 1);
        }
        
        // Update collision box
        if (portal.group) {
            portal.box = new THREE.Box3().setFromObject(portal.group);
        }
    }
};

/**
 * Checks if player has collided with a portal
 * @param {THREE.Vector3} playerPosition - Player's position
 * @param {THREE.Object3D} player - Player object
 * @param {Array} portals - Array of portal objects
 * @param {Object} gameState - The current game state
 * @returns {boolean} Whether a collision occurred and was handled
 */
export const checkPortalCollision = (playerPosition, player, portals, gameState) => {
    if (!portals || portals.length === 0 || !player) return false;
    
    const currentTime = Date.now();
    
    for (const portal of portals) {
        if (!portal.active || !portal.group) continue;
        
        // Use a more precise distance-based check instead of box intersection
        // Calculate 2D horizontal distance between player and portal center
        const portalPosition = portal.group.position;
        const dx = playerPosition.x - portalPosition.x;
        const dz = playerPosition.z - portalPosition.z;
        const distanceToPortal = Math.sqrt(dx * dx + dz * dz);
        
        // Portal radius - this should match the visual size of the portal
        const portalRadius = 1.2; // Adjust this value based on actual portal size
        
        // Check if player is standing within the portal radius
        if (distanceToPortal < portalRadius) {
            // If this is the first frame of collision, record entry time
            if (!portal.playerEntryTime) {
                portal.playerEntryTime = currentTime;
                // Show message when player first steps on portal
                showMessage('Stand on portal for 1 second to teleport...', 2000);
                
                // Play portal sound (first contact only)
                playSound('powerupPickup'); // Using existing sound for now
                
                logger.debug('portal', `Player entered portal area, distance: ${distanceToPortal.toFixed(2)}`);
            }
            
            // Calculate how long player has been on the portal
            const timeOnPortal = currentTime - portal.playerEntryTime;
            
            // Log the precise position and time for debugging
            if (timeOnPortal % 250 < 50) { // Log roughly every 250ms
                logger.debug('portal', `Standing on portal: ${timeOnPortal}ms, distance: ${distanceToPortal.toFixed(2)}`);
            }
            
            // If player has been on portal for 1+ seconds, teleport
            if (timeOnPortal >= 1000) {
                // Handle portal teleportation
                handlePortalTeleport(playerPosition, gameState);
                return true;
            }
            
            // Player is on portal but hasn't been there long enough yet
            return false;
        } else {
            // Reset entry time if player leaves the portal
            if (portal.playerEntryTime) {
                // Only log when actually leaving the portal area after having been on it
                logger.debug('portal', `Player left portal area, distance: ${distanceToPortal.toFixed(2)}`);
                portal.playerEntryTime = null;
            }
        }
    }
    
    return false;
};

/**
 * Handles teleportation through a portal
 * @param {THREE.Vector3} playerPosition - Player's position
 * @param {Object} gameState - The current game state
 */
const handlePortalTeleport = (playerPosition, gameState) => {
    logger.info('portal', 'Player stood on portal for 1 second, initiating teleport');
    
    // Create URL parameters with player state
    const params = new URLSearchParams({
        portal: 'true',  // This MUST be the string 'true' to match our check in main.js
        username: gameState.player.name || 'Survivor',
        score: gameState.score.toString(),
        health: gameState.player.health.toString(),
        color: 'red', // Default color for players
        speed: gameState.baseSpeed.toString(),
        ref: window.location.href // URL of our game as referrer
    });
    
    // Show teleport message
    showMessage('Entering the Vibeverse...', 2000);
    
    // Log the URL we're redirecting to for debugging
    logger.info('portal', `Redirecting to: http://portal.pieter.com/?${params.toString()}`);
    
    // Redirect immediately - no delay since we already waited 1 second on the portal
    window.location.href = `http://portal.pieter.com/?${params.toString()}`;
}; 