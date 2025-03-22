/**
 * World Module - Manages infinite procedural cliff world geometry
 */

/** Key Features Kept
Procedural Cliff Path: Raised at CLIFF_HEIGHT (20 units), with variable width (MIN_PATH_WIDTH to MAX_PATH_WIDTH) and smooth curvature via Math.sin.
Obstacles: Random boulders and holes on the path for challenge.
Outlying Land: Lower ground planes on both sides for future giant monster placement.
Chunk Management: Generates chunks based on player.position.z, removing those too far ahead.
Removed Features
Player addition/updating, zombie spawning, and giant monster logic are removed, as they'll live in gameLoop.js's animate() and gameState.
The World class now only handles geometry and procedural generation.
Integration with main.js
Here's how to integrate this into your existing setup:

 In main.js, after initializeGame
import { World } from './gameplay/world.js';

const { scene, camera, renderer, player, clock ... etc finish these } = initializeGame(gameState);
const world = new World(scene, player);

In animate function (gameLoop.js), call:
world.updateChunks();
Additional Methods
getPathCenterX(z): Returns the X-coordinate of the path center at a given Z, useful for spawning entities aligned with the curve.
getPathWidth(z): Returns the path width at a given Z, helping position entities within bounds.
This keeps world.js lean and focused on geometry, letting gameLoop.js and gameState.js handle gameplay dynamics. Let me know if you need help integrating it further or tweaking the generation!

*/

import * as THREE from 'three';
import { createRock, createTexturedGround, createDeadTree } from '../rendering/environment.js';

const CHUNK_SIZE = 50; // Size of each terrain chunk along Z-axis
const VIEW_DISTANCE = 3; // Chunks visible in each direction
const CLIFF_HEIGHT = 20; // Height of the raised cliff path
const MIN_PATH_WIDTH = 14; // Minimum width of the cliff path (40% wider)
const MAX_PATH_WIDTH = 28; // Maximum width of the cliff path (40% wider)
const EDGE_HEIGHT = 1.2; // Height of edge barriers to prevent falling
const EDGE_THICKNESS = 0.8; // Thickness of edge barriers

// Custom cliff face for world edges
const createCliffFace = (position, length, height = CLIFF_HEIGHT) => {
    const cliff = new THREE.Mesh(
        new THREE.BoxGeometry(5, height, length),
        new THREE.MeshStandardMaterial({ color: 0x4A2F1D, roughness: 1.0 })
    );
    cliff.position.set(position.x, height / 2, position.z);
    cliff.castShadow = true;
    cliff.receiveShadow = true;
    cliff.isObstacle = true;
    return cliff;
};

// Ground plane for the lower outlying land
const createLowerGround = (position, width, length) => {
    const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(width, length),
        new THREE.MeshStandardMaterial({ color: 0x3C2F2F, roughness: 0.8 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(position.x, 0, position.z);
    ground.receiveShadow = true;
    return ground;
};

/**
 * Creates edge barriers to prevent player from falling off cliff path
 * @param {number} centerX - X coordinate of path center
 * @param {number} pathWidth - Width of the path
 * @param {number} z - Z coordinate of the barrier
 * @param {number} length - Length of the barrier
 * @returns {Object} - Left and right barrier objects
 */
const createPathEdges = (centerX, pathWidth, z, length) => {
    // Material with a slightly different color from the path
    const edgeMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x6A5042, // Slightly lighter than the path
        roughness: 0.9,
        metalness: 0.2
    });
    
    // Create rounded left edge using cylinder
    const segments = 8; // Number of segments for rounding
    const leftEdge = new THREE.Mesh(
        new THREE.CylinderGeometry(EDGE_THICKNESS/2, EDGE_THICKNESS/2, length, segments, 1, false, Math.PI/2, Math.PI),
        edgeMaterial
    );
    // Rotate to align cylinder with Z-axis (along the path)
    leftEdge.rotation.x = Math.PI/2;
    leftEdge.position.set(
        centerX - (pathWidth / 2), // Exactly at the path edge
        CLIFF_HEIGHT + (EDGE_HEIGHT / 2), 
        z
    );
    leftEdge.receiveShadow = true;
    leftEdge.castShadow = true;
    
    // Create rounded right edge
    const rightEdge = new THREE.Mesh(
        new THREE.CylinderGeometry(EDGE_THICKNESS/2, EDGE_THICKNESS/2, length, segments, 1, false, -Math.PI/2, Math.PI),
        edgeMaterial
    );
    // Rotate to align cylinder with Z-axis (along the path)
    rightEdge.rotation.x = Math.PI/2;
    rightEdge.position.set(
        centerX + (pathWidth / 2), // Exactly at the path edge
        CLIFF_HEIGHT + (EDGE_HEIGHT / 2), 
        z
    );
    rightEdge.receiveShadow = true;
    rightEdge.castShadow = true;
    
    return { leftEdge, rightEdge };
};

/**
 * Manages the infinite cliff world geometry
 */
export class World {
    constructor(scene, player) {
        this.scene = scene;
        this.player = player; // Player object from gameSetup.js with position property
        this.chunks = new Map(); // Key: "z", Value: THREE.Group (chunks track Z-axis progression)
        this.lastChunkZ = 0; // Tracks the last generated chunk's Z position
        this.initializeBoundaries();
    }

    // Generate a cliff path chunk at given Z coordinate
    generateChunk(chunkZ) {
        const key = `${chunkZ}`;
        if (this.chunks.has(key)) return;

        const chunk = new THREE.Group();

        // Calculate path width and curvature
        const pathWidth = MIN_PATH_WIDTH + Math.random() * (MAX_PATH_WIDTH - MIN_PATH_WIDTH);
        const curveFactor = Math.sin(chunkZ * 0.05); // Smooth curvature based on Z position
        const centerX = curveFactor * 20; // Max lateral deviation of 20 units

        // Create the raised cliff path
        const path = new THREE.Mesh(
            new THREE.PlaneGeometry(pathWidth, CHUNK_SIZE),
            new THREE.MeshStandardMaterial({ color: 0x5A4032, roughness: 0.9 })
        );
        path.rotation.x = -Math.PI / 2;
        path.position.set(centerX, CLIFF_HEIGHT, chunkZ * CHUNK_SIZE + CHUNK_SIZE / 2);
        path.receiveShadow = true;
        chunk.add(path);

        // Add path edges to prevent falling
        const { leftEdge, rightEdge } = createPathEdges(
            centerX, 
            pathWidth, 
            chunkZ * CHUNK_SIZE + CHUNK_SIZE / 2, 
            CHUNK_SIZE
        );
        chunk.add(leftEdge, rightEdge);

        // Add cliff faces on both sides
        const leftCliff = createCliffFace({ x: centerX - pathWidth / 2 - 2.5, z: chunkZ * CHUNK_SIZE + CHUNK_SIZE / 2 }, CHUNK_SIZE);
        const rightCliff = createCliffFace({ x: centerX + pathWidth / 2 + 2.5, z: chunkZ * CHUNK_SIZE + CHUNK_SIZE / 2 }, CHUNK_SIZE);
        chunk.add(leftCliff, rightCliff);

        // Add lower ground on both sides for outlying land
        const leftGround = createLowerGround({ x: centerX - pathWidth / 2 - 50, z: chunkZ * CHUNK_SIZE + CHUNK_SIZE / 2 }, 100, CHUNK_SIZE);
        const rightGround = createLowerGround({ x: centerX + pathWidth / 2 + 50, z: chunkZ * CHUNK_SIZE + CHUNK_SIZE / 2 }, 100, CHUNK_SIZE);
        chunk.add(leftGround, rightGround);

        // Add random obstacles (boulders, holes)
        for (let i = 0; i < 3; i++) {
            const xOffset = (Math.random() - 0.5) * (pathWidth - 5);
            const zOffset = (Math.random() - 0.5) * CHUNK_SIZE;
            const rand = Math.random();
            if (rand < 0.4) {
                const rock = createRock({ x: centerX + xOffset, z: chunkZ * CHUNK_SIZE + CHUNK_SIZE / 2 + zOffset }, Math.random() + 0.5);
                rock.position.y = CLIFF_HEIGHT;
                chunk.add(rock);
            } else if (rand < 0.6) {
                // Create a hole
                const hole = new THREE.Mesh(
                    new THREE.CircleGeometry(2, 16),
                    new THREE.MeshBasicMaterial({ color: 0x000000 })
                );
                hole.rotation.x = -Math.PI / 2;
                hole.position.set(centerX + xOffset, CLIFF_HEIGHT - 0.1, chunkZ * CHUNK_SIZE + CHUNK_SIZE / 2 + zOffset);
                chunk.add(hole);
            }
        }

        this.chunks.set(key, chunk);
        this.scene.add(chunk);
    }

    // Update visible chunks based on player position
    updateChunks() {
        if (!this.player || !this.player.position) return;

        const centerZ = Math.floor(this.player.position.z / CHUNK_SIZE);

        // Generate chunks behind and slightly ahead
        for (let z = centerZ - VIEW_DISTANCE; z <= centerZ + 1; z++) {
            this.generateChunk(z);
        }

        // Remove chunks too far ahead
        for (const [key, chunk] of this.chunks) {
            const cz = Number(key);
            if (cz > centerZ + 2) {
                this.scene.remove(chunk);
                this.chunks.delete(key);
            }
        }

        this.lastChunkZ = centerZ;
    }

    // Initial boundaries (static cliffs at start)
    initializeBoundaries() {
        const cliffLeft = createCliffFace({ x: -50, z: 0 }, 100);
        const cliffRight = createCliffFace({ x: 50, z: 0 }, 100);
        this.scene.add(cliffLeft, cliffRight);
        
        // Add initial path edges at the start
        const { leftEdge, rightEdge } = createPathEdges(0, MIN_PATH_WIDTH, 0, 100);
        this.scene.add(leftEdge, rightEdge);
    }

    // Get the current path center X at a given Z position (for external use, e.g., spawning)
    getPathCenterX(z) {
        const chunkZ = Math.floor(z / CHUNK_SIZE);
        const curveFactor = Math.sin(chunkZ * 0.05);
        return curveFactor * 20;
    }

    // Get the current path width at a given Z position
    getPathWidth(z) {
        const chunkZ = Math.floor(z / CHUNK_SIZE);
        const key = `${chunkZ}`;
        if (this.chunks.has(key)) {
            const chunk = this.chunks.get(key);
            const path = chunk.children.find(child => child.geometry.type === 'PlaneGeometry');
            return path ? path.geometry.parameters.width : MIN_PATH_WIDTH;
        }
        return MIN_PATH_WIDTH + Math.random() * (MAX_PATH_WIDTH - MIN_PATH_WIDTH);
    }
}