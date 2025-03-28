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
 *   logToConsole: true,
 *   includeCallerInfo: true             // Show calling function/file information
 * });
 * 
 * // Custom log level
 * logger.log(6, 'Super detailed logs', { extraData: 'value' });
 * 
 * // URL parameters for debugging:
 * // ?debug=5                           // Set debug level to 5
 * // ?debugSection=audio,physics        // Only show logs from audio and physics sections
 * // ?debugAll=true                     // Enable all debug sections
 * // ?debugCaller=true                  // Show calling function/file information
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
    'scene'
    ,'speed'
    ,'enemy'
    ,'audio'
    ,'powerup'
    ,'enemyspawner'
    ,'explosion'
    ,'portal'
];

// Default configuration
let config = {
    level: DEFAULT_LOG_LEVELS.ERROR,  // Default to ERROR level (only show errors)
    includeTimestamp: false, // disable timestamps in production
    logToConsole: true, // 
    sections: DEFAULT_SECTIONS,      // All available sections
    enabledSections: new Set(),      // No sections enabled by default
    includeCallerInfo: false         // Whether to include caller information
};

/**
 * Parse URL parameters to allow runtime configuration of logging
 * This enables command-line like flags via the URL:
 * ?debug=5&debugSection=audio,physics
 */
const parseURLParameters = () => {
    if (typeof window === 'undefined') return; // Skip if not in browser
    
    const urlParams = new URLSearchParams(window.location.search);
    
    // Check for debug level parameter
    const debugLevel = urlParams.get('debug');
    if (debugLevel !== null) {
        const level = parseInt(debugLevel, 10);
        if (!isNaN(level)) {
            config.level = level;
            console.log(`Logger: Debug level set to ${level} from URL parameter`);
        }
    } else {
        // Set default debug level to INFO (2) if not specified
        config.level = DEFAULT_LOG_LEVELS.INFO;
        console.log(`Logger: Debug level set to INFO (${DEFAULT_LOG_LEVELS.INFO}) by default`);
    }
    
    // Check for debug sections parameter
    const debugSections = urlParams.get('debugSection') || urlParams.get('debugsection');
    if (debugSections) {
        const sections = debugSections.split(',').map(s => s.trim());
        if (sections.length > 0) {
            config.enabledSections = new Set(sections);
            console.log(`Logger: Enabled debug sections from URL: ${sections.join(', ')}`);
        }
    } else {
        // Never enable anything default
        console.log('Logger: Nothing enabled by default');
    }
    
    // Check for debug all parameter
    const debugAll = urlParams.get('debugAll');
    if (debugAll === 'true') {
        // Enable all sections
        config.enabledSections = new Set(config.sections);
        console.log('Logger: All debug sections enabled from URL parameter');
    }
    
    // Check for debug caller parameter
    const debugCaller = urlParams.get('debugCaller');
    if (debugCaller === 'true') {
        config.includeCallerInfo = true;
        console.log('Logger: Caller information enabled from URL parameter');
    }
};

// Run URL parameter parsing on module load
parseURLParameters();

/**
 * Get information about the calling function or file
 * @returns {string} Calling function or file information
 */
const getCallerInfo = () => {
    try {
        // Create an error to get the stack trace
        const err = new Error();
        
        // Parse the stack trace to extract caller information
        // The first two lines are this function and the log function, so we want the third line (index 2)
        const stackLines = err.stack.split('\n');
        
        // We need to skip the first 3 lines which are:
        // - The Error message line
        // - This function (getCallerInfo)
        // - The log function
        // - The logger method (error, info, debug, etc.)
        // So we want the 4th or 5th line typically
        
        // Find the first line that's not part of the logger
        let callerLine = '';
        for (let i = 1; i < stackLines.length; i++) {
            if (!stackLines[i].includes('logger.js')) {
                callerLine = stackLines[i];
                break;
            }
        }
        
        if (!callerLine) return '';
        
        // Extract function name and/or file info from the line
        // Format typically looks like: "    at FunctionName (file:line:column)"
        // or "    at file:line:column"
        let callerInfo = callerLine.trim();
        
        // Remove the "at " prefix
        callerInfo = callerInfo.substring(callerInfo.indexOf('at ') + 3);
        
        // Extract function name if available
        let functionName = '';
        if (callerInfo.includes('(')) {
            functionName = callerInfo.substring(0, callerInfo.indexOf('(')).trim();
            
            // If we found a function name, use that
            if (functionName) {
                return `[${functionName}]`;
            }
        }
        
        // If no function name or couldn't parse, extract file name
        let fileName = callerInfo;
        
        // If there's a path, extract just the file name
        if (fileName.includes('/')) {
            fileName = fileName.substring(fileName.lastIndexOf('/') + 1);
        }
        
        // Remove line and column numbers
        if (fileName.includes(':')) {
            fileName = fileName.substring(0, fileName.lastIndexOf(':'));
            fileName = fileName.substring(0, fileName.lastIndexOf(':'));
        }
        
        return `[${fileName}]`;
    } catch (e) {
        // If anything goes wrong, return an empty string
        return '';
    }
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
    
    // Add caller info if configured
    if (config.includeCallerInfo) {
        formattedMessage += ` ${getCallerInfo()}`;
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
    
    // If it's an error, always show regardless of section
    if (level <= DEFAULT_LOG_LEVELS.ERROR) {
        return true;
    }
    
    // For non-errors, section must be explicitly enabled
    // No sections enabled means nothing gets logged (except errors)
    if (!section || !config.enabledSections.has(section)) {
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
     * @param {boolean} newConfig.includeCallerInfo - Whether to include caller information
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
        if (!config.sections.includes(section)) {
            config.sections.push(section);
        }
        // No longer automatically enable new sections
    },

    /**
     * Enable a specific section
     * @param {string} section - The section to enable
     */
    enableSection: (section) => {
        if (!config.sections.includes(section)) {
            config.sections.push(section);
        }
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
     * Enable or disable caller information
     * @param {boolean} enable - Whether to enable caller information
     */
    setCallerInfo: (enable) => {
        config.includeCallerInfo = enable;
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
    
    /**
     * Parse URL parameters again (can be called if URL changes)
     */
    parseURLParameters,
    
    // Export log levels as a property of the logger
    levels: DEFAULT_LOG_LEVELS
}; 