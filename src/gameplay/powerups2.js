/**
 * Powerup Module - Defines enhanced powerup assets for the game
 */
import * as THREE from 'three';

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
    const gunBodyGeometry = new THREE.BoxGeometry(0.5, 0.15, 0.15);
    const gunMaterial = new THREE.MeshStandardMaterial({
        color: 0xffa500, // Orange for weapon enhance
        emissive: 0xffa500,
        emissiveIntensity: 0.4,
        roughness: 0.6
    });
    const gunBody = new THREE.Mesh(gunBodyGeometry, gunMaterial);
    gunBody.position.y = 0.2;
    gunBody.castShadow = true;
    powerup.add(gunBody);

    // Barrel
    const barrelGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.4, 8);
    const barrel = new THREE.Mesh(barrelGeometry, gunMaterial);
    barrel.rotation.z = Math.PI / 2;
    barrel.position.set(0.45, 0.2, 0);
    barrel.castShadow = true;
    powerup.add(barrel);

    // Handle
    const handleGeometry = new THREE.BoxGeometry(0.1, 0.2, 0.1);
    const handle = new THREE.Mesh(handleGeometry, gunMaterial);
    handle.position.set(-0.15, 0.1, 0);
    handle.castShadow = true;
    powerup.add(handle);

    // Orange halo
    const halo = createHalo(0xffa500);
    powerup.add(halo);

    powerup.position.set(position.x, 0, position.z);
    powerup.userData.type = 'rapidFire';
    return powerup;
};

/**
 * Creates a Shotgun Blast powerup
 * - Effect: Wide spread of pellets
 */
export const createShotgunBlastPowerup = (position) => {
    const powerup = new THREE.Group();

    // Shotgun body (more detailed)
    const bodyGeometry = new THREE.BoxGeometry(0.6, 0.2, 0.25);
    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: 0x4682b4, // Steel blue
        emissive: 0x4682b4,
        emissiveIntensity: 0.4,
        roughness: 0.6
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.2;
    body.castShadow = true;
    powerup.add(body);

    // Double barrels
    const barrelGeometry = new THREE.CylinderGeometry(0.06, 0.06, 0.5, 8);
    const barrelMaterial = new THREE.MeshStandardMaterial({
        color: 0x666666,
        roughness: 0.7
    });
    const barrel1 = new THREE.Mesh(barrelGeometry, barrelMaterial);
    barrel1.rotation.z = Math.PI / 2;
    barrel1.position.set(0.55, 0.2, -0.05);
    barrel1.castShadow = true;
    powerup.add(barrel1);

    const barrel2 = new THREE.Mesh(barrelGeometry, barrelMaterial);
    barrel2.rotation.z = Math.PI / 2;
    barrel2.position.set(0.55, 0.2, 0.05);
    barrel2.castShadow = true;
    powerup.add(barrel2);

    // Grip
    const gripGeometry = new THREE.BoxGeometry(0.15, 0.25, 0.15);
    const grip = new THREE.Mesh(gripGeometry, bodyMaterial);
    grip.position.set(-0.2, 0.1, 0);
    grip.castShadow = true;
    powerup.add(grip);

    // Blue halo
    const halo = createHalo(0x4682b4);
    powerup.add(halo);

    powerup.position.set(position.x, 0, position.z);
    powerup.userData.type = 'shotgunBlast';
    return powerup;
};

/**
 * Creates an Explosion powerup
 * - Effect: Area explosion that damages zombies but not the player
 */
export const createExplosionPowerup = (position) => {
    const powerup = new THREE.Group();

    // Bomb body (spherical with spikes)
    const bombGeometry = new THREE.SphereGeometry(0.25, 8, 8);
    const bombMaterial = new THREE.MeshStandardMaterial({
        color: 0xff0000, // Red for explosion
        emissive: 0xff0000,
        emissiveIntensity: 0.5,
        roughness: 0.6
    });
    const bomb = new THREE.Mesh(bombGeometry, bombMaterial);
    bomb.position.y = 0.25;
    bomb.castShadow = true;
    powerup.add(bomb);

    // Spikes
    const spikeGeometry = new THREE.ConeGeometry(0.05, 0.15, 6);
    const spikeMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
    for (let i = 0; i < 6; i++) {
        const spike = new THREE.Mesh(spikeGeometry, spikeMaterial);
        const angle = (i / 6) * Math.PI * 2;
        spike.position.set(
            Math.cos(angle) * 0.25,
            0.25,
            Math.sin(angle) * 0.25
        );
        spike.rotation.x = Math.PI / 2;
        spike.castShadow = true;
        powerup.add(spike);
    }

    // Fuse (animated glow effect possible in render loop)
    const fuseGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.3, 6);
    const fuse = new THREE.Mesh(fuseGeometry, new THREE.MeshStandardMaterial({
        color: 0xffff00, // Yellow glowing fuse
        emissive: 0xffff00,
        emissiveIntensity: 0.8
    }));
    fuse.position.y = 0.45;
    fuse.castShadow = true;
    powerup.add(fuse);

    // Red halo
    const halo = createHalo(0xff0000);
    powerup.add(halo);

    powerup.position.set(position.x, 0, position.z);
    powerup.userData.type = 'explosion';
    return powerup;
};

/**
 * Creates a Laser Shot powerup
 * - Effect: Fires a continuous laser beam for a short duration
 */
export const createLaserShotPowerup = (position) => {
    const powerup = new THREE.Group();

    // Laser emitter (futuristic rod with glowing tip)
    const emitterGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.5, 8);
    const emitterMaterial = new THREE.MeshStandardMaterial({
        color: 0x00ffff, // Cyan for sci-fi laser
        emissive: 0x00ffff,
        emissiveIntensity: 0.6,
        roughness: 0.5
    });
    const emitter = new THREE.Mesh(emitterGeometry, emitterMaterial);
    emitter.position.y = 0.25;
    emitter.castShadow = true;
    powerup.add(emitter);

    // Glowing tip
    const tipGeometry = new THREE.SphereGeometry(0.12, 8, 8);
    const tipMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xffffff,
        emissiveIntensity: 1.0,
        roughness: 0.4
    });
    const tip = new THREE.Mesh(tipGeometry, tipMaterial);
    tip.position.y = 0.5;
    tip.castShadow = true;
    powerup.add(tip);

    // Energy rings (visual flair)
    const ringGeometry = new THREE.RingGeometry(0.15, 0.2, 16);
    const ringMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide
    });
    const ring1 = new THREE.Mesh(ringGeometry, ringMaterial);
    ring1.rotation.x = Math.PI / 2;
    ring1.position.y = 0.3;
    powerup.add(ring1);

    const ring2 = ring1.clone();
    ring2.position.y = 0.2;
    powerup.add(ring2);

    // Cyan halo
    const halo = createHalo(0x00ffff);
    powerup.add(halo);

    powerup.position.set(position.x, 0, position.z);
    powerup.userData.type = 'laserShot';
    return powerup;
};

/**
 * Creates a Grenade Launcher powerup
 * - Effect: Lobs grenades that explode on impact with smoke trails
 */
export const createGrenadeLauncherPowerup = (position) => {
    const powerup = new THREE.Group();

    // Launcher body
    const bodyGeometry = new THREE.BoxGeometry(0.6, 0.2, 0.25);
    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: 0x228b22, // Forest green for military vibe
        emissive: 0x228b22,
        emissiveIntensity: 0.4,
        roughness: 0.6
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.2;
    body.castShadow = true;
    powerup.add(body);

    // Barrel (wide for grenade launching)
    const barrelGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.5, 8);
    const barrelMaterial = new THREE.MeshStandardMaterial({
        color: 0x333333, // Dark gray
        roughness: 0.7
    });
    const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
    barrel.rotation.z = Math.PI / 2;
    barrel.position.set(0.55, 0.2, 0);
    barrel.castShadow = true;
    powerup.add(barrel);

    // Mini grenade on top
    const grenadeGeometry = new THREE.SphereGeometry(0.12, 6, 6);
    const grenadeMaterial = new THREE.MeshStandardMaterial({
        color: 0x666666,
        roughness: 0.7
    });
    const grenade = new THREE.Mesh(grenadeGeometry, grenadeMaterial);
    grenade.position.set(0, 0.35, 0);
    grenade.castShadow = true;
    powerup.add(grenade);

    // Pin detail on grenade
    const pinGeometry = new THREE.BoxGeometry(0.05, 0.1, 0.05);
    const pin = new THREE.Mesh(pinGeometry, new THREE.MeshStandardMaterial({ color: 0xffff00 }));
    pin.position.set(0, 0.45, 0);
    pin.castShadow = true;
    powerup.add(pin);

    // Green halo
    const halo = createHalo(0x228b22);
    powerup.add(halo);

    powerup.position.set(position.x, 0, position.z);
    powerup.userData.type = 'grenadeLauncher';
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
 * Creates a projectile that explodes on impact
 * This function should be called when a player uses the grenade launcher
 * 
 * @param {THREE.Scene} scene - The scene to add the projectile to
 * @param {THREE.Vector3} startPosition - The starting position of the projectile
 * @param {THREE.Vector3} direction - The direction the projectile should travel
 * @param {Object} gameState - The current game state
 * @param {number} speed - The speed of the projectile (default: 0.5)
 * @param {number} gravity - The gravity effect on the projectile (default: 0.01)
 */
export const createGrenadeProjectile = (scene, startPosition, direction, gameState, speed = 0.5, gravity = 0.01) => {
    // Create grenade mesh
    const grenadeGeometry = new THREE.SphereGeometry(0.15, 8, 8);
    const grenadeMaterial = new THREE.MeshStandardMaterial({
        color: 0x333333,
        roughness: 0.7
    });
    const grenade = new THREE.Mesh(grenadeGeometry, grenadeMaterial);
    grenade.position.copy(startPosition);
    grenade.castShadow = true;
    scene.add(grenade);
    
    // Add pin detail
    const pinGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.1, 6);
    const pinMaterial = new THREE.MeshStandardMaterial({ color: 0xffff00 });
    const pin = new THREE.Mesh(pinGeometry, pinMaterial);
    pin.position.y = 0.12;
    grenade.add(pin);
    
    // Projectile properties
    const velocity = direction.clone().normalize().multiplyScalar(speed);
    let lifetime = 0;
    const maxLifetime = 100; // Auto-explode after this many frames
    
    // Smoke trail particles
    const smokeParticles = [];
    
    // Update function to be called each frame
    grenade.userData.update = () => {
        // Update position with velocity
        grenade.position.add(velocity);
        
        // Apply gravity
        velocity.y -= gravity;
        
        // Create smoke particle every few frames
        if (lifetime % 3 === 0) {
            const smoke = createSmokeTrail(grenade.position.clone());
            scene.add(smoke);
            smokeParticles.push(smoke);
        }
        
        // Update smoke particles
        for (let i = smokeParticles.length - 1; i >= 0; i--) {
            const smoke = smokeParticles[i];
            smoke.material.opacity -= 0.02;
            smoke.position.y += 0.01;
            
            if (smoke.material.opacity <= 0) {
                scene.remove(smoke);
                smoke.geometry.dispose();
                smoke.material.dispose();
                smokeParticles.splice(i, 1);
            }
        }
        
        // Check for collisions with ground
        if (grenade.position.y <= 0.15) {
            grenade.position.y = 0.15;
            velocity.y = Math.abs(velocity.y) * 0.5; // Bounce with dampening
            
            // If moving very slowly after bounce, explode
            if (velocity.length() < 0.1) {
                explodeGrenade();
                return false; // Stop updating
            }
        }
        
        // Check for collisions with zombies
        if (gameState && gameState.zombies) {
            for (const zombie of gameState.zombies) {
                if (zombie && zombie.mesh && zombie.mesh.position) {
                    const distance = grenade.position.distanceTo(zombie.mesh.position);
                    if (distance < 1) { // Hit a zombie
                        explodeGrenade();
                        return false; // Stop updating
                    }
                }
            }
        }
        
        // Auto-explode after maxLifetime
        lifetime++;
        if (lifetime >= maxLifetime) {
            explodeGrenade();
            return false; // Stop updating
        }
        
        // Rotate grenade as it flies
        grenade.rotation.x += 0.1;
        grenade.rotation.z += 0.1;
        
        return true; // Continue updating
    };
    
    // Function to handle explosion
    function explodeGrenade() {
        // Create explosion effect
        createPlayerExplosion(gameState, grenade.position.clone());
        
        // Clean up grenade and particles
        scene.remove(grenade);
        grenade.geometry.dispose();
        grenade.material.dispose();
        
        smokeParticles.forEach(smoke => {
            scene.remove(smoke);
            smoke.geometry.dispose();
            smoke.material.dispose();
        });
        smokeParticles.length = 0;
    }
    
    // Add to gameState for updating
    if (gameState) {
        if (!gameState.projectiles) {
            gameState.projectiles = [];
        }
        gameState.projectiles.push(grenade);
    }
    
    return grenade;
};

/**
 * Suggestion: Add this to your projectile system for grenade smoke trails
 * - Call this function each frame for each active grenade projectile
 */
export const createSmokeTrail = (grenadePosition) => {
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
    // In your render loop:
    // - Add smokeParticle to scene
    // - Update: particle.position.y += 0.01; particle.material.opacity -= particle.userData.fadeRate;
    // - Remove when opacity <= 0 or lifetime expires
};


