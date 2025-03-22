import * as THREE from 'three';
import { createScene, createCamera, createRenderer, createLighting } from './src/rendering/scene.js';
import { World } from './src/rendering/cliffworld.js';

// Basic setup from scene.js
const scene = createScene();
const camera = createCamera();
const renderer = createRenderer();
createLighting(scene);

// Create a dummy player for the world to track
const player = new THREE.Object3D();
player.position.set(0, 22, 0); // Position player above the cliff (CLIFF_HEIGHT=20)
scene.add(player);

// Create the world
const world = new World(scene, player);

// Camera setup for better viewing
camera.position.set(0, 30, -30);
camera.lookAt(0, 22, 20);

// Controls for testing (optional)
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
const controls = new OrbitControls(camera, renderer.domElement);

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    // Update world chunks based on player position
    world.updateChunks();
    
    // Move player forward slightly to see the world generate
    player.position.z += 0.1;
    
    renderer.render(scene, camera);
}

animate();