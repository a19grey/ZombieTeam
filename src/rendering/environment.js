/**
 * Environment Module - Handles creation of environmental objects
 * 
 * This module contains functions for creating various environmental objects
 * like buildings, rocks, trees, and textured ground to enhance the game world.
 * 
 * Example usage:
 * import { createBuilding, createRock, createTexturedGround } from './rendering/environment.js';
 * const building = createBuilding({ x: 10, z: 10 });
 * scene.add(building);
 */

import * as THREE from 'three';
import { logger } from '../utils/logger.js';

/**
 * Creates a simple building with windows
 * @param {Object} position - The position to place the building
 * @param {number} width - Width of the building (default: 5)
 * @param {number} height - Height of the building (default: 8)
 * @param {number} depth - Depth of the building (default: 5)
 * @returns {THREE.Group} The building object
 */
export const createBuilding = (position, width = 5, height = 8, depth = 5) => {
    const building = new THREE.Group();
    
    // Main building structure
    const buildingGeometry = new THREE.BoxGeometry(width, height, depth);
    const buildingMaterial = new THREE.MeshStandardMaterial({
        color: 0x808080, // Gray concrete
        roughness: 0.9
    });
    const buildingMesh = new THREE.Mesh(buildingGeometry, buildingMaterial);
    buildingMesh.position.y = height / 2;
    buildingMesh.castShadow = true;
    buildingMesh.receiveShadow = true;
    building.add(buildingMesh);
    
    // Add windows (simple blue squares)
    const windowGeometry = new THREE.PlaneGeometry(0.8, 0.8);
    const windowMaterial = new THREE.MeshStandardMaterial({
        color: 0x87CEEB, // Sky blue
        emissive: 0x3366FF,
        emissiveIntensity: 0.2,
        side: THREE.DoubleSide
    });
    
    // Create a grid of windows on each side
    const windowSpacingX = 1.5;
    const windowSpacingY = 2;
    const windowOffsetY = 1.5;
    
    // Front windows
    for (let y = 0; y < Math.floor(height / windowSpacingY); y++) {
        for (let x = 0; x < Math.floor(width / windowSpacingX) - 1; x++) {
            const windowMesh = new THREE.Mesh(windowGeometry, windowMaterial);
            windowMesh.position.set(
                -width/2 + 1 + x * windowSpacingX, 
                windowOffsetY + y * windowSpacingY, 
                depth/2 + 0.01
            );
            building.add(windowMesh);
        }
    }
    
    // Back windows
    for (let y = 0; y < Math.floor(height / windowSpacingY); y++) {
        for (let x = 0; x < Math.floor(width / windowSpacingX) - 1; x++) {
            const windowMesh = new THREE.Mesh(windowGeometry, windowMaterial);
            windowMesh.position.set(
                -width/2 + 1 + x * windowSpacingX, 
                windowOffsetY + y * windowSpacingY, 
                -depth/2 - 0.01
            );
            windowMesh.rotation.y = Math.PI;
            building.add(windowMesh);
        }
    }
    
    // Side windows
    for (let y = 0; y < Math.floor(height / windowSpacingY); y++) {
        for (let x = 0; x < Math.floor(depth / windowSpacingX) - 1; x++) {
            // Left side
            const leftWindowMesh = new THREE.Mesh(windowGeometry, windowMaterial);
            leftWindowMesh.position.set(
                -width/2 - 0.01,
                windowOffsetY + y * windowSpacingY,
                -depth/2 + 1 + x * windowSpacingX
            );
            leftWindowMesh.rotation.y = -Math.PI / 2;
            building.add(leftWindowMesh);
            
            // Right side
            const rightWindowMesh = new THREE.Mesh(windowGeometry, windowMaterial);
            rightWindowMesh.position.set(
                width/2 + 0.01,
                windowOffsetY + y * windowSpacingY,
                -depth/2 + 1 + x * windowSpacingX
            );
            rightWindowMesh.rotation.y = Math.PI / 2;
            building.add(rightWindowMesh);
        }
    }
    
    // Add a door
    const doorGeometry = new THREE.PlaneGeometry(1.2, 2);
    const doorMaterial = new THREE.MeshStandardMaterial({
        color: 0x8B4513, // Brown
        roughness: 0.8,
        side: THREE.DoubleSide
    });
    const door = new THREE.Mesh(doorGeometry, doorMaterial);
    door.position.set(0, 1, depth/2 + 0.01);
    building.add(door);
    
    // Position the building
    building.position.set(position.x, 0, position.z);
    
    // Add collision properties
    building.isObstacle = true;
    building.boundingRadius = Math.sqrt(width*width + depth*depth) / 2;
    
    return building;
};

/**
 * Creates a rock formation
 * @param {Object} position - The position to place the rock
 * @param {number} size - Size multiplier for the rock (default: 1)
 * @returns {THREE.Group} The rock object
 */
export const createRock = (position, size = 1) => {
    const rock = new THREE.Group();
    
    // Create several overlapping geometries for a more natural look
    const rockGeometries = [
        new THREE.DodecahedronGeometry(size, 1),
        new THREE.DodecahedronGeometry(size * 0.8, 1),
        new THREE.DodecahedronGeometry(size * 0.6, 1)
    ];
    
    const rockMaterial = new THREE.MeshStandardMaterial({
        color: 0x808080, // Gray
        roughness: 1.0,
        metalness: 0.2
    });
    
    // Create and position the rock parts
    const rockParts = rockGeometries.map((geometry, index) => {
        const mesh = new THREE.Mesh(geometry, rockMaterial);
        
        // Offset each part slightly for a more natural look
        mesh.position.set(
            (Math.random() - 0.5) * size * 0.3,
            size * 0.2 * index,
            (Math.random() - 0.5) * size * 0.3
        );
        
        // Random rotation for variety
        mesh.rotation.set(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
        );
        
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        return mesh;
    });
    
    // Add all parts to the rock group
    rockParts.forEach(part => rock.add(part));
    
    // Position the rock
    rock.position.set(position.x, 0, position.z);
    
    // Add collision properties
    rock.isObstacle = true;
    rock.boundingRadius = size * 1.2;
    
    return rock;
};

/**
 * Creates a textured ground plane
 * @param {number} size - Size of the ground plane (default: 1000)
 * @returns {THREE.Mesh} The ground mesh with texture
 */
export const createTexturedGround = (size = 1000) => {
    // Create a repeating texture pattern
    const textureSize = 10;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext('2d');
    
    // Fill with base color
    context.fillStyle = '#3a6e3a'; // Dark green base
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add some texture variation
    for (let i = 0; i < 1000; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const radius = Math.random() * 3 + 1;
        const brightness = Math.random() * 20 - 10;
        
        // Create a slightly different shade of green
        const green = Math.floor(110 + brightness);
        const red = Math.floor(58 + brightness * 0.7);
        const blue = Math.floor(58 + brightness * 0.5);
        
        context.fillStyle = `rgb(${red}, ${green}, ${blue})`;
        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fill();
    }
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(size / textureSize, size / textureSize);
    
    // Create ground with texture
    const groundGeometry = new THREE.PlaneGeometry(size, size);
    const groundMaterial = new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.9,
        metalness: 0.1
    });
    
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2; // Rotate to be horizontal
    ground.receiveShadow = true;
    
    return ground;
};

/**
 * Creates a dead tree
 * @param {Object} position - The position to place the tree
 * @returns {THREE.Group} The tree object
 */
export const createDeadTree = (position) => {
    const tree = new THREE.Group();
    
    // Trunk
    const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.5, 4, 8);
    const trunkMaterial = new THREE.MeshStandardMaterial({
        color: 0x4d3319, // Dark brown
        roughness: 1.0
    });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = 2;
    trunk.castShadow = true;
    tree.add(trunk);
    
    // Add some branches
    const branchMaterial = new THREE.MeshStandardMaterial({
        color: 0x4d3319, // Same as trunk
        roughness: 1.0
    });
    
    // Helper function to create a branch
    const createBranch = (length, thickness, angle, height, rotation) => {
        const branchGeometry = new THREE.CylinderGeometry(thickness * 0.7, thickness, length, 6);
        const branch = new THREE.Mesh(branchGeometry, branchMaterial);
        
        // Position at the connection point
        branch.position.y = height;
        
        // Rotate to the correct angle
        branch.rotation.z = angle;
        branch.rotation.y = rotation;
        
        // Move to be connected to the trunk
        branch.position.x = Math.sin(angle) * length * 0.5;
        branch.position.y = height - Math.cos(angle) * length * 0.5;
        
        branch.castShadow = true;
        return branch;
    };
    
    // Add several branches at different angles and heights
    const branches = [
        createBranch(2.5, 0.2, Math.PI / 4, 3, 0),
        createBranch(2, 0.15, Math.PI / 3, 2.5, Math.PI / 2),
        createBranch(1.8, 0.12, Math.PI / 2.5, 2, Math.PI),
        createBranch(1.5, 0.1, Math.PI / 3.5, 3.5, Math.PI * 1.5)
    ];
    
    branches.forEach(branch => tree.add(branch));
    
    // Position the tree
    tree.position.set(position.x, 0, position.z);
    
    // Add collision properties
    tree.isObstacle = true;
    tree.boundingRadius = 0.8;
    
    return tree;
};

/**
 * Creates a ground tile with a specified position
 * @param {Object} position - The position {x, z} to place the ground tile
 * @param {number} tileSize - Size of the ground tile (default: 100)
 * @returns {THREE.Mesh} The ground mesh with texture
 */
export const createGroundTile = (position, tileSize = 100) => {
    // Create a repeating texture pattern
    const textureSize = 10;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext('2d');
    
    // Fill with base color
    context.fillStyle = '#3a6e3a'; // Dark green base
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add some texture variation
    for (let i = 0; i < 1000; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const radius = Math.random() * 3 + 1;
        const brightness = Math.random() * 20 - 10;
        
        // Create a slightly different shade of green
        const green = Math.floor(110 + brightness);
        const red = Math.floor(58 + brightness * 0.7);
        const blue = Math.floor(58 + brightness * 0.5);
        
        context.fillStyle = `rgb(${red}, ${green}, ${blue})`;
        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fill();
    }
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(tileSize / textureSize, tileSize / textureSize);
    
    // Create ground with texture
    const groundGeometry = new THREE.PlaneGeometry(tileSize, tileSize);
    const groundMaterial = new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.9,
        metalness: 0.1
    });
    
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2; // Rotate to be horizontal
    ground.receiveShadow = true;
    
    // Position the ground tile
    ground.position.set(position.x, 0, position.z);
    
    // Add a property to identify this as a ground tile
    ground.isGroundTile = true;
    ground.tileSize = tileSize;
    
    return ground;
};

/**
 * Manages procedural ground generation as player moves
 * @param {THREE.Scene} scene - The Three.js scene
 * @param {Object} playerPosition - Player's current position {x, z}
 * @param {Object} worldData - Object containing ground tile tracking data
 * @returns {Object} Updated worldData object
 */
export const manageProceduralGround = (scene, playerPosition, worldData) => {
    // Initialize worldData if it doesn't exist
    if (!worldData) {
        worldData = {
            groundTiles: [],
            lastCheckedPosition: { x: 0, z: 0 },
            tileSize: 100,
            visibilityRange: 2 // How many tiles ahead/behind to keep visible
        };
        
        // Initialize with a central tile
        const centralTile = createGroundTile({ x: 0, z: 0 }, worldData.tileSize);
        scene.add(centralTile);
        worldData.groundTiles.push({
            mesh: centralTile,
            gridPos: { x: 0, z: 0 }
        });
        
        logger.info('terrain', 'Initialized procedural ground system');
    }
    
    // Calculate which grid cell the player is in
    const gridX = Math.floor(playerPosition.x / worldData.tileSize);
    const gridZ = Math.floor(playerPosition.z / worldData.tileSize);
    
    // If player has moved to a new grid cell or this is first check
    if (gridX !== worldData.lastCheckedPosition.x || 
        gridZ !== worldData.lastCheckedPosition.z) {
        
        logger.debug('terrain', `Player moved to new grid cell: (${gridX}, ${gridZ})`);
        
        // Update the last checked position
        worldData.lastCheckedPosition = { x: gridX, z: gridZ };
        
        // Define the range of grid cells that should be visible
        const minX = gridX - worldData.visibilityRange;
        const maxX = gridX + worldData.visibilityRange;
        const minZ = gridZ - worldData.visibilityRange;
        const maxZ = gridZ + worldData.visibilityRange;
        
        // Generate any missing tiles within the visibility range
        for (let x = minX; x <= maxX; x++) {
            for (let z = minZ; z <= maxZ; z++) {
                // Check if this grid position already has a tile
                const existingTile = worldData.groundTiles.find(
                    tile => tile.gridPos.x === x && tile.gridPos.z === z
                );
                
                if (!existingTile) {
                    // Create a new tile at this grid position
                    const tilePosition = {
                        x: x * worldData.tileSize + worldData.tileSize/2,
                        z: z * worldData.tileSize + worldData.tileSize/2
                    };
                    
                    const newTile = createGroundTile(tilePosition, worldData.tileSize);
                    scene.add(newTile);
                    
                    worldData.groundTiles.push({
                        mesh: newTile,
                        gridPos: { x, z }
                    });
                    
                    logger.debug('terrain', `Created new ground tile at grid (${x}, ${z})`);
                    
                    // Add random environmental objects to the new tile
                    addEnvironmentToTile(scene, tilePosition, worldData.tileSize);
                }
            }
        }
        
        // Remove tiles that are now too far away
        for (let i = worldData.groundTiles.length - 1; i >= 0; i--) {
            const tile = worldData.groundTiles[i];
            if (tile.gridPos.x < minX - 1 || tile.gridPos.x > maxX + 1 ||
                tile.gridPos.z < minZ - 1 || tile.gridPos.z > maxZ + 1) {
                
                // Remove the tile from the scene
                scene.remove(tile.mesh);
                
                // Dispose of geometries and materials to free memory
                if (tile.mesh.geometry) tile.mesh.geometry.dispose();
                if (tile.mesh.material) {
                    if (Array.isArray(tile.mesh.material)) {
                        tile.mesh.material.forEach(material => material.dispose());
                    } else {
                        tile.mesh.material.dispose();
                    }
                }
                
                // Remove from the array
                worldData.groundTiles.splice(i, 1);
                
                logger.debug('terrain', `Removed distant ground tile at grid (${tile.gridPos.x}, ${tile.gridPos.z})`);
            }
        }
    }
    
    return worldData;
};

/**
 * Adds random environmental objects to a newly created ground tile
 * @param {THREE.Scene} scene - The Three.js scene
 * @param {Object} tilePosition - Center position of the tile {x, z}
 * @param {number} tileSize - Size of the ground tile
 */
function addEnvironmentToTile(scene, tilePosition, tileSize) {
    // Define object counts
    const numBuildings = Math.floor(Math.random() * 3); // 0-2 buildings
    const numRocks = Math.floor(Math.random() * 6) + 2; // 2-7 rocks
    const numTrees = Math.floor(Math.random() * 5) + 1; // 1-5 trees
    
    // Calculate bounds within the tile (with some margin from edges)
    const margin = 5;
    const minX = tilePosition.x - tileSize/2 + margin;
    const maxX = tilePosition.x + tileSize/2 - margin;
    const minZ = tilePosition.z - tileSize/2 + margin;
    const maxZ = tilePosition.z + tileSize/2 - margin;
    
    // Add buildings
    for (let i = 0; i < numBuildings; i++) {
        const position = {
            x: minX + Math.random() * (maxX - minX),
            z: minZ + Math.random() * (maxZ - minZ)
        };
        
        // Vary building size
        const width = 4 + Math.random() * 4; // 4-8
        const height = 6 + Math.random() * 6; // 6-12
        const depth = 4 + Math.random() * 4; // 4-8
        
        const building = createBuilding(position, width, height, depth);
        scene.add(building);
    }
    
    // Add rocks
    for (let i = 0; i < numRocks; i++) {
        const position = {
            x: minX + Math.random() * (maxX - minX),
            z: minZ + Math.random() * (maxZ - minZ)
        };
        
        // Vary rock size
        const size = 0.5 + Math.random() * 1.5; // 0.5-2.0
        
        const rock = createRock(position, size);
        scene.add(rock);
    }
    
    // Add trees
    for (let i = 0; i < numTrees; i++) {
        const position = {
            x: minX + Math.random() * (maxX - minX),
            z: minZ + Math.random() * (maxZ - minZ)
        };
        
        const tree = createDeadTree(position);
        scene.add(tree);
    }
    
    logger.debug('terrain', `Added environmental objects to tile at (${tilePosition.x}, ${tilePosition.z}): ${numBuildings} buildings, ${numRocks} rocks, ${numTrees} trees`);
} 