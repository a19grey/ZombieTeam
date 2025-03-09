- Technical Product Specification: Cooperative Multiplayer Zombie Survival Game (Three.js)
1. Game Overview
Genre: Cooperative multiplayer browser-based 3D zombie survival game.

Core Mechanics:
New players spawn with a simple pistol to fight zombie hordes.

Players cannot harm each other; gameplay is fully cooperative against zombies.

Powerups (e.g., increased damage, speed, health) near one player apply to all nearby players, encouraging teamwork.

Players earn experience points (EXP) for zombies killed, with EXP shared among nearby players.

Harder zombies spawn as more players cluster together, incentivizing grouping for survival and higher rewards.

2. Technical Components
A. Three.js Frontend (Client-Side)
Rendering:
Use Three.js with WebGL to create a 3D environment (e.g., urban wasteland, forest) with zombies, players, and powerups.

Scene setup: Scene, PerspectiveCamera, WebGLRenderer, and objects like player models (humanoid), zombies (animated models), and powerups (e.g., glowing spheres).

Models: Load 3D models (e.g., via GLTFLoader) for players, zombies, and environment. Use simple geometries (e.g., BoxGeometry) for prototyping.

Lighting: Add DirectionalLight and AmbientLight for realistic illumination.

Animations: Use Three.js animations for player movement, zombie attacks, and powerup effects (e.g., Clock with requestAnimationFrame).

Gameplay:
Player controls: Keyboard/mouse for movement (WASD/Arrow keys) and shooting (mouse click or spacebar).

Zombie AI: Simple pathfinding (e.g., using Yuka.js or a custom script) to chase players, with attack animations.

Physics: Use Ammo.js or a custom system for collisions (player-zombie, player-powerup).

UI: Display health, ammo, EXP/points, and powerup status using HTML/CSS or dat.gui.

B. Multiplayer Architecture (Server-Side)
Real-Time Sync: Use Node.js with Socket.IO for WebSocket-based communication.

Game State Management:
Server tracks player positions, health, EXP, zombie locations, and powerup states.

Broadcast updates (e.g., player/zombie positions, powerup activations) at 30–60 FPS for smooth real-time interaction.

Share EXP for zombies killed within a radius (e.g., 10 units) of any player, encouraging clustering.

Scale zombie difficulty (e.g., faster, stronger zombies) based on the number of players in a cluster (detect via proximity checks).

Cooperative Features:
Powerups (e.g., +50% damage, +20% speed) apply to all players within a radius (e.g., 15 units) when picked up.

Prevent player damage to each other (server-side validation).