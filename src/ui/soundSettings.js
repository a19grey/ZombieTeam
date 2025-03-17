/**
 * Sound Settings UI Module
 * 
 * This module provides a user interface for controlling game audio settings,
 * including music volume, sound effects volume, and mute toggle.
 * 
 * Example usage:
 * import { createSoundSettingsUI } from './ui/soundSettings.js';
 * 
 * // Create and show the sound settings UI
 * createSoundSettingsUI();
 */

import { setMasterVolume, toggleMute, getAudioState, setMusicVolume, setSfxVolume, setAudioEnabled, setRandomMusicEnabled } from '../gameplay/audio.js';
import { showMessage } from './ui.js';

let soundSettingsElement = null;
let isSoundSettingsVisibleState = false;

/**
 * Creates the sound settings UI
 * @returns {HTMLElement} The sound settings container element
 */
export function createSoundSettingsUI() {
    // Skip creation if it already exists
    if (soundSettingsElement) return soundSettingsElement;
    
    // Create container
    soundSettingsElement = document.createElement('div');
    soundSettingsElement.id = 'sound-settings';
    soundSettingsElement.className = 'menu-panel';
    
    // Apply basic styling
    Object.assign(soundSettingsElement.style, {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        color: 'white',
        padding: '20px',
        borderRadius: '10px',
        zIndex: '100',
        display: 'none', // Initially hidden
        width: '300px'
    });
    
    // Add title - with margin on the right to make room for the close button
    const title = document.createElement('h2');
    title.textContent = 'Sound Settings';
    Object.assign(title.style, {
        margin: '0 0 15px 0',
        textAlign: 'center',
        paddingRight: '20px' // Space for close button
    });
    soundSettingsElement.appendChild(title);
    
    // Get current audio state
    const audioState = getAudioState ? getAudioState() : { musicVolume: 0.7, sfxVolume: 0.8, muted: false };
    
    // Add music volume control
    addVolumeControl(
        soundSettingsElement, 
        'Music Volume', 
        'music-volume', 
        audioState.musicVolume || 0.7,
        (value) => {
            if (setMusicVolume) {
                setMusicVolume(value);
                showFeedback('Music volume updated');
            } else {
                console.log('Music volume changed:', value);
            }
        }
    );
    
    // Add sound effects volume control
    addVolumeControl(
        soundSettingsElement, 
        'Sound Effects', 
        'sfx-volume', 
        audioState.sfxVolume || 0.8,
        (value) => {
            if (setSfxVolume) {
                setSfxVolume(value);
                showFeedback('Sound effects volume updated');
            } else {
                console.log('SFX volume changed:', value);
            }
        }
    );
    
    // Add mute toggle
    const muteContainer = document.createElement('div');
    muteContainer.style.marginTop = '15px';
    
    const muteLabel = document.createElement('label');
    muteLabel.setAttribute('for', 'mute-toggle');
    muteLabel.textContent = 'Mute All Audio';
    muteLabel.style.marginRight = '10px';
    
    const muteToggle = document.createElement('input');
    muteToggle.type = 'checkbox';
    muteToggle.id = 'mute-toggle';
    muteToggle.checked = audioState.muted || false;
    
    // Add mute toggle handler
    muteToggle.addEventListener('change', (e) => {
        const isMuted = e.target.checked;
        if (toggleMute) {
            toggleMute();
            showFeedback(isMuted ? 'Audio muted' : 'Audio unmuted');
        } else {
            console.log('Mute toggled:', isMuted);
        }
    });
    
    muteContainer.appendChild(muteLabel);
    muteContainer.appendChild(muteToggle);
    soundSettingsElement.appendChild(muteContainer);
    
    // Add random music toggle
    const randomMusicContainer = document.createElement('div');
    randomMusicContainer.style.marginTop = '15px';
    
    const randomMusicLabel = document.createElement('label');
    randomMusicLabel.setAttribute('for', 'random-music-toggle');
    randomMusicLabel.textContent = 'Random Music Playback';
    randomMusicLabel.style.marginRight = '10px';
    
    const randomMusicToggle = document.createElement('input');
    randomMusicToggle.type = 'checkbox';
    randomMusicToggle.id = 'random-music-toggle';
    randomMusicToggle.checked = true; // Default to enabled
    
    // Add random music toggle handler
    randomMusicToggle.addEventListener('change', (e) => {
        const isEnabled = e.target.checked;
        if (setRandomMusicEnabled) {
            setRandomMusicEnabled(isEnabled);
            showFeedback(isEnabled ? 'Random music enabled' : 'Random music disabled');
        } else {
            console.log('Random music toggled:', isEnabled);
        }
    });
    
    randomMusicContainer.appendChild(randomMusicLabel);
    randomMusicContainer.appendChild(randomMusicToggle);
    soundSettingsElement.appendChild(randomMusicContainer);
    
    // Add status text for feedback
    const statusText = document.createElement('div');
    statusText.id = 'sound-settings-status';
    Object.assign(statusText.style, {
        textAlign: 'center',
        marginTop: '20px',
        fontSize: '14px',
        color: '#4CAF50',
        height: '20px'
    });
    soundSettingsElement.appendChild(statusText);
    
    return soundSettingsElement;
}

/**
 * Shows temporary feedback message in the settings panel
 * @param {string} message - Message to display
 */
function showFeedback(message) {
    const statusElement = document.getElementById('sound-settings-status');
    if (!statusElement) return;
    
    statusElement.textContent = message;
    statusElement.style.opacity = '1';
    
    // Clear after 2 seconds
    setTimeout(() => {
        statusElement.style.opacity = '0';
        setTimeout(() => {
            statusElement.textContent = '';
        }, 300);
    }, 1500);
    
    // Also show in the main game UI if the function is available
    if (showMessage) {
        showMessage(message, 1500);
    }
}

/**
 * Helper function to create a volume slider control
 * @param {HTMLElement} parent - The parent element to append to
 * @param {string} label - Label text for the control
 * @param {string} id - ID for the input element
 * @param {number} defaultValue - Default value for the slider
 * @param {Function} onChange - Callback function when value changes
 */
function addVolumeControl(parent, label, id, defaultValue = 0.5, onChange = null) {
    const container = document.createElement('div');
    container.style.marginBottom = '15px';
    
    const labelElement = document.createElement('label');
    labelElement.setAttribute('for', id);
    labelElement.textContent = label;
    labelElement.style.display = 'block';
    labelElement.style.marginBottom = '5px';
    
    const sliderContainer = document.createElement('div');
    sliderContainer.style.display = 'flex';
    sliderContainer.style.alignItems = 'center';
    
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '0';
    slider.max = '1';
    slider.step = '0.01';
    slider.value = defaultValue.toString();
    slider.id = id;
    slider.style.flex = '1';
    
    const valueDisplay = document.createElement('span');
    valueDisplay.textContent = Math.round(defaultValue * 100) + '%';
    valueDisplay.style.marginLeft = '10px';
    valueDisplay.style.width = '40px';
    
    // Update value display and call onChange when slider changes
    slider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        valueDisplay.textContent = Math.round(value * 100) + '%';
        
        // Apply changes immediately
        if (onChange) {
            onChange(value);
        }
    });
    
    sliderContainer.appendChild(slider);
    sliderContainer.appendChild(valueDisplay);
    
    container.appendChild(labelElement);
    container.appendChild(sliderContainer);
    
    parent.appendChild(container);
}

/**
 * Toggles visibility of the sound settings panel
 * @returns {boolean} The new visibility state
 */
export function toggleSoundSettingsUI() {
    if (!soundSettingsElement) {
        createSoundSettingsUI();
    }
    
    isSoundSettingsVisibleState = !isSoundSettingsVisibleState;
    soundSettingsElement.style.display = isSoundSettingsVisibleState ? 'block' : 'none';
    
    return isSoundSettingsVisibleState;
}

/**
 * Sets visibility of the sound settings panel
 * @param {boolean} visible - Whether the panel should be visible
 */
export function setSoundSettingsVisibility(visible) {
    if (!soundSettingsElement) {
        createSoundSettingsUI();
    }
    
    isSoundSettingsVisibleState = visible;
    soundSettingsElement.style.display = visible ? 'block' : 'none';
}

/**
 * Checks if the sound settings panel is currently visible
 * @returns {boolean} Whether the panel is visible
 */
export function isSoundSettingsVisible() {
    return isSoundSettingsVisibleState;
} 