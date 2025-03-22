/**
 * Cliff World Test - Visualization testbed for the procedural cliff world
 * 
 * This file provides a minimal environment to test and visualize the cliff world
 * generation in isolation from the main game.
 * 
 * Run with: npm run dev-cliff
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createScene, createCamera, createRenderer, createLighting } from './src/rendering/scene.js';
import { World } from './src/rendering/cliffworld.js';
import { logger } from './src/utils/logger.js';

// Basic setup from scene.js
const scene = createScene();
const camera = createCamera();
const renderer = createRenderer();
const lights = createLighting(scene);

// Create a dummy player for the world to track
const player = new THREE.Object3D();
player.position.set(0, 22, 0); // Position player above the cliff (CLIFF_HEIGHT=20)
scene.add(player);

// Create the world
const world = new World(scene, player);
logger.info('test', 'Cliff world created');

// Camera setup for better viewing
camera.position.set(0, 30, -30);
camera.lookAt(0, 22, 20);

// Controls for testing
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// Add instructions
const createInstructions = () => {
    const instructions = document.createElement('div');
    instructions.style.position = 'absolute';
    instructions.style.top = '10px';
    instructions.style.left = '10px';
    instructions.style.color = 'white';
    instructions.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    instructions.style.padding = '10px';
    instructions.style.borderRadius = '5px';
    instructions.style.fontFamily = 'Arial, sans-serif';
    instructions.style.fontSize = '14px';
    instructions.innerHTML = `
        <h3>Cliff World Test</h3>
        <p>Controls:</p>
        <ul>
            <li>Left mouse: Rotate camera</li>
            <li>Right mouse: Pan camera</li>
            <li>Scroll: Zoom</li>
            <li>Space: Toggle player movement</li>
        </ul>
    `;
    document.body.appendChild(instructions);
};
createInstructions();

// Movement control
let isMoving = true;
document.addEventListener('keydown', (event) => {
    if (event.code === 'Space') {
        isMoving = !isMoving;
        logger.debug('test', `Player movement ${isMoving ? 'enabled' : 'disabled'}`);
    }
});

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    // Update controls
    controls.update();
    
    // Update world chunks based on player position
    world.updateChunks();
    
    // Move player forward if movement is enabled
    if (isMoving) {
        player.position.z += 0.2;
    }
    
    renderer.render(scene, camera);
}

animate();

logger.info('test', 'Cliff world test running. Press SPACE to toggle player movement.'); 