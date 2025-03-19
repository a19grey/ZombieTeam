/**
 * Logger Module - Provides advanced logging functionality with different levels and categories
 * 
 * This module contains functions for logging messages at different levels with support for
 * categorization, custom log levels, and detailed configuration options. Higher level numbers
 * indicate more detailed logs, allowing for infinite verbosity levels.
 * 
 * Example usage:
 * import { logger } from './utils/logger.js';
 * 
 * // Basic usage
 * logger.debug('Detailed information for debugging');
 * logger.info('General information about game state');
 * logger.warn('Warning that might need attention');
 * logger.error('Error that needs immediate attention');
 * 
 * // With categories/sections
 * logger.info('renderer', 'Initializing WebGL context');
 * logger.debug('physics', 'Collision detected', { objectA: 'player', objectB: 'enemy' });
 * 
 * // Configure logger
 * logger.configure({
 *   level: 5,                           // Show everything up to level 5
 *   sections: ['renderer', 'physics'],  // Only show logs from these sections
 *   includeTimestamp: true,
 *   logToConsole: true
 * });
 * 
 * // Custom log level
 * logger.log(6, 'Super detailed logs', { extraData: 'value' });
 */

// Default log levels (higher number = more verbose/detailed)
const DEFAULT_LOG_LEVELS = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3,
    VERBOSE: 5
};

// Default sections/categories for organizing logs
const DEFAULT_SECTIONS = [
    'renderer',
    'physics',
    'input',
    'network',
    'ai',
    'audio',
    'ui',
    'scene',
    'speed'
];

// Default configuration
let config = {
    level: DEFAULT_LOG_LEVELS.INFO,  // Default to INFO level
    includeTimestamp: true,
    logToConsole: true,
    sections: DEFAULT_SECTIONS,      // All sections enabled by default
    enabledSections: new Set(DEFAULT_SECTIONS)
};

/**
 * Formats a log message with optional timestamp and section
 * @param {string|number} level - The log level or name
 * @param {string} section - The section/category of the log
 * @param {string} message - The message to log
 * @param {Object} data - Additional data to log
 * @returns {string} The formatted log message
 */
const formatLogMessage = (level, section, message, data) => {
    let formattedMessage = '';
    
    // Add timestamp if configured
    if (config.includeTimestamp) {
        const now = new Date();
        formattedMessage += `[${now.toISOString()}] `;
    }
    
    // Add log level
    const levelStr = typeof level === 'string' ? level : `LEVEL-${level}`;
    formattedMessage += `[${levelStr}]`;
    
    // Add section if provided
    if (section) {
        formattedMessage += ` (${section})`;
    }
    
    // Add message
    formattedMessage += `: ${message}`;
    
    // Add data if provided
    if (data !== undefined) {
        try {
            if (typeof data === 'object') {
                formattedMessage += ` ${JSON.stringify(data)}`;
            } else {
                formattedMessage += ` ${data}`;
            }
        } catch (e) {
            formattedMessage += ' [Object could not be stringified]';
        }
    }
    
    return formattedMessage;
};

/**
 * Determines if a log should be shown based on its level and section
 * @param {number} level - The numeric log level
 * @param {string} section - The section/category of the log
 * @returns {boolean} Whether the log should be shown
 */
const shouldLog = (level, section) => {
    // Check if log level is high enough (remember, higher level = more detailed)
    if (level > config.level) {
        return false;
    }
    
    // Check if section is enabled (if a section is provided)
    if (section && !config.enabledSections.has(section)) {
        return false;
    }
    
    return true;
};

/**
 * Logs a message if the current log level and section configuration allows it
 * @param {number} level - The numeric log level
 * @param {string} section - The section/category of the log
 * @param {string} message - The message to log
 * @param {Object} data - Additional data to log
 */
const log = (level, levelName, section, message, data) => {
    // Handle the case where section is omitted and message is in its place
    if (typeof section === 'string' && typeof message === 'undefined') {
        message = section;
        section = null;
    }

    // Skip if we shouldn't log this
    if (!shouldLog(level, section)) {
        return;
    }

    // Skip if console logging is disabled
    if (!config.logToConsole) {
        return;
    }

    const formattedMessage = formatLogMessage(levelName, section, message, data);
    
    // Choose the right console method
    if (level <= DEFAULT_LOG_LEVELS.ERROR) {
        console.error(formattedMessage);
    } else if (level <= DEFAULT_LOG_LEVELS.WARN) {
        console.warn(formattedMessage);
    } else if (level <= DEFAULT_LOG_LEVELS.INFO) {
        console.info(formattedMessage);
    } else {
        console.debug(formattedMessage);
    }
};

/**
 * The logger object with methods for each log level
 */
export const logger = {
    /**
     * Configure the logger
     * @param {Object} newConfig - The new configuration
     * @param {number} newConfig.level - Maximum log level to display
     * @param {boolean} newConfig.includeTimestamp - Whether to include timestamps
     * @param {boolean} newConfig.logToConsole - Whether to log to console
     * @param {Array<string>} newConfig.sections - Array of sections to enable
     */
    configure: (newConfig) => {
        // Apply the new config
        config = { ...config, ...newConfig };
        
        // Update enabled sections if provided
        if (newConfig.sections) {
            config.enabledSections = new Set(newConfig.sections);
        }
    },
    
    /**
     * Get the current log level
     * @returns {number} The current log level
     */
    getLevel: () => config.level,
    
    /**
     * Set the log level
     * @param {number} level - The new log level
     */
    setLevel: (level) => {
        config.level = level;
    },

    /**
     * Get a list of available sections
     * @returns {Array<string>} List of available sections
     */
    getSections: () => [...config.sections],

    /**
     * Add a new section
     * @param {string} section - The section name to add
     */
    addSection: (section) => {
        config.sections.push(section);
        config.enabledSections.add(section);
    },

    /**
     * Enable a specific section
     * @param {string} section - The section to enable
     */
    enableSection: (section) => {
        config.enabledSections.add(section);
    },

    /**
     * Disable a specific section
     * @param {string} section - The section to disable
     */
    disableSection: (section) => {
        config.enabledSections.delete(section);
    },
    
    /**
     * Generic log method at any level
     * @param {number} level - The numeric log level
     * @param {string} section - Optional section/category
     * @param {string} message - The message to log
     * @param {Object} data - Additional data to log
     */
    log: (level, section, message, data) => {
        // Handle the case where level is a number but section is omitted
        if (typeof level === 'number' && typeof section === 'string' && message === undefined) {
            log(level, `LEVEL-${level}`, null, section, data);
        } else {
            log(level, `LEVEL-${level}`, section, message, data);
        }
    },
    
    /**
     * Log an error message (level 0)
     * @param {string} section - Optional section/category
     * @param {string} message - The message to log
     * @param {Object} data - Additional data to log
     */
    error: (section, message, data) => {
        // Handle case where section is omitted
        if (typeof message === 'undefined') {
            log(DEFAULT_LOG_LEVELS.ERROR, 'ERROR', null, section, data);
        } else {
            log(DEFAULT_LOG_LEVELS.ERROR, 'ERROR', section, message, data);
        }
    },
    
    /**
     * Log a warning message (level 1)
     * @param {string} section - Optional section/category
     * @param {string} message - The message to log
     * @param {Object} data - Additional data to log
     */
    warn: (section, message, data) => {
        // Handle case where section is omitted
        if (typeof message === 'undefined') {
            log(DEFAULT_LOG_LEVELS.WARN, 'WARN', null, section, data);
        } else {
            log(DEFAULT_LOG_LEVELS.WARN, 'WARN', section, message, data);
        }
    },
    
    /**
     * Log an info message (level 2)
     * @param {string} section - Optional section/category
     * @param {string} message - The message to log
     * @param {Object} data - Additional data to log
     */
    info: (section, message, data) => {
        // Handle case where section is omitted
        if (typeof message === 'undefined') {
            log(DEFAULT_LOG_LEVELS.INFO, 'INFO', null, section, data);
        } else {
            log(DEFAULT_LOG_LEVELS.INFO, 'INFO', section, message, data);
        }
    },
    
    /**
     * Log a debug message (level 3)
     * @param {string} section - Optional section/category
     * @param {string} message - The message to log
     * @param {Object} data - Additional data to log
     */
    debug: (section, message, data) => {
        // Handle case where section is omitted
        if (typeof message === 'undefined') {
            log(DEFAULT_LOG_LEVELS.DEBUG, 'DEBUG', null, section, data);
        } else {
            log(DEFAULT_LOG_LEVELS.DEBUG, 'DEBUG', section, message, data);
        }
    },
    
    /**
     * Log a verbose message (level 5)
     * @param {string} section - Optional section/category
     * @param {string} message - The message to log
     * @param {Object} data - Additional data to log
     */
    verbose: (section, message, data) => {
        // Handle case where section is omitted
        if (typeof message === 'undefined') {
            log(DEFAULT_LOG_LEVELS.VERBOSE, 'VERBOSE', null, section, data);
        } else {
            log(DEFAULT_LOG_LEVELS.VERBOSE, 'VERBOSE', section, message, data);
        }
    },
    
    // Export log levels as a property of the logger
    levels: DEFAULT_LOG_LEVELS
}; 