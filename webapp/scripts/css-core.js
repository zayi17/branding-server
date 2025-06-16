// CSS Variables
// Object to hold CSS properties and their values
function generateCssWithGroups(properties, groups) {
    let css = ":root {\n";

    // Regular properties
    for (const groupName in groups) {
        if (groups[groupName].length === 0) continue;
        css += `  /* GROUP: ${groupName} */\n`;

        for (const propertyName of groups[groupName]) {
            const property = properties[propertyName];
            if (!property) continue;

            const importantStr = property.isImportant ? " !important" : "";
            css += `  ${propertyName}: ${property.value}${importantStr};\n`;
        }

        css += "\n";
    }

    css += "}\n\n";

    // Create a map of breakpoints to their rules
    const breakpointRules = {};

    // Process all variants
    for (const propertyName in properties) {
        const property = properties[propertyName];
        if (!property.variants || property.variants.length === 0) continue;

        // Group variants by breakpoint
        property.variants.forEach(variant => {
            if (!breakpointRules[variant.breakpoint]) {
                breakpointRules[variant.breakpoint] = [];
            }

            const importantStr = variant.isImportant ? " !important" : "";
            breakpointRules[variant.breakpoint].push(
                `    ${propertyName}: ${variant.value}${importantStr};`
            );
        });
    }

    // Generate media queries for each breakpoint
    for (const breakpoint in breakpointRules) {
        // Get the appropriate media query based on breakpoint name
        let mediaQueryString;
        switch(breakpoint) {
            case 'mobile':
                mediaQueryString = "@media (max-width: 767px)";
                break;
            case 'tablet':
                mediaQueryString = "@media (min-width: 768px) and (max-width: 1023px)";
                break;
            case 'desktop':
                mediaQueryString = "@media (min-width: 1024px)";
                break;
            default:
                // For custom breakpoints, use the value directly
                mediaQueryString = `@media (${breakpoint})`;
        }

        // Add the media query with its rules
        css += `${mediaQueryString} {\n`;
        css += "  :root {\n";
        css += breakpointRules[breakpoint].join('\n');
        css += "\n  }\n";
        css += "}\n\n";
    }

    return css;
}

// Collect properties from the UI
// This function gathers all the properties and their values from the UI
// Collect properties from the UI
// This function gathers all the properties and their values from the UI
// Collect properties from the UI
// function collectProperties() {
//     const properties = {};
//     const groups = collectGroups(); // Get groups first
    
//     // Create reverse mapping from property name to group
//     const propToGroup = {};
//     for (const groupName in groups) {
//         for (const propName of groups[groupName]) {
//             propToGroup[propName] = groupName;
//         }
//     }

//     document.querySelectorAll('.variable-row').forEach(row => {
//         const nameField = row.querySelector('.variable-name .editable-field');
//         const valueField = row.querySelector('.variable-value-wrapper .variable-value-input:last-child');
//         const importanceCheckbox = row.querySelector('.importance-checkbox');
        
//         // CRITICAL FIX: Find what container this row is inside by traversing up to section
//         let containerType = "other";
        
//         // Find closest parent with data-type
//         const imagesContainer = document.getElementById('images-container');
//         const colorsContainer = document.getElementById('colors-container');
//         const typographyContainer = document.getElementById('typography-container');
//         const dimensionsContainer = document.getElementById('dimensions-container');
        
//         // Check which container this row is inside
//         if (imagesContainer && imagesContainer.contains(row)) {
//             containerType = "image";
//         } else if (colorsContainer && colorsContainer.contains(row)) {
//             containerType = "color";
//         } else if (typographyContainer && typographyContainer.contains(row)) {
//             containerType = "typography";
//         } else if (dimensionsContainer && dimensionsContainer.contains(row)) {
//             containerType = "dimension";
//         } else {
//             containerType = "other";
//         }

//         if (nameField && valueField) {
//             const name = nameField.value;
            
//             properties[name] = {
//                 value: valueField.value,
//                 isImportant: importanceCheckbox && importanceCheckbox.checked,
//                 type: containerType, 
//                 group: propToGroup[name] || "General", // Use group from mapping
//                 variants: []
//             };

//             // Collect variants for this property
//             const variantsContainer = row.querySelector('.variable-variants');
//             if (variantsContainer && !variantsContainer.classList.contains('hidden')) {
//                 const variantRows = variantsContainer.querySelectorAll('.variant-row');
//                 variantRows.forEach(variantRow => {
//                     const variantValueField = variantRow.querySelector('.variant-value .editable-field');
//                     const variantImportanceCheckbox = variantRow.querySelector('.importance-checkbox');
//                     const breakpoint = variantRow.dataset.breakpoint;

//                     // Add check for variant value field
//                     if (variantValueField && breakpoint) {
//                         properties[name].variants.push({
//                             breakpoint: breakpoint,
//                             value: variantValueField.value,
//                             isImportant: variantImportanceCheckbox && variantImportanceCheckbox.checked
//                         });
//                     } else {
//                         console.warn("Skipping variant row due to missing value field or breakpoint.", variantRow);
//                     }
//                 });
//             }
//         } else {
//             // Log if nameField or valueField were not found at all for a row
//             console.warn("Skipping variable row because nameField or valueField elements were not found.", row);
//         }
//     });

//     return properties;
// }

// Collect groups from the UI
// This function gathers all the groups and their variables from the UI
// Updated collectGroups function to use original group names from data attributes
function collectGroups() {
    const groups = {};
    
    // Get all CSS Elements containers
    document.querySelectorAll('.css-elements-container').forEach(container => {
        // First check for the original group name stored in data attribute
        let groupName;
        
        if (container.hasAttribute('data-original-group-name')) {
            groupName = container.getAttribute('data-original-group-name');
        } else {
            // Fallback to the visible title if data attribute isn't set
            const titleElement = container.querySelector('.css-elements-title');
            if (titleElement) {
                groupName = titleElement.textContent.trim();
            }
        }
        
        if (!groupName) {
            console.warn("Could not determine group name for container:", container);
            return; // Skip this container
        }
        
        console.log(`Collecting variables for group: "${groupName}"`); // Debug log
        groups[groupName] = [];

        // For each variable row in this container, get its name and group information
        container.querySelectorAll('.variable-row').forEach(row => {
            const nameField = row.querySelector('.variable-name .editable-field');
            
            // Check if the row has its own group name (which might differ from container)
            const rowGroupName = row.hasAttribute('data-group-name') ? 
                                row.getAttribute('data-group-name') : groupName;
            
            if (nameField && nameField.value) {
                const variableName = nameField.value.trim();
                
                // Ensure group exists
                if (!groups[rowGroupName]) {
                    groups[rowGroupName] = [];
                }
                
                // Add to the variable's actual group (which might be different from container's group)
                groups[rowGroupName].push(variableName);
                // console.log(`Added variable "${variableName}" to group "${rowGroupName}"`); // Debug log
            }
        });
    });
    
    console.log("Collected groups:", groups); // Debug log full result
    return groups;
}

// Update CSS output
// This function generates the CSS output based on the current variables and groups
// function updateCssOutput() {
//     // Skip updates if modal is open
//     if (window.modalOpen) {
//         console.log("Modal is open, skipping CSS update");
//         return;
//     }
    
//     console.log("Updating CSS output");
    
//     // Collect all CSS properties from the UI
//     const properties = collectProperties();
//     const groups = collectGroups();
    
//     // Generate CSS with grouped comments
//     const css = generateCssWithGroups(properties, groups);
    
//     // Update the CSS output element
//     if (cssOutput) {
//         cssOutput.textContent = css;
//     }
    
//     // If we're connected to a database and have a current styling ID, sync changes
//     if (window.currentStylingId && typeof syncCssWithDatabase === 'function') {
//         // Consider debouncing this call to prevent too many API requests
//         syncCssWithDatabase(window.currentStylingId, properties, groups);
//     }
// }


// In css-core.js

// Collect properties from the UI and the groups they belong to
// This function gathers all the properties and their values from the UI,
// and also returns the groups collected.
// Inside css-core.js - conceptual change for collectGroups

function collectGroups() {
    const groups = {};
    const mainVariablesContainer = document.getElementById('css-elements-background'); // Your main container

    if (!mainVariablesContainer) {
        console.error("Main variables container 'css-elements-background' not found.");
        return groups;
    }

    // Find ACTUAL group containers. These are the direct children of 'css-elements-background'
    // that are also 'css-elements-container' AND have a 'data-original-group-name' attribute.
    // (as created by processAssetsIntoGroups in ui-renderings.js and makeRowOfStandardGroup in templates.js)
    const groupContainers = mainVariablesContainer.querySelectorAll(':scope > .css-elements-container[data-original-group-name]');

    groupContainers.forEach(groupElement => {
        const groupName = groupElement.dataset.originalGroupName; // Get the actual group name
        if (groupName) {
            if (!groups[groupName]) {
                groups[groupName] = [];
            }
            // Now, collect properties for THIS specific groupElement
            // This is where collectProperties (or its logic) should be focused.
            // It needs to find '.variable-row' elements *within this groupElement*.
            const variableRows = groupElement.querySelectorAll('.variable-row');
            variableRows.forEach(row => {
                const nameField = row.querySelector('.variable-name .editable-field');
                // THE CRITICAL SELECTOR FOR VALUE:
                const valueField = row.querySelector('.variable-value-wrapper .variable-value-input');

                if (nameField && valueField && nameField.value.trim()) {
                    const varName = nameField.value.trim();
                    // Add to groups[groupName] (this part depends on how collectProperties structures its return)
                    // For example, if collectProperties returns an array of variable names for the group:
                    // groups[groupName].push(varName);

                    // Or, if collectProperties directly populates a shared 'properties' object:
                    // (This is more complex to show without seeing your exact collectProperties)
                } else if (nameField && nameField.value.trim()) {
                     console.warn(`Value field not found for variable '${nameField.value.trim()}' in group '${groupName}'. Ensure selector is '.variable-value-wrapper .variable-value-input'`, row);
                }
            });
        } else {
            console.warn("Group element found without 'data-original-group-name'", groupElement);
        }
    });

    console.log("Collected groups:", groups); // For debugging
    return groups;
}



function collectProperties(/* parameters might include the groups object or a specific group element */) {
    const properties = {};
    // This function MUST correctly iterate through .variable-row elements
    // and use:
    // const nameField = row.querySelector('.variable-name .editable-field');
    // const valueField = row.querySelector('.variable-value-wrapper .variable-value-input');

    // Example if iterating globally (less ideal, better to scope to groups):
    document.querySelectorAll('#css-elements-background .variable-row').forEach(row => {
        const nameField = row.querySelector('.variable-name .editable-field');
        const valueField = row.querySelector('.variable-value-wrapper .variable-value-input');
        const isImportantCheckbox = row.querySelector('.variable-importance .importance-checkbox');
        const groupName = row.closest('.css-elements-container[data-original-group-name]')?.dataset.originalGroupName;


        if (nameField && valueField && nameField.value.trim() && groupName) {
            const varName = nameField.value.trim();
            properties[varName] = {
                value: valueField.value.trim(),
                isImportant: isImportantCheckbox ? isImportantCheckbox.checked : false,
                type: row.dataset.type || 'unknown', // Get type from row's data attribute
                group: groupName, // Associate with the correct group
                // id: row.dataset.assetId // Include asset ID if available and needed by /sync
            };
        } else if (!nameField || !valueField) {
             console.warn("collectProperties: Skipping a row due to missing name or value field. Check selectors and DOM structure.", row);
        }
    });
    return properties;
}

// Update CSS output
// This function generates the CSS output based on the current variables and groups
function updateCssOutput() {
    // Skip updates if modal is open
    if (window.modalOpen) {
        console.log("Modal is open, skipping CSS update");
        return;
    }
    
    console.log("Updating CSS output");
    
    // Collect all CSS properties and groups from the UI in one go
    const { properties, groups } = collectProperties(); // collectProperties now returns groups as well
    // const groups = collectGroups(); // THIS LINE IS NO LONGER NEEDED
    
    // Generate CSS with grouped comments
    const css = generateCssWithGroups(properties, groups);
    
    // Update the CSS output element
    const cssOutput = document.getElementById('css-output'); // Assuming cssOutput is fetched here or globally
    if (cssOutput) {
        cssOutput.textContent = css;
    }
    
    // If we're connected to a database and have a current styling ID, sync changes
    if (window.currentStylingId && typeof syncCssWithDatabase === 'function') {
        // Consider debouncing this call to prevent too many API requests
        syncCssWithDatabase(window.currentStylingId, properties, groups);
    }
}

// Fallback to client generation
// This function is called when the CSS output is not available
function fallbackToClientGeneration() {
    const properties = collectProperties();
    const groups = collectGroups();
    cssOutput.textContent = generateCssWithGroups(properties, groups);
}


// Function to update the visual UI elements based on parsed CSS data
// This is called after fetching CSS or after saving changes.
// It now accepts optional inheritance data.
function updateUiFromParsedCss(properties, groups, inheritanceData = null) { // Accept inheritanceData parameter
    console.log("Updating UI from parsed CSS data:", { properties, groups, inheritanceData });

    // Map internal types to container IDs
    const typeContainerMap = {
        color: 'colors-container',
        font: 'typography-container',
        dimension: 'dimensions-container',
        image: 'images-container',
        selector: 'selector-container', // Added selector container based on your HTML
        other: 'other-container' // Added other container
    };

    // Clear existing content in containers, preserving headers and add rows
    const assetContainers = document.querySelectorAll('.css-elements-container');
    assetContainers.forEach(container => {
         // Find the parent of the current group container
         const parentContainer = container.parentElement;
         // Find the add row *before* clearing
        const addRow = container.querySelector('.add-variable-row');
        const header = container.querySelector('.css-elements-header'); // Preserve header too

        // Create a temporary container to hold the elements to preserve
        const tempContainer = document.createElement('div');
         if (header) tempContainer.appendChild(header);
        if (addRow) tempContainer.appendChild(addRow);


        // Clear the original container's content
        container.innerHTML = '';

        // Append the preserved elements back
        while (tempContainer.firstChild) {
             container.appendChild(tempContainer.firstChild);
         }
    });


     // Create a map of assets with inheritance data by asset ID for easy lookup
    const inheritanceDataMap = {};
    if (inheritanceData && inheritanceData.assets) {
        inheritanceData.assets.forEach(assetWithInheritance => {
            inheritanceDataMap[assetWithInheritance.id] = assetWithInheritance;
        });
    }


    // Rebuild UI for each group
    for (const groupName in groups) {
        const propertyNames = groups[groupName];
        if (!propertyNames || propertyNames.length === 0) continue;

         // Find an existing container for this group, or determine type for a new one
        let container = null;
        let containerType = 'other'; // Default type if group name doesn't map directly

         // Attempt to find an existing container by original group name
         const existingContainer = document.querySelector(`.css-elements-container[data-original-group-name="${groupName}"]`);
         if (existingContainer) {
              container = existingContainer;
              containerType = container.dataset.type || 'other'; // Get type from existing container
         } else {
              // If no existing container, determine type from properties in this group
              for (const propertyName of propertyNames) {
                 const property = properties[propertyName]; // properties object is keyed by propertyName
                 if (property && property.type) {
                     containerType = property.type.toLowerCase(); // Use the type of the first property found
                     break;
                 }
             }

             // Get the container element based on the determined type
             const containerId = typeContainerMap[containerType] || typeContainerMap['other'];
             container = document.getElementById(containerId);

             // If container exists and doesn't have this group yet, create the group structure
             if (container && !container.querySelector(`.css-elements-container[data-original-group-name="${groupName}"]`)) {
                const groupId = `${containerType}-${groupName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`;

                const groupHtml = `
                     <div class="css-elements-container" id="${groupId}-container" data-type="${containerType}" data-original-group-name="${groupName}">
                         <div class="css-elements-header">
                             <h3 class="css-elements-title">${groupName}</h3>
                             <div class="css-elements-actions">
                                 <button class="button button-primary" data-group="${groupId}" data-original-group-name="${groupName}">
                                     <i class="fas fa-plus icon"></i> Add ${capitalizeFirstLetter(containerType)}
                                 </button>
                                 <button class="action-button delete-group" title="Delete Group">
                    <i class="fas fa-times"></i>
                                 </button>
                             </div>
                         </div>
                         <div class="css-variables-table">
                             <div class="variable-group" id="${groupId}-variables">
                                 <div class="add-variable-row" data-group="${groupId}" data-type="${containerType}" data-original-group-name="${groupName}">
                                     <i class="fas fa-plus icon"></i>
                                     <span>Add ${capitalizeFirstLetter(containerType)} variable</span>
                                 </div>
                             </div>
                         </div>
                     </div>
                 `;
                 container.insertAdjacentHTML('beforeend', groupHtml);
                 container = document.getElementById(`${groupId}-container`); // Update container reference
             }
         }

        if (!container) {
            console.warn(`Container or group structure for group "${groupName}" not found or created. Skipping variables in this group.`);
            continue; // Skip this group if container wasn't found/created
        }


        // Get the variables container and add row within the correct group container
        const variablesContainer = container.querySelector('.variable-group'); // Assumes one variable-group per css-elements-container
        const addVariableRow = variablesContainer ? variablesContainer.querySelector('.add-variable-row') : null;

        if (!variablesContainer || !addVariableRow) {
             console.error(`Variables container or add row not found for group "${groupName}". Cannot add variables.`);
             continue;
        }


        // Add each property in this group to the UI
        for (const propertyName of propertyNames) {
            const property = properties[propertyName]; // properties object is keyed by propertyName
            if (!property) continue;

            // Find the inheritance data for this specific asset using the map
            // Note: The properties object from parsing doesn't have asset IDs.
            // We need to match by name and type, which is fragile, or ideally
            // the parsed properties should include the original asset ID.
            // Assuming the backend ensures unique names within a type/group
            // for simplicity here, but matching by ID is more robust.
             const assetInheritanceData = inheritanceDataMap[property.id] // Try matching by ID first (if available in parsed data)
                                           || (inheritanceData && inheritanceData.assets
                                             ? inheritanceData.assets.find(a => a.name === propertyName && a.type === property.type) // Fallback match by name and type
                                             : null);

            // Ensure property has an ID for correct data-asset-id
            const assetId = property.id || Date.now().toString(); // Use property.id if available, fallback to temp


            // Create HTML for this property using makeRowOfVariable, passing inheritance data
            // Make sure makeRowOfVariable is accessible (either global or imported)
            if (typeof makeRowOfVariable === 'function') {
                 // Construct an asset-like object expected by makeRowOfVariable
                const assetForTemplate = {
                    id: property.id || assetId, // Preserve the actual database ID if available
                    type: property.type,
                    name: propertyName,
                    value: property.value,
                    is_important: property.isImportant,
                    group_name: groupName,
                    variants: property.variants || [],
                };

                const variableHtml = makeRowOfVariable(assetForTemplate, assetInheritanceData);


                // Insert before the "add variable" row
                addVariableRow.insertAdjacentHTML('beforebegin', variableHtml);

                // Get the new row element reference after insertion
                const newRow = addVariableRow.previousElementSibling;

                // Initialize row event listeners for the new row
                if (newRow && typeof initRowEventListeners === 'function') {
                   initRowEventListeners(newRow); // This should handle the !important checkbox and icon update
                }

                // Add variants if they exist for this property, passing their inheritance data
                if (newRow && property.variants && property.variants.length > 0) {
                    const variantsContainer = newRow.querySelector('.variable-variants');
                    if (variantsContainer) {
                        variantsContainer.classList.remove('hidden');
                        property.variants.forEach(variant => {
                            // Find inheritance data for the variant using the map or by matching
                            const variantInheritanceData = assetInheritanceData && assetInheritanceData.variants
                               ? assetInheritanceData.variants.find(v => v.id === variant.id) // Try matching by variant ID (if available)
                               : null; // No fallback match for variants here without asset inheritance data

                             // Make sure addVariantToRow is accessible
                            if (typeof addVariantToRow === 'function') {
                                 // addVariantToRow expects asset, variant, variantsContainer, type, inheritanceData
                                 // Need to pass the parent asset object structure, not just the variant
                                addVariantToRow(assetForTemplate, variant, variantsContainer, property.type, variantInheritanceData);
                             } else {
                                 console.error("addVariantToRow function not found.");
                             }
                        });
                    }
                }

            } else {
                 console.error("makeRowOfVariable function not found. Cannot render variable row.");
            }
        }

        // Initialize group event listeners after populating
        if (container && typeof initGroupEventListeners === 'function') {
            initGroupEventListeners(container, containerType);
        } else {
            console.error("initGroupEventListeners function not found or container missing.");
        }
    }

    // After rendering, ensure all new rows have their icons updated initially
     document.querySelectorAll('.variable-row').forEach(updateInheritanceIcon);
     document.querySelectorAll('.variant-row').forEach(updateInheritanceIcon);


    // Re-initialize action buttons to ensure listeners are attached to new buttons
    // Assuming initActionButtons is available globally or imported
    if (typeof initActionButtons === 'function') {
         initActionButtons();
     } else {
         console.warn("initActionButtons function not found.");
     }

    // Finally, update the CSS output preview
    // This might be redundant as syncCssWithDatabase already does this,
    // but keeping it here ensures the display is current after UI rebuild.
    // updateCssOutput(); // This function triggers syncCssWithDatabase again, might cause loop.
                       // Let's rely on the updateCssOutput call triggered by input/change listeners instead.

}

// Helper function to generate preview HTML based on type and value
function getPreviewHtml(type, value) {
    if (type === 'color') {
        return `
            <div class="variable-preview">
                <div class="color-preview" style="background-color: ${value};"></div>
                <input type="color" class="color-picker-input" value="${value}" style="display: none;">
            </div>
        `;
    } else if (type === 'image') {
        return `
            <div class="variable-preview">
                <img src="${value}" alt="Image preview" style="max-height: 24px; max-width: 100%;">
            </div>
        `;
    } else if (type === 'font') {
        return `
            <div class="variable-preview" style="padding: 0 var(--padding-xs);">
                <span style="font-family: ${value}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 14px;">
                    Aa Bb Cc
                </span>
            </div>
        `;
    } else {
        // For dimensions, create a visual representation
        let height = '8px';
        if (value.includes('px')) {
            const match = value.match(/(\d+)px/);
            if (match && match[1]) {
                height = Math.min(24, parseInt(match[1])) + 'px';
            }
        }
        
        return `
            <div class="variable-preview" style="padding: 0 var(--padding-xs);">
                <div style="content: "dimension"; width: 100%; height: 100%; background-color: #FDD94C;"></div>
            </div>
        `;
    }
}

// Helper function to add variants to a row
function addVariantsToRow(row, property) {
    const variantsContainer = row.querySelector('.variable-variants');
    if (!variantsContainer) return;
    
    // Make variants visible
    variantsContainer.classList.remove('hidden');
    
    // Add each variant
    property.variants.forEach(variant => {
        const variantId = Date.now().toString();
        const breakpointLabel = capitalizeFirstLetter(variant.breakpoint);
        let previewHtml = '';
        
        // Add preview based on variable type
        if (property.type === 'color' && isValidColor(variant.value)) {
            previewHtml = `
                <div class="variable-preview">
                    <div class="color-preview" style="background-color: ${variant.value};"></div>
                    <input type="color" class="color-picker-input" value="${variant.value}" style="display: none;">
                </div>
            `;
        } else if (property.type === 'font') {
            previewHtml = `
                <div class="variant-preview">
                    <span style="font-family: ${variant.value}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 14px;">
                        Aa
                    </span>
                </div>
            `;
        } else if (property.type === 'dimension') {
            let height = '8px';
            if (variant.value.includes('px')) {
                const match = variant.value.match(/(\d+)px/);
                if (match && match[1]) {
                    height = Math.min(20, parseInt(match[1])) + 'px';
                }
            }
            
            previewHtml = `
                <div class="variant-preview">
                    <div style="width: 20px; height: ${height}; background-color: var(--accent-hover);"></div>
                </div>
            `;
        }
        
        const variantHtml = `
            <div class="variant-row" data-id="${variantId}" data-database-id="${variant.id}" data-breakpoint="${variant.breakpoint}">
                <div class="variant-breakpoint">${breakpointLabel}</div>
                <div class="variant-value">
                    <input type="text" class="editable-field" value="${variant.value}" spellcheck="false">
                </div>
                ${previewHtml}
                <div class="variant-importance">
                    <input type="checkbox" class="importance-checkbox" title="Apply !important" ${variant.isImportant ? 'checked' : ''}>
                </div>
                <div class="variant-actions">
                    <button class="action-button delete" title="Delete Variant">
                    <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `;
        
        variantsContainer.insertAdjacentHTML('beforeend', variantHtml);
    });
    
    // Attach event listeners to variant rows
    const variantRows = variantsContainer.querySelectorAll('.variant-row');
    variantRows.forEach(variantRow => {
        const deleteBtn = variantRow.querySelector('.action-button.delete');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', function() {
                if (confirm('Delete this variant?')) {
                    //const variantId = variantRow.dataset.databaseId || variantRow.dataset.id;
                    
                    // Fix: Get the parent variable row using closest()
                    //const parentRow = variantRow.closest('.variable-row');
                    //const assetId = parentRow ? parentRow.dataset.assetId : null;
                    
                    //variantRow.remove();
                    
                    // Hide variants container if empty
                    //if (variantsContainer.children.length === 0) {
                    //    variantsContainer.classList.add('hidden');
                    //}
                    
                    // updateCssOutput();
                    
                    // // Delete from database if IDs are available
                    // if (window.currentStylingId && assetId && variantId) {
                    //    apiFetch(`${API_BASE_URL}/brand-stylings/${window.currentStylingId}/assets/${assetId}/variants/${variantId}`, {
                    //        method: 'DELETE'
                    //    })
                    //    .then(response => {
                    //        if (!response.ok) return response.text().then(text => { throw new Error(text) });
                    //        showToast('Variant deleted', 'success');
                    //    })
                    //   .catch(error => {
                    //        console.error('Error deleting variant:', error);
                    //        showToast('Error deleting variant', 'error');
                    //    });
                    //}

                    deleteVariant(variantRow);
                }
            });
        }
        
        // Add change listeners for inputs
        const inputs = variantRow.querySelectorAll('input');
        inputs.forEach(input => {
            input.addEventListener('change', function() {
                updateCssOutput();
            });
        });
    });
}

// -------------------------------------------------- //
// DELETION EVENTS                                    //
// -------------------------------------------------- //

// Delete a group and all its variables
function deleteGroup(groupElement) {
  if (!groupElement || !window.currentStylingId) return;

  // Get all variables in this group
  const variables = groupElement.querySelectorAll('.variable-row');
  
  // Delete each variable (backend only - UI deletion happens elsewhere)
  variables.forEach(variable => {
    const assetId = variable.dataset.assetId;
    if (assetId) {
      // Use existing deleteAsset function from api.js
      deleteAsset(assetId)
        .catch(error => console.error(`Error deleting asset ${assetId} from group:`, error));
    }
  });
  
  // Note: UI removal of group already happens elsewhere
  
  // Refresh CSS display after deletions
  setTimeout(() => {
    if (window.currentStylingId) {
      updateCssFromApi(window.currentStylingId);
    }
  }, 300); // Small delay to allow API operations to complete
}

// Delete a variable and its variants
function deleteVariable(variableRow) {
  if (!variableRow || !window.currentStylingId) return;
  
  const assetId = variableRow.dataset.assetId;
  if (!assetId) {
    console.error("Cannot delete variable: Missing asset ID", variableRow);
    return;
  }
  
  // Use existing deleteAsset function from api.js
  deleteAsset(assetId)
    .catch(error => console.error(`Error deleting asset ${assetId}:`, error));
  
  // Note: UI removal already happens elsewhere
  
  // Refresh CSS display
  setTimeout(() => {
    if (window.currentStylingId) {
      updateCssFromApi(window.currentStylingId);
    }
  }, 300); // Small delay to allow API operations to complete
}


// Helper function to include asset IDs in the UI generation
// This should be added to updateUiFromParsedCss to ensure proper IDs are available
function enhancePropertyRow(property, propertyName, groupName) {
  return {
    id: property.id || null,
    name: propertyName,
    value: property.value,
    type: property.type,
    groupName: groupName,
    isImportant: property.isImportant,
    variants: property.variants || []
  };
}

// Update the variant row creation to include database IDs
// This needs to be incorporated into your addVariantsToRow function
function createVariantRowWithIds(variant, parentProperty) {
  const variantId = variant.id || Date.now().toString();
  return `
    <div class="variant-row" 
         data-id="${Date.now()}" 
         data-database-id="${variantId}" 
         data-breakpoint="${variant.breakpoint}">
      <!-- Variant content -->
    </div>
  `;
}