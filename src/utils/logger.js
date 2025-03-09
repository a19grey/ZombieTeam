/**
 * Logger Module - Provides logging functionality with different levels
 * 
 * This module contains functions for logging messages at different levels
 * (debug, info, warn, error) and can be configured to show only logs
 * at or above a certain level.
 * 
 * Example usage:
 * import { logger } from './utils/logger.js';
 * logger.debug('Detailed information for debugging');
 * logger.info('General information about game state');
 * logger.warn('Warning that might need attention');
 * logger.error('Error that needs immediate attention');
 */

// Log levels
const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    NONE: 4
};

// Default configuration
let config = {
    level: LOG_LEVELS.INFO, // Default to INFO level
    includeTimestamp: true,
    logToConsole: true
};

/**
 * Formats a log message with optional timestamp
 * @param {string} level - The log level
 * @param {string} message - The message to log
 * @param {Object} data - Additional data to log
 * @returns {string} The formatted log message
 */
const formatLogMessage = (level, message, data) => {
    let formattedMessage = '';
    
    // Add timestamp if configured
    if (config.includeTimestamp) {
        const now = new Date();
        formattedMessage += `[${now.toISOString()}] `;
    }
    
    // Add log level
    formattedMessage += `[${level}] ${message}`;
    
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
 * Logs a message if the current log level allows it
 * @param {number} level - The numeric log level
 * @param {string} levelName - The name of the log level
 * @param {string} message - The message to log
 * @param {Object} data - Additional data to log
 */
const log = (level, levelName, message, data) => {
    if (level >= config.level && config.logToConsole) {
        const formattedMessage = formatLogMessage(levelName, message, data);
        
        switch (level) {
            case LOG_LEVELS.DEBUG:
                console.debug(formattedMessage);
                break;
            case LOG_LEVELS.INFO:
                console.info(formattedMessage);
                break;
            case LOG_LEVELS.WARN:
                console.warn(formattedMessage);
                break;
            case LOG_LEVELS.ERROR:
                console.error(formattedMessage);
                break;
        }
    }
};

/**
 * The logger object with methods for each log level
 */
export const logger = {
    /**
     * Configure the logger
     * @param {Object} newConfig - The new configuration
     */
    configure: (newConfig) => {
        config = { ...config, ...newConfig };
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
     * Log a debug message
     * @param {string} message - The message to log
     * @param {Object} data - Additional data to log
     */
    debug: (message, data) => {
        log(LOG_LEVELS.DEBUG, 'DEBUG', message, data);
    },
    
    /**
     * Log an info message
     * @param {string} message - The message to log
     * @param {Object} data - Additional data to log
     */
    info: (message, data) => {
        log(LOG_LEVELS.INFO, 'INFO', message, data);
    },
    
    /**
     * Log a warning message
     * @param {string} message - The message to log
     * @param {Object} data - Additional data to log
     */
    warn: (message, data) => {
        log(LOG_LEVELS.WARN, 'WARN', message, data);
    },
    
    /**
     * Log an error message
     * @param {string} message - The message to log
     * @param {Object} data - Additional data to log
     */
    error: (message, data) => {
        log(LOG_LEVELS.ERROR, 'ERROR', message, data);
    },
    
    // Export log levels as a property of the logger
    levels: LOG_LEVELS
};

// No need to export LOG_LEVELS separately as it's now available as logger.levels 