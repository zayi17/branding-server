// Enhanced CSS Parser with Type Detection

/**
 * Advanced parser that extracts CSS variables, detects their types, and organizes them by groups
 * Supports explicit type comments and intelligent auto-detection
 * 
 * @param {string} cssContent The CSS content to parse
 * @returns {Object} Object with properties and groups
 */
function parseCustomPropertiesWithGroups(css) {
    const properties = {};
    const groups = {};
    let currentGroup = "General"; // Default group
    let currentGroupType = null; // Type for the current group
    
    // Initialize default group
    groups[currentGroup] = [];
    
    // Extract root block content
    const rootMatch = css.match(/:root\s*{([^}]*)}/s);
    if (!rootMatch) return { properties, groups };
    
    const rootContent = rootMatch[1];
    const lines = rootContent.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        if (line === '') continue;
        
        // Check for group comment with potential type definition
        const groupMatch = line.match(/\/\*\s*GROUP:\s*(.*?)\s*\*\//);
        if (groupMatch) {
            currentGroup = groupMatch[1].trim();
            if (!groups[currentGroup]) {
                groups[currentGroup] = [];
            }
            
            // Check for type definition in the same line or next non-empty line
            const typeMatch = line.match(/\/\*\s*TYPE:\s*(\w+)\s*\*\//);
            if (typeMatch) {
                currentGroupType = mapTypeCodeToType(typeMatch[1]);
            } else {
                // Look ahead for a type definition on the next line
                for (let j = i + 1; j < lines.length; j++) {
                    const nextLine = lines[j].trim();
                    if (nextLine === '') continue;
                    
                    const nextTypeMatch = nextLine.match(/\/\*\s*TYPE:\s*(\w+)\s*\*\//);
                    if (nextTypeMatch && !nextLine.match(/--[a-zA-Z0-9-_]+/)) {
                        // Type comment is on its own line, not attached to a variable
                        currentGroupType = mapTypeCodeToType(nextTypeMatch[1]);
                        i = j; // Skip ahead
                        break;
                    } else {
                        break; // Stop looking if we hit any other content
                    }
                }
            }
            
            continue;
        }
        
        // Check for variable declaration
        const varMatch = line.match(/\s*(--[a-zA-Z0-9-_]+)\s*:\s*([^;]+);/);
        if (varMatch) {
            const name = varMatch[1].trim();
            let rawValue = varMatch[2].trim();
            
            // Check for type comment directly attached to this variable
            const variableTypeMatch = line.match(/\/\*\s*TYPE:\s*(\w+)\s*\*\//);
            let variableType = variableTypeMatch ? 
                mapTypeCodeToType(variableTypeMatch[1]) : null;
            
            // Check for !important flag
            const isImportant = /\s*!important\s*$/i.test(rawValue);
            const value = isImportant ? 
                rawValue.replace(/\s*!important\s*$/i, '').trim() : rawValue;
            
            // If no explicit type on this variable, use group type or auto-detect
            if (!variableType) {
                variableType = currentGroupType || autoDetectType(value);
            }
            
            // Ensure group exists and add variable
            if (!groups[currentGroup]) {
                groups[currentGroup] = [];
            }
            
            if (!groups[currentGroup].includes(name)) {
                groups[currentGroup].push(name);
            }
            
            // Store variable with all properties
            properties[name] = {
                value: value,
                type: variableType,
                isImportant: isImportant,
                group: currentGroup
            };
        }
    }
    
    // Second pass to apply group context for variables without a clear type
    // If most variables in a group are of one type, assume other are too
    for (const groupName in groups) {
        const groupVars = groups[groupName];
        if (groupVars.length <= 1) continue; // Skip groups with 0-1 variables
        
        // Count types in this group
        const typeCounts = {};
        let totalTyped = 0;
        
        groupVars.forEach(varName => {
            if (properties[varName] && properties[varName].type !== 'other') {
                const type = properties[varName].type;
                typeCounts[type] = (typeCounts[type] || 0) + 1;
                totalTyped++;
            }
        });
        
        // Find the dominant type if any
        let dominantType = null;
        let maxCount = 0;
        
        for (const type in typeCounts) {
            if (typeCounts[type] > maxCount) {
                maxCount = typeCounts[type];
                dominantType = type;
            }
        }
        
        // Only apply if there's a clear dominant type (more than half of typed variables)
        if (dominantType && maxCount > totalTyped / 2) {
            // Apply to variables with 'other' type
            groupVars.forEach(varName => {
                if (properties[varName] && properties[varName].type === 'other') {
                    properties[varName].type = dominantType;
                }
            });
        }
    }
    
    return { properties, groups };
}

/**
 * Maps type code from comment to full type name
 * @param {string} code - Short type code (col, img, typ, etc.) or full name
 * @returns {string} - Full type name (color, image, font, etc.)
 */
function mapTypeCodeToType(code) {
    if (!code) return 'other';
    
    code = code.toLowerCase().trim();
    
    switch (code) {
        case 'col':
        case 'color':
            return 'color';
        case 'img':
        case 'image':
            return 'image';
        case 'typ':
        case 'font':
            return 'font';
        case 'dim':
        case 'dimension':
            return 'dimension';
        case 'cls':
        case 'selector':
            return 'selector';
        default: 
            return 'other';
    }
}

/**
 * Auto-detects variable type based on its value
 * @param {string} value - CSS variable value
 * @returns {string} - Detected type
 */
function autoDetectType(value) {
    if (!value) return 'other';
    
    // Color detection
    if (value.startsWith('#') || 
        /^rgb\s*\(/.test(value) ||
        /^rgba\s*\(/.test(value) ||
        /^hsl\s*\(/.test(value) ||
        /^hsla\s*\(/.test(value) ||
        ['red', 'blue', 'green', 'black', 'white', 'yellow', 'purple',
         'gray', 'orange', 'pink', 'brown', 'cyan', 'magenta', 'teal',
         'olive', 'navy', 'maroon', 'lime', 'aqua', 'silver', 'gold',
         'beige', 'transparent'].includes(value.toLowerCase())) {
        return 'color';
    }
    
    // Image detection
    if (value.includes('url(') || value.startsWith('data:image/')) {
        return 'image';
    }
    
    // Typography/Font detection
    if (value.includes('font-family') || 
        value.includes('serif') || 
        value.includes('sans-serif') ||
        value.includes('monospace') ||
        value.includes('cursive') ||
        value.includes('fantasy') ||
        value.match(/'[^']+'/) || // Quoted font names
        value.match(/"[^"]+"/)) {
        return 'font';
    }
    
    // Dimension detection
    if (value.match(/[0-9]+(px|rem|em|%|vh|vw|vmin|vmax|pt|pc|in|mm|cm|ex|ch)/) ||
        value.startsWith('calc(')) {
        return 'dimension';
    }
    
    // Default to other if no clear type
    return 'other';
}

// Make sure the enhanced function is globally available
window.parseCustomPropertiesWithGroups = parseCustomPropertiesWithGroups;
