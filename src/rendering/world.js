/**
 * World Module - Manages infinite procedural world and multiplayer elements
 */

import * as THREE from 'three';
import { createBuilding, createRock, createTexturedGround, createDeadTree } from './environment.js';

const CHUNK_SIZE = 50; // Size of each terrain chunk
const VIEW_DISTANCE = 3; // Chunks visible in each direction
const SPAWN_DISTANCE = 30; // Distance between player spawns

// Custom cliff-face for world edges
const createCliffFace = (position, length) => {
    const cliff = new THREE.Mesh(
        new THREE.BoxGeometry(5, 20, length),
        new THREE.MeshStandardMaterial({ color: 0x4A2F1D, roughness: 1.0 })
    );
    cliff.position.set(position.x, 10, position.z);
    cliff.castShadow = true;
    cliff.receiveShadow = true;
    cliff.isObstacle = true;
    return cliff;
};

/**
 * Manages the infinite world
 */
export class World {
    constructor(scene) {
        this.scene = scene;
        this.chunks = new Map(); // Key: "x,z", Value: THREE.Group
        this.players = new Map(); // Key: playerId, Value: { mesh, position }
        this.zombies = [];
        this.zombieSpawnRate = 0.5; // Base spawn rate (zombies per second)
        this.lastSpawnTime = 0;
    }

    // Generate a terrain chunk at given coordinates
    generateChunk(chunkX, chunkZ) {
        const key = `${chunkX},${chunkZ}`;
        if (this.chunks.has(key)) return;

        const chunk = new THREE.Group();
        const ground = createTexturedGround(CHUNK_SIZE);
        ground.position.set(chunkX * CHUNK_SIZE, 0, chunkZ * CHUNK_SIZE);
        chunk.add(ground);

        // Add random obstacles
        for (let i = 0; i < 5; i++) {
            const x = chunkX * CHUNK_SIZE + (Math.random() - 0.5) * CHUNK_SIZE;
            const z = chunkZ * CHUNK_SIZE + (Math.random() - 0.5) * CHUNK_SIZE;
            const rand = Math.random();
            if (rand < 0.3) chunk.add(createRock({ x, z }, Math.random() + 0.5));
            else if (rand < 0.6) chunk.add(createDeadTree({ x, z }));
            else chunk.add(createBuilding({ x, z }, 4, 6, 4));
        }

        this.chunks.set(key, chunk);
        this.scene.add(chunk);
    }

    // Update visible chunks based on player positions
    updateChunks() {
        const playerPositions = Array.from(this.players.values()).map(p => p.position);
        if (!playerPositions.length) return;

        // Find average player position
        const avgPos = playerPositions.reduce((acc, pos) => ({
            x: acc.x + pos.x / playerPositions.length,
            z: acc.z + pos.z / playerPositions.length
        }), { x: 0, z: 0 });

        const centerX = Math.floor(avgPos.x / CHUNK_SIZE);
        const centerZ = Math.floor(avgPos.z / CHUNK_SIZE);

        // Generate chunks in view distance
        for (let x = centerX - VIEW_DISTANCE; x <= centerX + VIEW_DISTANCE; x++) {
            for (let z = centerZ - VIEW_DISTANCE; z <= centerZ + VIEW_DISTANCE; z++) {
                this.generateChunk(x, z);
            }
        }

        // Remove far chunks (optional for performance)
        for (const [key, chunk] of this.chunks) {
            const [cx, cz] = key.split(',').map(Number);
            if (Math.abs(cx - centerX) > VIEW_DISTANCE + 1 || Math.abs(cz - centerZ) > VIEW_DISTANCE + 1) {
                this.scene.remove(chunk);
                this.chunks.delete(key);
            }
        }
    }

    // Add a new player
    addPlayer(playerId) {
        const existingPlayers = Array.from(this.players.values());
        let spawnPos = { x: 0, z: 0 };
        if (existingPlayers.length > 0) {
            const nearest = existingPlayers[0];
            spawnPos.x = nearest.position.x + (Math.random() > 0.5 ? SPAWN_DISTANCE : -SPAWN_DISTANCE);
            spawnPos.z = nearest.position.z + (Math.random() - 0.5) * 10;
        }

        const playerMesh = new THREE.Mesh(
            new THREE.BoxGeometry(0.8, 2, 0.8),
            new THREE.MeshStandardMaterial({ color: 0xFF4500 }) // Orange for visibility
        );
        playerMesh.position.set(spawnPos.x, 1, spawnPos.z);
        playerMesh.castShadow = true;
        this.scene.add(playerMesh);
        this.players.set(playerId, { mesh: playerMesh, position: spawnPos });

        // Increase zombie spawn rate
        this.zombieSpawnRate += 0.2;
    }

    // Update player position
    updatePlayer(playerId, position) {
        const player = this.players.get(playerId);
        if (!player) return;
        player.position = position;
        player.mesh.position.set(position.x, 1, position.z);
    }

    // Spawn zombies from positive Z
    spawnZombies(deltaTime) {
        this.lastSpawnTime += deltaTime;
        const spawnInterval = 1 / this.zombieSpawnRate;
        if (this.lastSpawnTime < spawnInterval) return;

        this.lastSpawnTime = 0;
        const playerPositions = Array.from(this.players.values()).map(p => p.position);
        if (!playerPositions.length) return;

        const avgPos = playerPositions.reduce((acc, pos) => ({
            x: acc.x + pos.x / playerPositions.length,
            z: acc.z + pos.z / playerPositions.length
        }), { x: 0, z: 0 });

        const spawnZ = avgPos.z + 50; // Spawn ahead of players
        const spawnX = avgPos.x + (Math.random() - 0.5) * CHUNK_SIZE;
        const zombie = createbaseZombie({ x: spawnX, z: spawnZ });
        this.zombies.push(zombie);
        this.scene.add(zombie);
    }

    // Update zombie movement
    updateZombies() {
        const playerPositions = Array.from(this.players.values()).map(p => p.position);
        this.zombies.forEach((zombie, index) => {
            // Find nearest player
            const nearest = playerPositions.reduce((closest, pos) => {
                const dist = Math.hypot(pos.x - zombie.position.x, pos.z - zombie.position.z);
                return dist < closest.dist ? { pos, dist } : closest;
            }, { pos: playerPositions[0], dist: Infinity }).pos;

            // Move toward player
            const dx = nearest.x - zombie.position.x;
            const dz = nearest.z - zombie.position.z;
            const dist = Math.hypot(dx, dz);
            if (dist > 0.1) {
                zombie.position.x += (dx / dist) * zombie.speed;
                zombie.position.z += (dz / dist) * zombie.speed;
            }

            // Remove if too far behind (optional)
            if (zombie.position.z < nearest.z - 100) {
                this.scene.remove(zombie);
                this.zombies.splice(index, 1);
            }
        });
    }

    // Add world boundaries
    initializeBoundaries() {
        const cliffLeft = createCliffFace({ x: -100, z: 0 }, 1000);
        const cliffRight = createCliffFace({ x: 100, z: 0 }, 1000);
        this.scene.add(cliffLeft, cliffRight);
    }
}