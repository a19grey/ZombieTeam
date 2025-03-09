/**
 * Scene Module - Handles Three.js scene setup
 * 
 * This module contains pure functions for creating and managing the 3D scene,
 * including the camera, renderer, lighting, and ground plane.
 * 
 * Example usage:
 * import { createScene, createCamera, createRenderer } from './rendering/scene.js';
 * const scene = createScene();
 * const camera = createCamera();
 * const renderer = createRenderer();
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.132.2/build/three.module.js';
import { logger } from '../utils/logger.js';

/**
 * Creates a new Three.js scene
 * @returns {THREE.Scene} The created scene
 */
export const createScene = () => {
    try {
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x87CEEB); // Sky blue background
        scene.fog = new THREE.Fog(0x87CEEB, 20, 100); // Add fog for atmosphere
        logger.debug('Scene created with sky blue background and fog');
        return scene;
    } catch (error) {
        logger.error('Error creating scene:', error);
        throw error; // Re-throw to allow caller to handle
    }
};

/**
 * Creates a perspective camera for the scene
 * @returns {THREE.PerspectiveCamera} The created camera
 */
export const createCamera = () => {
    try {
        const camera = new THREE.PerspectiveCamera(
            75, // Field of view
            window.innerWidth / window.innerHeight, // Aspect ratio
            0.1, // Near clipping plane
            1000 // Far clipping plane
        );
        logger.debug('Camera created', {
            fov: 75,
            aspect: window.innerWidth / window.innerHeight,
            near: 0.1,
            far: 1000
        });
        return camera;
    } catch (error) {
        logger.error('Error creating camera:', error);
        throw error;
    }
};

/**
 * Creates a WebGL renderer for the scene
 * @returns {THREE.WebGLRenderer} The created renderer
 */
export const createRenderer = () => {
    try {
        // Check if WebGL is available
        if (!isWebGLAvailable()) {
            const warning = getWebGLErrorMessage();
            document.body.appendChild(warning);
            logger.error('WebGL not available');
            throw new Error('WebGL not available');
        }
        
        // Create renderer with antialiasing
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // Append to document body
        document.body.appendChild(renderer.domElement);
        
        logger.debug('Renderer created', {
            size: { width: window.innerWidth, height: window.innerHeight },
            shadowMapEnabled: true,
            shadowMapType: 'PCFSoftShadowMap'
        });
        
        return renderer;
    } catch (error) {
        logger.error('Error creating renderer:', error);
        
        // Show a user-friendly error message
        const errorMessage = document.createElement('div');
        errorMessage.style.position = 'absolute';
        errorMessage.style.top = '50%';
        errorMessage.style.left = '50%';
        errorMessage.style.transform = 'translate(-50%, -50%)';
        errorMessage.style.color = 'white';
        errorMessage.style.backgroundColor = 'rgba(255, 0, 0, 0.7)';
        errorMessage.style.padding = '20px';
        errorMessage.style.borderRadius = '5px';
        errorMessage.style.fontFamily = 'Arial, sans-serif';
        errorMessage.style.fontSize = '16px';
        errorMessage.style.textAlign = 'center';
        errorMessage.innerHTML = `
            <h2>Error Creating 3D Renderer</h2>
            <p>${error.message || 'Unknown error'}</p>
            <p>Please try a different browser or check your graphics drivers.</p>
        `;
        document.body.appendChild(errorMessage);
        
        // Create a minimal fallback renderer that won't actually render anything
        const fallbackRenderer = {
            domElement: document.createElement('div'),
            setSize: () => {},
            render: () => {},
            shadowMap: { enabled: false, type: null }
        };
        
        return fallbackRenderer;
    }
};

/**
 * Check if WebGL is available
 * @returns {boolean} True if WebGL is available
 */
function isWebGLAvailable() {
    try {
        const canvas = document.createElement('canvas');
        return !!(window.WebGLRenderingContext && 
            (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
    } catch (e) {
        return false;
    }
}

/**
 * Get WebGL error message element
 * @returns {HTMLElement} Error message element
 */
function getWebGLErrorMessage() {
    const element = document.createElement('div');
    element.style.fontFamily = 'Arial, sans-serif';
    element.style.fontSize = '16px';
    element.style.fontWeight = 'bold';
    element.style.textAlign = 'center';
    element.style.background = '#FFF';
    element.style.color = '#000';
    element.style.padding = '1.5em';
    element.style.width = '400px';
    element.style.margin = '5em auto 0';
    element.innerHTML = 'Your browser does not seem to support WebGL.<br/>Please try a different browser.';
    return element;
}

/**
 * Adds lighting to the scene
 * @param {THREE.Scene} scene - The scene to add lighting to
 * @returns {Object} The created lights
 */
export const createLighting = (scene) => {
    try {
        // Ambient light for general illumination
        const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
        scene.add(ambientLight);
        logger.debug('Ambient light added');
        
        // Directional light for shadows and directional illumination
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 20, 10);
        directionalLight.castShadow = true;
        
        // Configure shadow properties
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 50;
        directionalLight.shadow.camera.left = -25;
        directionalLight.shadow.camera.right = 25;
        directionalLight.shadow.camera.top = 25;
        directionalLight.shadow.camera.bottom = -25;
        
        scene.add(directionalLight);
        logger.debug('Directional light added with shadows');
        
        return { ambientLight, directionalLight };
    } catch (error) {
        logger.error('Error creating lighting:', error);
        return { ambientLight: null, directionalLight: null };
    }
};

/**
 * Creates a ground plane for the scene
 * @returns {THREE.Mesh} The created ground mesh
 */
export const createGround = () => {
    try {
        const groundGeometry = new THREE.PlaneGeometry(100, 100);
        const groundMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x1a5e1a, // Dark green
            roughness: 0.8,
            metalness: 0.2
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2; // Rotate to be horizontal
        ground.receiveShadow = true;
        logger.debug('Ground plane created');
        return ground;
    } catch (error) {
        logger.error('Error creating ground:', error);
        // Return a minimal ground object that won't cause errors if used
        const fallbackGround = new THREE.Object3D();
        return fallbackGround;
    }
}; 