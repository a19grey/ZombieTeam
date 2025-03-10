/**
 * Powerup Module - Defines powerup assets for the game
 * 
 * This module contains functions to create low-poly, Minecraft-style powerups
 * that the player can shoot or walk over to collect. Logic for effects is not implemented.
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.132.2/build/three.module.js';

/**
 * Creates a Triple Shot powerup
 * - Effect: When collected, player's next shots fire three bullets in a wide spray
 * @param {Object} position - The initial position of the powerup
 * @returns {THREE.Group} The powerup object
 */
export const createTripleShotPowerup = (position) => {
    const powerup = new THREE.Group();

    // Base (three small blocks to represent triple shots)
    const blockGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    const blockMaterial = new THREE.MeshStandardMaterial({
        color: 0xffa500, // Orange for energy
        emissive: 0xffa500,
        emissiveIntensity: 0.3,
        roughness: 0.7
    });

    const leftBlock = new THREE.Mesh(blockGeometry, blockMaterial);
    leftBlock.position.set(-0.25, 0.1, 0);
    leftBlock.castShadow = true;
    powerup.add(leftBlock);

    const centerBlock = new THREE.Mesh(blockGeometry, blockMaterial);
    centerBlock.position.set(0, 0.1, 0);
    centerBlock.castShadow = true;
    powerup.add(centerBlock);

    const rightBlock = new THREE.Mesh(blockGeometry, blockMaterial);
    rightBlock.position.set(0.25, 0.1, 0);
    rightBlock.castShadow = true;
    powerup.add(rightBlock);

    // Set position
    powerup.position.set(position.x, 0, position.z);
    powerup.userData.type = 'tripleShot'; // For identification in collision detection

    return powerup;
};

/**
 * Creates a Shotgun Blast powerup
 * - Effect: When collected, player's next shot fires a wide spread of pellets (shotgun effect)
 * @param {Object} position - The initial position of the powerup
 * @returns {THREE.Group} The powerup object
 */
export const createShotgunBlastPowerup = (position) => {
    const powerup = new THREE.Group();

    // Base (wide block with pellets)
    const baseGeometry = new THREE.BoxGeometry(0.5, 0.2, 0.3);
    const baseMaterial = new THREE.MeshStandardMaterial({
        color: 0x4682b4, // Steel blue for shotgun
        emissive: 0x4682b4,
        emissiveIntensity: 0.3,
        roughness: 0.7
    });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = 0.1;
    base.castShadow = true;
    powerup.add(base);

    // Pellets (small cubes on top)
    const pelletGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    const pelletMaterial = new THREE.MeshStandardMaterial({
        color: 0x666666, // Gray for pellets
        roughness: 0.7
    });

    const pellet1 = new THREE.Mesh(pelletGeometry, pelletMaterial);
    pellet1.position.set(-0.15, 0.25, 0);
    pellet1.castShadow = true;
    powerup.add(pellet1);

    const pellet2 = new THREE.Mesh(pelletGeometry, pelletMaterial);
    pellet2.position.set(0, 0.25, 0);
    pellet2.castShadow = true;
    powerup.add(pellet2);

    const pellet3 = new THREE.Mesh(pelletGeometry, pelletMaterial);
    pellet3.position.set(0.15, 0.25, 0);
    pellet3.castShadow = true;
    powerup.add(pellet3);

    // Set position
    powerup.position.set(position.x, 0, position.z);
    powerup.userData.type = 'shotgunBlast'; // For identification in collision detection

    return powerup;
};

/**
 * Creates an Explosion powerup
 * - Effect: When collected, causes an explosion in a region around the player, damaging nearby zombies
 * @param {Object} position - The initial position of the powerup
 * @returns {THREE.Group} The powerup object
 */
export const createExplosionPowerup = (position) => {
    const powerup = new THREE.Group();

    // Base (cubic "bomb" shape)
    const bombGeometry = new THREE.BoxGeometry(0.4, 0.4, 0.4);
    const bombMaterial = new THREE.MeshStandardMaterial({
        color: 0xff0000, // Red for danger
        emissive: 0xff0000,
        emissiveIntensity: 0.4,
        roughness: 0.7
    });
    const bomb = new THREE.Mesh(bombGeometry, bombMaterial);
    bomb.position.y = 0.2;
    bomb.castShadow = true;
    powerup.add(bomb);

    // Fuse (small block on top)
    const fuseGeometry = new THREE.BoxGeometry(0.1, 0.2, 0.1);
    const fuseMaterial = new THREE.MeshStandardMaterial({
        color: 0x000000, // Black fuse
        roughness: 0.7
    });
    const fuse = new THREE.Mesh(fuseGeometry, fuseMaterial);
    fuse.position.set(0, 0.5, 0);
    fuse.castShadow = true;
    powerup.add(fuse);

    // Set position
    powerup.position.set(position.x, 0, position.z);
    powerup.userData.type = 'explosion'; // For identification in collision detection

    return powerup;
};

/**
 * Optional: Animate powerups (add to your render loop if desired)
 * - Makes powerups bob up and down slightly
 * @param {THREE.Group} powerup - The powerup object
 * @param {number} time - Current time for animation
 */
export const animatePowerup = (powerup, time) => {
    powerup.position.y = Math.sin(time * 2) * 0.1 + 0.2; // Bob between 0.1 and 0.3
    powerup.rotation.y += 0.02; // Slow rotation
};