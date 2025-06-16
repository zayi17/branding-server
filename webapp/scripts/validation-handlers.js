// validation-handlers.js - Functions for validating and formatting input values

/**
 * Validates and formats a CSS variable name
 * @param {string} name - The raw variable name to format
 * @returns {string} - The properly formatted CSS variable name
 */
function validateVarName(name) {
    if (!name) return "";
    
    let rawName = name.trim();
    if (!rawName) return "";
    
    // Remove any existing leading '--' or '-' prefixes
    if (rawName.startsWith('--')) {
        rawName = rawName.substring(2);
    } else if (rawName.startsWith('-')) {
        rawName = rawName.substring(1);
    }
    
    // Replace spaces with hyphens and convert to lowercase for consistency
    let formatted = rawName.toLowerCase().replace(/\s+/g, '-');
    
    // Remove any characters that are not alphanumeric, hyphen, or underscore
    formatted = formatted.replace(/[^\w-]/g, '');
    
    // Ensure it starts with exactly '--'
    return `--${formatted}`;
}





function convertToHex(color) {
    if (typeof color !== 'string') return '#000000';
    if (color.startsWith('#')) return color; // Already hex

    const ctx = document.createElement('canvas').getContext('2d');
    if (!ctx) return '#000000'; // Canvas not supported

    ctx.fillStyle = color;
    const hex = ctx.fillStyle;

    // Return black if conversion failed (e.g. invalid color name)
    return hex.startsWith('#') ? hex : '#000000';
}


window.validateVarName = validateVarName;
window.convertToHex    = convertToHex;