/**
 * Player Module - Handles player creation and controls
 * 
 * This module contains functions for creating a Minecraft-style low-poly player character,
 * handling player movement based on keyboard input, and creating the player's weapon.
 */

import * as THREE from 'three';
import { logger } from '../utils/logger.js';

/**
 * Creates a Minecraft-style low-poly player character
 * @returns {THREE.Group} The player object
 */
export const createPlayer = () => {
    const player = new THREE.Group();

    // Head (cube)
    const headGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const headMaterial = new THREE.MeshStandardMaterial({
        color: 0xf9c9b6, // Skin tone
        metalness: 0,
        roughness: 0.8
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1.5; // Top of character at y=2
    head.castShadow = true;
    player.add(head);

    // Create health halo (annulus/ring) above the player's head
    const haloRadius = 0.4; // Size of the halo
    const haloTubeWidth = 0.08; // Thickness of the ring
    const haloGeometry = new THREE.RingGeometry(haloRadius - haloTubeWidth, haloRadius, 32);
    const haloMaterial = new THREE.MeshBasicMaterial({
        color: 0xf0f0f0, // Soft white glow
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide
    });
    const healthHalo = new THREE.Mesh(haloGeometry, haloMaterial);
    healthHalo.rotation.x = -Math.PI / 2; // Make it horizontal
    healthHalo.position.y = 1.9; // Position above the head
    player.add(healthHalo);
    
    // Add a subtle glow effect to the halo
    const glowGeometry = new THREE.RingGeometry(haloRadius - haloTubeWidth - 0.02, haloRadius + 0.02, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0xf0f0f0,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide
    });
    const glowHalo = new THREE.Mesh(glowGeometry, glowMaterial);
    glowHalo.rotation.x = -Math.PI / 2;
    glowHalo.position.y = 1.9;
    player.add(glowHalo);
    
    // Store reference to the health halo for updating
    player.userData.healthHalo = healthHalo;
    player.userData.glowHalo = glowHalo;
    
    // Body (rectangular prism)
    const bodyGeometry = new THREE.BoxGeometry(0.5, 0.75, 0.25);
    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: 0x2c6eb5, // Blue shirt
        metalness: 0,
        roughness: 0.8
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.75; // Center of body
    body.castShadow = true;
    player.add(body);

    // Left Arm
    const armGeometry = new THREE.BoxGeometry(0.25, 0.75, 0.25);
    const armMaterial = new THREE.MeshStandardMaterial({
        color: 0xf9c9b6, // Skin tone
        metalness: 0,
        roughness: 0.8
    });
    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-0.375, 0.75, 0); // Left side of body
    leftArm.castShadow = true;
    player.add(leftArm);

    // Right Arm (weapon arm)
    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(0.375, 0.75, 0); // Right side of body
    rightArm.castShadow = true;
    player.add(rightArm);

    // Left Leg
    const legGeometry = new THREE.BoxGeometry(0.25, 0.5, 0.25);
    const legMaterial = new THREE.MeshStandardMaterial({
        color: 0x3c2f2f, // Brown pants
        metalness: 0,
        roughness: 0.8
    });
    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-0.125, 0.25, 0); // Bottom left
    leftLeg.castShadow = true;
    player.add(leftLeg);

    // Right Leg
    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(0.125, 0.25, 0); // Bottom right
    rightLeg.castShadow = true;
    player.add(rightLeg);

    // Weapon attachment point (at end of right hand)
    const weaponMount = new THREE.Object3D();
    weaponMount.position.set(0.375, 0.375, 0.125); // End of right arm (y lowered to hand level, positive Z for forward direction)
    player.add(weaponMount);
    player.userData.weaponMount = weaponMount; // Accessible for weapon attachment
    
    // No need to rotate the player 180 degrees - we'll handle direction in the aiming function
    // player.rotation.y = Math.PI;

    return player;
};

/**
 * Creates a weapon for the player
 * @returns {THREE.Group} The weapon object
 */
export const createPlayerWeapon = () => {
    const weapon = new THREE.Group();
    
    // Create a more visible gun
    const gunGeometry = new THREE.BoxGeometry(0.15, 0.15, 0.8);
    const gunMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x333333, 
        metalness: 0.9, 
        roughness: 0.1 
    });
    const gun = new THREE.Mesh(gunGeometry, gunMaterial);
    gun.position.z = 0.4; // Extend forward (positive Z now that we've fixed the orientation)
    
    // Add a barrel
    const barrelGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.9, 16);
    const barrelMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x555555, 
        metalness: 0.9, 
        roughness: 0.1 
    });
    const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
    barrel.rotation.x = Math.PI / 2; // Rotate to point forward
    barrel.position.z = 0.7; // Position at the front of the gun (positive Z now)
    
    // Add a handle
    const handleGeometry = new THREE.BoxGeometry(0.1, 0.3, 0.1);
    const handleMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x8B4513, 
        metalness: 0.2, 
        roughness: 0.6 
    });
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.position.y = -0.2;
    
    // Add sight
    const sightGeometry = new THREE.BoxGeometry(0.05, 0.05, 0.05);
    const sightMaterial = new THREE.MeshStandardMaterial({
        color: 0xff0000,
        emissive: 0xff0000,
        emissiveIntensity: 0.5
    });
    const sight = new THREE.Mesh(sightGeometry, sightMaterial);
    sight.position.y = 0.1;
    sight.position.z = 0.2; // Positive Z now
    
    // Add parts to weapon
    weapon.add(gun);
    weapon.add(barrel);
    weapon.add(handle);
    weapon.add(sight);
    
    // Position the weapon to the right side of the player
    weapon.position.set(0.6, 1.0, 0.2);
    
    return weapon;
};

/**
 * Handles player movement based on keyboard input (unchanged from original)
 * @param {THREE.Group} player - The player object
 * @param {Object} keys - Object containing the state of keyboard keys
 * @param {number} baseSpeed - Base movement speed
 * @param {Object} mouse - Mouse position for aiming
 */
export const handlePlayerMovement = (player, keys, baseSpeed, mouse) => {
    const moveX = ((keys['a'] || keys['arrowleft']) ? -1 : 0) + ((keys['d'] || keys['arrowright']) ? 1 : 0);
    const moveZ = ((keys['w'] || keys['arrowup']) ? -1 : 0) + ((keys['s'] || keys['arrowdown']) ? 1 : 0);
    
    // Use the baseSpeed parameter instead of hardcoded values
    // Apply slight modifiers for different directions
    const forwardSpeed = baseSpeed * 1.03;
    const backwardSpeed = baseSpeed * 0.97;
    const sideSpeed = baseSpeed;
    
    // Log player speed values occasionally to avoid console spam
    // Use a static variable to track last log time
    const currentTime = Date.now();
    if (!handlePlayerMovement.lastLogTime || currentTime - handlePlayerMovement.lastLogTime > 5000) { // Log every 5 seconds
        logger.debug('speed', `Player movement speeds - base: ${baseSpeed}, forward: ${forwardSpeed}, backward: ${backwardSpeed}, side: ${sideSpeed}`);
        handlePlayerMovement.lastLogTime = currentTime;
    }
    
    let speedX = sideSpeed;
    let speedZ = moveZ < 0 ? forwardSpeed : backwardSpeed;
    
    let newX = player.position.x;
    let newZ = player.position.z;
    
    if (moveX !== 0 && moveZ !== 0) {
        const normalizer = 1 / Math.sqrt(2);
        newX += moveX * speedX * normalizer;
        newZ += moveZ * speedZ * normalizer;
    } else {
        newX += moveX * speedX;
        newZ += moveZ * speedZ;
    }
    
    // Check collision with environment objects before applying movement
    let canMove = true;
    if (window.gameState && window.gameState.environmentObjects) {
        for (const object of window.gameState.environmentObjects) {
            if (object && object.isObstacle) {
                const dx = newX - object.position.x;
                const dz = newZ - object.position.z;
                const distance = Math.sqrt(dx * dx + dz * dz);
                
                // If player would collide with this object, prevent movement
                if (distance < (object.boundingRadius || 2.5) + 0.5) { // 0.5 is player radius
                    canMove = false;
                    
                    // Try to slide along the obstacle instead of stopping completely
                    // This creates a more natural movement around obstacles
                    const pushDirection = new THREE.Vector3(dx, 0, dz).normalize();
                    const pushDistance = (object.boundingRadius || 2.5) + 0.5 - distance + 0.1;
                    
                    // Try moving only in X direction
                    if (Math.abs(moveX) > 0) {
                        const testX = player.position.x + moveX * speedX;
                        const testDx = testX - object.position.x;
                        const testDistanceX = Math.sqrt(testDx * testDx + dz * dz);
                        
                        if (testDistanceX >= (object.boundingRadius || 2.5) + 0.5) {
                            newX = testX;
                            newZ = player.position.z;
                            canMove = true;
                        }
                    }
                    
                    // Try moving only in Z direction
                    if (!canMove && Math.abs(moveZ) > 0) {
                        const testZ = player.position.z + moveZ * speedZ;
                        const testDz = testZ - object.position.z;
                        const testDistanceZ = Math.sqrt(dx * dx + testDz * testDz);
                        
                        if (testDistanceZ >= (object.boundingRadius || 2.5) + 0.5) {
                            newX = player.position.x;
                            newZ = testZ;
                            canMove = true;
                        }
                    }
                    
                    if (!canMove) {
                        break;
                    }
                }
            }
        }
    }
    
    // Apply movement if no collision
    if (canMove) {
        player.position.x = newX;
        player.position.z = newZ;
    }
    
    return {
        x: player.position.x,
        y: player.position.y,
        z: player.position.z
    };
};

/**
 * Aims the player and weapon based on mouse position
 * @param {THREE.Group} player - The player object
 * @param {Object} mouse - Mouse position for aiming
 * @param {THREE.Camera} camera - The camera for raycasting
 */
export const aimPlayerWithMouse = (player, mouse, camera) => {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    
    const intersectionPoint = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, intersectionPoint);
    
    const direction = new THREE.Vector3();
    direction.subVectors(intersectionPoint, player.position);
    direction.y = 0;
    
    if (direction.length() > 0.1) {
        // Make player face the mouse pointer directly
        player.rotation.y = Math.atan2(direction.x, direction.z);
    }
};