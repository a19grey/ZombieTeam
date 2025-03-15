# Project File Structure

> Generated on 3/15/2025, 12:01:31 PM

This document provides a detailed overview of the project's file structure with descriptions extracted from file documentation.

## /src Directory

- 📄 **debug.js**:  
  Debug Utility for WebGL and Three.js  
  This script provides debugging tools for WebGL and Three.js rendering issues.  
  It can be included in the main HTML file to help diagnose rendering problems.  
  Example usage:  
  import { debugWebGL, fixWebGLContext, monitorRenderingPerformance } from './debug.js';  
  /

- 📄 **debugCheck.js**:  
  Debug Check Utility  
  This script verifies if debug mode is correctly set up and displays information  
  about the environment variables in the browser console and DOM.  
  /

- 📄 **envCheck.js**:  
  Environment Check Utility  
  This script helps debug environment-related issues by displaying the current  
  environment variables and settings in a visible overlay on the page.  
  Example usage: Import this module in your HTML to see environment information.  
  /

- 📄 **main.js**:  
  Zombie Survival Game - Main Entry Point  
  This file initializes the game, sets up the Three.js scene, and coordinates  
  the game loop. It imports functionality from other modules to maintain a  
  clean, modular structure.  
  Example usage: This file is loaded by index.html and automatically starts the game.  
  /

- 📁 **gameplay/**
  - 📄 **audio.js**:  
    Audio Module - Handles audio loading, playback, and state management  
    This module provides functionality for loading and playing both global and positional  
    audio in the game. It supports background music, sound effects, and spatial audio.  
    Example usage:  
    import { initAudio, loadAudio, playSound } from './gameplay/audio.js';  
    // Initialize audio system  
    initAudio(camera);  
    // Load background music and sound effects  
    await loadAudio('backgroundMusic', '/audio/Pulse-Drive.mp3'.mp3', true, 0.5);  
    await loadAudio('gunshot', '/audio/gunshot.mp3', false, 0.8);  
    // Play sounds  
    playSound('backgroundMusic'); // Play background music  
    playSound('gunshot'); // Play gunshot sound  
    /

  - 📄 **dismemberment.js**:  
    Dismemberment Module - Handles zombie limb loss based on damage  
    This module contains functions for managing the dismemberment of zombies  
    as they take damage. It provides a scalable system where zombies lose limbs  
    based on the percentage of damage they've taken.  
    Example usage:  
    import { setupDismemberment, processDismemberment } from './gameplay/dismemberment.js';  
    const zombie = createZombie(position);  
    setupDismemberment(zombie);  
    processDismemberment(zombie, damagePercent);  
    /

  - 📄 **physics.js**:  
    Physics Module - Handles collision detection  
    This module contains functions for detecting and handling collisions  
    between game entities (player, zombies, bullets).  
    Example usage:  
    import { handleCollisions } from './gameplay/physics.js';  
    handleCollisions(gameState, scene);  
    /

  - 📄 **player.js**:  
    Player Module - Handles player creation and controls  
    This module contains functions for creating a Minecraft-style low-poly player character,  
    handling player movement based on keyboard input, and creating the player's weapon.  
    /

  - 📄 **powerupSpawner.js**:  
    Powerup Spawner Module - Handles spawning of powerups in the game  
    This module contains functions for spawning powerups behind the player,  
    just out of view. It ensures powerups spawn within a reasonable distance  
    from the player to create interesting gameplay choices between pursuing  
    powerups or focusing on zombies.  
    Example usage:  
    ```  
    // In your game loop  
    if (shouldSpawnPowerup(gameState, currentTime)) {  
    spawnPowerupBehindPlayer(scene, gameState, player);  
    }  
    ```  
    /

  - 📄 **powerups.js**:  
    Powerup Module - Defines powerup assets for the game  
    This module contains functions to create low-poly, Minecraft-style powerups  
    that the player can shoot or walk over to collect. Logic for effects is not implemented.  
    /

  - 📄 **powerups2.js**:  
    Powerup Module - Defines enhanced powerup assets for the game  
    /

  - 📄 **weapons.js**:  
    Weapons Module - Handles bullet creation and movement  
    This module contains functions for creating bullets and updating their  
    positions as they travel through the scene.  
    Example usage:  
    import { createBullet, updateBullets } from './gameplay/weapons.js';  
    const bullet = createBullet(playerPosition, playerRotation);  
    updateBullets(bullets, scene);  
    /

  - 📄 **world.js**:  
    World Module - Manages infinite procedural world and multiplayer elements  
    /

  - 📄 **zombie.js**:  
    Zombie Module - Handles zombie creation and AI behavior  
    This module contains functions for creating Minecraft-style low-poly zombies and updating their  
    positions to chase the player.  
    /

- 📁 **rendering/**
  - 📄 **environment.js**:  
    Environment Module - Handles creation of environmental objects  
    This module contains functions for creating various environmental objects  
    like buildings, rocks, trees, and textured ground to enhance the game world.  
    Example usage:  
    import { createBuilding, createRock, createTexturedGround } from './rendering/environment.js';  
    const building = createBuilding({ x: 10, z: 10 });  
    scene.add(building);  
    /

  - 📄 **scene.js**:  
    Scene Module - Handles Three.js scene setup  
    This module contains pure functions for creating and managing the 3D scene,  
    including the camera, renderer, lighting, and ground plane.  
    Example usage:  
    import { createScene, createCamera, createRenderer } from './rendering/scene.js';  
    const scene = createScene();  
    const camera = createCamera();  
    const renderer = createRenderer();  
    /

- 📁 **ui/**
  - 📄 **soundSettings.js**:  
    Sound Settings UI Module  
    This module provides a user interface for controlling game audio settings,  
    including music volume, sound effects volume, and mute toggle.  
    Example usage:  
    import { createSoundSettingsUI } from './ui/soundSettings.js';  
    // Create and show the sound settings UI  
    createSoundSettingsUI();  
    /

  - 📄 **ui.js**:  
    UI Module - Handles user interface updates  
    This module contains functions for updating the UI elements  
    that display player stats like health and EXP.  
    Example usage:  
    import { updateUI, showMessage } from './ui/ui.js';  
    updateUI(gameState);  
    showMessage("Game Over!", 3000);  
    /

- 📁 **utils/**
  - 📄 **audioChecker.js**:  
    audioChecker.js  
    Utility for checking audio files at game startup to ensure they exist and can be loaded.  
    Provides detailed error reporting for missing or corrupt audio files.  
    Example usage:  
    import { checkAudioFiles } from './utils/audioChecker.js';  
    // In your game initialization:  
    const audioStatus = await checkAudioFiles();  
    if (!audioStatus.success) {  
    console.error('Audio files failed to load:', audioStatus.failures);  
    }  
    /

  - 📄 **devMode.js**:  
    Development Mode Utilities  
    This module provides tools for debugging and development without UI panels.  
    The dev panel implementation has been removed for simplicity.  
    Example usage:  
    import { toggleFeature, isFeatureEnabled } from './utils/devMode.js';  
    /

  - 📄 **logger.js**:  
    Logger Module - Provides logging functionality with different levels  
    This module contains functions for logging messages at different levels  
    (debug, info, warn, error) and can be configured to show only logs  
    at or above a certain level.  
    Example usage:  
    import { logger } from './utils/logger.js';  
    logger.debug('Detailed information for debugging');  
    logger.info('General information about game state');  
    logger.warn('Warning that might need attention');  
    logger.error('Error that needs immediate attention');  
    /

  - 📄 **safeAccess.js**:  
    safeAccess.js  
    Utility functions for safely accessing properties of objects that might be null or undefined.  
    Helps prevent "Cannot read property 'x' of null/undefined" errors.  
    Example usage:  
    import { safeGet, safeCall } from './utils/safeAccess.js';  
    // Instead of: zombie.mesh.scale.set(1, 1, 1);  
    // Use: safeCall(zombie, 'mesh.scale.set', [1, 1, 1]);  
    // Instead of: const health = zombie.userData.health;  
    // Use: const health = safeGet(zombie, 'userData.health', 100); // 100 is default value  
    /

  - 📄 **testRunner.js**:  
    testRunner.js  
    A testing framework for the Zombie WebGL Co-Op game.  
    This file contains functions to test individual components of the game  
    during initialization to catch errors early.  
    Example usage:  
    import { runTests } from './utils/testRunner.js';  
    // In your main.js initialization code:  
    runTests();  
    /

  - 📄 **weaponsTester.js**:  
    weaponsTester.js  
    A test suite specifically for the weapons system in the game.  
    Tests bullet creation, bullet updates, and ensures no null pointer errors.  
    Example usage:  
    import { testWeaponsSystem } from './utils/weaponsTester.js';  
    // In your main.js initialization code:  
    testWeaponsSystem();  
    /

