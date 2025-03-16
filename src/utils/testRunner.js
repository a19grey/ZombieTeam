/**
 * testRunner.js
 * 
 * A testing framework for the Zombie WebGL Co-Op game.
 * This file contains functions to test individual components of the game
 * during initialization to catch errors early.
 * 
 * Example usage:
 * import { runTests } from './utils/testRunner.js';
 * 
 * // In your main.js initialization code:
 * runTests();
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.132.2/build/three.module.js';

// Store test results
const testResults = {
    passed: [],
    failed: [],
    warnings: []
};

// Test logger
const logTest = (component, test, passed, error = null) => {
    const status = passed ? 'PASSED' : 'FAILED';
    const message = `[TEST] ${component}: ${test} - ${status}`;
    
    if (passed) {
        console.log(`%c${message}`, 'color: green');
        testResults.passed.push({ component, test });
    } else {
        console.error(`%c${message}`, 'color: red');
        console.error(error);
        testResults.failed.push({ component, test, error });
    }
};

// Audio test function
const testAudio = () => {
    const audioFiles = [
        { src: './audio/gunshot.mp3', name: 'Gunshot' },
        { src: './audio/zombie-growl.mp3', name: 'Zombie Growl' },
        { src: './audio/player-hit.mp3', name: 'Player Hit' },
        { src: './audio/powerup.mp3', name: 'Powerup' }
    ];
    
    let pendingTests = audioFiles.length;
    
    return new Promise((resolve) => {
        audioFiles.forEach(file => {
            const audio = new Audio();
            
            audio.addEventListener('canplaythrough', () => {
                logTest('Audio', `Load ${file.name}`, true);
                pendingTests--;
                if (pendingTests === 0) resolve();
            }, { once: true });
            
            audio.addEventListener('error', (e) => {
                logTest('Audio', `Load ${file.name}`, false, e);
                pendingTests--;
                if (pendingTests === 0) resolve();
            });
            
            // Add a timeout in case the file never loads
            setTimeout(() => {
                if (audio.readyState < 4) { // Not loaded
                    logTest('Audio', `Load ${file.name}`, false, new Error('Timeout loading audio'));
                    pendingTests--;
                    if (pendingTests === 0) resolve();
                }
            }, 5000);
            
            audio.src = file.src;
            audio.load();
        });
    });
};

// Three.js test function
const testThreeJs = (scene, renderer, camera) => {
    try {
        // Test renderer
        const testCanvas = renderer.domElement;
        if (!testCanvas) {
            throw new Error('Renderer has no DOM element');
        }
        logTest('Three.js', 'Renderer', true);
        
        // Test scene
        if (!scene.isScene) {
            throw new Error('Scene is not a valid Three.js Scene');
        }
        logTest('Three.js', 'Scene', true);
        
        // Test camera
        if (!camera.isCamera) {
            throw new Error('Camera is not a valid Three.js Camera');
        }
        logTest('Three.js', 'Camera', true);
        
        return true;
    } catch (error) {
        logTest('Three.js', 'Core Components', false, error);
        return false;
    }
};

// Asset loading test
const testAssetLoading = (assetLoader) => {
    return new Promise((resolve) => {
        try {
            // Test loading a simple texture
            const textureLoader = new THREE.TextureLoader();
            textureLoader.load(
                './textures/test-texture.jpg',
                (texture) => {
                    logTest('Assets', 'Texture Loading', true);
                    resolve(true);
                },
                undefined,
                (error) => {
                    logTest('Assets', 'Texture Loading', false, error);
                    resolve(false);
                }
            );
        } catch (error) {
            logTest('Assets', 'Texture Loading', false, error);
            resolve(false);
        }
    });
};

// Test physics and collision detection
const testPhysics = () => {
    try {
        // Create test objects
        const obj1 = { position: new THREE.Vector3(0, 0, 0), radius: 1 };
        const obj2 = { position: new THREE.Vector3(0.5, 0, 0), radius: 1 };
        const obj3 = { position: new THREE.Vector3(3, 0, 0), radius: 1 };
        
        // Test collision detection
        const dist1To2 = obj1.position.distanceTo(obj2.position);
        const collides1And2 = dist1To2 < (obj1.radius + obj2.radius);
        
        const dist1To3 = obj1.position.distanceTo(obj3.position);
        const collides1And3 = dist1To3 < (obj1.radius + obj3.radius);
        
        if (collides1And2 && !collides1And3) {
            logTest('Physics', 'Collision Detection', true);
            return true;
        } else {
            throw new Error('Collision detection failed basic test');
        }
    } catch (error) {
        logTest('Physics', 'Collision Detection', false, error);
        return false;
    }
};

// Run all tests
export const runTests = async (scene, renderer, camera) => {
    console.log('%c[TEST SUITE] Starting tests...', 'color: blue; font-weight: bold');
    
    // Run Three.js tests
    const threeJsResult = testThreeJs(scene, renderer, camera);
    
    // Run async tests
    const audioResult = await testAudio();
    
    // Test physics system
    const physicsResult = testPhysics();
    
    // Display test summary
    console.log('%c[TEST SUMMARY]', 'color: blue; font-weight: bold');
    console.log(`Tests Passed: ${testResults.passed.length}`);
    console.log(`Tests Failed: ${testResults.failed.length}`);
    
    if (testResults.failed.length > 0) {
        console.error('%c[TEST FAILURES]', 'color: red; font-weight: bold');
        testResults.failed.forEach(failure => {
            console.error(`${failure.component}: ${failure.test}`);
        });
    }
    
    return {
        success: testResults.failed.length === 0,
        results: testResults
    };
};

// Make runTests globally available
if (typeof window !== 'undefined') {
    window.runTests = runTests;
}

// Function to test a specific component
export const testComponent = async (componentName, testFn) => {
    try {
        const result = await testFn();
        logTest(componentName, 'Custom Test', result === true);
        return result === true;
    } catch (error) {
        logTest(componentName, 'Custom Test', false, error);
        return false;
    }
}; 