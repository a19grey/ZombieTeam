nstructions for Implementing Zombie Horde Flocking with Random Sampling and Cohorts
Overview
You’re building a zombie horde in a Three.js browser game. Zombies should chase the player as a mob, not a straight line, using flocking-like behavior. With potentially 1,000+ zombies spawning over time, we need efficiency. Here’s the plan:

Use a spatial grid to limit neighbor checks.
Randomly sample nearby zombies (Monte Carlo-style) for separation and cohesion.
Assign each zombie to a cohort (e.g., 4 groups) to stagger updates.
Include three forces: attraction to player, separation from neighbors, and cohesion with neighbors.
Avoid InstancedMesh for now; use individual meshes.
Step-by-Step Implementation
Set Up Zombie Data Structure
Each zombie has:
position: THREE.Vector3 (current position).
velocity: THREE.Vector3 (movement direction and speed).
mesh: THREE.Mesh (for rendering).
cohort: Integer (0-3, assigned randomly at spawn).
Store zombies in an array: zombies.
Create a Spatial Grid
Divide the world into cells (e.g., 10x10 units).
Use a Map to store zombies by cell key (e.g., "x,z").
Update the grid every frame with all zombies.
Assign Cohorts
When a zombie spawns, randomly assign it to one of 4 cohorts (0, 1, 2, or 3).
Use a frame counter to update one cohort per frame (e.g., cohort 0 on frame 0, cohort 1 on frame 1, etc.).
Implement Flocking Forces
For each zombie in the current cohort:
Attraction: Move toward the player.
Separation: Push away from a random sample of nearby zombies.
Cohesion: Pull toward the average position of a random sample of nearby zombies.
Randomly sample up to 5 neighbors from nearby grid cells (Monte Carlo-style).
Update Positions
Apply velocity to position for the updated cohort.
For all zombies (every frame), smoothly interpolate positions to avoid jitter.
Render
Update each zombie’s mesh position every frame.
Efficiency Notes
Grid reduces neighbor checks from all zombies to nearby ones.
Random sampling caps force calculations at 5 neighbors.
Cohorts spread updates over 4 frames, handling 1,000+ zombies.
Example Code
javascript

Collapse

Wrap

Copy
// Setup
const zombies = []; // Array to hold all zombies
const cellSize = 10; // Grid cell size (tune based on world size)
const grid = new Map(); // Spatial grid
const zombieSpeed = 0.05; // Max speed
const cohortCount = 4; // 4 cohorts for staggered updates
let frameCounter = 0; // To cycle cohorts

// Spawn a zombie (call this when adding new zombies)
function spawnZombie(x, z) {
  const zombie = {
    position: new THREE.Vector3(x, 0, z),
    velocity: new THREE.Vector3(0, 0, 0),
    mesh: new THREE.Mesh(
      new THREE.BoxGeometry(1, 2, 1), // Placeholder zombie model
      new THREE.MeshBasicMaterial({ color: 0x00ff00 })
    ),
    cohort: Math.floor(Math.random() * cohortCount) // Random cohort 0-3
  };
  scene.add(zombie.mesh);
  zombies.push(zombie);
  return zombie;
}

// Update function (run every frame)
function updateZombies(player) {
  frameCounter = (frameCounter + 1) % cohortCount; // Cycle 0-3

  // Step 1: Update grid with all zombies
  grid.clear();
  zombies.forEach(zombie => {
    const gridX = Math.floor(zombie.position.x / cellSize);
    const gridZ = Math.floor(zombie.position.z / cellSize);
    const key = `${gridX},${gridZ}`;
    if (!grid.has(key)) grid.set(key, []);
    grid.get(key).push(zombie);
  });

  // Step 2: Update zombies in current cohort
  zombies.forEach(zombie => {
    if (zombie.cohort !== frameCounter) return; // Skip if not this cohort

    const gridX = Math.floor(zombie.position.x / cellSize);
    const gridZ = Math.floor(zombie.position.z / cellSize);

    // Get nearby zombies from 9 cells (current + 8 neighbors)
    let nearbyZombies = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const key = `${gridX + dx},${gridZ + dz}`;
        if (grid.has(key)) nearbyZombies.push(...grid.get(key));
      }
    }

    // Randomly sample up to 5 neighbors (Monte Carlo)
    const sampleSize = Math.min(5, nearbyZombies.length);
    const sampledZombies = [];
    for (let i = 0; i < sampleSize; i++) {
      const randomIndex = Math.floor(Math.random() * nearbyZombies.length);
      sampledZombies.push(nearbyZombies[randomIndex]);
      nearbyZombies.splice(randomIndex, 1); // Remove to avoid duplicates
    }

    // Calculate forces
    const toPlayer = player.position.clone().sub(zombie.position).normalize();
    const separation = new THREE.Vector3();
    const cohesionPos = new THREE.Vector3();
    let neighborCount = 0;

    // Separation and Cohesion from sampled neighbors
    sampledZombies.forEach(other => {
      if (other === zombie) return; // Skip self
      const distance = zombie.position.distanceTo(other.position);
      if (distance < 2) { // Separation radius
        const away = zombie.position.clone().sub(other.position).normalize();
        separation.add(away.divideScalar(distance));
        neighborCount++;
      }
      cohesionPos.add(other.position); // For cohesion average
    });

    // Finalize forces
    if (neighborCount > 0) {
      separation.divideScalar(neighborCount);
      cohesionPos.divideScalar(sampleSize); // Average position
      const toCohesion = cohesionPos.sub(zombie.position).normalize();
      zombie.velocity.add(toCohesion.multiplyScalar(0.02)); // Cohesion force
    }
    zombie.velocity.add(toPlayer.multiplyScalar(0.05)); // Attraction force
    zombie.velocity.add(separation.multiplyScalar(0.1)); // Separation force
    zombie.velocity.clampLength(0, zombieSpeed); // Cap speed

    // Update target position
    zombie.targetPosition = zombie.position.clone().add(zombie.velocity);
  });

  // Step 3: Smoothly update all zombie positions every frame
  zombies.forEach(zombie => {
    if (!zombie.targetPosition) zombie.targetPosition = zombie.position.clone();
    zombie.position.lerp(zombie.targetPosition, 0.1); // Interpolate
    zombie.mesh.position.copy(zombie.position); // Update mesh
  });
}

// Example game loop
function animate() {
  requestAnimationFrame(animate);
  updateZombies(player); // Player is a THREE.Object3D or similar
  renderer.render(scene, camera);
}

// Spawn initial zombies (example)
for (let i = 0; i < 100; i++) {
  spawnZombie(Math.random() * 100 - 50, Math.random() * 100 - 50);
}
animate();
Explanation of Code
Zombie Spawn:
Randomly assigns a cohort (0-3) at creation.
Adds a mesh to the Three.js scene.
Grid Update:
Runs every frame to keep the grid current as zombies move and spawn.
Maps zombies to cells based on position.
Cohort System:
frameCounter cycles 0-3, updating 25% of zombies per frame.
Scales with continuous spawning since cohort is set at spawn.
Flocking Forces:
Attraction: Simple vector to player, weighted at 0.05.
Separation: Pushes away from up to 5 randomly sampled neighbors, weighted at 0.1.
Cohesion: Pulls toward the average position of sampled neighbors, weighted at 0.02 (light to avoid over-clumping).
Random sampling ensures constant-time neighbor checks.
Position Smoothing:
lerp keeps movement smooth despite cohort-based updates.
Rendering:
Updates individual mesh positions (no InstancedMesh).
Tuning Tips
Cell Size: If FPS drops with 1,000 zombies, increase cellSize to 15 or 20.
Sample Size: Reduce to 3 neighbors if performance lags.
Cohort Count: Increase to 8 if updates feel too infrequent.
Force Weights: Adjust 0.05 (attraction), 0.1 (separation), and 0.02 (cohesion) for desired mob behavior.
This should give you a scalable, mob-like horde with cohesion, ready for continuous spawning. Test it and let me know if you need adjustments!