/**
 * Controls Menu Module - Handles display of game controls
 * 
 * This module provides functionality for creating and managing the game controls
 * information panel. It generates DOM elements for displaying control instructions.
 * 
 * Example usage:
 * import { createControlsMenu, toggleControlsMenu } from './ui/controlsMenu.js';
 * 
 * // Create controls menu
 * const controlsElement = createControlsMenu();
 * document.body.appendChild(controlsElement);
 * 
 * // Toggle visibility
 * toggleControlsMenu();
 */

// Store reference to the controls menu element
let controlsMenuElement = null;
let controlsMenuVisibleState = false;

/**
 * Creates the controls menu DOM element
 * @returns {HTMLElement} The controls menu container element
 */
export function createControlsMenu() {
    // Create menu container
    controlsMenuElement = document.createElement('div');
    controlsMenuElement.id = 'controls-menu';
    controlsMenuElement.className = 'menu-panel';
    
    // Add control instructions
    controlsMenuElement.innerHTML = `
        <div style="margin-top: 10px;">WASD: Move (slower when moving south)</div>
        <div>Mouse: Aim weapon</div>
        <div>Hold Left Mouse Button: Continuous fire</div>
    `;
    
    // Apply styling
    Object.assign(controlsMenuElement.style, {
        position: 'absolute',
        bottom: '10px',
        left: '10px',
        color: 'white',
        fontSize: '14px',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        padding: '10px',
        borderRadius: '5px',
        zIndex: '100',
        display: 'none', // Initially hidden
        minWidth: '200px'
    });
    
    return controlsMenuElement;
}

/**
 * Toggles the visibility of the controls menu
 * @returns {boolean} The new visibility state
 */
export function toggleControlsMenu() {
    if (!controlsMenuElement) return false;
    
    controlsMenuVisibleState = !controlsMenuVisibleState;
    controlsMenuElement.style.display = controlsMenuVisibleState ? 'block' : 'none';
    
    return controlsMenuVisibleState;
}

/**
 * Sets the visibility of the controls menu
 * @param {boolean} visible - Whether the menu should be visible
 */
export function setControlsMenuVisibility(visible) {
    if (!controlsMenuElement) return;
    
    controlsMenuVisibleState = visible;
    controlsMenuElement.style.display = visible ? 'block' : 'none';
}

/**
 * Returns whether the controls menu is currently visible
 * @returns {boolean} Whether the menu is visible
 */
export function isControlsMenuVisible() {
    return controlsMenuVisibleState;
}

/**
 * Updates the content of the controls menu
 * @param {string} html - New HTML content for the menu
 */
export function updateControlsMenuContent(html) {
    if (!controlsMenuElement) return;
    
    controlsMenuElement.innerHTML = html;
} 