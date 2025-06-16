// Helper functions
function capitalizeFirstLetter(string) {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// Helper function to check if a value is a valid color
// Use existing function if available
function isValidColor(value) {
if (window.isValidColor) return window.isValidColor(value);

if (!value) return false;

// Basic validation for hex, rgb, rgba, hsl, hsla
return /^#[0-9A-Fa-f]{3,8}$/.test(value) ||
        /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/.test(value) ||
        /^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)$/.test(value) ||
        /^hsl\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*\)$/.test(value) ||
        /^hsla\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*,\s*[\d.]+\s*\)$/.test(value) ||
        ['red', 'blue', 'green', 'black', 'white', 'yellow', 'purple',
        'gray', 'orange', 'pink', 'transparent'].includes(value.toLowerCase());
}

function fallbackToClientGeneration() {
    const properties = collectProperties();
    const groups = collectGroups();
    cssOutput.textContent = generateCssWithGroups(properties, groups);
}

