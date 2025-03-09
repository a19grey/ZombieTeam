# Zombie Survival Game

A 3D browser-based cooperative multiplayer zombie survival game built with Three.js. This is the MVP (Minimum Viable Product) version focusing on core mechanics in a single-player context, with the groundwork for multiplayer to be added later.

## Features

- 3D environment with player character and zombies
- Player movement using WASD keys
- Shooting zombies with mouse clicks
- Zombie AI that chases the player
- Health and experience point (EXP) system
- Simple UI showing player stats

## Project Structure

The project follows a modular architecture with functional programming principles:

```
/zombie-game
├── /src
│   ├── /rendering    # Three.js scene, camera, models
│   ├── /gameplay     # Player controls, zombie AI, physics
│   ├── /ui           # Health, ammo, EXP display
│   └── main.js       # Entry point
├── index.html        # Main HTML file
├── server.js         # Express server for serving the game
└── package.json      # Dependencies
```

## How to Run

### Method 1: Using Express Server (Recommended)

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Start the Express server:
   ```
   npm start
   ```
4. Open your browser and navigate to `http://localhost:3000`

### Method 2: Using Serve Package

If you encounter issues with the Express server, you can try using the serve package:

1. Install dependencies:
   ```
   npm install
   ```
2. Start the serve package:
   ```
   npm run serve
   ```
3. Open your browser and navigate to the URL shown in the terminal

### Troubleshooting

If you see a black screen or encounter errors:
1. Check your browser console (F12) for any JavaScript errors
2. Make sure all files are in the correct directory structure
3. Try a different browser (Chrome or Firefox recommended)
4. Clear your browser cache

## Controls

- **W, A, S, D**: Move the player
- **Mouse**: Aim
- **Left Mouse Button**: Shoot
- **ESC**: Pause game (to be implemented)

## Future Enhancements

- Multiplayer functionality with Socket.IO
- More detailed 3D models and animations
- Different types of zombies and weapons
- Power-ups and special abilities
- Level progression system
- Sound effects and music

## Technical Details

- Built with Three.js for 3D rendering
- Uses functional programming principles for maintainable code
- Designed with multiplayer in mind from the start
- Modular architecture for easy extension 