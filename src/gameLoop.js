import * as THREE from 'three';

import { gameState, handleGameOver } from './gameState.js';

// import { createScene, createCamera, createRenderer, createLighting, createGround } from './rendering/scene.js';
import { createPlayer, handlePlayerMovement, createPlayerWeapon, aimPlayerWithMouse } from './gameplay/player.js';
import { updateZombies, createExplosion } from './gameplay/zombie.js';
import { createbaseZombie,createExploder,createSkeletonArcher,createZombieKing,createPlagueTitan,createNecrofiend,createRotBehemoth,createSkittercrab } from './enemies/enemyindex.js';
import { updateUI, showMessage, initUI } from './ui/ui.js';
import { handleCollisions, checkCollision, applyPowerupEffect } from './gameplay/physics.js';
import { createBullet, updateBullets } from './gameplay/weapons.js';
import { logger } from './utils/logger.js';
import { createRapidFirePowerup, createShotgunBlastPowerup, createExplosionPowerup, createLaserShotPowerup, createGrenadeLauncherPowerup, animatePowerup, createSmokeTrail } from './gameplay/powerups2.js';
import { createTexturedGround, createBuilding, createRock, createDeadTree } from './rendering/environment.js';
import { setupDismemberment, updateParticleEffects } from './gameplay/dismemberment.js';
import { shouldSpawnPowerup, spawnPowerupBehindPlayer, cleanupOldPowerups } from './gameplay/powerupSpawner.js';
import { debugWebGL, fixWebGLContext, monitorRenderingPerformance, createFallbackCanvas } from './debug.js';
import { safeCall } from './utils/safeAccess.js';
import { spawnEnvironmentObjects, spawnEnemy } from './gameplay/entitySpawners.js';
import { shootBullet, handleCombatCollisions } from './gameplay/combat.js';
import { playSound } from './gameplay/audio.js';

/**
 * Controls and plays ambient enemy sounds based on global sound settings
 * Uses the sound control parameters from gameState to determine frequency and probability
 * 
 * @param {Array} zombies - Array of zombie objects
 * @param {number} currentTime - Current game timestamp in milliseconds
 * @param {Object} gameState - The game state containing sound settings
 */
function updateEnemySounds(zombies, currentTime, gameState) {
    if (!zombies || zombies.length === 0) return;
    
    // Check if enough time has passed since the last sound check
    if (currentTime - gameState.sound.lastZombieSoundTime < gameState.sound.zombieSoundCheckInterval) {
        return; // Not time to check for sounds yet
    }
    
    // Update the last sound check time
    gameState.sound.lastZombieSoundTime = currentTime;
    
    // Track how many sounds we've played in this interval
    let soundsPlayed = 0;
    
    // Process a random subset of zombies
    // Get a random starting point to avoid always checking the same zombies first
    const maxZombiesToProcess = Math.min(zombies.length, 20); // Process up to 20 zombies per check
    const startIndex = Math.floor(Math.random() * zombies.length);
    
    // Check zombie sounds
    for (let i = 0; i < maxZombiesToProcess; i++) {
        // Exit if we've reached the maximum number of sounds per interval
        if (soundsPlayed >= gameState.sound.maxZombieSoundsPerInterval) {
            break;
        }
        
        const index = (startIndex + i) % zombies.length;
        const zombie = zombies[index];
        
        // Skip if zombie doesn't exist
        if (!zombie || !zombie.mesh) continue;
        
        // Get the sound chance based on zombie type
        const soundChance = gameState.sound.zombieSoundChance[zombie.type] || 0.01;
        
        // Random chance to play sound based on type
        if (Math.random() < soundChance) {
            // Only play sound if zombie is close enough to the player
            const player = gameState.playerObject;
            if (player && player.position) {
                const dx = zombie.mesh.position.x - player.position.x;
                const dz = zombie.mesh.position.z - player.position.z;
                const distanceToPlayer = Math.sqrt(dx * dx + dz * dz);
                
                // Only play sound if zombie is within hearing range (adjust distance as needed)
                const maxHearingDistance = 20;
                if (distanceToPlayer < maxHearingDistance) {
                    // Select sound based on zombie type
                    let soundId = 'zombie-growl'; // Default sound
                    
                    // Log the sound being played
                    logger.debug('audio', `Playing ambient sound for ${zombie.type} at distance ${distanceToPlayer.toFixed(2)}`);
                    
                    // Play the sound at the zombie's position
                    playSound(soundId, zombie.mesh.position);
                    
                    // Increment the sound counter
                    soundsPlayed++;
                }
            }
        }
    }
}

// Animation loop with error handling
function animate(scene, camera, renderer, player, clock, powerupTimer, powerupTimerGeometry, innerCircle, powerupTimerMaterial, innerCircleGeometry, innerCircleMaterial) {
    requestAnimationFrame(() => animate(scene, camera, renderer, player, clock, powerupTimer, powerupTimerGeometry, innerCircle, powerupTimerMaterial, innerCircleGeometry, innerCircleMaterial));
    
    try {
        const delta = clock.getDelta();
        const currentTime = Date.now();
        
        // Skip updates if game is over
        if (gameState.gameOver) {
            renderer.render(scene, camera);
            return;
        }
        
        // Update player position based on input with direction-based speeds
        handlePlayerMovement(player, gameState.keys, gameState.baseSpeed);
        
        // Aim player with mouse
        aimPlayerWithMouse(player, gameState.mouse, camera);
        
        // Update health halo based on player health
        if (player.userData.healthHalo) {
            // Calculate the angle based on health percentage (full circle = 2π radians)
            const healthPercent = Math.max(0, Math.min(100, gameState.player.health)) / 100;
            const angle = healthPercent * Math.PI * 2;
            
            // Replace the current halo with an updated one that shows the correct health
            const haloRadius = 0.4;
            const haloTubeWidth = 0.08;
            
            // Remove the old halo
            const oldHalo = player.userData.healthHalo;
            player.remove(oldHalo);
            
            // Remove the old glow halo if it exists
            if (player.userData.glowHalo) {
                const oldGlow = player.userData.glowHalo;
                player.remove(oldGlow);
            }
            
            // Create a new halo with the correct arc length
            const haloGeometry = new THREE.RingGeometry(
                haloRadius - haloTubeWidth, 
                haloRadius, 
                32, 
                1, 
                0, 
                angle
            );
            
            // Change color based on health - improved gradient
            let haloColor;
            if (healthPercent > 0.8) {
                haloColor = 0xffffff; // White for 80-100%
            } else if (healthPercent > 0.6) {
                haloColor = 0x00ff00; // Green for 60-80%
            } else if (healthPercent > 0.4) {
                haloColor = 0xffff00; // Yellow for 40-60%
            } else if (healthPercent > 0.2) {
                haloColor = 0xff8800; // Orange for 20-40%
            } else {
                haloColor = 0xff0000; // Red for 0-20%
            }
            
            const haloMaterial = new THREE.MeshBasicMaterial({
                color: haloColor,
                transparent: true,
                opacity: 0.8,
                side: THREE.DoubleSide
            });
            
            const newHalo = new THREE.Mesh(haloGeometry, haloMaterial);
            newHalo.rotation.x = -Math.PI / 2; // Make it horizontal
            newHalo.position.y = 1.9; // Position above the head
            player.add(newHalo);
            
            // Create a new glow halo with the correct arc length
            const glowGeometry = new THREE.RingGeometry(
                haloRadius - haloTubeWidth - 0.02, 
                haloRadius + 0.02, 
                32, 
                1, 
                0, 
                angle
            );
            
            const glowMaterial = new THREE.MeshBasicMaterial({
                color: haloColor,
                transparent: true,
                opacity: 0.3,
                side: THREE.DoubleSide
            });
            
            const newGlow = new THREE.Mesh(glowGeometry, glowMaterial);
            newGlow.rotation.x = -Math.PI / 2;
            newGlow.position.y = 1.9;
            player.add(newGlow);
            
            // Update the references
            player.userData.healthHalo = newHalo;
            player.userData.glowHalo = newGlow;
            
            // Add a subtle pulsing effect to the glow when health is low
            if (healthPercent < 0.3) {
                const pulseScale = 1 + 0.1 * Math.sin(currentTime * 0.01);
                newGlow.scale.set(pulseScale, pulseScale, 1);
            }
        }
        
        // Update camera to follow player
        camera.position.x = player.position.x;
        
        if (gameState.debug.enabled) {
            // Use debug camera settings
            const cameraSettings = gameState.debug.camera;
            
            // Calculate camera position based on debug settings
            camera.position.z = player.position.z + cameraSettings.distance;
            camera.position.y = cameraSettings.height;
            
            // Calculate a target point with tilt adjustment
            const tiltRadians = THREE.MathUtils.degToRad(cameraSettings.tilt);
            const targetPoint = new THREE.Vector3(
                player.position.x,
                player.position.y - 1 + Math.sin(tiltRadians) * cameraSettings.distance * 0.5,
                player.position.z - 3 - Math.cos(tiltRadians) * 2
            );
            camera.lookAt(targetPoint);
        } else {
            // Default camera behavior for production mode
            camera.position.z = player.position.z + 10; // Now in front of the player (flipped 180 degrees)
            camera.position.y = 10; // Higher camera position for more overhead view (was 7)
            
            // Calculate a target point that's:
            // 1. At the player's x position
            // 2. Below the player's y position (to position player higher in frame)
            // 3. Behind the player (to look back at the player)
            const targetPoint = new THREE.Vector3(
                player.position.x,
                player.position.y - 1, // Adjusted to tilt camera more overhead
                player.position.z - 3  // Now behind the player (flipped 180 degrees)
            );
            camera.lookAt(targetPoint);
        }
        
        // Handle continuous firing when mouse is held down - with rate limiting
        if ((gameState.mouseDown || gameState.keys[' ']) && !gameState.gameOver) {
            shootBullet(scene, player, gameState);
        }
        
        // Update bullets
        updateBullets(gameState.bullets, delta);
        
        // Handle combat-related collisions (bullet-zombie, etc.)
        handleCombatCollisions(scene, player, gameState, delta);
        
        // Handle all collisions (player-powerup, bullet-powerup, player-zombie, etc.)
        handleCollisions(gameState, scene, delta);
        
        // Update zombies to chase player
        updateZombies(gameState.zombies, player.position, delta, gameState.baseSpeed);
        
        // Update enemy sounds using global sound control settings
        updateEnemySounds(gameState.zombies, currentTime, gameState);
        
        // Handle exploder explosions
        for (let i = gameState.zombies.length - 1; i >= 0; i--) {
            try {
                const zombie = gameState.zombies[i];
                
                if (!zombie || !zombie.mesh) continue;
                
                if (zombie.type === 'exploder' && 
                    zombie.mesh.isExploding && 
                    zombie.mesh.explosionTimer <= 0) {
                    
                    // Create explosion
                    createExplosion(
                        scene, 
                        zombie.mesh.position.clone(), 
                        4, // radius
                        75, // damage
                        gameState.zombies, 
                        player, 
                        gameState
                    );
                    
                    // Remove exploder
                    scene.remove(zombie.mesh);
                    gameState.zombies.splice(i, 1);
                    
                    // Add points for successful explosion
                    gameState.score += 25;
                }
            } catch (error) {
                logger.error(`Error handling exploder explosion: ${error.message}`);
                // Try to safely remove the zombie if there was an error
                try {
                    if (gameState.zombies[i] && gameState.zombies[i].mesh) {
                        scene.remove(gameState.zombies[i].mesh);
                    }
                    gameState.zombies.splice(i, 1);
                } catch (e) {
                    logger.error(`Error cleaning up zombie after explosion error: ${e.message}`);
                }
            }
        }
        
        // Handle skeleton archer shooting
        for (let i = 0; i < gameState.zombies.length; i++) {
            const zombie = gameState.zombies[i];
            
            if (zombie.type === 'skeletonArcher') {
                const currentTime = Date.now();
                const ARCHER_COOLDOWN = 2000; // 2 seconds between shots
                
                if (currentTime - zombie.lastShotTime >= ARCHER_COOLDOWN) {
                    // Check if in range and has line of sight
                    const distance = zombie.mesh.position.distanceTo(player.position);
                    
                    if (distance < 15 && distance > 5) {
                        zombie.lastShotTime = currentTime;
                        
                        // Get direction to player
                        const direction = new THREE.Vector3(
                            player.position.x - zombie.mesh.position.x,
                            0,
                            player.position.z - zombie.mesh.position.z
                        ).normalize();
                        
                        // Create arrow (similar to bullet but slower and different appearance)
                        const arrow = createBullet(
                            new THREE.Vector3(
                                zombie.mesh.position.x,
                                zombie.mesh.position.y + 0.5,
                                zombie.mesh.position.z
                            ),
                            direction,
                            10, // Arrow damage
                            0.2, // Arrow speed (slower than bullets)
                            0x8B4513 // Brown color for arrow
                        );
                        
                        // Use safeCall instead of direct access to avoid null errors
                        safeCall(arrow, 'mesh.scale.set', [0.05, 0.05, 0.3]);
                        
                        if (arrow.mesh) {
                            scene.add(arrow.mesh);
                        }
                        gameState.bullets.push(arrow);
                    }
                }
            }
        }
        
        // Handle zombie king summoning minions
        for (let i = 0; i < gameState.zombies.length; i++) {
            const zombie = gameState.zombies[i];
            
            if (zombie.type === 'zombieKing' && zombie.mesh.summonCooldown <= 0) {
                // Reset cooldown
                zombie.mesh.summonCooldown = 10; // 10 seconds between summons
                
                // Summon 2-3 regular zombies around the king
                const numMinions = 2 + Math.floor(Math.random() * 2);
                
                for (let j = 0; j < numMinions; j++) {
                    const angle = Math.random() * Math.PI * 2;
                    const distance = 2 + Math.random() * 2;
                    
                    const position = {
                        x: zombie.mesh.position.x + Math.sin(angle) * distance,
                        z: zombie.mesh.position.z + Math.cos(angle) * distance
                    };
                    
                    const minion = createbaseZombie(position);
                    const minionObj = {
                        mesh: minion,
                        health: 30, // Weaker than regular zombies
                        speed: gameState.baseSpeed, // But faster
                        gameState: gameState,
                        baseSpeed: 0.04,
                        type: 'zombie'
                    };
                    
                    gameState.zombies.push(minionObj);
                    scene.add(minion);
                }
                
                // Visual effect for summoning
                const summonEffect = new THREE.Mesh(
                    new THREE.RingGeometry(0.5, 3, 32),
                    new THREE.MeshBasicMaterial({
                        color: 0x800080,
                        transparent: true,
                        opacity: 0.7,
                        side: THREE.DoubleSide
                    })
                );
                
                summonEffect.rotation.x = Math.PI / 2; // Lay flat on ground
                summonEffect.position.copy(zombie.mesh.position);
                summonEffect.position.y = 0.1; // Just above ground
                scene.add(summonEffect);
                
                // Animate and remove the effect
                let scale = 1;
                const animateSummonEffect = () => {
                    scale -= 0.02;
                    summonEffect.scale.set(scale, scale, scale);
                    summonEffect.material.opacity = scale * 0.7;
                    
                    if (scale > 0) {
                        requestAnimationFrame(animateSummonEffect);
                    } else {
                        scene.remove(summonEffect);
                        summonEffect.geometry.dispose();
                        summonEffect.material.dispose();
                    }
                };
                
                animateSummonEffect();
            }
        }
        
        // Spawn new enemies based on time - much more frequently for a horde
        if (currentTime - gameState.lastEnemySpawnTime > gameState.enemySpawnRate) {
            // Spawn multiple zombies at once for a horde effect
            const spawnCount = Math.min(5, gameState.maxZombies - gameState.zombies.length);
            
            for (let i = 0; i < spawnCount; i++) {
                spawnEnemy(player.position, scene, gameState);
            }
            
            gameState.lastEnemySpawnTime = currentTime;
        }
        
        // Update powerups - animate them
        for (const powerup of gameState.powerups) {
            if (powerup.active && powerup.mesh) {
                animatePowerup(powerup.mesh, clock.elapsedTime);
                
                // Add special effects for unlocked powerups
                if (powerup.unlocked) {
                    // Add a pulsing glow effect to unlocked powerups
                    const pulseIntensity = 0.5 + 0.2 * Math.sin(clock.elapsedTime * 4);
                    
                    // Find core parts of the powerup to apply the glow
                    powerup.mesh.traverse((child) => {
                        if (child.isMesh && child.material && child.material.emissiveIntensity !== undefined) {
                            // Increase emissive intensity for a pulse effect
                            child.material.emissiveIntensity = pulseIntensity;
                        }
                    });
                }
                else if (powerup.health < powerup.maxHealth) {
                    // Add a subtle hit effect that fades quickly for damaged powerups
                    if (powerup.lastHitTime && currentTime - powerup.lastHitTime < 300) {
                        const fadeIntensity = 1 - ((currentTime - powerup.lastHitTime) / 300);
                        
                        // Apply a brief flash effect
                        powerup.mesh.traverse((child) => {
                            if (child.isMesh && child.material && !child.material._isHealthRing) {
                                // Store original color if not already stored
                                if (!child.material._originalColor) {
                                    if (child.material.color) {
                                        child.material._originalColor = child.material.color.clone();
                                    }
                                }
                                
                                // Flash with white, fading back to original color
                                if (child.material._originalColor) {
                                    child.material.color.lerp(new THREE.Color(0xffffff), fadeIntensity * 0.7);
                                }
                            }
                        });
                    }
                }
            }
        }
        
        
        // Check if we should spawn a powerup (only check once per second for efficiency)
        if (!gameState.lastPowerupCheckFrameTime || currentTime - gameState.lastPowerupCheckFrameTime >= 1000) {
            gameState.lastPowerupCheckFrameTime = currentTime;
            logger.debug('powerup', 'Checking for powerup spawn time', currentTime);
            if (shouldSpawnPowerup(gameState, currentTime)) {
                spawnPowerupBehindPlayer(scene, gameState, player);
            }
        }
        
        // Clean up old powerups
        cleanupOldPowerups(scene, gameState, 30000); // 30 seconds max age
        
        // Update powerup duration
        if (gameState.player.activePowerup && gameState.player.powerupDuration > 0) {
            gameState.player.powerupDuration -= delta;
            
            // Debug log to track powerup duration
            if (gameState.debug.enabled) {
                logger.debug('powerup', `Powerup active: ${gameState.player.activePowerup}, duration: ${gameState.player.powerupDuration.toFixed(2)}`);
            }
            
            // Update powerup timer indicator
            if (!powerupTimer.visible) {
                powerupTimer.visible = true;
                innerCircle.visible = true;
                
                logger.info('powerup', `Showing powerup timer for ${gameState.player.activePowerup}`);
                
                // Set color based on powerup type
                let timerColor, innerColor;
                if (gameState.player.activePowerup === 'rapidFire') {
                    timerColor = 0xffa500; // Orange
                    innerColor = 0xffcc00; // Light orange
                } else if (gameState.player.activePowerup === 'shotgunBlast') {
                    timerColor = 0x4682b4; // Steel blue
                    innerColor = 0x87ceeb; // Light blue
                } else if (gameState.player.activePowerup === 'explosion') {
                    timerColor = 0xff0000; // Red
                    innerColor = 0xff6666; // Light red
                } else if (gameState.player.activePowerup === 'laserShot') {
                    timerColor = 0x00ffff; // Cyan
                    innerColor = 0x99ffff; // Light cyan
                } else if (gameState.player.activePowerup === 'grenadeLauncher') {
                    timerColor = 0x228b22; // Forest green
                    innerColor = 0x32cd32; // Lime green
                }
                
                powerupTimerMaterial.color.set(timerColor);
                innerCircleMaterial.color.set(innerColor);
            }
            
            // Calculate scale based on remaining duration (starts at 2, shrinks to 0)
            const scale = gameState.player.powerupDuration / 10 * 2;
            
            // Dispose old geometries
            powerupTimerGeometry.dispose();
            innerCircleGeometry.dispose();
            
            // Create new geometries with updated sizes
            powerupTimer.geometry = new THREE.RingGeometry(scale * 0.8, scale, 32);
            innerCircle.geometry = new THREE.CircleGeometry(scale * 0.7, 32);
            
            // Add pulsing effect to the inner circle
            const pulseScale = 0.9 + Math.sin(clock.elapsedTime * 5) * 0.1;
            innerCircle.scale.set(pulseScale, pulseScale, 1);
            
            // Adjust opacity based on remaining time (fade out as time runs out)
            const remainingTimeRatio = gameState.player.powerupDuration / 10;
            powerupTimerMaterial.opacity = 0.6 * remainingTimeRatio + 0.2; // Min opacity 0.2
            
            // Clear powerup if duration is up
            if (gameState.player.powerupDuration <= 0) {
                gameState.player.activePowerup = null;
                gameState.player.powerupDuration = 0;
                powerupTimer.visible = false;
                innerCircle.visible = false;
            }
        } else if (powerupTimer.visible || innerCircle.visible) {
            // Ensure timer elements are hidden when no powerup is active
            powerupTimer.visible = false;
            innerCircle.visible = false;
        }
        
        // Update UI
        updateUI(gameState);
        
        // Update particles from dismemberment
        if (gameState.dismembermentParticles && gameState.dismembermentParticles.length > 0) {
            updateParticleEffects(gameState.dismembermentParticles, scene, delta);
        }
        
        // Render scene with error handling
        try {
            renderer.render(scene, camera);
        } catch (renderError) {
            logger.error('renderer', 'Render error:', renderError);
            
            // Try to fix WebGL context
            const fixed = fixWebGLContext(renderer);
            
            if (fixed) {
                // Try rendering again with a simple scene
                const testScene = new THREE.Scene();
                testScene.background = new THREE.Color(0xff0000); // Red for visibility
                renderer.render(testScene, camera);
            }
        }
    } catch (error) {
        logger.error('Animation loop error:', error);
    }
}

export { animate };