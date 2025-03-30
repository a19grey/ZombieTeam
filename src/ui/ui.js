/**
 * UI Module - Handles user interface updates
 * 
 * This module contains functions for updating the UI elements
 * that display player stats like health and score.
 * 
 * Example usage:
 * import { updateUI, showMessage } from './ui/ui.js';
 * updateUI(gameState);
 * showMessage("Game Over!", 3000);
 */

/**
 * Initializes the UI elements
 * Called once at the start of the game
 * @param {Object} gameState - The initial game state
 */
export const initUI = (gameState) => {
    // Create UI container if it doesn't exist
    let uiContainer = document.getElementById('ui-container');
    if (!uiContainer) {
        uiContainer = document.createElement('div');
        uiContainer.id = 'ui-container';
        uiContainer.style.position = 'absolute';
        uiContainer.style.top = '10px';
        uiContainer.style.left = '10px';
        uiContainer.style.color = 'white';
        uiContainer.style.fontFamily = 'Arial, sans-serif';
        uiContainer.style.fontSize = '16px';
        uiContainer.style.zIndex = '100';
        document.body.appendChild(uiContainer);
        
        // Health is now displayed as a halo above the player's head
        // No need for health display elements in the UI
        
        // Create score display
        const scoreElement = document.createElement('div');
        scoreElement.id = 'score';
        scoreElement.style.fontSize = '20px';
        scoreElement.style.fontWeight = 'bold';
        scoreElement.style.marginBottom = '10px';
        uiContainer.appendChild(scoreElement);
        
        // Create zombie count display
        const zombieCountElement = document.createElement('div');
        zombieCountElement.id = 'zombieCount';
        uiContainer.appendChild(zombieCountElement);
        
        // Create powerup display
        const powerupElement = document.createElement('div');
        powerupElement.id = 'powerup';
        powerupElement.style.marginBottom = '5px';
        uiContainer.appendChild(powerupElement);
        
        // Create powerup bar container
        const powerupBarContainer = document.createElement('div');
        powerupBarContainer.id = 'powerup-bar-container';
        powerupBarContainer.style.width = '200px';
        powerupBarContainer.style.height = '10px';
        powerupBarContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        powerupBarContainer.style.border = '1px solid white';
        powerupBarContainer.style.marginTop = '5px';
        powerupBarContainer.style.marginBottom = '10px';
        powerupBarContainer.style.display = 'none'; // Hidden by default
        uiContainer.appendChild(powerupBarContainer);
        
        // Create powerup bar
        const powerupBar = document.createElement('div');
        powerupBar.id = 'powerup-bar';
        powerupBar.style.width = '100%';
        powerupBar.style.height = '100%';
        powerupBar.style.backgroundColor = 'blue';
        powerupBarContainer.appendChild(powerupBar);
        
        // Show welcome message
        showMessage("Survive the zombie horde!", 3000);
    }
};

/**
 * Updates the UI elements with the current game state
 * @param {Object} gameState - The current game state
 */
export const updateUI = (gameState) => {
    // Initialize UI if it doesn't exist
    if (!document.getElementById('ui-container')) {
        initUI(gameState);
    }
    
    const { player } = gameState;
    
    // Health is now displayed as a halo above the player's head
    // No need to update health display elements in the UI
    
    // Update score display
    const scoreElement = document.getElementById('score');
    if (scoreElement) {
        scoreElement.textContent = `Score: ${gameState.score}`;
    }
    
    // Update zombie count
    const zombieCountElement = document.getElementById('zombieCount');
    if (zombieCountElement && gameState.zombies) {
        zombieCountElement.textContent = `Enemies: ${gameState.zombies.length}`;
        
        // Check if we're in development mode
        const DEBUG_MODE = window.NODE_ENV === 'development';
        
        // Only show enemy breakdown in development mode
        if (DEBUG_MODE) {
            // Count enemy types
            const enemyCounts = gameState.zombies.reduce((counts, zombie) => {
                const type = zombie.type || 'zombie';
                counts[type] = (counts[type] || 0) + 1;
                return counts;
            }, {});
            
        }
    }
    
    // Update powerup display
    const powerupElement = document.getElementById('powerup');
    const powerupBarContainer = document.getElementById('powerup-bar-container');
    const powerupBar = document.getElementById('powerup-bar');
    
    if (powerupElement && powerupBarContainer && powerupBar) {
        if (player.activePowerup) {
            // Format the powerup name for display
            const formattedName = player.activePowerup
                .replace(/([A-Z])/g, ' $1') // Add space before capital letters
                .replace(/^./, str => str.toUpperCase()); // Capitalize first letter
            
            powerupElement.textContent = `Active Powerup: ${formattedName}`;
            powerupElement.style.color = getPowerupColor(player.activePowerup);
            
            // Hide powerup duration bar (using circle under player instead)
            powerupBarContainer.style.display = 'none';
        } else {
            powerupElement.textContent = 'No Active Powerup';
            powerupElement.style.color = 'white';
            powerupBarContainer.style.display = 'none';
        }
    }
};

/**
 * Gets the color associated with a powerup type
 * @param {string} powerupType - The type of powerup
 * @returns {string} The color as a hex string
 */
const getPowerupColor = (powerupType) => {
    switch (powerupType) {
        case 'tripleShot':
            return '#ffa500'; // Orange
        case 'shotgunBlast':
            return '#4682b4'; // Steel blue
        case 'explosion':
            return '#ff0000'; // Red
        default:
            return '#ffffff'; // White
    }
};

/**
 * Displays a message on screen (disabled as per user request)
 * @param {string} message - The message to display
 * @param {number} duration - How long to display the message (milliseconds), 0 for permanent
 */
export const showMessage = (message, duration = 3000) => {
    // No-op: Messages disabled as per user request
    return;
}; 