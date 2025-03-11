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
        
        // Create EXP display
        const expElement = document.createElement('div');
        expElement.id = 'exp';
        uiContainer.appendChild(expElement);
        
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
        
        // Create enemy type legend
        const legendContainer = document.createElement('div');
        legendContainer.id = 'enemy-legend';
        legendContainer.style.position = 'absolute';
        legendContainer.style.top = '10px';
        legendContainer.style.right = '10px';
        legendContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        legendContainer.style.padding = '10px';
        legendContainer.style.borderRadius = '5px';
        legendContainer.style.color = 'white';
        legendContainer.style.fontFamily = 'Arial, sans-serif';
        legendContainer.style.fontSize = '14px';
        document.body.appendChild(legendContainer);
        
        // Add legend title
        const legendTitle = document.createElement('div');
        legendTitle.textContent = 'Enemy Types:';
        legendTitle.style.fontWeight = 'bold';
        legendTitle.style.marginBottom = '5px';
        legendContainer.appendChild(legendTitle);
        
        // Add enemy types to legend
        const enemyTypes = [
            { name: 'Zombie', color: '#2e8b57' },
            { name: 'Skeleton Archer', color: '#dcdcdc' },
            { name: 'Exploder', color: '#00cc00' },
            { name: 'Zombie King (Boss)', color: '#ffd700' }
        ];
        
        enemyTypes.forEach(enemy => {
            const enemyRow = document.createElement('div');
            enemyRow.style.display = 'flex';
            enemyRow.style.alignItems = 'center';
            enemyRow.style.marginBottom = '3px';
            
            const colorBox = document.createElement('div');
            colorBox.style.width = '12px';
            colorBox.style.height = '12px';
            colorBox.style.backgroundColor = enemy.color;
            colorBox.style.marginRight = '5px';
            
            const nameText = document.createElement('div');
            nameText.textContent = enemy.name;
            
            enemyRow.appendChild(colorBox);
            enemyRow.appendChild(nameText);
            legendContainer.appendChild(enemyRow);
        });
        
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
        
        // Pulse animation when score changes
        if (gameState.score > (gameState.lastDisplayedScore || 0)) {
            scoreElement.style.color = '#ffff00'; // Yellow flash
            setTimeout(() => {
                scoreElement.style.color = 'white';
            }, 300);
            gameState.lastDisplayedScore = gameState.score;
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
        zombieCountElement.textContent = `Enemies: ${gameState.zombies.length}`;
        
        // Count enemy types
        const enemyCounts = gameState.zombies.reduce((counts, zombie) => {
            const type = zombie.type || 'zombie';
            counts[type] = (counts[type] || 0) + 1;
            return counts;
        }, {});
        
        // Add enemy type breakdown
        let enemyBreakdown = '';
        if (enemyCounts.zombie) enemyBreakdown += ` Zombies: ${enemyCounts.zombie}`;
        if (enemyCounts.skeletonArcher) enemyBreakdown += ` Archers: ${enemyCounts.skeletonArcher}`;
        if (enemyCounts.exploder) enemyBreakdown += ` Exploders: ${enemyCounts.exploder}`;
        if (enemyCounts.zombieKing) enemyBreakdown += ` Kings: ${enemyCounts.zombieKing}`;
        
        if (enemyBreakdown) {
            zombieCountElement.textContent += ` (${enemyBreakdown.trim()})`;
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