/**
 * safeAccess.js
 * 
 * Utility functions for safely accessing properties of objects that might be null or undefined.
 * Helps prevent "Cannot read property 'x' of null/undefined" errors.
 * 
 * Example usage:
 * import { safeGet, safeCall } from './utils/safeAccess.js';
 * 
 * // Instead of: zombie.mesh.scale.set(1, 1, 1);
 * // Use: safeCall(zombie, 'mesh.scale.set', [1, 1, 1]);
 * 
 * // Instead of: const health = zombie.userData.health;
 * // Use: const health = safeGet(zombie, 'userData.health', 100); // 100 is default value
 */

/**
 * Safely get a nested property from an object without throwing errors
 * @param {Object} obj - The object to get property from
 * @param {string} path - The property path (e.g. 'user.address.street')
 * @param {*} defaultValue - Default value to return if path doesn't exist
 * @returns {*} The property value or defaultValue if not found
 */
export const safeGet = (obj, path, defaultValue = null) => {
    if (obj === null || obj === undefined) {
        return defaultValue;
    }
    
    const parts = path.split('.');
    let current = obj;
    
    for (let i = 0; i < parts.length; i++) {
        if (current === null || current === undefined) {
            return defaultValue;
        }
        
        current = current[parts[i]];
    }
    
    return current !== undefined ? current : defaultValue;
};

/**
 * Safely call a method on an object that might be null
 * @param {Object} obj - The object to call method on
 * @param {string} path - The method path (e.g. 'mesh.scale.set')
 * @param {Array} args - Arguments to pass to the method
 * @param {*} defaultValue - Default value to return if path doesn't exist
 * @returns {*} The method return value or defaultValue if not callable
 */
export const safeCall = (obj, path, args = [], defaultValue = null) => {
    if (obj === null || obj === undefined) {
        return defaultValue;
    }
    
    const parts = path.split('.');
    const methodName = parts.pop(); // Get last part as method name
    
    // Navigate to the parent object of the method
    let parent = obj;
    for (let i = 0; i < parts.length; i++) {
        if (parent === null || parent === undefined) {
            return defaultValue;
        }
        
        parent = parent[parts[i]];
    }
    
    // Call method if parent exists and method is callable
    if (parent && typeof parent[methodName] === 'function') {
        return parent[methodName](...args);
    }
    
    return defaultValue;
};

/**
 * Safely executes a callback function for each element in an array
 * @param {Array} arr - The array to iterate
 * @param {Function} callback - The callback to execute for each element
 * @returns {void}
 */
export const safeForEach = (arr, callback) => {
    if (!Array.isArray(arr)) return;
    
    arr.forEach((item, index) => {
        try {
            callback(item, index, arr);
        } catch (error) {
            console.error('Error in forEach callback:', error);
        }
    });
};

/**
 * Creates a proxy around an object to automatically handle null checks on property access
 * @param {Object} obj - The object to wrap
 * @returns {Proxy} A proxy that safely handles property access
 */
export const createSafeProxy = (obj) => {
    if (obj === null || obj === undefined) {
        return new Proxy({}, {
            get: () => createSafeProxy(null)
        });
    }
    
    return new Proxy(obj, {
        get: (target, prop) => {
            const value = target[prop];
            
            // Handle functions
            if (typeof value === 'function') {
                return (...args) => {
                    try {
                        return createSafeProxy(value.apply(target, args));
                    } catch (e) {
                        console.warn(`Safe proxy: Error calling ${String(prop)}`, e);
                        return createSafeProxy(null);
                    }
                };
            }
            
            // Handle properties
            return createSafeProxy(value);
        }
    });
}; 