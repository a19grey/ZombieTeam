/**
 * Player Module - Handles player creation and controls
 * 
 * This module contains functions for creating the player character,
 * handling player movement based on keyboard input, and creating
 * the player's weapon.
 * 
 * Example usage:
 * import { createPlayer, handlePlayerMovement } from './gameplay/player.js';
 * const player = createPlayer();
 * handlePlayerMovement(player, keys, speed);
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.132.2/build/three.module.js';

/**
 * Creates a cooler player character
 * @returns {THREE.Group} The player object
 */
export const createPlayer = () => {
    const player = new THREE.Group();

    // Torso (tapered cone for a heroic shape)
    const torsoGeometry = new THREE.ConeGeometry(0.5, 1.6, 32); // Wider at bottom, narrower at top
    const torsoMaterial = new THREE.MeshStandardMaterial({
        color: 0x1a2a6c, // Dark blue armor
        metalness: 0.7,
        roughness: 0.3
    });
    const torso = new THREE.Mesh(torsoGeometry, torsoMaterial);
    torso.position.y = 0.8; // Center of torso
    torso.castShadow = true;
    player.add(torso);

    // Head (helmet with visor)
    const headGeometry = new THREE.SphereGeometry(0.35, 32, 32);
    const headMaterial = new THREE.MeshStandardMaterial({
        color: 0x555555, // Gray helmet
        metalness: 0.8,
        roughness: 0.2
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1.8; // Above torso
    head.castShadow = true;
    player.add(head);

    // Visor (small glowing rectangle on head)
    const visorGeometry = new THREE.BoxGeometry(0.3, 0.1, 0.05);
    const visorMaterial = new THREE.MeshStandardMaterial({
        color: 0x00ffff, // Cyan glow
        emissive: 0x00ffff,
        emissiveIntensity: 0.5
    });
    const visor = new THREE.Mesh(visorGeometry, visorMaterial);
    visor.position.set(0, 1.8, 0.3); // Front of head
    visor.castShadow = true;
    player.add(visor);

    // Left Arm
    const armGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.8, 32);
    const armMaterial = new THREE.MeshStandardMaterial({
        color: 0x1a2a6c, // Match torso
        metalness: 0.7,
        roughness: 0.3
    });
    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-0.6, 1.2, 0);
    leftArm.rotation.z = Math.PI / 6; // Slight angle outward
    leftArm.castShadow = true;
    player.add(leftArm);

    // Right Arm (weapon arm)
    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(0.6, 1.2, 0);
    rightArm.rotation.z = -Math.PI / 6;
    rightArm.castShadow = true;
    player.add(rightArm);

    // Legs
    const legGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.9, 32);
    const legMaterial = new THREE.MeshStandardMaterial({
        color: 0x162252, // Slightly darker blue
        metalness: 0.6,
        roughness: 0.4
    });
    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-0.25, 0.45, 0);
    leftLeg.castShadow = true;
    player.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(0.25, 0.45, 0);
    rightLeg.castShadow = true;
    player.add(rightLeg);

    // Weapon attachment point (optional, for your createPlayerWeapon)
    const weaponMount = new THREE.Object3D();
    weaponMount.position.set(0.6, 1.0, -0.2); // Near right hand
    player.add(weaponMount);
    player.userData.weaponMount = weaponMount; // Accessible for weapon attachment

    return player;
};

/**
 * Creates a weapon for the player
 * @returns {THREE.Group} The weapon object
 */
// Integrate with your existing createPlayerWeapon (optional)
export const createPlayerWeapon = () => {
    const weapon = new THREE.Group();
    
    const gunGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.5);
    const gunMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x333333, 
        metalness: 0.9, 
        roughness: 0.1 
    });
    const gun = new THREE.Mesh(gunGeometry, gunMaterial);
    gun.position.z = 0.25; // Extend forward
    
    const handleGeometry = new THREE.BoxGeometry(0.08, 0.25, 0.08);
    const handleMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x8B4513, 
        metalness: 0.2, 
        roughness: 0.6 
    });
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.position.y = -0.125;
    
    weapon.add(gun);
    weapon.add(handle);
    
    return weapon;
};

/**
 * Handles player movement based on keyboard input with different speeds based on direction
 * @param {THREE.Group} player - The player object
 * @param {Object} keys - Object containing the state of keyboard keys
 * @param {number} baseSpeed - Base movement speed
 * @param {Object} mouse - Mouse position for aiming
 */
export const handlePlayerMovement = (player, keys, baseSpeed, mouse) => {
    // Calculate movement direction
    const moveX = ((keys['a'] || keys['arrowleft']) ? -1 : 0) + ((keys['d'] || keys['arrowright']) ? 1 : 0);
    const moveZ = ((keys['w'] || keys['arrowup']) ? -1 : 0) + ((keys['s'] || keys['arrowdown']) ? 1 : 0);
    
    // Set different speeds based on direction
    // Base zombie speed is assumed to be 0.03
    // Forward (north) is 5% faster than zombies
    // Backward (south) is only 1% faster than zombies
    const zombieBaseSpeed = 0.03;
    const forwardSpeed = zombieBaseSpeed * 1.05; // 5% faster
    const backwardSpeed = zombieBaseSpeed * 1.02; // 1% faster
    const sideSpeed = zombieBaseSpeed * 1.03; // 3% faster
    
    let speedX = sideSpeed;
    let speedZ = moveZ < 0 ? forwardSpeed : backwardSpeed; // North is negative Z
    
    // Normalize diagonal movement
    if (moveX !== 0 && moveZ !== 0) {
        const normalizer = 1 / Math.sqrt(2);
        player.position.x += moveX * speedX * normalizer;
        player.position.z += moveZ * speedZ * normalizer;
    } else {
        player.position.x += moveX * speedX;
        player.position.z += moveZ * speedZ;
    }
    
    // Return the updated position
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
    // Create a raycaster
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    
    // Create a plane at player's height for intersection
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    
    // Find intersection point
    const intersectionPoint = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, intersectionPoint);
    
    // Calculate direction from player to intersection point
    const direction = new THREE.Vector3();
    direction.subVectors(intersectionPoint, player.position);
    direction.y = 0; // Keep rotation on horizontal plane
    
    // Rotate player to face the intersection point
    if (direction.length() > 0.1) { // Only rotate if mouse is far enough
        player.rotation.y = Math.atan2(direction.x, direction.z);
    }
}; 