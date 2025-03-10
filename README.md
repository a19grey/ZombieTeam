# Zombie WebGL Co-Op Survival Game

A cooperative multiplayer browser-based 3D zombie survival game built with Three.js and WebGL.

## Game Features

### Enemies
The game features multiple enemy types with unique behaviors:

- **Regular Zombies**: Basic enemies that chase the player.
- **Skeleton Archers**: Ranged enemies that maintain distance and shoot arrows.
- **Exploders**: Fast enemies that explode when close to the player, damaging everything nearby.
- **Zombie King (Boss)**: Powerful boss that appears every 5 waves, can summon minions, and has much more health.

### Environment
The game world includes various environmental elements:

- **Textured Ground**: A procedurally generated ground texture.
- **Buildings**: Various sized buildings with windows scattered around the map.
- **Rocks**: Natural-looking rock formations of different sizes.
- **Dead Trees**: Eerie dead trees adding to the post-apocalyptic atmosphere.

### Game Mechanics

- **Wave-Based Progression**: Enemies come in waves, with difficulty increasing over time.
- **Boss Waves**: Every 5th wave features a Zombie King boss.
- **Scoring System**: Different points awarded for different enemy types.
- **Health System**: Player must manage health to survive.
- **Powerups**: Various powerups can be collected to enhance combat abilities.

### Controls

- **WASD/Arrow Keys**: Move the player character
- **Mouse**: Aim
- **Left Mouse Button**: Shoot
- **R**: Restart game after game over

## Technical Details

This game is built using:

- **Three.js**: For 3D rendering
- **JavaScript**: Core game logic
- **HTML/CSS**: UI elements

The game features a modular architecture with separate components for:
- Rendering
- Gameplay mechanics
- UI
- Physics
- Enemy AI

## Future Enhancements

- Full multiplayer functionality with WebSockets
- More enemy types
- Additional weapons and powerups
- Larger, more varied environments
- Character progression system

## Credits

Created as a WebGL experiment for learning Three.js and game development concepts. 