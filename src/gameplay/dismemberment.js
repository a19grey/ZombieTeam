/**
 * Dismemberment Module - Handles zombie limb loss based on damage
 * 
 * This module contains functions for managing the dismemberment of zombies
 * as they take damage. It provides a scalable system where zombies lose limbs
 * based on the percentage of damage they've taken.
 * 
 * Example usage:
 * import { setupDismemberment, processDismemberment } from './gameplay/dismemberment.js';
 * const zombie = createZombie(position);
 * setupDismemberment(zombie);
 * processDismemberment(zombie, damagePercent);
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.132.2/build/three.module.js';
import { logger } from '../utils/logger.js';

// Constants for dismemberment
const DISMEMBERMENT_THRESHOLDS = {
    EYE: 3,       // 3% damage for eye loss (was 5%)
    ARM: 10,      // 10% damage for arm loss (was 20%)
    LEG: 15,      // 15% damage for leg loss (was 20%)
    HEAD: 30      // 30% damage for head loss (was 40%)
};

// Rainbow particle palette (for playful dismemberment effects)
const RAINBOW_COLORS = [
    0xFF5555, // Red
    0xFF9955, // Orange
    0xFFFF55, // Yellow
    0x55FF55, // Green
    0x55FFFF, // Cyan
    0x5555FF, // Blue
    0xFF55FF, // Magenta
    0xFFAAFF, // Pink
    0xAAFFAA, // Light green
    0xAAFFFF  // Light blue
];

// Base particle material template
const particleMaterialTemplate = new THREE.MeshBasicMaterial({ 
    transparent: true,
    opacity: 0.55
});

/**
 * Sets up a zombie for dismemberment by adding necessary properties
 * @param {Object} zombie - The zombie object to set up
 */
export const setupDismemberment = (zombie) => {
    if (!zombie || !zombie.mesh) return;
    
    // Initialize dismemberment tracking
    zombie.dismemberment = {
        damageTaken: 0,
        maxHealth: zombie.health, // Store initial health as max health
        lostParts: {
            leftEye: false,
            rightEye: false,
            leftArm: false,
            rightArm: false,
            leftLeg: false,
            rightLeg: false,
            head: false
        },
        // Store references to body parts for easy access
        parts: {}
    };
    
    logger.debug(`Setting up dismemberment for ${zombie.type} with max health: ${zombie.dismemberment.maxHealth}`);
    
    // Map body parts based on zombie type
    const zombieMesh = zombie.mesh;
    
    // Find and store references to body parts
    zombieMesh.traverse((child) => {
        if (child.isMesh) {
            // Identify parts by their position
            if (child.position.y > 1.4 && child.position.y < 1.6) {
                // Eyes are small and at eye level
                if (child.position.x < 0 && child.position.z > 0) {
                    zombie.dismemberment.parts.leftEye = child;
                } else if (child.position.x > 0 && child.position.z > 0) {
                    zombie.dismemberment.parts.rightEye = child;
                }
            } else if (child.position.y > 1.4 && child.geometry.type === 'BoxGeometry') {
                // Head is at the top
                if (Math.abs(child.position.x) < 0.3) {
                    zombie.dismemberment.parts.head = child;
                }
            } else if (child.position.y > 0.5 && child.position.y < 1.0) {
                // Arms are at mid-height
                if (child.position.x < -0.3) {
                    zombie.dismemberment.parts.leftArm = child;
                } else if (child.position.x > 0.3) {
                    zombie.dismemberment.parts.rightArm = child;
                }
            } else if (child.position.y < 0.5) {
                // Legs are at the bottom
                if (child.position.x < 0) {
                    zombie.dismemberment.parts.leftLeg = child;
                } else if (child.position.x > 0) {
                    zombie.dismemberment.parts.rightLeg = child;
                }
            }
        }
    });
    
    // For zombie king, adjust the part mapping due to different proportions
    if (zombie.type === 'zombieKing') {
        logger.debug('Setting up dismemberment for Zombie King');
        
        // Clear previous mappings to avoid confusion
        zombie.dismemberment.parts = {};
        
        zombieMesh.traverse((child) => {
            if (child.isMesh) {
                // Log each mesh for debugging
                logger.debug(`ZombieKing mesh: y=${child.position.y.toFixed(2)}, x=${child.position.x.toFixed(2)}, z=${child.position.z.toFixed(2)}, type=${child.geometry.type}`);
                
                // Eyes - purple glowing eyes at eye level
                if (child.position.y > 2.2 && child.position.y < 2.3 && child.position.z > 0.3) {
                    if (child.position.x < 0) {
                        zombie.dismemberment.parts.leftEye = child;
                        logger.debug('Found left eye for Zombie King');
                    } else if (child.position.x > 0) {
                        zombie.dismemberment.parts.rightEye = child;
                        logger.debug('Found right eye for Zombie King');
                    }
                } 
                // Head - large box at the top
                else if (child.position.y > 2.0 && child.geometry.type === 'BoxGeometry' && 
                         Math.abs(child.position.x) < 0.4 && Math.abs(child.position.z) < 0.4) {
                    zombie.dismemberment.parts.head = child;
                    logger.debug('Found head for Zombie King');
                }
                // Arms - boxes at mid-height with x offset
                else if (child.position.y > 0.7 && child.position.y < 1.3) {
                    if (child.position.x < -0.4) {
                        zombie.dismemberment.parts.leftArm = child;
                        logger.debug('Found left arm for Zombie King');
                    } else if (child.position.x > 0.4) {
                        zombie.dismemberment.parts.rightArm = child;
                        logger.debug('Found right arm for Zombie King');
                    }
                }
                // Legs - boxes at the bottom
                else if (child.position.y < 0.7) {
                    if (child.position.x < 0) {
                        zombie.dismemberment.parts.leftLeg = child;
                        logger.debug('Found left leg for Zombie King');
                    } else if (child.position.x > 0) {
                        zombie.dismemberment.parts.rightLeg = child;
                        logger.debug('Found right leg for Zombie King');
                    }
                }
            }
        });
        
        // Check if we found all parts
        const parts = zombie.dismemberment.parts;
        logger.debug(`ZombieKing parts found: head=${!!parts.head}, leftEye=${!!parts.leftEye}, rightEye=${!!parts.rightEye}, leftArm=${!!parts.leftArm}, rightArm=${!!parts.rightArm}, leftLeg=${!!parts.leftLeg}, rightLeg=${!!parts.rightLeg}`);
    }
    
    // For exploder, adjust the part mapping due to different body structure
    if (zombie.type === 'exploder') {
        // Exploders have a different structure, so we need to handle them differently
        // They don't have separate arms, just a body and legs
        zombieMesh.traverse((child) => {
            if (child.isMesh) {
                if (child.position.y > 0.8 && child.position.z > 0.3) {
                    if (child.position.x < 0) {
                        zombie.dismemberment.parts.leftEye = child;
                    } else if (child.position.x > 0) {
                        zombie.dismemberment.parts.rightEye = child;
                    } else {
                        zombie.dismemberment.parts.mouth = child;
                    }
                } else if (child.position.y > 0.5) {
                    if (Math.abs(child.position.x) < 0.3 && Math.abs(child.position.z) < 0.3) {
                        zombie.dismemberment.parts.head = child; // Actually the body for exploders
                    }
                } else if (child.position.y < 0.5) {
                    if (child.position.x < 0) {
                        zombie.dismemberment.parts.leftLeg = child;
                    } else if (child.position.x > 0) {
                        zombie.dismemberment.parts.rightLeg = child;
                    }
                }
            }
        });
        
        // Exploders don't have arms to lose
        zombie.dismemberment.lostParts.leftArm = true;
        zombie.dismemberment.lostParts.rightArm = true;
    }
    
    // For skeleton archer, adjust the part mapping
    if (zombie.type === 'skeletonArcher') {
        // Skeleton archers have a bow that should be preserved
        zombieMesh.traverse((child) => {
            if (child.isMesh) {
                if (child.material && child.material.color && child.material.color.r === 0.545) {
                    // This is the bow (brown color)
                    zombie.dismemberment.parts.bow = child;
                }
            }
        });
    }
    
    logger.debug('Dismemberment setup complete for zombie type:', zombie.type);
};

/**
 * Creates a colorful particle effect at the dismemberment location
 * @param {THREE.Scene} scene - The scene to add the effect to
 * @param {THREE.Vector3} position - The position of the dismemberment
 * @returns {Array} Array of particle meshes created
 */
export const createParticleEffect = (scene, position) => {
    const particleCount = 5 + Math.floor(Math.random() * 10);
    const particles = [];
    
    for (let i = 0; i < particleCount; i++) {
        const size = 0.05 + Math.random() * 0.1;
        const geometry = new THREE.SphereGeometry(size, 4, 4);
        
        // Create a new material with a random color from our palette
        const material = particleMaterialTemplate.clone();
        const colorIndex = Math.floor(Math.random() * RAINBOW_COLORS.length);
        material.color = new THREE.Color(RAINBOW_COLORS[colorIndex]);
        
        const particle = new THREE.Mesh(geometry, material);
        
        // Position at dismemberment location with slight randomness
        particle.position.copy(position);
        particle.position.x += (Math.random() - 0.5) * 0.2;
        particle.position.y += (Math.random() - 0.5) * 0.2;
        particle.position.z += (Math.random() - 0.5) * 0.2;
        
        // Add velocity for animation
        particle.userData.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 0.05,
            Math.random() * 0.05,
            (Math.random() - 0.5) * 0.05
        );
        
        // Add gravity effect
        particle.userData.gravity = 0.002;
        
        // Add lifetime
        particle.userData.lifetime = 1 + Math.random();
        particle.userData.age = 0;
        
        scene.add(particle);
        particles.push(particle);
    }
    
    // Return particles for animation
    return particles;
};

/**
 * Updates particle effects
 * @param {Array} particles - Array of particle meshes
 * @param {THREE.Scene} scene - The scene to remove particles from
 * @param {number} delta - Time delta for frame-rate independent movement
 */
export const updateParticleEffects = (particles, scene, delta = 1/60) => {
    for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i];
        
        // Update position based on velocity
        particle.position.add(particle.userData.velocity.clone().multiplyScalar(delta * 60));
        
        // Apply gravity
        particle.userData.velocity.y -= particle.userData.gravity * delta * 60;
        
        // Update age
        particle.userData.age += delta;
       
        // Fade out based on age
        const fadeRatio = 1 - (particle.userData.age / particle.userData.lifetime);
        particle.material.opacity *= fadeRatio;
        // Remove if lifetime exceeded
        if (particle.userData.age >= particle.userData.lifetime) {
            scene.remove(particle);
            particle.geometry.dispose();
            particle.material.dispose();
            particles.splice(i, 1);
        }
    }
};

/**
 * Processes dismemberment for a zombie based on damage percentage
 * @param {Object} zombie - The zombie object to process
 * @param {number} newDamage - The new damage amount to apply
 * @param {THREE.Scene} scene - The scene to add effects to
 * @returns {Array} Array of particle effects created
 */
export const processDismemberment = (zombie, newDamage, scene) => {
    if (!zombie || !zombie.dismemberment || !zombie.mesh) return [];
    
    // Calculate damage percentage
    const previousDamage = zombie.dismemberment.damageTaken;
    zombie.dismemberment.damageTaken += newDamage;
    const damagePercent = (zombie.dismemberment.damageTaken / zombie.dismemberment.maxHealth) * 100;
    
    // Debug logging
    logger.debug(`Zombie type: ${zombie.type}, Health: ${zombie.health}, Max Health: ${zombie.dismemberment.maxHealth}, Damage %: ${damagePercent.toFixed(1)}%`);
    
    // Track particles created
    const particles = [];
    
    // Check if we've crossed any dismemberment thresholds
    const thresholdsCrossed = [];
    
    // Check for eye loss (lowest threshold)
    if (damagePercent >= DISMEMBERMENT_THRESHOLDS.EYE) {
        // Chance to lose an eye
        if (!zombie.dismemberment.lostParts.leftEye && Math.random() < 0.7) {
            thresholdsCrossed.push('leftEye');
        } else if (!zombie.dismemberment.lostParts.rightEye) {
            thresholdsCrossed.push('rightEye');
        }
    }
    
    // Check for limb loss
    if (damagePercent >= DISMEMBERMENT_THRESHOLDS.ARM) {
        // Chance to lose an arm
        if (!zombie.dismemberment.lostParts.leftArm && Math.random() < 0.6) {
            thresholdsCrossed.push('leftArm');
        } else if (!zombie.dismemberment.lostParts.rightArm && Math.random() < 0.6) {
            thresholdsCrossed.push('rightArm');
        }
    }
    
    if (damagePercent >= DISMEMBERMENT_THRESHOLDS.LEG) {
        // Chance to lose a leg
        if (!zombie.dismemberment.lostParts.leftLeg && Math.random() < 0.6) {
            thresholdsCrossed.push('leftLeg');
        } else if (!zombie.dismemberment.lostParts.rightLeg && Math.random() < 0.6) {
            thresholdsCrossed.push('rightLeg');
        }
    }
    
    // Check for head loss (highest threshold)
    if (damagePercent >= DISMEMBERMENT_THRESHOLDS.HEAD && !zombie.dismemberment.lostParts.head) {
        // Chance to lose head
        if (Math.random() < 0.7) {
            thresholdsCrossed.push('head');
        }
    }
    
    // Process each threshold crossed
    thresholdsCrossed.forEach(partName => {
        const part = zombie.dismemberment.parts[partName];
        if (part) {
            // Mark part as lost
            zombie.dismemberment.lostParts[partName] = true;
            
            // Store original position for blood effect
            const originalPosition = part.getWorldPosition(new THREE.Vector3());
            
            // Hide the part (remove from scene)
            part.visible = false;
            
            // Create particle effect at dismemberment location
            const newParticles = createParticleEffect(scene, originalPosition);
            particles.push(...newParticles);
            
            // Apply gameplay effects based on part lost
            applyDismembermentEffects(zombie, partName);
            
            logger.debug(`Zombie lost ${partName} at ${damagePercent.toFixed(1)}% damage`);
        } else {
            logger.debug(`Failed to find part: ${partName} for zombie type: ${zombie.type}`);
        }
    });
    
    return particles;
};

/**
 * Applies gameplay effects based on the dismembered part
 * @param {Object} zombie - The zombie object
 * @param {string} partName - The name of the lost part
 */
const applyDismembermentEffects = (zombie, partName) => {
    switch (partName) {
        case 'leftLeg':
        case 'rightLeg':
            // Losing a leg slows the zombie down
            zombie.speed *= 0.7;
            zombie.baseSpeed *= 0.7;
            break;
            
        case 'leftArm':
        case 'rightArm':
            // Losing an arm reduces damage
            // This is handled in the damage calculation
            break;
            
        case 'head':
            // Losing a head makes the zombie move erratically
            zombie.headless = true;
            // Headless zombies move more randomly
            break;
            
        case 'leftEye':
        case 'rightEye':
            // Losing eyes reduces accuracy (for ranged enemies)
            // This would affect skeleton archers
            if (zombie.type === 'skeletonArcher') {
                zombie.accuracy = (zombie.accuracy || 1.0) * 0.6;
            }
            break;
    }
}; 