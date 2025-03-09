/**
 * UI Module - Handles user interface updates
 * 
 * This module contains functions for updating the UI elements
 * that display player stats like health and EXP.
 * 
 * Example usage:
 * import { updateUI, showMessage } from './ui/ui.js';
 * updateUI(gameState);
 * showMessage("Game Over!", 3000);
 */

/**
 * Initializes the UI elements
 * Called once at the start of the game
 */
export const initUI = () => {
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
        
        // Create health display
        const healthElement = document.createElement('div');
        healthElement.id = 'health';
        uiContainer.appendChild(healthElement);
        
        // Create health bar container
        const healthBarContainer = document.createElement('div');
        healthBarContainer.id = 'health-bar-container';
        healthBarContainer.style.width = '200px';
        healthBarContainer.style.height = '15px';
        healthBarContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        healthBarContainer.style.border = '1px solid white';
        healthBarContainer.style.marginTop = '5px';
        healthBarContainer.style.marginBottom = '10px';
        uiContainer.appendChild(healthBarContainer);
        
        // Create health bar
        const healthBar = document.createElement('div');
        healthBar.id = 'health-bar';
        healthBar.style.width = '100%';
        healthBar.style.height = '100%';
        healthBar.style.backgroundColor = 'green';
        healthBar.style.transition = 'width 0.3s, background-color 0.3s';
        healthBarContainer.appendChild(healthBar);
        
        // Create EXP display
        const expElement = document.createElement('div');
        expElement.id = 'exp';
        uiContainer.appendChild(expElement);
        
        // Create zombie count display
        const zombieCountElement = document.createElement('div');
        zombieCountElement.id = 'zombieCount';
        uiContainer.appendChild(zombieCountElement);
    }
};

/**
 * Updates the UI elements with the current game state
 * @param {Object} gameState - The current game state
 */
export const updateUI = (gameState) => {
    // Initialize UI if it doesn't exist
    if (!document.getElementById('ui-container')) {
        initUI();
    }
    
    const { player } = gameState;
    
    // Update health display
    const healthElement = document.getElementById('health');
    if (healthElement) {
        healthElement.textContent = `Health: ${Math.floor(player.health)}`;
        
        // Change color based on health
        if (player.health < 30) {
            healthElement.style.color = 'red';
        } else if (player.health < 70) {
            healthElement.style.color = 'yellow';
        } else {
            healthElement.style.color = 'white';
        }
    }
    
    // Update health bar
    const healthBar = document.getElementById('health-bar');
    if (healthBar) {
        const healthPercent = Math.max(0, Math.min(100, player.health));
        healthBar.style.width = `${healthPercent}%`;
        
        // Change color based on health
        if (healthPercent < 30) {
            healthBar.style.backgroundColor = 'red';
        } else if (healthPercent < 70) {
            healthBar.style.backgroundColor = 'yellow';
        } else {
            healthBar.style.backgroundColor = 'green';
        }
    }
    
    // Update EXP display
    const expElement = document.getElementById('exp');
    if (expElement) {
        expElement.textContent = `EXP: ${player.exp}`;
    }
    
    // Update zombie count
    const zombieCountElement = document.getElementById('zombieCount');
    if (zombieCountElement && gameState.zombies) {
        zombieCountElement.textContent = `Zombies: ${gameState.zombies.length}`;
    }
};

/**
 * Displays a message on screen
 * @param {string} message - The message to display
 * @param {number} duration - How long to display the message (milliseconds), 0 for permanent
 */
export const showMessage = (message, duration = 3000) => {
    // Create message element if it doesn't exist
    let messageElement = document.getElementById('message');
    if (!messageElement) {
        messageElement = document.createElement('div');
        messageElement.id = 'message';
        messageElement.style.position = 'absolute';
        messageElement.style.top = '50%';
        messageElement.style.left = '50%';
        messageElement.style.transform = 'translate(-50%, -50%)';
        messageElement.style.color = 'white';
        messageElement.style.fontSize = '24px';
        messageElement.style.fontFamily = 'Arial, sans-serif';
        messageElement.style.textAlign = 'center';
        messageElement.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        messageElement.style.padding = '20px';
        messageElement.style.borderRadius = '10px';
        messageElement.style.zIndex = '1000';
        document.body.appendChild(messageElement);
    }
    
    // Set message text
    messageElement.textContent = message;
    messageElement.style.display = 'block';
    
    // Hide message after duration (if not permanent)
    if (duration > 0) {
        setTimeout(() => {
            messageElement.style.display = 'none';
        }, duration);
    }
}; 