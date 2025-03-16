/**
 * Menu System Module - Provides a centralized menu management system
 * 
 * This module provides a flexible menu system for the game that can handle multiple
 * sub-menus, such as controls, settings, audio, etc. The main menu controller manages
 * the creation, display, and toggling of various menu components.
 * 
 * Example usage:
 * import { initMenuSystem, addSubMenu, toggleMenu } from './ui/menu.js';
 * 
 * // Initialize the menu system
 * initMenuSystem();
 * 
 * // Add a sub-menu from another module
 * import { createControlsMenu } from './ui/controlsMenu.js';
 * addSubMenu('controls', 'Controls', createControlsMenu());
 */

// Store references to menu elements
const menuSystem = {
    container: null,
    mainButton: null,
    menuList: null,
    subMenus: new Map(),
    isMenuOpen: false
};

/**
 * Initializes the menu system
 * @returns {HTMLElement} The main menu container
 */
export function initMenuSystem() {
    // Create main container for all menus
    menuSystem.container = document.createElement('div');
    menuSystem.container.id = 'menu-system';
    
    // Create settings button
    menuSystem.mainButton = document.createElement('button');
    menuSystem.mainButton.id = 'settings-button';
    menuSystem.mainButton.innerHTML = '⚙️';
    
    // Apply styling to main button
    Object.assign(menuSystem.mainButton.style, {
        position: 'absolute',
        top: '10px',
        right: '10px',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        padding: '8px 12px',
        fontSize: '18px',
        cursor: 'pointer',
        zIndex: '1000'
    });
    
    // Create menu list container (hidden by default)
    menuSystem.menuList = document.createElement('div');
    menuSystem.menuList.id = 'menu-list';
    Object.assign(menuSystem.menuList.style, {
        position: 'absolute',
        top: '50px',
        right: '10px',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        color: 'white',
        padding: '10px',
        borderRadius: '5px',
        display: 'none',
        zIndex: '999'
    });
    
    // Add click event to toggle menu
    menuSystem.mainButton.addEventListener('click', toggleMainMenu);
    
    // Add elements to DOM
    document.body.appendChild(menuSystem.mainButton);
    document.body.appendChild(menuSystem.menuList);
    document.body.appendChild(menuSystem.container);
    
    return menuSystem.container;
}

/**
 * Adds a sub-menu to the menu system
 * @param {string} id - Unique identifier for the sub-menu
 * @param {string} label - Display name for the menu item
 * @param {HTMLElement} element - The sub-menu element to add
 * @param {boolean} visible - Whether the sub-menu should be initially visible
 * @returns {HTMLElement} The added sub-menu element
 */
export function addSubMenu(id, label = id, element, visible = false) {
    // Add close button to the element if it doesn't have one
    addCloseButton(element, id);
    
    // Store the sub-menu in our map
    menuSystem.subMenus.set(id, {
        id,
        label,
        element,
        visible
    });
    
    // Set initial visibility
    element.style.display = visible ? 'block' : 'none';
    
    // Add to the DOM if it's not already there
    if (!element.parentNode) {
        document.body.appendChild(element);
    }
    
    // Update the menu list with the new item
    updateMenuList();
    
    return element;
}

/**
 * Adds a close button to a sub-menu element
 * @param {HTMLElement} element - The element to add a close button to
 * @param {string} menuId - The ID of the sub-menu
 */
function addCloseButton(element, menuId) {
    // Only add if position is set to allow absolute positioning for the button
    if (element.style.position !== 'absolute' && element.style.position !== 'relative') {
        element.style.position = 'relative';
    }
    
    // Check if element already has a close button
    const existingButton = element.querySelector('.menu-close-button');
    if (existingButton) return;
    
    // Create close button
    const closeButton = document.createElement('button');
    closeButton.className = 'menu-close-button';
    closeButton.innerHTML = '×'; // × is the multiplication sign, looks like an X
    
    // Style the close button
    Object.assign(closeButton.style, {
        position: 'absolute',
        top: '10px',
        right: '10px',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        color: 'white',
        border: 'none',
        borderRadius: '50%',
        width: '24px',
        height: '24px',
        fontSize: '16px',
        lineHeight: '1',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0',
        fontWeight: 'bold',
        transition: 'background-color 0.2s'
    });
    
    // Add hover effect
    closeButton.addEventListener('mouseover', () => {
        closeButton.style.backgroundColor = 'rgba(255, 255, 255, 0.4)';
    });
    
    closeButton.addEventListener('mouseout', () => {
        closeButton.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
    });
    
    // Add click handler to close just this menu
    closeButton.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent the click from affecting the menu item
        setSubMenuVisibility(menuId, false);
    });
    
    // Add the close button to the element
    element.appendChild(closeButton);
}

/**
 * Updates the menu list items based on registered sub-menus
 */
function updateMenuList() {
    // Clear existing items
    menuSystem.menuList.innerHTML = '';
    
    // Create an unordered list
    const ul = document.createElement('ul');
    Object.assign(ul.style, {
        listStyle: 'none',
        padding: '0',
        margin: '0'
    });
    
    // Add items for each sub-menu
    menuSystem.subMenus.forEach((subMenu, id) => {
        const li = document.createElement('li');
        li.textContent = subMenu.label;
        Object.assign(li.style, {
            padding: '8px 12px',
            margin: '5px 0',
            backgroundColor: 'rgba(80, 80, 80, 0.5)',
            borderRadius: '3px',
            cursor: 'pointer',
            transition: 'background-color 0.2s'
        });
        
        // Highlight if visible
        if (subMenu.visible) {
            li.style.backgroundColor = 'rgba(100, 150, 200, 0.7)';
        }
        
        // Add hover effect
        li.addEventListener('mouseover', () => {
            li.style.backgroundColor = subMenu.visible ? 
                'rgba(120, 170, 220, 0.7)' : 
                'rgba(100, 100, 100, 0.7)';
        });
        
        li.addEventListener('mouseout', () => {
            li.style.backgroundColor = subMenu.visible ? 
                'rgba(100, 150, 200, 0.7)' : 
                'rgba(80, 80, 80, 0.5)';
        });
        
        // Add click handler
        li.addEventListener('click', () => {
            // Hide all sub-menus
            menuSystem.subMenus.forEach((menu) => {
                menu.visible = false;
                menu.element.style.display = 'none';
            });
            
            // Show selected sub-menu
            subMenu.visible = true;
            subMenu.element.style.display = 'block';
            
            // Update menu list to reflect changes
            updateMenuList();
        });
        
        ul.appendChild(li);
    });
    
    menuSystem.menuList.appendChild(ul);
}

/**
 * Gets a sub-menu by its ID
 * @param {string} id - The ID of the sub-menu to get
 * @returns {HTMLElement|null} The sub-menu element or null if not found
 */
export function getSubMenu(id) {
    const subMenu = menuSystem.subMenus.get(id);
    return subMenu ? subMenu.element : null;
}

/**
 * Toggles visibility of a specific sub-menu
 * @param {string} id - The ID of the sub-menu to toggle
 * @returns {boolean} The new visibility state
 */
export function toggleSubMenu(id) {
    const subMenu = menuSystem.subMenus.get(id);
    if (!subMenu) return false;
    
    // Hide all other sub-menus
    menuSystem.subMenus.forEach((menu, menuId) => {
        if (menuId !== id) {
            menu.visible = false;
            menu.element.style.display = 'none';
        }
    });
    
    // Toggle this sub-menu
    const newVisibility = !subMenu.visible;
    subMenu.visible = newVisibility;
    subMenu.element.style.display = newVisibility ? 'block' : 'none';
    
    // Update menu list to reflect changes
    updateMenuList();
    
    return newVisibility;
}

/**
 * Sets visibility of a specific sub-menu
 * @param {string} id - The ID of the sub-menu to update
 * @param {boolean} visible - Whether the sub-menu should be visible
 */
export function setSubMenuVisibility(id, visible) {
    const subMenu = menuSystem.subMenus.get(id);
    if (!subMenu) return;
    
    // Hide all other sub-menus if showing this one
    if (visible) {
        menuSystem.subMenus.forEach((menu, menuId) => {
            if (menuId !== id) {
                menu.visible = false;
                menu.element.style.display = 'none';
            }
        });
    }
    
    subMenu.visible = visible;
    subMenu.element.style.display = visible ? 'block' : 'none';
    
    // Update menu list to reflect changes
    updateMenuList();
}

/**
 * Toggles the main menu open/closed state
 * Shows/hides the menu list with available sub-menus
 */
function toggleMainMenu() {
    menuSystem.isMenuOpen = !menuSystem.isMenuOpen;
    
    // Toggle the menu list visibility
    menuSystem.menuList.style.display = menuSystem.isMenuOpen ? 'block' : 'none';
    
    // If closing the menu, also hide all sub-menus
    if (!menuSystem.isMenuOpen) {
        menuSystem.subMenus.forEach((subMenu) => {
            subMenu.visible = false;
            subMenu.element.style.display = 'none';
        });
        
        // Update menu list for next time it's opened
        updateMenuList();
    }
}

/**
 * Returns the menu system's state
 * @returns {Object} The current state of the menu system
 */
export function getMenuSystemState() {
    return {
        isOpen: menuSystem.isMenuOpen,
        subMenus: Array.from(menuSystem.subMenus.entries()).map(([id, menu]) => ({
            id,
            label: menu.label,
            visible: menu.visible
        }))
    };
} 