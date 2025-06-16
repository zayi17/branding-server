

// Update color preview
// This function updates the color preview element based on the input value
function updateColorPreview(input) {
    if (!input) return;

    const row = input.closest('.variable-row');
    if (!row) return;

    const preview = row.querySelector('.color-preview');

    if (preview && isValidColor(input.value)) {
        preview.style.backgroundColor = input.value;
    }

    updateCssOutput();
}

// Capitalise function
// This function capitalizes the first letter of a string
function capitalizeFirstLetter(string) {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// Process API data (would be implemented in a real application)
// This function processes the data received from the API
function processApiData(data) {
    // Process and display the data received from the API
    // This would typically involve parsing the data and updating the UI
    console.log("Processing API data:", data);

    // If the data includes dimensions, update the available dimensions
    if (data && data.dimensions) {
        processDimensions(data.dimensions);
    }
}

// Fetch dimensions from the API
// This function is a placeholder and should be replaced with actual API calls
async function fetchDimensions() {
    try {
        const apiUrlValue = apiUrl.value.trim();
        const brandIdValue = brandId.value.trim();

        if (!apiUrlValue || !brandIdValue) {
            console.warn('API URL and Brand ID are required to fetch dimensions');
            return;
        }

        // In a real implementation, fetch dimensions from the API
        // For now, we'll simulate a fetch with the default dimensions

        // In actual implementation, it would be:
        // const response = await apiFetch(`${apiUrlValue}/brand-stylings/${brandIdValue}/assets?type=dimension`);
        // if (response.ok) {
        //     const dimensionAssets = await response.json();
        //     processDimensions(dimensionAssets);
        // }

        // For our test UI, we'll just use the defaults
        console.log("Dimensions would be fetched from API in actual implementation");

        // Update the variant modal's breakpoint select options
       // updateBreakpointOptions();
    } catch (error) {
        console.error('Error fetching dimensions:', error);
    }
}

// Process dimensions from API response
// This function processes the dimensions and updates the available dimensions
function processDimensions(dimensions) {
    // Clear existing dimensions
    availableDimensions = {};

    // Look for dimension assets that could be used as breakpoints
    dimensions.forEach(dim => {
        // Look for dimensions with breakpoint in the name
        if (dim.name.toLowerCase().includes('breakpoint')) {
            // Extract key from name (e.g., --breakpoint-mobile → mobile)
            const match = dim.name.match(/--breakpoint-(\w+)/i);
            if (match && match[1]) {
                const key = match[1].toLowerCase();
                availableDimensions[key] = {
                    name: match[1].charAt(0).toUpperCase() + match[1].slice(1),
                    value: dim.value,
                    id: dim.id
                };
            }
        }
    });

    // If no dimensions were found, keep using defaults
    if (Object.keys(availableDimensions).length === 0) {
        console.warn('No breakpoint dimensions found, using defaults');
        availableDimensions = {
            mobile: { name: "Mobile", value: "max-width: 767px" },
            tablet: { name: "Tablet", value: "min-width: 768px) and (max-width: 1023px" },
            desktop: { name: "Desktop", value: "min-width: 1024px" }
        };
    }

    // Update the variant modal's breakpoint select options
   // updateBreakpointOptions();
}

// Helper function to check if a value is a valid color (second, more comprehensive version)
// Use existing function if available
function isValidColor(value) {
    // REMOVED: if (window.isValidColor) return window.isValidColor(value);

    if (!value) return false;

    // Basic validation for hex, rgb, rgba, hsl, hsla, and named colors
    return /^#[0-9A-Fa-f]{3,8}$/.test(value) ||
           /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/.test(value) ||
           /^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)$/.test(value) ||
           /^hsl\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*\)$/.test(value) ||
           /^hsla\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*,\s*[\d.]+\s*\)$/.test(value) ||
           ['red', 'blue', 'green', 'black', 'white', 'yellow', 'purple',
           'gray', 'orange', 'pink', 'transparent'].includes(value.toLowerCase());
}

/**
 * Attempts to extract a raw image URL from a CSS variable value.
 * Handles plain URLs and url() formats. Returns null for var() or other unparseable values.
 * @param {string} value The CSS variable value string.
 * @returns {string|null} The raw URL string, or null if extraction fails or it's a var().
 */
// Function to be REPLACED in helpers.js
function extractImageUrlForPreview(cssValue, variableMap, visited = new Set()) {
    if (!cssValue || typeof cssValue !== 'string') return '';

    let currentValue = cssValue.trim();
    let resolvedVar = false; // Flag to check if a variable was processed

    // Step 1: Resolve CSS variable if present (either direct or inside url())
    const varRegex = /var\((--[a-zA-Z0-9-_]+)\)/;
    let varMatch = currentValue.match(varRegex);

    if (varMatch && varMatch[1]) {
        const varName = varMatch[1];
        if (typeof window.resolveCssVar === 'function' && variableMap) {
            if (visited.has(varName)) {
                console.warn(`[Preview] Circular reference detected for variable: ${varName}`);
                return ''; 
            }
            visited.add(varName);
            const resolved = window.resolveCssVar(varName, variableMap, new Set(visited)); // Pass a new Set for this resolution path
            
            if (resolved && resolved !== varName) { // If it resolved to something different
                currentValue = currentValue.replace(varMatch[0], resolved); // Replace the var part with its resolved value
                resolvedVar = true;
                // Recurse with the new value that has the variable resolved
                return extractImageUrlForPreview(currentValue, variableMap, visited); 
            } else if (resolved === varName) { // Variable resolved to itself or not found in map
                return ''; 
            } else if (resolved) { // Successfully resolved to a primitive value
                currentValue = currentValue.replace(varMatch[0], resolved);
                resolvedVar = true;
            } else { // Variable not found
                return '';
            }
        } else {
            return ''; // Cannot resolve variable
        }
    }

    // Step 2: After any variable resolution, extract from url()
    const urlRegex = /url\(['"]?(.*?)['"]?\)/i;
    const urlMatchResult = currentValue.match(urlRegex);

    if (urlMatchResult && urlMatchResult[1]) {
        return urlMatchResult[1].trim(); // Return content within url()
    }
    
    // Step 3: If it wasn't a var() and wasn't url() initially, or if a var resolved to a non-url string
    if (!cssValue.trim().startsWith('var(') && !cssValue.trim().toLowerCase().startsWith('url(') && !resolvedVar) {
        return currentValue.trim(); // Assume it's a direct path if it wasn't a variable and not url()
    }
    
    // If a variable was resolved, but the result is not in url() format, it might be a direct path from variable
    if (resolvedVar && !urlMatchResult) {
        return currentValue.trim();
    }

    return ''; // Fallback
}