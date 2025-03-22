/**
 * Device Detection Module - Detects device types and capabilities
 * 
 * This module provides utilities for detecting device types (mobile, tablet, desktop),
 * checking for touch support, and determining screen characteristics. These checks help
 * the game adapt its controls and UI for different device types.
 * 
 * Example usage:
 * import { isMobileDevice, isTouchDevice, getDeviceInfo } from './utils/deviceDetection.js';
 * 
 * if (isMobileDevice()) {
 *   // Enable mobile-specific controls
 * }
 * 
 * if (isTouchDevice()) {
 *   // Initialize touch controls
 * }
 * 
 * const deviceInfo = getDeviceInfo();
 * console.log(`Device type: ${deviceInfo.type}, Screen width: ${deviceInfo.screenWidth}`);
 */

import { logger } from './logger.js';

/**
 * Detects if the current device is a mobile device based on user agent
 * @returns {boolean} True if the device is mobile
 */
export const isMobileDevice = () => {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    
    // Primary check: user agent string
    const isMobile = mobileRegex.test(userAgent);
    
    // Secondary check: screen size (most mobile devices are less than 1024px wide)
    const isSmallScreen = window.innerWidth < 1024;
    
    // Log the detection for debugging
    logger.debug('device', `Mobile detection: UserAgent=${isMobile}, ScreenSize=${isSmallScreen}`);
    
    return isMobile;
};

/**
 * Detects if the device supports touch events
 * @returns {boolean} True if the device supports touch
 */
export const isTouchDevice = () => {
    // Check for touch API support
    const hasTouchAPI = 'ontouchstart' in window || 
                     navigator.maxTouchPoints > 0 ||
                     navigator.msMaxTouchPoints > 0;
                     
    // Additional check: some devices report touch support but are actually desktop
    // If a mouse pointer is detected, it's likely a desktop even with touch support
    const hasCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
    
    logger.debug('device', `Touch detection: TouchAPI=${hasTouchAPI}, CoarsePointer=${hasCoarsePointer}`);
    
    return hasTouchAPI && hasCoarsePointer;
};

/**
 * Gets device orientation (portrait or landscape)
 * @returns {string} 'portrait' or 'landscape'
 */
export const getDeviceOrientation = () => {
    return window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
};

/**
 * Gets comprehensive device information
 * @returns {Object} Device information including type, orientation, and screen dimensions
 */
export const getDeviceInfo = () => {
    const mobile = isMobileDevice();
    const touch = isTouchDevice();
    const orientation = getDeviceOrientation();
    
    // Determine device type based on screen size and capabilities
    let deviceType = 'desktop';
    
    if (mobile) {
        // Further distinguish between phone and tablet based on screen size
        deviceType = window.innerWidth < 768 ? 'phone' : 'tablet';
    }
    
    const info = {
        type: deviceType,
        isMobile: mobile,
        isTouch: touch,
        orientation: orientation,
        screenWidth: window.innerWidth,
        screenHeight: window.innerHeight,
        pixelRatio: window.devicePixelRatio || 1,
        userAgent: navigator.userAgent
    };
    
    logger.debug('device', 'Device info:', info);
    
    return info;
};

/**
 * Adds device detection information to body data attributes for CSS targeting
 */
export const applyDeviceClasses = () => {
    const deviceInfo = getDeviceInfo();
    
    // Add data attributes to body for CSS targeting
    document.body.setAttribute('data-device-type', deviceInfo.type);
    document.body.setAttribute('data-orientation', deviceInfo.orientation);
    
    if (deviceInfo.isMobile) {
        document.body.classList.add('mobile-device');
    }
    
    if (deviceInfo.isTouch) {
        document.body.classList.add('touch-device');
    }
    
    logger.info('device', `Applied device classes: ${deviceInfo.type}, ${deviceInfo.orientation}`);
};

// Add an event listener for orientation changes
window.addEventListener('resize', () => {
    // Update orientation class when the window is resized
    const orientation = getDeviceOrientation();
    document.body.setAttribute('data-orientation', orientation);
    
    logger.debug('device', `Orientation changed to ${orientation}`);
});

// Initialize device detection when module loads
applyDeviceClasses(); 