// In templates.js
// Ensure escapeHtml function is available (place at the top or ensure it's globally available if not already)
if (typeof escapeHtml === 'undefined') {
    function escapeHtml(unsafe) {
        if (typeof unsafe !== 'string') return '';
        return unsafe.replace(/&/g, "&amp;")
                     .replace(/</g, "&lt;")
                     .replace(/>/g, "&gt;")
                     .replace(/"/g, "&quot;")
                     .replace(/'/g, "&#039;");
    }
    window.escapeHtml = escapeHtml; // Make it global if not using modules
}


/**
 * Creates the HTML string for a single variable row.
 * @param {object} asset - The asset object containing variable data (id, type, name, value, is_important, group_name).
 * @param {object} inheritanceData - The inheritance data for this asset (source, overridden, master_is_important, etc.).
 * @returns {string} The HTML string for the variable row.
 */
function makeRowOfVariable(asset, inheritanceData) {
    const id = asset.id || `asset-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const type = asset.type || 'dimension';
    const name = asset.name || '';
    const value = asset.value || ''; 
    const resolvedValue = asset.resolved_value !== undefined ? asset.resolved_value : value;
    const isImportant = asset.is_important || false; 
    const enabled = typeof asset.enabled === 'boolean' ? asset.enabled : true;
    const originalGroupName = asset.group_name || asset.group || "General"; 
    const description = asset.description || ''; 

    const escapedName = escapeHtml(name);
    const escapedValue = escapeHtml(value); 
    const escapedOriginalGroupName = escapeHtml(originalGroupName);

    // Always include a .variable-preview, even if empty
    let previewHtml = '';
    const isColor = type === 'color';
    const isImage = type === 'image';

    if (isColor) {
        const swatchDisplayColor = value.startsWith('var(') ? value : resolvedValue;
        const pickerInputValue = (typeof isValidColor === 'function' && isValidColor(resolvedValue) && !resolvedValue.startsWith('var(')) ? resolvedValue : '#000000';
        previewHtml = `
            <div class="variable-preview" style="position: relative;">
                <div class="color-preview" style="background-color: ${escapeHtml(swatchDisplayColor)};"></div>
                <input type="color" class="color-picker-input" value="${escapeHtml(pickerInputValue)}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer;">
            </div>`;
    } else if (isImage) {
        // Pass window.variableMap to the preview function
        const imageUrl = (typeof extractImageUrlForPreview === 'function') ? 
                        extractImageUrlForPreview(value, window.variableMap || {}, new Set()) : // Pass map and new Set for visited
                        value;
        // Construct the style attribute string
        const imgStyle = `cursor: pointer; ${!imageUrl ? 'display:none;' : ''}`;

        previewHtml = `<div class="variable-preview">
            <img src="${imageUrl ? escapeHtml(imageUrl) : ''}" alt="Preview" class="clickable-image-preview" style="${imgStyle}">
            ${!imageUrl && value.startsWith('var(') ? `<span class="image-var-fallback">${escapedValue}</span>` : ''}
        </div>`;
    }  else if (type === 'font') {
        if (value) {
           previewHtml = `<div class="variable-preview"><span style="font-family: ${escapeHtml(value.split(',')[0].trim())}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 13px;">Aa Bb</span></div>`;
       }
    } else if (type === 'dimension') {
       let height = '10px';
       if (value && typeof value === 'string' && value.includes('px')) {
           const match = value.match(/(\d+)px/);
           if (match && match[1]) {
               height = Math.min(20, Math.max(4, parseInt(match[1]))) + 'px';
           }
       }

        let previewColor = 'var(--accent-hover, #555)'; // Default color
        const lowerName = name.toLowerCase();
        if (lowerName === '--breakpoint-mobile') {
            previewColor = 'var(--bp-col-mobile)'; // Red
            pText = "mobile"
        } else if (lowerName === '--breakpoint-tablet') {
            previewColor = 'var(--bp-col-tablet)'; // Green
            pText = "tablet";
        } else if (lowerName === '--breakpoint-desktop') {
            previewColor = 'var(--bp-col-desktop)'; // Blue
            pText = "desktop";
        }

       if (value) {
            previewHtml = `<div class="variable-preview"><div style="width: 100%; color: black; $ height: ${height}; background-color: ${previewColor}; opacity: 0.7; border-radius: 1px;"></div></div>`;
       }
    } else if (type === 'other') {
        // Add a default preview or customize as needed
        previewHtml = `<div class="variable-preview"><div style="width: 100%; background-color: var(--p-col-other) !important; height:100%; opacity: 0.7; border-radius: 1px;"></div></div>`;
    }


    const inheritanceDataString = inheritanceData ? escapeHtml(JSON.stringify(inheritanceData)) : '';
    let iconHtml = '';
    if (inheritanceData) {
        let inheritanceIconName = '';
        let inheritanceIconselector = 'inheritance-icon material-icons'; 
        let title = '';

        if (inheritanceData.source === "inherited" && !inheritanceData.overridden) {
            inheritanceIconName = 'link'; 
            inheritanceIconselector += ' inherited-simple';
            title = `Inherited from: ${escapeHtml(inheritanceData.master_brand_name || 'Master')}`;
            if (inheritanceData.master_asset_id) title += ` (Asset ID: ${inheritanceData.master_asset_id})`;
        } else if (inheritanceData.source === 'local' && inheritanceData.overridden) { 
            inheritanceIconName = 'south_east'; 
            inheritanceIconselector += ' overridden-green';
            title = `Overrides master: ${escapeHtml(inheritanceData.master_brand_name || 'Master')}`;
            if (inheritanceData.master_asset_id) title += ` (Asset ID: ${inheritanceData.master_asset_id})`;
            
            if (inheritanceData.master_is_important && !isImportant) {
                 inheritanceIconName = 'north_west'; 
                 inheritanceIconselector = inheritanceIconselector.replace('overridden-green', 'overridden-orange');
                 title = `Overrides important master with non-important value. Master: ${escapeHtml(inheritanceData.master_brand_name || 'Master')}`;
            }
        }
        if (inheritanceIconName) {
            iconHtml = `<span class="${inheritanceIconselector}" title="${title}">${inheritanceIconName}</span>`;
        }
    }

    return `
         <div class="variable-row"
              data-id="${id}"
              data-type="${type}"
              data-asset-id="${id}"
              data-group-name="${escapedOriginalGroupName}"
              data-variable-name="${escapedName}" 
              data-inheritance-data='${inheritanceDataString}'>
            <div class="variable-content">
                <input type="checkbox" class="enable-disable-checkbox" title="Enable/Disable" ${enabled ? 'checked' : ''}>
                <div class="inheritance-icon-cell">${iconHtml}</div>
                <div class="variable-name">
                    <input type="text" class="editable-field" value="${escapedName}" spellcheck="false">
                </div>
                <span class="colon-separator">:</span>
                <div class="variable-value-wrapper"> 
                    <input type="text" class="editable-field variable-value-input" value="${escapedValue}" spellcheck="false">
                    <span class="material-icons value-status-icon"></span>
                </div>
                ${previewHtml}
                <div class=variable-desciption>
                    <input type="text" class="editable-field variable-description-input" placeholder="Description (optional)" spellcheck="false" value="${description }">
                </div>
                <div class="variable-importance">
                    <input type="checkbox" class="importance-checkbox" id="importance-${id}" ${isImportant ? 'checked' : ''}>
                    <label for="importance-${id}" title="Apply !important">!important</label>
                </div>
                <div class="variable-actions">
                    <button class="icon-btn reassign-group-btn" title="Reassign Group">
                         <i class="fas fa-folder"></i>
                    </button>
                    <button class="action-button add-variant" title="Add variant">
                        <i class="fas fa-layer-group"></i>
                    </button>
                    <button class="action-button duplicate" title="Duplicate">
                        <i class="fas fa-clone"></i>
                    </button>

                    <button class="action-button delete" title="Delete">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            <div class="variable-variants hidden"></div>
        </div>
     `;
}

/**
 * Creates the HTML string for a single CSS rule (declaration) row.
 * This aims to be visually and structurally similar to makeRowOfVariable.
 * @param {object} ruleData - The rule data (e.g., { id (optional), property, value, is_important, enabled }).
 * @param {object} inheritanceData - Inheritance data (optional, for structural consistency).
 * @returns {string} The HTML string for the CSS rule row.
 */
// Function to be REPLACED in templates.js
function makeRowOfRule(ruleData, inheritanceData) {
    const id = ruleData.id || `rule-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const property = ruleData.property || '';
    const value = ruleData.value || '';
    const isImportant = ruleData.is_important || false;
    const enabled = typeof ruleData.enabled === 'boolean' ? ruleData.enabled : true;
    const description = ruleData.description || ''; 
    
    const escapedProperty = escapeHtml(property);
    const escapedValue = escapeHtml(value);
    
    let iconHtml = '';
    if (inheritanceData && inheritanceData.source) {
        iconHtml = `<span class="inheritance-icon material-icons" title="Inheritance: ${inheritanceData.source}">info</span>`;
    }

    // Preview for rule rows is generally not complex, can be empty or simple text
    const previewHtml = `<div class="variable-preview"></div>`; 

    return `
    <div class="variable-row css-rule-row" data-id="${id}" data-asset-id="${id}" data-type="css_declaration">
        <div class="variable-content">
            <input type="checkbox" class="enable-disable-checkbox" title="Enable/Disable Rule" ${enabled ? 'checked' : ''}>
            <div class="inheritance-icon-cell">${iconHtml}</div>
            <div class="variable-name css-property-name">
                <input type="text" class="editable-field" value="${escapedProperty}" placeholder="property" spellcheck="false">
            </div>
            <span class="colon-separator">:</span>
            <div class="variable-value-wrapper css-rule-value-wrapper">
                <input type="text" class="editable-field variable-value-input" value="${escapedValue}" placeholder="value" spellcheck="false">
                <span class="material-icons value-status-icon"></span>
            </div>
            ${previewHtml}
            <div class=variable-desciption>
                    <input type="text" class="editable-field variable-description-input" placeholder="Description (optional)" spellcheck="false" value="${description }">
                </div>
            <div class="variable-importance">
                <input type="checkbox" class="importance-checkbox" id="ruleImportance-${id}" ${isImportant ? 'checked' : ''}>
                <label for="ruleImportance-${id}" title="Apply !important">!important</label>
            </div>
            <div class="variable-actions css-rule-actions">
                <button class="action-button delete" title="Delete Property"><i class="fas fa-times"></i></button>
            </div>
        </div>
    </div>
    `;
}

// REPLACE this function in templates.js

/**
 * Creates the HTML string for a single variant row.
 * @param {object} variant - The variant object containing data (id, breakpoint, value, is_important).
 * @param {string} assetType - The type of the main asset this variant belongs to.
 * @param {object} variantInheritanceData - The inheritance data for this variant (source, overridden, master_is_important, etc.).
 * @returns {string} The HTML string for the variant row.
 */
function makeRowOfVariant(variant, assetType, variantInheritanceData) { // Accept variantInheritanceData
    const id = variant.id || `asset-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const variantId = variant.id || Date.now().toString();
    const breakpointLabel = variant.breakpoint || 'default';
    const value = variant.value || '';
    const important = variant.is_important || false; // Sub-brand variant's !important status
    const enabled = typeof variant.enabled === 'boolean' ? variant.enabled : true;
    const description = variant.description || ''; // Optional description for the variant

    const previewHtml = getPreviewHtmlForVariant(assetType, value);

    // Store variantInheritanceData as a JSON string in a data attribute
    const variantInheritanceDataString = variantInheritanceData ? JSON.stringify(variantInheritanceData) : '';


     // Determine icon based on initial load data - This logic will be moved/duplicated for live update
    let iconHtml = '';
    let iconselector = 'inheritance-icon';
    let iconName = '';

    if (variantInheritanceData) {
        if (variantInheritanceData.source === "inherited" && !variantInheritanceData.overridden) {
            iconName = 'link';
            iconselector += ' inherited-simple';
        } else if (variantInheritanceData.overridden) {
            iconName = 'south_east';
            iconselector += ' overridden-green';
             if (variantInheritanceData.master_is_important && !important) {
                 iconName = 'north_west';
                 iconselector = iconselector.replace('overridden-green', 'overridden-orange');
            }
        }
    }

    if (iconName) {
        iconHtml = `<span class="material-icons ${iconselector}">${iconName}</span>`;
    }


    return `
        <div class="variant-row" data-id="${variantId}" data-database-id="${variant.id || ''}" data-type="${assetType}" data-breakpoint="${variant.breakpoint || ''}" data-inheritance-data='${variantInheritanceDataString}'> 
         
            <input type="checkbox" class="enable-disable-checkbox" title="Enable/Disable" ${enabled ? 'checked' : ''}>    
            <div class="inheritance-icon-cell">${iconHtml}</div>
            <div class="variant-breakpoint">${breakpointLabel}</div>
            <span class="colon-separator">-</span>
            <div class="variant-value">
                <input type="text" class="editable-field" value="${value}" spellcheck="false">
            </div>
            ${previewHtml}
            <div class=variable-desciption>
                <input type="text" class="editable-field variable-description-input" placeholder="Description (optional)" spellcheck="false" value="${description }">
            </div>
            <div class="variant-importance">
                <input type="checkbox" class="importance-checkbox" title="Apply !important" ${important ? 'checked' : ''}>
                    <label for="importance-${id}" title="Apply !important">!important</label>
            </div>
            <div class="variant-actions">
                    <button class="icon-btn reassign-group-btn" title="Reassign Group">
                         <i class="fas fa-folder"></i>
                    </button>
                    <button class="action-button add-variant invisible" disabled title="Add variant">
                        <i class="fas fa-layer-group"></i>
                    </button>
                    <button class="action-button duplicate invisible" title="Duplicate">
                        <i class="fas fa-clone"></i>
                    </button>
                <button class="action-button delete" title="Delete Variant">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>
    `;
}

function getPreviewHtmlForAsset(type, value) {
    let innerPreview = '<span></span>'; // Default for non-matching types
    const assetType = typeof type === 'string' ? type.toLowerCase() : 'dimension';

    switch (assetType) {
        case 'color':
            const escapedColorValue = escapeHtml(value);
            innerPreview = `
                <div class="color-preview" style="background-color: ${escapedColorValue};" title="Click to change color"></div>
                <input type="color" class="color-picker-input" value="${escapedColorValue}" style="display: none;" title="Color Picker">
            `;
            break;
        case 'image':
            const imageUrl = value ? value.replace(/^url\(['"]?(.*?)['"]?\)$/, '$1') : '';
            if (imageUrl) {
                // Added class "clickable-image-preview" for specific targeting by variable-previews.js if needed
                innerPreview = `<img src="${escapeHtml(imageUrl)}" alt="Preview" class="clickable-image-preview" style="max-height: 20px; max-width: 100%; display:block; margin: auto; cursor: pointer;">`;
                // The hint for image preview can also be added here or by JavaScript
                // For consistency, if JavaScript (variable-previews.js) adds the hint, remove it from here.
                // If templates.js adds it, ensure variable-previews.js doesn't duplicate.
                // Let's assume variable-previews.js will handle the hint icon.
            }
            break;
        case 'font':
             if (value) {
                innerPreview = `<span style="font-family: ${escapeHtml(value.split(',')[0].trim())}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 13px;">Aa Bb</span>`;
            }
            break;
        case 'dimension':
            let height = '10px';
            if (value && typeof value === 'string' && value.includes('px')) {
                const match = value.match(/(\d+)px/);
                if (match && match[1]) {
                    height = Math.min(20, Math.max(4, parseInt(match[1]))) + 'px';
                }
            }
            if (value) {
                 innerPreview = `<div style="width: 100%; height: ${height}; background-color: var(--accent-hover, #555); opacity: 0.7; border-radius: 1px;"></div>`;
            }
            break;
    }
    return `<div class="variable-preview">${innerPreview}</div>`;
}

/**
 * Helper function to generate the preview HTML for a variant based on asset type and value.
 * This logic is adapted from the addVariantToRow function in the original ui-renderings.js file.
 * @param {string} type - The type of the main asset (e.g., 'color', 'image', 'font', 'dimension').
 * @param {string} value - The value of the variant.
 * @returns {string} The HTML string for the variant preview.
 */
function getPreviewHtmlForVariant(type, value) {
    let previewHtml = '';
     switch(type.toLowerCase()) {
        case 'color':
            if (value && (value.startsWith('#') || value.startsWith('rgb') || value.startsWith('hsl') || ['red', 'blue'].includes(value.toLowerCase()))) {
                previewHtml = `
                    <div class="variable-preview" style="position: relative;">
                        <div class="color-preview" style="background-color: ${value};"></div>
                        <input type="color" class="color-picker-input" value="${value}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer;">
                    </div>
                `;
            }
            break;
        case 'image':
            const imageUrl = value ? value.replace(/^url\(['"]?(.*?)['"]?\)$/, '$1') : ''; // Simple extraction
            if (imageUrl) {
                previewHtml = `
                    <div class="variable-preview">  <img 
                            src="${imageUrl}" 
                            alt="Image variant" 
                            class="clickable-image-preview" /* 2. ADDED: This class for consistency */
                            style="max-height: 24px; max-width: 100%; cursor: pointer;"
                        >
                    </div>
                `;
            }
            break;
        case 'font':
            if (value) {
                previewHtml = `
                    <div class="variable-preview"> <span style="font-family: ${value}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 14px;">
                            Aa
                        </span>
                    </div>
                `;
            }
            break;
        case 'dimension':
            let height = '8px';
            if (value && value.includes('px')) {
                const match = value.match(/(\d+)px/);
                if (match && match[1]) {
                    height = Math.min(20, parseInt(match[1])) + 'px';
                }
            } else if (value) { // Basic visualization for non-px dimensions
                 height = '10px'; // Default height for other units
            }
            if (value) { // Only show preview if there's a value
                 previewHtml = `
                    <div class="variable-preview"> <div style="width: 20px; height: ${height}; background-color: var(--accent-hover);"></div>
                    </div>
                `;
            }
            break;
         // Add other types as needed
     }
     return previewHtml;
}

/**
 * Orchestrates the creation of group HTML by calling the appropriate specific group function.
 * This function would replace the direct use of createGroupHtml from modal-html.js for this purpose.
 * @param {string} groupType - The fundamental type of the group (e.g., 'color', 'selector').
 * @param {string} groupDisplayName - The name to be displayed for the group (e.g., "Primary Colors", "Selectors : Class / ID").
 * @param {string} groupId - The unique ID for the group (e.g., "color-primary-colors").
 * @returns {string} The HTML string for the group.
 */
function generateGroupHtml(groupType, groupDisplayName, groupId) {
    if (groupType === 'selector') {
        return makeRowOfSelectorGroup(groupId, groupDisplayName, groupType);
    } else {
        return makeRowOfStandardGroup(groupId, groupDisplayName, groupType);
    }
}

/**
 * Creates the HTML string for a standard group (e.g., color, image, typography, dimension).
 * @param {string} id - The unique ID for the group.
 * @param {string} groupDisplayName - The display name of the group.
 * @param {string} groupType - The type of the group.
 * @returns {string} The HTML string for the standard group row.
 */
function makeRowOfStandardGroup(id, groupDisplayName, groupType) {
    const { icon, typeLabel } = getGroupTypeDetails(groupType);

    return `
        <div class="css-elements-container" id="${id}-container" data-type="${groupType}" data-original-group-name="${groupDisplayName}">
            <div class="css-elements-header">
                <h3 class="css-elements-title">${groupDisplayName}</h3>
                <div class="css-elements-actions">
                    <button class="button button-primary" data-group="${id}" data-original-group-name="${groupDisplayName}">
                        <i class="fas ${icon} icon"></i> Add ${typeLabel}
                    </button>
                    <button class="action-button delete-group" title="Delete Group">
                    <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            <div class="css-variables-table">
                <div class="variable-group" id="${id}-variables">
                    <div class="add-variable-row" data-group="${id}" data-type="${groupType}" data-original-group-name="${groupDisplayName}">
                        <i class="fas fa-plus icon"></i>
                        <span>Add ${typeLabel} variable</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Creates the HTML string for a selector group (specifically for 'selector' type).
 * @param {string} id - The unique ID for the group.
 * @param {string} groupDisplayName - The display name of the group (e.g., "MyClass : Class / ID").
 * @param {string} groupType - The type of the group (will be 'selector').
 * @returns {string} The HTML string for the selector group row.
 */
function makeRowOfSelectorGroup(id, groupDisplayName, groupType) {
    const { icon, typeLabel } = getGroupTypeDetails(groupType); // For 'selector', typeLabel will be 'Class'

    return `
        <div class="css-elements-container" id="${id}-container" data-type="${groupType}" data-original-group-name="${groupDisplayName}">
            <div class="css-elements-header">
                <h3 class="css-elements-title">${groupDisplayName}</h3>
                <div class="css-elements-actions">
                    <button class="button button-primary" data-group="${id}" data-original-group-name="${groupDisplayName}">
                        <i class="fas ${icon} icon"></i> Add ${typeLabel}
                    </button>
                    <button class="action-button delete-group" title="Delete Group">
                    <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            <div class="css-variables-table">
                <div class="variable-group" id="${id}-variables">
                    <div class="add-variable-row" data-group="${id}" data-type="${groupType}" data-original-group-name="${groupDisplayName}">
                        <i class="fas fa-plus icon"></i>
                        <span>Add ${typeLabel}</span> 
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Helper function to determine icon and typeLabel based on group type.
 * @param {string} groupType - The type of the group.
 * @returns {object} An object containing the icon and typeLabel.
 */
function getGroupTypeDetails(groupType) {
    switch (groupType) {
        case 'color':
            return { icon: 'fas fa-palette', typeLabel: 'Colors' };
        case 'image':
            return { icon: 'fas fa-image', typeLabel: 'Images' };
        case 'typography':
            return { icon: 'fas fa-font', typeLabel: 'Typography' };
        case 'dimension':
            return { icon: 'fas fa-ruler-horizontal', typeLabel: 'Dimensions' };
        case 'selector':
            return { icon: 'fas fa-code', typeLabel: 'Selectors' };
        case 'other':
            return { icon: 'fas fa-asterisk', typeLabel: 'Others' };
        default:
            return { icon: 'fas fa-question', typeLabel: 'Unknown' };
    }
}



// ADD THIS FUNCTION to templates.js

/**
 * Creates the HTML string for a single CSS Selector Entry block (e.g., .my-class {}, #my-id {}).
 * This is the standard template for displaying an individual selector rule.
 * @param {string} assetId - The unique ID for the asset (the selector rule itself).
 * @param {string} selectorString - The CSS selector string (e.g., ".my-class", "#my-id[type='text']").
 * @param {string} originalGroupName - The name of the UI group this rule belongs to.
 * @param {Array<object>} declarationsArray - Array of parsed declaration objects ({property, value, is_important, enabled}) to render initially.
 * @param {object} selectorStyleInfo - Object with {color, type} for styling the selector name, typically from getSelectorTypeAndStyle.
 * @param {boolean} [isBlockEnabled=true] - Optional. Whether the entire rule block is initially enabled.
 * @returns {string} The HTML string for the selector entry.
 */
// Function to be ADDED to templates.js
function makeIndividualSelectorEntryHtml(representativeAssetIdForBlock, selectorString, assetUiGroupName, ruleDataForTemplateArray, selectorStyleInfo, isBlockEnabled = true) {
    const ruleId = representativeAssetIdForBlock; 
    const safeSelectorString = (typeof escapeHtml === 'function' ? escapeHtml(selectorString) : selectorString);
    const safeOriginalGroupName = (typeof escapeHtml === 'function' ? escapeHtml(assetUiGroupName) : assetUiGroupName);

    const selectorColor = (selectorStyleInfo && selectorStyleInfo.color) ? selectorStyleInfo.color : "var(--text-color-default, #ccc)";
    const selectorType = (selectorStyleInfo && selectorStyleInfo.type) ? selectorStyleInfo.type : "default";

    const declarationsHtml = (ruleDataForTemplateArray || []).map(ruleData => {
        // Ensure makeRowOfRule is available
        if (typeof makeRowOfRule === 'function') {
            return makeRowOfRule(ruleData, ruleData.inheritanceData || null);
        }
        return `<div>Error: makeRowOfRule not found for property ${ruleData.property}</div>`;
    }).join('');

    return `
       <div class="class-rule-entry" 
            data-asset-id="${ruleId}" 
            data-selector-string="${safeSelectorString}" 
            data-asset-ui-group-name="${safeOriginalGroupName}" 
            data-selector-type="${selectorType}">
           <div class="class-rule-header">
               <input type="checkbox" class="enable-disable-checkbox" title="Enable/Disable Rule Block" ${isBlockEnabled ? 'checked' : ''}>
               <span class="selector-name" style="color: ${selectorColor};" data-original-selector="${safeSelectorString}">${safeSelectorString}</span>
               <div class="rule-actions">
                   <button class="btn-edit-class-rule icon-btn" title="Edit Selector Name (Not Implemented)"><i class="fas fa-edit"></i></button>
                   <button class="action-button delete" title="Delete Selector Block"><i class="fas fa-times"></i></button>
               </div>
           </div>
           <span class="selector-bracket">{</span>
           <div class="css-declarations-list">
               ${declarationsHtml}
           </div>
           <div class="add-variable-row add-css-declaration-to-selector-row" title="Add CSS property">
               <i class="fas fa-plus icon"></i>
               <span>Add property</span>
           </div>
           <div class="class-rule-footer-bracket">}</div>
       </div>
   `;
}

//window.createCssRuleEditorHeaderHTML = createCssRuleEditorHeaderHTML; // If used globally
// window.createCssRuleEditorHTML = createCssRuleEditorHTML;             // <<< THIS ONE IS CRITICAL
window.makeIndividualSelectorEntryHtml = makeIndividualSelectorEntryHtml; // If used globally
window.makeRowOfRule = makeRowOfRule; // If used globally