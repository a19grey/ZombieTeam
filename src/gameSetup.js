/**
 * Game Setup Module - Initializes Three.js components and game objects
 * 
 * This file handles all initialization for the game including:
 * - Scene, camera, and renderer setup
 * - Player creation and configuration
 * - Audio system initialization
 * - UI initialization
 * 
 * Example usage: Import and call initializeGame() to set up all game components
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.132.2/build/three.module.js';
import { createScene, createCamera, createRenderer, createLighting, createGround } from './rendering/scene.js';
import { createPlayer, createPlayerWeapon } from './gameplay/player.js';
import { updateUI, initUI } from './ui/ui.js';
import { initAudio, loadAudio, loadPositionalAudio, playSound, stopSound, toggleMute, setMasterVolume, debugAudioSystem, getAudioState, setAudioEnabled } from './gameplay/audio.js';
import { createSoundSettingsUI } from './ui/soundSettings.js';
import { debugWebGL, fixWebGLContext, createFallbackCanvas } from './debug.js';
import { logger } from './utils/logger.js';
import { gameState } from './gameState.js';

/**
 * Initializes all game components and returns references to key objects
 * @returns {Object} Object containing scene, camera, renderer, player, clock, and audioListener
 */
export function initializeGame(gameState) {
    // Create scene, camera, and renderer with error handling
    let scene, camera, renderer, audioListener;
    try {
        // Create scene
        scene = createScene();
        if (!scene) throw new Error('Failed to create scene');
        
        // Create camera
        camera = createCamera();
        if (!camera) throw new Error('Failed to create camera');
        
        // Position camera
        camera.position.set(0, 10, 10);
        camera.lookAt(0, 0, 0);
        
        // Create renderer with error handling
        renderer = createRenderer();
        if (!renderer || !renderer.domElement) {
            throw new Error('Failed to create renderer');
        }
        
        // Expose objects globally for debugging
        window.scene = scene;
        window.camera = camera;
        window.renderer = renderer;
        
        // Initialize audio listener
        try {
            audioListener = initAudio(camera);
            // Disable audio system by default until all sound files are properly set up
            setAudioEnabled(false);
            logger.info('Audio system initialized but disabled by default');
        } catch (audioError) {
            logger.error('Audio initialization failed:', audioError);
            console.error('Audio initialization failed:', audioError);
            // Continue without audio
        }
        
        // Add lighting
        const lights = createLighting(scene);
        
        // Create ground
        const ground = createGround();
        scene.add(ground);
        
        logger.info('Scene setup completed successfully');
    } catch (setupError) {
        logger.error('Scene setup failed:', setupError);
        console.error('Scene setup failed:', setupError);
        
        // Create fallback canvas with diagnostic information
        createFallbackCanvas();
        
        // Throw error to prevent further execution
        throw setupError;
    }

    // Try to fix WebGL context if it exists
    if (renderer) {
        fixWebGLContext(renderer);
    }

    // Create player
    const player = createPlayer();
    scene.add(player);
    player.position.y = 0;

    // Store player object in gameState for access by other functions
    gameState.playerObject = player;

    // Add weapon to player
    const playerWeapon = createPlayerWeapon();
    player.add(playerWeapon);

    // Create powerup timer indicator (initially invisible)
    const powerupTimerGeometry = new THREE.RingGeometry(0, 2, 32);
    const powerupTimerMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide
    });
    const powerupTimer = new THREE.Mesh(powerupTimerGeometry, powerupTimerMaterial);
    powerupTimer.rotation.x = Math.PI / 2; // Lay flat on ground
    powerupTimer.position.y = 0.05; // Just above ground
    powerupTimer.visible = false; // Initially invisible
    player.add(powerupTimer);

    // Add inner circle for better visual effect
    const innerCircleGeometry = new THREE.CircleGeometry(0.5, 32);
    const innerCircleMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide
    });
    const innerCircle = new THREE.Mesh(innerCircleGeometry, innerCircleMaterial);
    innerCircle.rotation.x = Math.PI / 2; // Lay flat on ground
    innerCircle.position.y = 0.04; // Just below the ring
    innerCircle.visible = false; // Initially invisible
    player.add(innerCircle);

    // Create clock for timing
    const clock = new THREE.Clock();

    // Initialize UI
    initUI(gameState);

    // Add sound settings button
    const soundSettingsButton = document.createElement('button');
    soundSettingsButton.textContent = '🔊 Sound Settings';
    soundSettingsButton.style.position = 'absolute';
    soundSettingsButton.style.top = '10px';
    soundSettingsButton.style.right = '10px';
    soundSettingsButton.style.padding = '8px 16px';
    soundSettingsButton.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    soundSettingsButton.style.color = 'white';
    soundSettingsButton.style.border = 'none';
    soundSettingsButton.style.borderRadius = '5px';
    soundSettingsButton.style.cursor = 'pointer';
    soundSettingsButton.style.fontSize = '16px';
    soundSettingsButton.style.zIndex = '1000';

    soundSettingsButton.addEventListener('click', () => {
        // Toggle sound settings UI
        createSoundSettingsUI();
    });

    document.body.appendChild(soundSettingsButton);

    // Add audio debug button in development mode
    if (gameState.debug.enabled) {
        const audioDebugButton = document.createElement('button');
        audioDebugButton.textContent = '🔊 Debug Audio';
        audioDebugButton.style.position = 'absolute';
        audioDebugButton.style.top = '50px';
        audioDebugButton.style.right = '10px';
        audioDebugButton.style.padding = '8px 16px';
        audioDebugButton.style.backgroundColor = 'rgba(255, 0, 0, 0.7)';
        audioDebugButton.style.color = 'white';
        audioDebugButton.style.border = 'none';
        audioDebugButton.style.borderRadius = '5px';
        audioDebugButton.style.cursor = 'pointer';
        audioDebugButton.style.fontSize = '16px';
        audioDebugButton.style.zIndex = '1000';

        audioDebugButton.addEventListener('click', () => {
            // Debug audio system
            const debugInfo = debugAudioSystem();
            console.log('Audio Debug Info:', debugInfo);
            
            // Try to play a test sound
            try {
                // Create a test oscillator
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                oscillator.type = 'sine';
                oscillator.frequency.value = 440; // A4 note
                gainNode.gain.value = 0.1;
                
                oscillator.start();
                
                // Stop after 0.5 seconds
                setTimeout(() => {
                    oscillator.stop();
                    showMessage('Test sound played - did you hear it?', 3000);
                }, 500);
                
                // Also try to resume any suspended audio contexts
                if (audioListener?.context?.state === 'suspended') {
                    audioListener.context.resume().then(() => {
                        showMessage('Audio context resumed', 2000);
                    });
                }
            } catch (error) {
                console.error('Error playing test sound:', error);
                showMessage('Error playing test sound', 2000);
            }
        });

        document.body.appendChild(audioDebugButton);
    }

    /**
     * Load all game audio files
     * This function loads all sound effects and background music needed for the game
     * @returns {Promise} A promise that resolves when all audio is loaded
     */
    const loadGameAudio = async () => {
        try {
            logger.info('Loading game audio files...');
            
            // Load background music
            await loadAudio('backgroundMusic', './audio/music/Pulse-Drive.mp3', true, 0.5, 'music');
            
            // Load weapon sounds
            await loadAudio('gunshot', './audio/sfx/bullet.mp3', false, 0.8);
            
            // Load zombie sounds
            await loadPositionalAudio('zombieGrowl', './audio/sfx/zombie-growl.mp3', 15, 0.7);
            await loadPositionalAudio('zombieDeath', './audio/sfx/zombie-death.mp3', 10, 0.8);
            
            // Load powerup sounds
            await loadAudio('powerupPickup', './audio/sfx/powerup-pickup.mp3', false, 0.9);
            
            // Load explosion sound
            await loadPositionalAudio('explosion', './audio/sfx/explosion.mp3', 20, 1.0);
            
            // Start background music
            playSound('backgroundMusic');
            
            logger.info('Game audio loaded successfully');
            return true;
        } catch (error) {
            logger.error('Failed to load game audio:', error);
            showMessage('Audio failed to load. Game will continue without sound.', 3000);
            return false;
        }
    };

    // Load game audio
    loadGameAudio();

    return { scene, camera, renderer, player, clock, audioListener, powerupTimer,innerCircle,powerupTimerMaterial,powerupTimerGeometry,innerCircleGeometry,innerCircleMaterial };
} 