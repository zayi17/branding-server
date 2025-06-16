// custom-css-rule-editor.js
let discoveredVariables = [];
let suggestionsBoxElement = null;
let currentSuggestionInput = null;
let hideSuggestionsTimeout;

// Initialize suggestions box on page load
document.addEventListener('DOMContentLoaded', function() {
    if (!suggestionsBoxElement) {
        suggestionsBoxElement = document.createElement('div');
        suggestionsBoxElement.id = 'css-variable-suggestions';
        suggestionsBoxElement.className = 'value-suggestions-list'; // Make sure this class has appropriate styling for appearance
        suggestionsBoxElement.style.display = 'none';
        // **** ADD THESE TWO LINES ****
        suggestionsBoxElement.style.position = 'absolute';
        suggestionsBoxElement.style.zIndex = '1000'; // Or a high enough z-index
        // **** END OF ADDED LINES ****
        document.body.appendChild(suggestionsBoxElement);
    }
});

// Ensure window.discoveredVariables is initialized
if (typeof window.discoveredVariables === 'undefined') {
    window.discoveredVariables = [];
}

if (typeof window.variableMap === 'undefined') {
    window.variableMap = new Map();
}



function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return '';
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

function getSelectorTypeColor(selectorText) {
    if (!selectorText || typeof selectorText !== 'string') return 'var(--selector-default-color)';
    const s = selectorText.trim();
    const primarySelectorSegment = s.split(',')[0].trim();
    if (primarySelectorSegment.startsWith('#')) return 'var(--selector-id-color)';
    if (primarySelectorSegment.startsWith('.')) return 'var(--selector-class-color)';
    if (primarySelectorSegment.includes('::')) return 'var(--selector-pseudo-element-color)';
    if (primarySelectorSegment.includes(':')) return 'var(--selector-pseudo-class-color)';
    if (primarySelectorSegment.includes('[') && primarySelectorSegment.includes(']')) return 'var(--selector-attr-color)';
    if (primarySelectorSegment === '*') return 'var(--selector-universal-color)';
    const firstWord = primarySelectorSegment.split(/[\s>+~.:#\[\]]/)[0];
    if (/^[a-zA-Z_]/.test(firstWord) && firstWord !== "") return 'var(--selector-element-color)';
    return 'var(--selector-default-color)';
}

function isColorPropertyForSwatch(propertyName) { // Renamed to avoid conflict if you have another isColorProperty
    if (typeof propertyName !== 'string') return false;
    return propertyName.toLowerCase().includes('color') || propertyName.toLowerCase().includes('background');
}

function isValidHexColor(str) { 
    if (typeof str !== 'string') return false;
     return /^#([0-9A-F]{3}){1,2}$/i.test(str); 
}

function isValidRgbOrRgbaColor(str) {
     if (typeof str !== 'string') return false;
      return /^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(,\s*(0|1|0?\.\d+))?\s*\)$/i.test(str); 
}

function showSuggestionsForEditor(inputElement, filterText = "") {
    if (!suggestionsBoxElement) {
        console.error('[Suggestions] Suggestion box element not found!');
        return;
    }
    clearTimeout(hideSuggestionsTimeout);
    currentSuggestionInput = inputElement;
    suggestionsBoxElement.innerHTML = ''; // Clear previous suggestions

    // Determine the actual text to filter by, considering var() or direct -- input
    let effectiveFilterText = filterText.toLowerCase();
    if (filterText.startsWith('var(')) {
        effectiveFilterText = filterText.substring(4).toLowerCase();
        if (effectiveFilterText.startsWith('--')) {
            effectiveFilterText = effectiveFilterText.substring(2);
        }
    } else if (filterText.startsWith('--')) {
        effectiveFilterText = filterText.substring(2).toLowerCase();
    }

    const currentActiveElementIsInput = (document.activeElement === inputElement);

    console.log('[Suggestions] showSuggestionsForEditor called. Original Filter:', filterText, 'Effective Filter:', effectiveFilterText, 'Input focused:', currentActiveElementIsInput);
    console.log('[Suggestions] window.discoveredVariables:', JSON.parse(JSON.stringify(window.discoveredVariables)));

    let relevantVars = [];

    // Condition to show suggestions:
    // - Input starts with 'var('
    // - Input starts with '--'
    // - Input is empty AND focused (to show all available initially)
    if (filterText.startsWith('var(') || filterText.startsWith('--') || (filterText === "" && currentActiveElementIsInput)) {
        if (Array.isArray(window.discoveredVariables)) {
            const variableRow = inputElement.closest('.variable-row');
            const currentEditingVariableName = variableRow ? variableRow.dataset.variableName : null;

            relevantVars = window.discoveredVariables.filter(variable => {
                if (!variable || typeof variable !== 'string') return false;

                const varNameForFilter = variable.substring(2).toLowerCase(); // Compare "--var-name" with "var-name"

                if (!varNameForFilter.includes(effectiveFilterText)) {
                    return false;
                }

                if (currentEditingVariableName && window.variableMap && window.variableMap.size > 0 && typeof isCircularReference === 'function') {
                    if (isCircularReference(currentEditingVariableName, variable, window.variableMap)) {
                        console.log(`[Suggestions] Filtering out circular reference: ${variable} for ${currentEditingVariableName}`);
                        return false;
                    }
                }
                return true;
            });
        } else {
            console.warn('[Suggestions] window.discoveredVariables is not an array or undefined.');
        }
    }

    console.log('[Suggestions] Relevant vars after filtering:', JSON.parse(JSON.stringify(relevantVars)));

    if (relevantVars.length === 0) {
        suggestionsBoxElement.style.display = 'none';
        console.log('[Suggestions] No relevant vars, hiding suggestions box.');
        return;
    }

    relevantVars.forEach(variable => {
        if (typeof addSuggestionItemToEditor === 'function') {
            addSuggestionItemToEditor(variable, inputElement);
        } else {
            console.error('[Suggestions] addSuggestionItemToEditor function is not defined!');
        }
    });

    const inputRect = inputElement.getBoundingClientRect();
    suggestionsBoxElement.style.left = `${window.scrollX + inputRect.left}px`;
    suggestionsBoxElement.style.top = `${window.scrollY + inputRect.bottom}px`;
    suggestionsBoxElement.style.width = `${inputRect.width}px`;
    suggestionsBoxElement.style.display = 'block';
    console.log('[Suggestions] Suggestions box should be visible.');
}

function addSuggestionItemToEditor(variable, inputElement) {
    if (!suggestionsBoxElement) return;
    const item = document.createElement('div');
    item.className = 'suggestion-item';
    item.textContent = variable;
    item.addEventListener('mousedown', (e) => {
        e.preventDefault();
        let currentVal = inputElement.value;
        let varPrefix = "var(";
        let insertVal = `${varPrefix}${variable})`;
        if (currentVal.toLowerCase().includes(varPrefix.toLowerCase()) && currentVal.endsWith(")")) { inputElement.value = insertVal; }
        else if (currentVal.toLowerCase().includes(varPrefix.toLowerCase())) { let startIndex = currentVal.toLowerCase().lastIndexOf(varPrefix.toLowerCase()); inputElement.value = currentVal.substring(0, startIndex) + insertVal; }
        else { inputElement.value = insertVal; }
        inputElement.dispatchEvent(new Event('input', { bubbles: true }));
        inputElement.dispatchEvent(new Event('change', { bubbles: true }));
        hideSuggestionsForEditor();
    });
    suggestionsBoxElement.appendChild(item);
}

function hideSuggestionsForEditor() {
    if (suggestionsBoxElement) suggestionsBoxElement.style.display = 'none';
    currentSuggestionInput = null;
}

function insertNewCssRuleEditor(parentContainer, initialSelectorText, initialRulesString, assetId, groupName) {
    console.log(`[CUSTOM-CSS-RULE-EDITOR-FIXED] insertNewCssRuleEditor for selector: ${initialSelectorText}`);

    if (typeof window.makeIndividualSelectorEntryHtml !== 'function') {
        const errorMsg = "CRITICAL ERROR: window.makeIndividualSelectorEntryHtml from templates.js is NOT DEFINED.";
        console.error(errorMsg);
        if (typeof showToast === 'function') showToast(errorMsg, "error");
        const errorDiv = document.createElement('div');
        errorDiv.textContent = `Error: Template for CSS Rule ('${escapeHtml(initialSelectorText)}') missing.`;
        if (parentContainer) {
             const addRowPlaceholder = parentContainer.querySelector('.add-new-css-rule-block-trigger-row, .add-variable-row');
             if (addRowPlaceholder) parentContainer.insertBefore(errorDiv, addRowPlaceholder);
             else parentContainer.appendChild(errorDiv);
        }
        return null;
    }

    // Parse the initialRulesString (which is asset.value) into a declarationsArray
    // Assuming parseCssDeclarations is globally available from ui-renderings.js or helpers.js
    let declarationsArray = [];
    if (typeof window.parseCssDeclarations === 'function') {
        declarationsArray = window.parseCssDeclarations(initialRulesString || "");
    } else {
        console.warn("[CUSTOM-CSS-RULE-EDITOR-FIXED] window.parseCssDeclarations is not defined. Rules will be empty.");
    }

    // Get selector style info
    // Assuming getSelectorTypeAndStyle is globally available from modal-html.js or helpers.js
    let selectorStyleInfo = { color: 'var(--text-color-default, #ccc)', type: 'default' };
    if (typeof window.getSelectorTypeAndStyle === 'function') {
        selectorStyleInfo = window.getSelectorTypeAndStyle(initialSelectorText);
    } else {
        console.warn("[CUSTOM-CSS-RULE-EDITOR-FIXED] window.getSelectorTypeAndStyle is not defined. Using default style for selector.");
    }

    // Call the correct template function
    const ruleBlockHtml = window.makeIndividualSelectorEntryHtml(
        assetId,
        initialSelectorText,
        groupName,
        declarationsArray,
        selectorStyleInfo,
        true // isBlockEnabled (defaulting to true)
    );

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = ruleBlockHtml.trim();
    const ruleBlockElement = tempDiv.firstChild;

    if (ruleBlockElement) {
        // Logic to append to parentContainer (which is groupContentDiv from renderBrandStylingView)
        const addRowPlaceholder = parentContainer.querySelector('.add-new-css-rule-block-trigger-row, .add-variable-row');
        if (addRowPlaceholder) {
            parentContainer.insertBefore(ruleBlockElement, addRowPlaceholder);
        } else {
            parentContainer.appendChild(ruleBlockElement);
        }
        
        // Initialize listeners for the new rule block and its properties
        if (typeof window.initClassRuleEntryListeners === 'function') {
            window.initClassRuleEntryListeners(ruleBlockElement);
        } else {
            console.warn("[CUSTOM-CSS-RULE-EDITOR-FIXED] window.initClassRuleEntryListeners is not defined.");
        }
        return ruleBlockElement;
    }
    return null;
}

// function updateValueInputVariableStyle(inputElement) {
//     if (!inputElement) return;

//     const value = inputElement.value.trim();
//     // REGEX MODIFIED: To only match var(--name) and not var(--name, fallback) for these checks
//     const varRegex = /^var\(\s*(--[a-zA-Z0-9-_]+)\s*\)$/; // Only var(--name)
//     const match = value.match(varRegex);

//     const variableRow = inputElement.closest('.variable-row');
//     const currentEditingVariableName = variableRow ? variableRow.dataset.variableName : null;

//     if (match) {
//         const referencedVarName = match[1];
//         let statusToSet = 'none';
//         let iconMessage = '';

//         // Check 1: Missing variable
//         if (!window.discoveredVariables || !window.discoveredVariables.includes(referencedVarName)) { // Ensure discoveredVariables exists
//             statusToSet = 'warning';
//             iconMessage = `Variable ${referencedVarName} is not defined.`;
//         }
//         // Check 2: Circular reference (only if not missing)
//         else if (typeof window.isCircularReference === 'function' && currentEditingVariableName && window.variableMap && window.variableMap.size > 0) {
//             if (window.isCircularReference(currentEditingVariableName, referencedVarName, window.variableMap)) {
//                 statusToSet = 'error';
//                 iconMessage = `Circular reference: ${currentEditingVariableName} cannot reference ${referencedVarName}.`;
//             } else {
//                 statusToSet = 'valid_var'; // Exists and not circular
//                 iconMessage = `Variable ${referencedVarName} is valid.`;
//             }
//         }
//         // Fallback if circular check couldn't run but variable exists
//         else if (window.discoveredVariables && window.discoveredVariables.includes(referencedVarName)) {
//             statusToSet = 'valid_var';
//             iconMessage = `Variable ${referencedVarName} is valid (circular check context incomplete).`;
//         }
        
//         if (typeof window.updateValueStatusIcon === 'function') {
//             window.updateValueStatusIcon(inputElement, statusToSet, iconMessage);
//         }

//     } else {
//         // Value is not a 'var(--name)' or is empty. Clear any existing status.
//         if (typeof window.updateValueStatusIcon === 'function') {
//             window.updateValueStatusIcon(inputElement, 'none');
//         }
//     }
// };


/**
 * Parses a CSS value to find 'var()' references.
 * @param {string} value - The CSS value string.
 * @returns {Array<string>} A list of referenced variable names.
 */
function getReferencedVariables(value) {
    if (typeof value !== 'string') return [];
    const references = [];
    const varRegex = /var\(\s*(--[a-zA-Z0-9-_]+)\s*(?:,[^)]*)?\)/g;
    let match;
    while ((match = varRegex.exec(value)) !== null) {
        references.push(match[1]);
    }
    return references;
}


function initSharedCssVariableDiscovery(stylingId) {
    console.log('[DEBUG] initSharedCssVariableDiscovery CALLED with stylingId:', stylingId);

    if (!stylingId && window.currentStylingId) {
        stylingId = window.currentStylingId;
    }

    // Clear previous data immediately if no stylingId
    if (!stylingId) {
        console.log('[DEBUG] initSharedCssVariableDiscovery: No stylingId. Clearing discoveredVariables and variableMap.');
        window.discoveredVariables = [];
        window.variableMap.clear();
        if (typeof window.reapplyAllVariableValueStyles === 'function') {
            window.reapplyAllVariableValueStyles();
        }
        if (typeof window.initVariablePreviews === 'function') { // ADDED CALL
            window.initVariablePreviews();
        }
        return Promise.resolve(); // Keep as Promise.resolve() for consistency if callers expect a promise
    }

    console.log(`[DEBUG] initSharedCssVariableDiscovery: Fetching variables from: ${API_BASE_URL}/brand-stylings/${stylingId}/assets-with-inheritance`);

    return apiFetch(`${API_BASE_URL}/brand-stylings/${stylingId}/assets-with-inheritance`)
        .then(response => {
            console.log('[DEBUG] initSharedCssVariableDiscovery: API response status:', response.status);
            if (!response.ok) {
                return response.text().then(text => {
                    throw new Error(`HTTP error for variable discovery: ${response.status} - ${text || 'Unknown API error'}`);
                });
            }
            return response.json();
        })
        .then(assets => {
            console.log('[DEBUG] initSharedCssVariableDiscovery: Fetched assets for variables:', assets);
            window.discoveredVariables = []; // Reset before populating
            window.variableMap.clear(); // Reset variableMap

            if (Array.isArray(assets)) {
                assets.forEach(asset => {
                    if (asset && asset.name && asset.name.startsWith('--')) {
                        if (!window.discoveredVariables.includes(asset.name)) {
                            window.discoveredVariables.push(asset.name);
                        }
                        // Populate variableMap
                        window.variableMap.set(asset.name, {
                            id: asset.id,
                            value: asset.value, // Raw value from DB/API
                            references: getReferencedVariables(asset.value), // Parsed direct references
                            isImportant: asset.is_important,
                            source: asset.source, // 'local' or 'inherited'
                            variants: asset.variants ? asset.variants.map(v => ({
                                breakpoint: v.breakpoint,
                                value: v.value,
                                references: getReferencedVariables(v.value) //
                            })) : []
                        });
                    }
                });
            } else {
                console.warn('[DEBUG] initSharedCssVariableDiscovery: Fetched assets is not an array:', assets);
            }
            console.log('[DEBUG] initSharedCssVariableDiscovery: Final discoveredVariables:', JSON.parse(JSON.stringify(window.discoveredVariables)));
            console.log('[DEBUG] initSharedCssVariableDiscovery: Final variableMap size:', window.variableMap.size);

            if (typeof window.reapplyAllVariableValueStyles === 'function') {
                window.reapplyAllVariableValueStyles(); //
            }
            if (typeof window.initVariablePreviews === 'function') { // ADDED CALL
                window.initVariablePreviews(); //
            }
        })
        .catch(error => {
            console.error('[DEBUG] initSharedCssVariableDiscovery: Error fetching/processing variables:', error);
            window.discoveredVariables = []; // Clear on error
            window.variableMap.clear();
            if (typeof window.reapplyAllVariableValueStyles === 'function') {
                window.reapplyAllVariableValueStyles(); //
            }
            if (typeof window.initVariablePreviews === 'function') { // ADDED CALL
                window.initVariablePreviews(); //
            }
            // return Promise.reject(error); // Optionally propagate the error
        });
}

// async function initSharedCssVariableDiscovery(stylingId) {
//     console.log('[DEBUG] initSharedCssVariableDiscovery CALLED with stylingId:', stylingId);

//     const currentActiveStylingId = stylingId || window.currentStylingId;

//     if (!currentActiveStylingId) {
//         console.warn('[DEBUG] initSharedCssVariableDiscovery: No stylingId available. Clearing discoveredVariables and variableMap.');
//         window.discoveredVariables = [];
//         window.variableMap.clear();
//         if (typeof window.reapplyAllVariableValueStyles === 'function') {
//             window.reapplyAllVariableValueStyles();
//         }
//         return; // No promise needed if exiting early
//     }

//     console.log(`[DEBUG] initSharedCssVariableDiscovery: Fetching variables for styling ID ${currentActiveStylingId} from: ${API_BASE_URL}/brand-stylings/${currentActiveStylingId}/assets-with-inheritance`);

//     try {
//         const response = await apiFetch(`${API_BASE_URL}/brand-stylings/${currentActiveStylingId}/assets-with-inheritance`);
//         console.log('[DEBUG] initSharedCssVariableDiscovery: API response status:', response.status);

//         if (!response.ok) {
//             const errorText = await response.text().catch(() => 'Failed to get error text from response.');
//             console.error(`[DEBUG] initSharedCssVariableDiscovery: HTTP error ${response.status} - ${errorText}`);
//             throw new Error(`HTTP error for variable discovery: ${response.status} - ${errorText}`);
//         }

//         const assets = await response.json();
//         console.log('[DEBUG] initSharedCssVariableDiscovery: Fetched assets:', assets);

//         window.discoveredVariables = []; // Reset before populating
//         window.variableMap.clear(); // Reset variableMap

//         if (Array.isArray(assets)) {
//             assets.forEach(asset => {
//                 if (asset && asset.name && typeof asset.name === 'string' && asset.name.startsWith('--')) {
//                     if (!window.discoveredVariables.includes(asset.name)) {
//                         window.discoveredVariables.push(asset.name);
//                     }
//                     window.variableMap.set(asset.name, {
//                         id: asset.id,
//                         value: asset.value,
//                         references: getReferencedVariables(asset.value),
//                         isImportant: asset.is_important,
//                         source: asset.source,
//                         variants: asset.variants ? asset.variants.map(v => ({
//                             breakpoint: v.breakpoint,
//                             value: v.value,
//                             references: getReferencedVariables(v.value)
//                         })) : []
//                     });
//                 }
//             });
//         } else {
//             console.warn('[DEBUG] initSharedCssVariableDiscovery: Fetched assets is not an array:', assets);
//         }

//         console.log('[DEBUG] initSharedCssVariableDiscovery: Final discoveredVariables:', JSON.parse(JSON.stringify(window.discoveredVariables)));
//         console.log('[DEBUG] initSharedCssVariableDiscovery: Final variableMap size:', window.variableMap.size);

//     } catch (error) {
//         console.error('[DEBUG] initSharedCssVariableDiscovery: Error fetching/processing variables:', error);
//         window.discoveredVariables = []; // Clear on error to ensure clean state
//         window.variableMap.clear();
//     } finally {
//         // Always reapply styles, even on error, to clear any invalid states
//         if (typeof window.reapplyAllVariableValueStyles === 'function') {
//             window.reapplyAllVariableValueStyles();
//         }
//     }
// }

// function initSharedCssVariableDiscovery(stylingId) {
//     console.log('[DEBUG] initSharedCssVariableDiscovery CALLED with stylingId:', stylingId);

//     if (!stylingId && window.currentStylingId) {
//         stylingId = window.currentStylingId;
//     }

//     // Clear previous data immediately if no stylingId
//     if (!stylingId) {
//         console.log('[DEBUG] initSharedCssVariableDiscovery: No stylingId. Clearing discoveredVariables and variableMap.');
//         window.discoveredVariables = [];
//         window.variableMap.clear();
//         if (typeof window.reapplyAllVariableValueStyles === 'function') {
//             window.reapplyAllVariableValueStyles();
//         }
//         return Promise.resolve();
//     }

//     console.log(`[DEBUG] initSharedCssVariableDiscovery: Fetching variables from: ${API_BASE_URL}/brand-stylings/${stylingId}/assets-with-inheritance`);

//     return apiFetch(`${API_BASE_URL}/brand-stylings/${stylingId}/assets-with-inheritance`)
//         .then(response => {
//             console.log('[DEBUG] initSharedCssVariableDiscovery: API response status:', response.status);
//             if (!response.ok) {
//                 return response.text().then(text => {
//                     throw new Error(`HTTP error for variable discovery: ${response.status} - ${text || 'Unknown API error'}`);
//                 });
//             }
//             return response.json();
//         })
//         .then(assets => {
//             console.log('[DEBUG] initSharedCssVariableDiscovery: Fetched assets for variables:', assets);
//             window.discoveredVariables = []; // Reset before populating
//             window.variableMap.clear(); // Reset variableMap

//             if (Array.isArray(assets)) {
//                 assets.forEach(asset => {
//                     if (asset && asset.name && asset.name.startsWith('--')) {
//                         if (!window.discoveredVariables.includes(asset.name)) {
//                             window.discoveredVariables.push(asset.name);
//                         }
//                         // Populate variableMap
//                         window.variableMap.set(asset.name, {
//                             id: asset.id,
//                             value: asset.value, // Raw value from DB/API
//                             references: getReferencedVariables(asset.value), // Parsed direct references
//                             isImportant: asset.is_important,
//                             source: asset.source, // 'local' or 'inherited'
//                             // Include variants if needed for more complex cycle detection across breakpoints
//                             variants: asset.variants ? asset.variants.map(v => ({
//                                 breakpoint: v.breakpoint,
//                                 value: v.value,
//                                 references: getReferencedVariables(v.value)
//                             })) : []
//                         });
//                     }
//                 });
//             } else {
//                 console.warn('[DEBUG] initSharedCssVariableDiscovery: Fetched assets is not an array:', assets);
//             }
//             console.log('[DEBUG] initSharedCssVariableDiscovery: Final discoveredVariables:', JSON.parse(JSON.stringify(window.discoveredVariables)));
//             console.log('[DEBUG] initSharedCssVariableDiscovery: Final variableMap size:', window.variableMap.size);
//             // For detailed map logging: console.log('[DEBUG] initSharedCssVariableDiscovery: Final variableMap:', Object.fromEntries(window.variableMap));


//             if (typeof window.reapplyAllVariableValueStyles === 'function') {
//                 window.reapplyAllVariableValueStyles();
//             }
//         })
//         .catch(error => {
//             console.error('[DEBUG] initSharedCssVariableDiscovery: Error fetching/processing variables:', error);
//             window.discoveredVariables = []; // Clear on error
//             window.variableMap.clear();
//             if (typeof window.reapplyAllVariableValueStyles === 'function') {
//                 window.reapplyAllVariableValueStyles();
//             }
//             // return Promise.reject(error); // Optionally propagate the error
//         });
// }

/**
 * Checks for circular references using Depth-First Search (DFS).
 * @param {string} startVarName - The variable name being defined or edited.
 * @param {string} referencedVarName - The variable name being referenced in startVarName's value.
 * @param {Map<string, {references: Array<string>}>} varMap - The map of all variables and their direct references.
 * @returns {boolean} True if a circular reference is detected, false otherwise.
 */
function isCircularReference(startVarName, referencedVarName, varMap) {
    if (!varMap.has(referencedVarName)) {
        return false; // Cannot be circular if the referenced variable doesn't exist in the map
    }

    const path = new Set();
    const stack = [];

    // Initial check: if startVarName is trying to reference itself directly.
    if (startVarName === referencedVarName) return true;

    // Start DFS from the variable that `startVarName` *would* reference.
    // We want to see if this `referencedVarName` eventually leads back to `startVarName`.
    stack.push(referencedVarName);

    while (stack.length > 0) {
        const currentVar = stack.pop();

        if (path.has(currentVar)) {
            // This means we've already processed this node in the current traversal path.
            // If it wasn't startVarName, it might be part of another cycle not involving startVarName directly,
            // but our main concern is if currentVar *is* startVarName.
            continue;
        }
        path.add(currentVar);

        const varDetails = varMap.get(currentVar);
        if (varDetails && varDetails.references) {
            for (const depName of varDetails.references) {
                if (depName === startVarName) {
                    return true; // Cycle detected: a dependency leads back to the original variable.
                }
                if (!path.has(depName) && varMap.has(depName)) { // Only push if not visited in current path and exists
                    stack.push(depName);
                }
            }
        }
    }
    return false;
}


function updateValueInputVariableStyle(inputElement) {
    if (!inputElement) return;

    const value = inputElement.value.trim();
    const varRegex = /var\(\s*(--[a-zA-Z0-9-_]+)\s*\)/; // Simplified regex for single var detection
    const match = value.match(varRegex);

    // Determine the name of the variable being edited (the "LHS" variable)
    // This requires the inputElement to be part of a structure that holds this info.
    // Assuming the variable row has a data attribute 'data-variable-name'
    const variableRow = inputElement.closest('.variable-row');
    const currentEditingVariableName = variableRow ? variableRow.dataset.variableName : null;

    if (match) {
        const referencedVarName = match[1]; // The variable name inside var()
        let statusToSet = 'none';
        let iconMessage = '';

        if (!window.discoveredVariables.includes(referencedVarName)) {
            statusToSet = 'warning';
            iconMessage = `Variable ${referencedVarName} is not defined.`;
        } else {
            // Variable exists, now check for circular reference
            if (currentEditingVariableName && window.variableMap.size > 0) {
                if (isCircularReference(currentEditingVariableName, referencedVarName, window.variableMap)) {
                    statusToSet = 'error';
                    iconMessage = `Circular reference: ${currentEditingVariableName} cannot reference ${referencedVarName} through this chain.`;
                } else {
                    statusToSet = 'valid_var'; // Exists and not circular
                    iconMessage = `Variable ${referencedVarName} is valid.`;
                }
            } else {
                // Cannot perform circular check if currentEditingVariableName is unknown or variableMap is empty
                // but we know it's a discovered variable.
                statusToSet = 'valid_var';
                 iconMessage = `Variable ${referencedVarName} is valid (circular check pending context).`;
            }
        }
        
        if (typeof window.updateValueStatusIcon === 'function') {
            window.updateValueStatusIcon(inputElement, statusToSet, iconMessage);
        }

    } else {
        // Value is not a 'var(...)' or is empty. Clear any existing status.
        if (typeof window.updateValueStatusIcon === 'function') {
            window.updateValueStatusIcon(inputElement, 'none');
        }
    }
};

// Ensure reapplyAllVariableValueStyles calls the updated function
function reapplyAllVariableValueStyles() {
    console.log("[StyleUpdate] Re-applying styles/validation to all relevant variable value inputs.");
    document.querySelectorAll('.variable-value-wrapper .variable-value-input').forEach(inputEl => {
        if (typeof window.updateValueInputVariableStyle === 'function') {
            window.updateValueInputVariableStyle(inputEl);
        }
    });
    // Also for variants if they have a similar input structure and validation needs
    document.querySelectorAll('.variant-value .editable-field').forEach(inputEl => { // Assuming variant values also need this
        if (typeof window.updateValueInputVariableStyle === 'function') {
            // Note: For variants, currentEditingVariableName might need different logic
            // or circular checks might be scoped differently.
            // For now, it will attempt validation.
            window.updateValueInputVariableStyle(inputEl);
        }
    });
};



// ...
/**
 * Resolves a CSS variable name to its root primitive value.
 * It checks for missing variables and circular references during the resolution.
 *
 * @param {string} targetVarName - The CSS variable name to resolve (e.g., "--my-color").
 * @param {Map<string, {value: string, references?: Array<string>}>} variableMap - The map of all variables.
 * The `value` is the direct value string.
 * @param {Set<string>} [visitedInPath=new Set()] - Used internally to detect circular references
 * during a single resolution attempt for the initial targetVarName.
 * @param {number} [depth=0] - Current recursion depth to prevent overly long chains.
 * @returns {object} An object describing the outcome:
 * - { status: 'resolved', value: string, originalTarget: string }
 * - { status: 'missing', value: string (original var() string), originalTarget: string, missingVar: string }
 * - { status: 'circular', value: string (original var() string), originalTarget: string, cyclePath: string[] }
 * - { status: 'depth_limit', value: string (original var() string), originalTarget: string, message: string }
 * - { status: 'not_a_css_var', value: string (original input), originalTarget: string }
 */
function getResolvedCssVariableValue(targetVarName, variableMap, visitedInPath = new Set(), depth = 0) {
    const MAX_RESOLUTION_DEPTH = 20;
    // console.log(`[Resolver LVL ${depth}] Attempting to resolve: ${targetVarName}, Path: ${Array.from(visitedInPath).join(' -> ')}`); // DEBUG

    if (typeof targetVarName !== 'string' || !targetVarName.startsWith('--')) {
        // console.log(`[Resolver LVL ${depth}] Not a CSS var: ${targetVarName}. Returning as resolved.`); // DEBUG
        return { status: 'not_a_css_var', value: targetVarName, originalTarget: targetVarName };
    }

    if (depth > MAX_RESOLUTION_DEPTH) {
        // console.warn(`[Resolver LVL ${depth}] Exceeded max depth for ${targetVarName}.`); // DEBUG
        return { status: 'depth_limit', value: `var(${targetVarName})`, originalTarget: targetVarName, message: `Exceeded max resolution depth of ${MAX_RESOLUTION_DEPTH}.` };
    }

    if (!variableMap.has(targetVarName)) {
        // console.warn(`[Resolver LVL ${depth}] Missing var: ${targetVarName}.`); // DEBUG
        return { status: 'missing', value: `var(${targetVarName})`, originalTarget: targetVarName, missingVar: targetVarName };
    }

    if (visitedInPath.has(targetVarName)) {
        // console.warn(`[Resolver LVL ${depth}] Circular reference detected for ${targetVarName}. Path: ${Array.from(visitedInPath).join(' -> ')} -> ${targetVarName}`); // DEBUG
        return { status: 'circular', value: `var(${targetVarName})`, originalTarget: targetVarName, cyclePath: [...visitedInPath, targetVarName] };
    }

    visitedInPath.add(targetVarName);

    const varDetails = variableMap.get(targetVarName);
    const currentValue = varDetails.value;
    // console.log(`[Resolver LVL ${depth}] Var: ${targetVarName}, Direct Value: "${currentValue}"`); // DEBUG

    // MODIFIED REGEX: To correctly parse var(--name) even if it has a fallback var(--name, fallback)
    const varRefRegex = /^var\(\s*(--[a-zA-Z0-9-_]+)\s*(?:,[^)]*)?\)$/; // <-- MODIFIED LINE
    const match = typeof currentValue === 'string' ? currentValue.trim().match(varRefRegex) : null;

    let result;
    if (match) {
        const referencedVarName = match[1];
        // console.log(`[Resolver LVL ${depth}] ${targetVarName} is var, referencing: ${referencedVarName}. Recursing.`); // DEBUG
        result = getResolvedCssVariableValue(referencedVarName, variableMap, new Set(visitedInPath), depth + 1);
    } else {
        // console.log(`[Resolver LVL ${depth}] ${targetVarName} is primitive: "${currentValue}". Resolved.`); // DEBUG
        result = { status: 'resolved', value: currentValue, originalTarget: targetVarName };
    }
    
    // console.log(`[Resolver LVL ${depth}] Returning for ${targetVarName}:`, JSON.parse(JSON.stringify(result))); // DEBUG
    return result;
}







// Make it globally accessible if it's going to be called from other files like variable-previews.js
window.getResolvedCssVariableValue = getResolvedCssVariableValue;

window.isCircularReference = isCircularReference; 
window.reapplyAllVariableValueStyles =reapplyAllVariableValueStyles;
window.showSuggestionsForEditor = showSuggestionsForEditor;
window.initSharedCssVariableDiscovery = initSharedCssVariableDiscovery;
window.insertNewCssRuleEditor = insertNewCssRuleEditor;
window.updateValueInputVariableStyle = updateValueInputVariableStyle
window.hideSuggestionsForEditor = hideSuggestionsForEditor; // For global click listener
window.currentEditorSuggestionInput = () => currentSuggestionInput; // Getter for global click listener
window.editorSuggestionsBoxElement = () => suggestionsBoxElement; // Getter for global click listener