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

import { setMasterVolume, toggleMute, getAudioState, setMusicVolume, setSfxVolume } from '../gameplay/audio.js';
import { showMessage } from './ui.js';

let settingsPanel = null;
let isVisible = false;

/**
 * Creates and displays the sound settings UI
 * @returns {HTMLElement} The created settings panel
 */
export const createSoundSettingsUI = () => {
    // If panel already exists, just toggle visibility
    if (settingsPanel) {
        toggleSoundSettingsUI();
        return settingsPanel;
    }
    
    // Create container
    settingsPanel = document.createElement('div');
    settingsPanel.id = 'sound-settings-panel';
    settingsPanel.style.position = 'absolute';
    settingsPanel.style.top = '50%';
    settingsPanel.style.left = '50%';
    settingsPanel.style.transform = 'translate(-50%, -50%)';
    settingsPanel.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
    settingsPanel.style.padding = '20px';
    settingsPanel.style.borderRadius = '10px';
    settingsPanel.style.color = 'white';
    settingsPanel.style.fontFamily = 'Arial, sans-serif';
    settingsPanel.style.zIndex = '2000';
    settingsPanel.style.width = '350px';
    settingsPanel.style.boxShadow = '0 0 20px rgba(0, 0, 0, 0.5)';
    settingsPanel.style.display = 'none'; // Initially hidden
    
    // Add title
    const title = document.createElement('h2');
    title.textContent = 'Sound Settings';
    title.style.margin = '0 0 20px 0';
    title.style.textAlign = 'center';
    title.style.color = '#ff9900';
    settingsPanel.appendChild(title);
    
    // Get current audio state
    const audioState = getAudioState();
    
    // Create sliders
    const sliders = [
        {
            name: 'Music Volume',
            min: 0,
            max: 100,
            value: audioState.musicVolume * 100,
            step: 1,
            onChange: (value) => {
                setMusicVolume(value / 100);
            }
        },
        {
            name: 'Sound Effects Volume',
            min: 0,
            max: 100,
            value: audioState.sfxVolume * 100,
            step: 1,
            onChange: (value) => {
                setSfxVolume(value / 100);
            }
        },
        {
            name: 'Master Volume',
            min: 0,
            max: 100,
            value: audioState.masterVolume * 100,
            step: 1,
            onChange: (value) => {
                setMasterVolume(value / 100);
            }
        }
    ];
    
    // Add sliders to container
    sliders.forEach(slider => {
        const sliderContainer = document.createElement('div');
        sliderContainer.style.marginBottom = '15px';
        
        const label = document.createElement('label');
        label.textContent = `${slider.name}: ${Math.round(slider.value)}%`;
        label.style.display = 'block';
        label.style.marginBottom = '8px';
        label.style.fontWeight = 'bold';
        
        const input = document.createElement('input');
        input.type = 'range';
        input.min = slider.min;
        input.max = slider.max;
        input.value = slider.value;
        input.step = slider.step;
        input.style.width = '100%';
        input.style.height = '20px';
        
        input.addEventListener('input', () => {
            slider.onChange(parseFloat(input.value));
            label.textContent = `${slider.name}: ${Math.round(input.value)}%`;
        });
        
        sliderContainer.appendChild(label);
        sliderContainer.appendChild(input);
        settingsPanel.appendChild(sliderContainer);
    });
    
    // Add mute toggle button
    const muteButton = document.createElement('button');
    muteButton.textContent = audioState.muted ? 'Unmute' : 'Mute All';
    muteButton.style.padding = '10px 20px';
    muteButton.style.backgroundColor = audioState.muted ? '#4CAF50' : '#ff4444';
    muteButton.style.color = 'white';
    muteButton.style.border = 'none';
    muteButton.style.borderRadius = '5px';
    muteButton.style.cursor = 'pointer';
    muteButton.style.width = '100%';
    muteButton.style.marginTop = '10px';
    muteButton.style.fontSize = '16px';
    
    muteButton.addEventListener('click', () => {
        const isMuted = toggleMute();
        muteButton.textContent = isMuted ? 'Unmute' : 'Mute All';
        muteButton.style.backgroundColor = isMuted ? '#4CAF50' : '#ff4444';
        showMessage(isMuted ? 'Audio muted' : 'Audio unmuted', 1000);
    });
    
    settingsPanel.appendChild(muteButton);
    
    // Add close button
    const closeButton = document.createElement('button');
    closeButton.textContent = 'Close';
    closeButton.style.padding = '10px 20px';
    closeButton.style.backgroundColor = '#555555';
    closeButton.style.color = 'white';
    closeButton.style.border = 'none';
    closeButton.style.borderRadius = '5px';
    closeButton.style.cursor = 'pointer';
    closeButton.style.width = '100%';
    closeButton.style.marginTop = '15px';
    closeButton.style.fontSize = '16px';
    
    closeButton.addEventListener('click', () => {
        toggleSoundSettingsUI();
    });
    
    settingsPanel.appendChild(closeButton);
    
    // Add to document
    document.body.appendChild(settingsPanel);
    
    // Show the panel
    toggleSoundSettingsUI();
    
    return settingsPanel;
};

/**
 * Toggles the visibility of the sound settings UI
 */
export const toggleSoundSettingsUI = () => {
    if (!settingsPanel) return;
    
    isVisible = !isVisible;
    settingsPanel.style.display = isVisible ? 'block' : 'none';
};

/**
 * Checks if the sound settings UI is currently visible
 * @returns {boolean} Whether the sound settings UI is visible
 */
export const isSoundSettingsVisible = () => {
    return isVisible;
}; 