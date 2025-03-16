import { gameState } from './gameState.js';
import { logger } from './utils/logger.js';
import { spawnPowerupBehindPlayer } from './gameplay/powerupSpawner.js';
import { createSoundSettingsUI } from './ui/soundSettings.js';

export function setupEventListeners(player, scene, camera,renderer) {
// Setup event listeners
document.addEventListener('keydown', (event) => {
        gameState.keys[event.key.toLowerCase()] = true;
        
        // Debug key to spawn a powerup (P key)
        if (event.key.toLowerCase() === 'p' && gameState.debug) {
            logger.debug('Manual powerup spawn triggered');
            spawnPowerupBehindPlayer(scene, gameState, player);
        }
        
        // Toggle sound settings with M key
        if (event.key.toLowerCase() === 'm') {
            createSoundSettingsUI();
        }
    });

    document.addEventListener('keyup', (event) => {
        gameState.keys[event.key.toLowerCase()] = false;
    });

    document.addEventListener('mousemove', (event) => {
        // Calculate normalized device coordinates (-1 to +1)
        gameState.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        gameState.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    });

    document.addEventListener('mousedown', () => {
        gameState.mouseDown = true;
    });

    document.addEventListener('mouseup', () => {
        gameState.mouseDown = false;
    });

    // Handle window resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}