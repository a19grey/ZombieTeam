/**
 * Powerup Module - Defines enhanced powerup assets for the game
 */
import * as THREE from 'three';
import { logger } from '../utils/logger.js'; // Add logger import at the top

// Helper function to create a halo
const createHalo = (color, radius = 0.6) => {
    const haloGeometry = new THREE.CircleGeometry(radius, 32);
    const haloMaterial = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide
    });
    const halo = new THREE.Mesh(haloGeometry, haloMaterial);
    halo.rotation.x = -Math.PI / 2; // Lay flat
    halo.position.y = 0.01; // Slightly above ground
    return halo;
};

/**
 * Creates a Rapid Fire powerup (replacing Triple Shot)
 * - Effect: Rapid machine gun fire
 */
export const createRapidFirePowerup = (position) => {
    const powerup = new THREE.Group();

    // Machine gun model (simplified, scale down from weapons.js later)
    const gunBodyGeometry = new THREE.BoxGeometry(0.7, 0.2, 0.2); // Increased size
    const gunMaterial = new THREE.MeshStandardMaterial({
        color: 0xffa500, // Orange for weapon enhance
        emissive: 0xffa500,
        emissiveIntensity: 0.5, // Increased
        roughness: 0.5
    });
    const gunBody = new THREE.Mesh(gunBodyGeometry, gunMaterial);
    gunBody.position.y = 0.3; // Raised
    gunBody.castShadow = true;
    powerup.add(gunBody);

    // Barrel
    const barrelGeometry = new THREE.CylinderGeometry(0.07, 0.07, 0.5, 8); // Thicker
    const barrel = new THREE.Mesh(barrelGeometry, gunMaterial);
    barrel.rotation.z = Math.PI / 2;
    barrel.position.set(0.6, 0.3, 0); // Moved forward
    barrel.castShadow = true;
    powerup.add(barrel);

    // Handle
    const handleGeometry = new THREE.BoxGeometry(0.15, 0.25, 0.15); // Larger
    const handle = new THREE.Mesh(handleGeometry, gunMaterial);
    handle.position.set(-0.2, 0.15, 0);
    handle.castShadow = true;
    powerup.add(handle);

    // Orange halo
    const halo = createHalo(0xffa500, 0.8); // Larger halo
    powerup.add(halo);

    powerup.position.set(position.x, 0, position.z);
    powerup.userData.type = 'rapidFire';
    powerup.userData.health = 175*15; // Standard health value
    return powerup;
};

/**
 * Creates a Shotgun Blast powerup
 * - Effect: Wide spread of pellets
 */
export const createShotgunBlastPowerup = (position) => {
    const powerup = new THREE.Group();

    // Shotgun body (more detailed)
    const bodyGeometry = new THREE.BoxGeometry(0.8, 0.25, 0.3); // Larger
    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: 0x4682b4, // Steel blue
        emissive: 0x4682b4,
        emissiveIntensity: 0.5, // Increased
        roughness: 0.5
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.3; // Raised
    body.castShadow = true;
    powerup.add(body);

    // Double barrels
    const barrelGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.6, 8); // Thicker and longer
    const barrelMaterial = new THREE.MeshStandardMaterial({
        color: 0x666666,
        emissive: 0x333333, // Added emissive
        emissiveIntensity: 0.3,
        roughness: 0.6
    });
    const barrel1 = new THREE.Mesh(barrelGeometry, barrelMaterial);
    barrel1.rotation.z = Math.PI / 2;
    barrel1.position.set(0.7, 0.3, -0.07); // Moved forward
    barrel1.castShadow = true;
    powerup.add(barrel1);

    const barrel2 = new THREE.Mesh(barrelGeometry, barrelMaterial);
    barrel2.rotation.z = Math.PI / 2;
    barrel2.position.set(0.7, 0.3, 0.07); // Moved forward
    barrel2.castShadow = true;
    powerup.add(barrel2);

    // Grip
    const gripGeometry = new THREE.BoxGeometry(0.2, 0.3, 0.2); // Larger
    const grip = new THREE.Mesh(gripGeometry, bodyMaterial);
    grip.position.set(-0.25, 0.15, 0);
    grip.castShadow = true;
    powerup.add(grip);

    // Blue halo
    const halo = createHalo(0x4682b4, 0.8); // Larger halo
    powerup.add(halo);

    powerup.position.set(position.x, 0, position.z);
    powerup.userData.type = 'shotgunBlast';
    powerup.userData.health = 250*15; // Higher health value - harder to unlock
    return powerup;
};

/**
 * Creates an Explosion powerup
 * - Effect: Area explosion that damages zombies but not the player
 */
export const createExplosionPowerup = (position) => {
    const powerup = new THREE.Group();

    // Bomb body (spherical with spikes)
    const bombGeometry = new THREE.SphereGeometry(0.35, 12, 12); // Larger and more detailed
    const bombMaterial = new THREE.MeshStandardMaterial({
        color: 0xff0000, // Red for explosion
        emissive: 0xff0000,
        emissiveIntensity: 0.6, // Brighter
        roughness: 0.5
    });
    const bomb = new THREE.Mesh(bombGeometry, bombMaterial);
    bomb.position.y = 0.35; // Raised
    bomb.castShadow = true;
    powerup.add(bomb);

    // Spikes
    const spikeGeometry = new THREE.ConeGeometry(0.08, 0.2, 8); // Larger spikes
    const spikeMaterial = new THREE.MeshStandardMaterial({
        color: 0x000000,
        emissive: 0x111111,
        emissiveIntensity: 0.3
    });
    for (let i = 0; i < 8; i++) { // More spikes
        const spike = new THREE.Mesh(spikeGeometry, spikeMaterial);
        const angle = (i / 8) * Math.PI * 2;
        spike.position.set(
            Math.cos(angle) * 0.35,
            0.35,
            Math.sin(angle) * 0.35
        );
        spike.rotation.x = Math.PI / 2;
        spike.castShadow = true;
        powerup.add(spike);
    }

    // Fuse (animated glow effect possible in render loop)
    const fuseGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.4, 8); // Thicker
    const fuse = new THREE.Mesh(fuseGeometry, new THREE.MeshStandardMaterial({
        color: 0xffff00, // Yellow glowing fuse
        emissive: 0xffff00,
        emissiveIntensity: 0.9 // Brighter
    }));
    fuse.position.y = 0.65; // Raised
    fuse.castShadow = true;
    powerup.add(fuse);

    // Red halo
    const halo = createHalo(0xff0000, 0.9); // Larger halo
    powerup.add(halo);

    powerup.position.set(position.x, 0, position.z);
    powerup.userData.type = 'explosion';
    powerup.userData.health = 200*15; // High health value - hard to unlock
    return powerup;
};

/**
 * Creates a Laser Shot powerup
 * - Effect: Fires a continuous laser beam for a short duration
 */
export const createLaserShotPowerup = (position) => {
    const powerup = new THREE.Group();

    // Laser emitter (futuristic rod with glowing tip)
    const emitterGeometry = new THREE.CylinderGeometry(0.35, 0.35, 0.7, 12); // Even bigger
    const emitterMaterial = new THREE.MeshStandardMaterial({
        color: 0x00ffff, // Cyan for sci-fi laser
        emissive: 0x00ffff,
        emissiveIntensity: 1.0, // Increased more
        roughness: 0.2 // More shine
    });
    const emitter = new THREE.Mesh(emitterGeometry, emitterMaterial);
    emitter.position.y = 0.35; // Raised more
    emitter.castShadow = true;
    powerup.add(emitter);

    // Glowing tip
    const tipGeometry = new THREE.SphereGeometry(0.25, 16, 16); // Larger and more detailed
    const tipMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xffffff,
        emissiveIntensity: 1.5, // Increased more
        roughness: 0.2 // More shine
    });
    const tip = new THREE.Mesh(tipGeometry, tipMaterial);
    tip.position.y = 0.7; // Raised more
    tip.castShadow = true;
    powerup.add(tip);

    // Energy rings (visual flair)
    const ringGeometry = new THREE.RingGeometry(0.3, 0.4, 24); // Larger and more detailed
    const ringMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.9, // More visible
        side: THREE.DoubleSide
    });
    const ring1 = new THREE.Mesh(ringGeometry, ringMaterial);
    ring1.rotation.x = Math.PI / 2;
    ring1.position.y = 0.5;
    powerup.add(ring1);

    const ring2 = ring1.clone();
    ring2.position.y = 0.3;
    powerup.add(ring2);

    const ring3 = ring1.clone(); // Added a third ring
    ring3.position.y = 0.1;
    powerup.add(ring3);

    // Larger cyan halo
    const halo = createHalo(0x00ffff, 1.0); // Increased radius more
    powerup.add(halo);

    powerup.position.set(position.x, 0, position.z);
    powerup.userData.type = 'laserShot';
    powerup.userData.health = 250*15; // High health value
    return powerup;
};

/**
 * Creates a Grenade Launcher powerup
 * - Effect: Lobs grenades that explode on impact with smoke trails
 */
export const createGrenadeLauncherPowerup = (position) => {
    logger.info('grenadelauncher', 'Creating grenade launcher powerup mesh in powerups2.js');
    const powerup = new THREE.Group();

    // Launcher body
    const bodyGeometry = new THREE.BoxGeometry(0.8, 0.25, 0.35); // Larger
    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: 0x228b22, // Forest green for military vibe
        emissive: 0x228b22,
        emissiveIntensity: 0.5, // Brighter
        roughness: 0.5
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.3; // Raised
    body.castShadow = true;
    powerup.add(body);

    // Barrel (wide for grenade launching)
    const barrelGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.6, 12); // Wider and more detailed
    const barrelMaterial = new THREE.MeshStandardMaterial({
        color: 0x333333, // Dark gray
        emissive: 0x111111,
        emissiveIntensity: 0.3,
        roughness: 0.6
    });
    const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
    barrel.rotation.z = Math.PI / 2;
    barrel.position.set(0.7, 0.3, 0); // Moved forward
    barrel.castShadow = true;
    powerup.add(barrel);

    // Mini grenade on top
    const grenadeGeometry = new THREE.SphereGeometry(0.18, 12, 12); // Larger
    const grenadeMaterial = new THREE.MeshStandardMaterial({
        color: 0x555555,
        emissive: 0x111111,
        emissiveIntensity: 0.3,
        roughness: 0.6
    });
    const grenade = new THREE.Mesh(grenadeGeometry, grenadeMaterial);
    grenade.position.set(0, 0.5, 0); // Raised
    grenade.castShadow = true;
    powerup.add(grenade);

    // Pin detail on grenade
    const pinGeometry = new THREE.BoxGeometry(0.07, 0.14, 0.07); // Larger
    const pin = new THREE.Mesh(pinGeometry, new THREE.MeshStandardMaterial({
        color: 0xffff00,
        emissive: 0xffff00,
        emissiveIntensity: 0.5
    }));
    pin.position.set(0, 0.65, 0); // Raised
    pin.castShadow = true;
    powerup.add(pin);

    // Add red band for better visibility
    const bandGeometry = new THREE.TorusGeometry(0.18, 0.04, 8, 16);
    const bandMaterial = new THREE.MeshStandardMaterial({
        color: 0xff0000,
        emissive: 0xff0000,
        emissiveIntensity: 0.5
    });
    const band = new THREE.Mesh(bandGeometry, bandMaterial);
    band.rotation.x = Math.PI / 2;
    grenade.add(band);

    // Green halo
    const halo = createHalo(0x228b22, 0.9); // Larger halo
    powerup.add(halo);

    powerup.position.set(position.x, 0, position.z);
    powerup.userData.type = 'grenadeLauncher';
    powerup.userData.health = 225*15; // High health value
    
    logger.debug('grenadelauncher', 'Completed grenade launcher powerup mesh creation');
    return powerup;
};

/**
 * Animate powerups
 */
export const animatePowerup = (powerup, time) => {
    powerup.position.y = Math.sin(time * 2) * 0.1 + 0.25;
    powerup.rotation.y += 0.02;
    
    // Pulse halo - more robust detection
    for (let i = 0; i < powerup.children.length; i++) {
        const child = powerup.children[i];
        
        // Look for the halo by checking if it's a mesh with CircleGeometry
        if (child instanceof THREE.Mesh && 
            child.geometry instanceof THREE.CircleGeometry) {
            child.scale.setScalar(1 + Math.sin(time * 3) * 0.1);
        }
        
        // Optional: Pulse laser tip
        if (powerup.userData.type === 'laserShot' && 
            child instanceof THREE.Mesh && 
            child.geometry instanceof THREE.SphereGeometry) {
            child.scale.setScalar(1 + Math.sin(time * 5) * 0.05);
        }
    }
};

/**
 * Creates a grenade explosion effect (player-sourced)
 * This function is intended to be called when a player's grenade explodes
 * It creates an explosion that damages zombies but not the player
 * 
 * @param {Object} gameState - The current game state
 * @param {THREE.Vector3} position - The position where the explosion should occur
 * @param {number} radius - The radius of the explosion (default: 4)
 * @param {number} damage - The base damage of the explosion (default: 150)
 */
export const createPlayerExplosion = (gameState, position, radius = 4, damage = 150) => {
    if (!gameState || !gameState.scene) {
        console.error("Cannot create player explosion: gameState or scene is undefined");
        return;
    }
    
    // Import the explosion function dynamically to avoid circular dependencies
    import('../gameplay/zombieUtils.js').then(({ createExplosion }) => {
        createExplosion(
            gameState.scene,
            position,
            radius,
            damage,
            gameState.zombies || [],
            gameState.playerObject,
            gameState,
            'player' // Set source as player so it won't damage the player
        );
    }).catch(error => {
        console.error("Failed to import createExplosion:", error);
    });
};


/**
 * Creates a smoke trail particle for grenades
 * 
 * This function is used by combat.js to generate smoke particles for grenade trails.
 * It is the centralized implementation for smoke trails.
 * 
 * @param {THREE.Vector3} grenadePosition - The position to create the smoke particle at
 * @returns {THREE.Mesh} The smoke particle mesh
 */
export const createSmokeTrail = (grenadePosition) => {
    // No need to log every smoke particle creation as it would spam the logs
    const smokeGeometry = new THREE.SphereGeometry(0.05, 4, 4);
    const smokeMaterial = new THREE.MeshBasicMaterial({
        color: 0x888888,
        transparent: true,
        opacity: 0.6
    });
    const smokeParticle = new THREE.Mesh(smokeGeometry, smokeMaterial);
    smokeParticle.position.copy(grenadePosition);
    smokeParticle.userData = {
        lifetime: 0.5, // Seconds
        fadeRate: 0.02
    };
    return smokeParticle;
};


