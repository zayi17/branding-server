// ui-renderings.js
// v 5.0.0




function parseCssDeclarations(declarationsString) {
    if (!declarationsString || typeof declarationsString !== 'string') {
        return [];
    }
    const declarations = [];
    const rules = declarationsString.split(/;(?!base64|charset|data|font-face|font-feature-values|import|keyframes|media|namespace|page|supports|viewport)/)
                                 .map(rule => rule.trim())
                                 .filter(rule => rule !== '');
    rules.forEach(rule => {
        const colonIndex = rule.indexOf(':');
        if (colonIndex > 0) { 
            const property = rule.substring(0, colonIndex).trim();
            let value = rule.substring(colonIndex + 1).trim();
            let is_important = false;
            if (value.toLowerCase().endsWith('!important')) {
                is_important = true;
                value = value.replace(/!\s*important/i, '').trim();
            }
            if (property && (value || value === "")) { 
                declarations.push({
                    property: property, 
                    value: value,     
                    is_important: is_important,
                    enabled: true 
                });
            }
        } else if (rule.trim()) { 
            console.warn(`Skipping malformed CSS declaration part during modal parsing: "${rule}"`);
        }
    });
    return declarations;
}

function renderSiteView(site, stylings) {
    // Assuming showSiteView is globally available or part of this file/module
    if (typeof showSiteView !== 'function') {
        console.error('showSiteView function is not defined.');
        return;
    }
    showSiteView(site.id); 

    const siteNameElement = document.getElementById('site-name');
    if (siteNameElement) siteNameElement.textContent = site.name;
    const siteDescriptionElement = document.getElementById('site-description');
    if (siteDescriptionElement) siteDescriptionElement.textContent = site.description || 'No description';

    const brandStylesList = document.getElementById('brand-stylings-list');
    if (!brandStylesList) {
        console.error("Brand stylings list element (#brand-stylings-list) not found.");
        return;
    }
    brandStylesList.innerHTML = ''; 

    if (stylings.length === 0) {
        const emptyStateHtml = `
            <div class="empty-state">
                <p>No brand stylings found for this site.</p>
                <button class="btn primary-btn" id="add-brand-styling-btn-empty">
                    Add Your First Brand Styling
                </button>
            </div>
        `;
        brandStylesList.innerHTML = emptyStateHtml;
        const emptyStateAddBtn = document.getElementById('add-brand-styling-btn-empty');
        if (emptyStateAddBtn) {
            emptyStateAddBtn.addEventListener('click', () => {
                // Assuming a global function or a click on the main button
                const mainAddBtn = document.getElementById('add-brand-styling-btn');
                if (mainAddBtn) mainAddBtn.click();
                else console.error("Main 'Add Brand Styling' button not found.");
            });
        }
    } else {
        // Sort master brands and sub-brands
        const masterBrands = stylings.filter(s => !s.master_brand_id).sort((a,b) => a.name.localeCompare(b.name));
        const subBrands = stylings.filter(s => s.master_brand_id).sort((a,b) => a.name.localeCompare(b.name));
        const masterBrandMap = masterBrands.reduce((map, brand) => { map[brand.id] = brand.name; return map; }, {});

        const appendStylingCard = (styling, isMaster) => {
            const card = document.createElement('div');
            card.className = `brand-styling-card ${isMaster ? 'master-brand' : 'sub-brand'}`;
            let badgeHtml = isMaster ? '<span class="brand-type-badge master">Master Brand</span>' : 
                            `<span class="brand-type-badge sub">Inherits from: ${masterBrandMap[styling.master_brand_id] || 'Unknown'}</span>`;
            
            card.innerHTML = `
                <div class="brand-styling-card-header">
                    <div>
                        <h4 class="brand-styling-card-title">${styling.name}</h4>
                        ${badgeHtml}
                    </div>
                    <div class="card-header-actions">
                        <button class="icon-btn" data-styling-id="${styling.id}" data-action="edit-styling" title="Edit Brand Styling"><i class="fas fa-pencil-alt"></i></button>
                        <button class="icon-btn danger-btn" data-styling-id="${styling.id}" data-action="delete-styling" title="Delete Brand Styling"><i class="fas fa-times"></i></button>
                    </div>
                </div>
                <div class="brand-styling-card-content">
                    <p class="brand-styling-card-description">${styling.description || 'No description'}</p>
                    <div class="brand-styling-card-actions">
                        <button class="btn secondary-btn" data-styling-id="${styling.id}" data-action="view-styling"><i class="fas fa-eye mr-1"></i> View Styling</button>
                        <button class="btn secondary-btn" data-styling-id="${styling.id}" data-action="export-styling"><i class="fas fa-download mr-1"></i> Export</button>
                        <button class="btn secondary-btn" data-styling-id="${styling.id}" data-action="view-css"><i class="fas fa-code mr-1"></i> View CSS</button>
                    </div>
                </div>
            `;
            brandStylesList.appendChild(card);
            if (typeof addCardEventListeners === 'function') {
                addCardEventListeners(card, styling);
            } else {
                console.warn("addCardEventListeners function is not defined. Styling card actions might not work.");
            }
        };
        masterBrands.forEach(s => appendStylingCard(s, true));
        subBrands.forEach(s => appendStylingCard(s, false));
    }
}

// PASTE THIS ENTIRE FUNCTION INTO: ui-renderings.js
// REPLACING the existing renderBrandStylingView function.

// PASTE THIS ENTIRE FUNCTION INTO: ui-renderings.js
// REPLACING the existing renderBrandStylingView function.

// PASTE THIS ENTIRE FUNCTION INTO: ui-renderings.js
// REPLACING the existing renderBrandStylingView function.

// async function renderBrandStylingView(styling, site, assetsFromServer) {


//     const allViews = document.querySelectorAll('.content-view');
// allViews.forEach(view => {
//     view.classList.add('hidden');
// });

// const brandStylingView = document.getElementById('brand-styling-view');
// if (brandStylingView) {
//     brandStylingView.classList.remove('hidden');
// }

//     const brandStylingNameEl = document.getElementById('brand-styling-name');
//     if (brandStylingNameEl) brandStylingNameEl.textContent = styling.name;
//     const brandStylingSiteEl = document.getElementById('brand-styling-site');
//     if (brandStylingSiteEl) brandStylingSiteEl.textContent = `Site: ${site.name}`;
    
//     if(typeof displayBrandStylingDescription === 'function') {
//         displayBrandStylingDescription(styling);
//     } else {
//         console.warn("displayBrandStylingDescription function is not defined.");
//     }

//     window.currentStylingId = styling.id;

//     const stylingCssUrlElement = document.getElementById('styling-css-url');
//     if (stylingCssUrlElement) {
//         stylingCssUrlElement.textContent = `${API_BASE_URL}/brand/${styling.id}/css`;
//     }

//     try {

//         const clearContainers = () => {
//             const containerIds = ['colors-container', 'images-container', 'typography-container', 'dimensions-container', 'selector-container', 'other-container'];
//             containerIds.forEach(id => {
//                 const el = document.getElementById(id);
//                 if (el) el.innerHTML = ''; // Clear previous content
//             });
//         };
//         clearContainers();

//         let inheritanceDataMap = {};
//         try {
//             const assetsWithInheritanceResponse = await apiFetch(`${API_BASE_URL}/brand-stylings/${styling.id}/assets-with-inheritance`);
//             if (assetsWithInheritanceResponse.ok) {
//                 const assetsWithInheritance = await assetsWithInheritanceResponse.json();
//                 assetsWithInheritance.forEach(asset => { inheritanceDataMap[asset.id] = asset; });
//             }
//         } catch (fetchError) { console.warn("Could not fetch assets with inheritance data:", fetchError); }

//         const localAssetsOnly = (assetsFromServer || []).filter(asset => asset.source === 'local');
        
//         const cssVariables = localAssetsOnly.filter(asset => !asset.selector && asset.type !== "class_rule" && asset.type !== "css_declaration");
//         const cssDeclarations = localAssetsOnly.filter(asset => (asset.type === "css_declaration" || asset.type === "selector") && asset.selector);
//         const legacyClassRules = localAssetsOnly.filter(asset => asset.type === "class_rule");

//         processAssetsIntoGroups(cssVariables.filter(a => a.type === 'color'), 'color', 'colors-container', inheritanceDataMap);
//         processAssetsIntoGroups(cssVariables.filter(a => a.type === 'image'), 'image', 'images-container', inheritanceDataMap);
//         processAssetsIntoGroups(cssVariables.filter(a => ['font', 'typography'].includes(a.type)), 'font', 'typography-container', inheritanceDataMap);
//         processAssetsIntoGroups(cssVariables.filter(a => a.type === 'dimension'), 'dimension', 'dimensions-container', inheritanceDataMap);
//         processAssetsIntoGroups(cssVariables.filter(a => !['color', 'image', 'font', 'typography', 'dimension', 'class_rule', 'css_declaration'].includes(a.type)), 'other', 'other-container', inheritanceDataMap);
//         processSelectorDeclarations(cssDeclarations, 'selector-container', inheritanceDataMap);
        
//         if (legacyClassRules.length > 0) {
//             processLegacyClassRules(legacyClassRules, 'selector-container', inheritanceDataMap);
//         }

//         if (typeof updateCssOutput === 'function') updateCssOutput();
        
//     } catch (error) {
//         console.error("Error processing assets in renderBrandStylingView:", error);
//         if (typeof showToast === 'function') showToast(`Failed to render assets: ${error.message}`, 'error');
//     }
    

//     try {
//         if (window.inheritanceHandlers && typeof window.inheritanceHandlers.initInheritanceUI === 'function') {
//             window.inheritanceHandlers.initInheritanceUI(styling.id);
//         }
//         if (typeof setupTempRowTracking === 'function') {
//             setupTempRowTracking();
//         }
//         if (window.inheritanceHandlers && typeof window.inheritanceHandlers.refreshAllInheritanceStatus === 'function') {
//             await window.inheritanceHandlers.refreshAllInheritanceStatus();
//         }
//         if (typeof window.initSharedCssVariableDiscovery === 'function' && window.currentStylingId) {
//             await window.initSharedCssVariableDiscovery(window.currentStylingId);
//         }
//     } catch (postRenderError) {
//         console.error("A non-critical error occurred during post-render UI updates:", postRenderError);
//         if (typeof showToast === 'function') showToast('UI updated, but some statuses may be out of date.', 'warning');
//     }

// }


// REPLACE the existing renderBrandStylingView function in ui-renderings.js with this:

async function renderBrandStylingView(styling, site, assetsFromServer) {
    const allViews = document.querySelectorAll('.content-view');
    allViews.forEach(view => {
        view.classList.add('hidden');
    });

    const brandStylingView = document.getElementById('brand-styling-view');
    if (brandStylingView) {
        brandStylingView.classList.remove('hidden');
    }

    const brandStylingNameEl = document.getElementById('brand-styling-name');
    if (brandStylingNameEl) brandStylingNameEl.textContent = styling.name;
    const brandStylingSiteEl = document.getElementById('brand-styling-site');
    if (brandStylingSiteEl) brandStylingSiteEl.textContent = `Site: ${site.name}`;
    
    if(typeof displayBrandStylingDescription === 'function') {
        displayBrandStylingDescription(styling);
    }

    // Set the global variable for other functions that may need it.
    window.currentStylingId = styling.id;

    const stylingCssUrlElement = document.getElementById('styling-css-url');
    if (stylingCssUrlElement) {
        stylingCssUrlElement.textContent = `${API_BASE_URL}/brand/${styling.id}/css`;
    }

    // *** THIS IS THE DEFINITIVE FIX ***
    // Re-wire the Export and View Docs buttons every time the view is rendered
    // to ensure they have the correct, current styling ID.

    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) {
        const newExportBtn = exportBtn.cloneNode(true);
        exportBtn.parentNode.replaceChild(newExportBtn, exportBtn);
        newExportBtn.addEventListener('click', () => {
            // Pass the correct ID directly to the handler function
            handleExport(styling.id);
        });
    }

    const viewDocsBtn = document.getElementById('view-docs-btn');
    if (viewDocsBtn) {
        const newViewDocsBtn = viewDocsBtn.cloneNode(true);
        viewDocsBtn.parentNode.replaceChild(newViewDocsBtn, viewDocsBtn);
        newViewDocsBtn.addEventListener('click', () => {
            // Open the URL directly with the correct ID, no separate handler needed
            window.open(`${API_BASE_URL}/brand/${styling.id}/docs`, '_blank');
        });
    }
    // *** END OF FIX ***

    // --- The rest of the function remains the same ---
    const clearContainers = () => {
        const containerIds = ['colors-container', 'images-container', 'typography-container', 'dimensions-container', 'selector-container', 'other-container'];
        containerIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = '';
        });
    };
    clearContainers();
    
    let inheritanceDataMap = {};
    try {
        const assetsWithInheritanceResponse = await apiFetch(`${API_BASE_URL}/brand-stylings/${styling.id}/assets-with-inheritance`);
        if (assetsWithInheritanceResponse.ok) {
            const assetsWithInheritance = await assetsWithInheritanceResponse.json();
            assetsWithInheritance.forEach(asset => { inheritanceDataMap[asset.id] = asset; });
        }
    } catch (fetchError) { console.warn("Could not fetch assets with inheritance data:", fetchError); }

    const localAssetsOnly = (assetsFromServer || []).filter(asset => asset.source === 'local');
    const cssVariables = localAssetsOnly.filter(asset => !asset.selector && asset.type !== "class_rule" && asset.type !== "css_declaration");
    const cssDeclarations = localAssetsOnly.filter(asset => (asset.type === "css_declaration" || asset.type === "selector") && asset.selector);
    const legacyClassRules = localAssetsOnly.filter(asset => asset.type === "class_rule");

    processAssetsIntoGroups(cssVariables.filter(a => a.type === 'color'), 'color', 'colors-container', inheritanceDataMap);
    processAssetsIntoGroups(cssVariables.filter(a => a.type === 'image'), 'image', 'images-container', inheritanceDataMap);
    processAssetsIntoGroups(cssVariables.filter(a => ['font', 'typography'].includes(a.type)), 'font', 'typography-container', inheritanceDataMap);
    processAssetsIntoGroups(cssVariables.filter(a => a.type === 'dimension'), 'dimension', 'dimensions-container', inheritanceDataMap);
    processAssetsIntoGroups(cssVariables.filter(a => !['color', 'image', 'font', 'typography', 'dimension', 'class_rule', 'css_declaration'].includes(a.type)), 'other', 'other-container', inheritanceDataMap);
    
    processSelectorDeclarations(cssDeclarations, 'selector-container', inheritanceDataMap);
    
    if (legacyClassRules.length > 0) {
        processLegacyClassRules(legacyClassRules, 'selector-container', inheritanceDataMap);
    }
    if (typeof updateCssOutput === 'function') updateCssOutput();

    try {
        if (window.inheritanceHandlers && typeof window.inheritanceHandlers.initInheritanceUI === 'function') {
            window.inheritanceHandlers.initInheritanceUI(styling.id);
        }
        if (typeof setupTempRowTracking === 'function') {
            setupTempRowTracking();
        }
        if (window.inheritanceHandlers && typeof window.inheritanceHandlers.refreshAllInheritanceStatus === 'function') {
            await window.inheritanceHandlers.refreshAllInheritanceStatus();
        }
        if (typeof window.initSharedCssVariableDiscovery === 'function' && window.currentStylingId) {
            await window.initSharedCssVariableDiscovery(window.currentStylingId);
        }
    } catch (postRenderError) {
        console.error("A non-critical error occurred during post-render UI updates:", postRenderError);
    }
}


function processAssetsIntoGroups(assetsToProcess, groupDisplayTypeForContainer, containerId, inheritanceDataMap) {
    if (!assetsToProcess || !Array.isArray(assetsToProcess) || assetsToProcess.length === 0) return;

    const cssVariablesOnly = (assetsToProcess || []).filter(asset => !asset.selector && asset.type !== 'css_declaration' && asset.type !== 'class_rule');
    if (!cssVariablesOnly || cssVariablesOnly.length === 0) return;

    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Container ID "${containerId}" not found for CSS variables (display type ${groupDisplayTypeForContainer}).`);
        return;
    }

    const groups = {};
    cssVariablesOnly.forEach(asset => {
        let groupName = asset.group_name || "General";
        if (!groups[groupName]) {
            groups[groupName] = [];
        }
        groups[groupName].push(asset);
    });

    Object.keys(groups).forEach(groupName => {
        const groupAssets = groups[groupName];
        if (!groupAssets.length) return;

        let uiTypeForGroupHtml = (groupDisplayTypeForContainer === 'font') ? 'typography' : groupDisplayTypeForContainer;
        const groupId = `${uiTypeForGroupHtml}-${groupName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`;

        let groupContainerElement = document.getElementById(`${groupId}-container`);
        if (!groupContainerElement) {
            const groupHtmlContent = (typeof createGroupHtml === 'function') ?
                createGroupHtml(uiTypeForGroupHtml, groupName, groupId) :
                `<div>Error creating UI group: ${escapeHtml(groupName)}</div>`;
            container.insertAdjacentHTML('beforeend', groupHtmlContent);
            groupContainerElement = document.getElementById(`${groupId}-container`);
            if (typeof initGroupEventListeners === 'function' && groupContainerElement) {
                initGroupEventListeners(groupContainerElement, uiTypeForGroupHtml);
            } else if (!groupContainerElement) {
                console.error(`Failed to create or find group container element for ID: ${groupId}-container`);
                return;
            }
        }

        const variablesContainer = groupContainerElement.querySelector('.variable-group');
        const addRowPlaceholder = variablesContainer ? variablesContainer.querySelector('.add-variable-row') : null;

        if (!variablesContainer || !addRowPlaceholder) {
            console.error(`Cannot find .variable-group or .add-variable-row for CSS variable group "${groupName}" (ID: ${groupId}).`);
            return;
        }

        groupAssets.forEach(asset => {
            const inheritanceData = inheritanceDataMap && asset.id ? inheritanceDataMap[asset.id] : null;

            if (typeof makeRowOfVariable !== 'function') {
                console.error("Template function 'makeRowOfVariable' is missing.");
                return;
            }

            const mainRowHtml = makeRowOfVariable(asset, inheritanceData);
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = mainRowHtml;
            const mainRowElement = tempDiv.firstElementChild;

            if (mainRowElement) {
                const variantsContainer = mainRowElement.querySelector('.variable-variants');

                // ================================================================== //
                // ================== START: THIS IS THE CRITICAL FIX =============== //
                // ================================================================== //
// In ui-renderings.js, inside the `processAssetsIntoGroups` function:

if (variantsContainer && asset.variants && Array.isArray(asset.variants) && asset.variants.length > 0) {
    asset.variants.forEach(variant => {
        const variantInheritanceData = inheritanceData?.variants?.find(v => v.id === variant.id) || null;
        const variantHtml = makeRowOfVariant(variant, asset.type, variantInheritanceData);
if (variantHtml && variantHtml.trim()) {
    variantsContainer.insertAdjacentHTML('beforeend', variantHtml);
    const newVariantRow = variantsContainer.lastElementChild;
    if (newVariantRow && newVariantRow.classList.contains('variant-row')) {
        if (typeof initVariantRowEventListeners === 'function') {
            initVariantRowEventListeners(newVariantRow, asset.id);
        }
        if (typeof window.initVariablePreviewsForRow === 'function') {
            window.initVariablePreviewsForRow(newVariantRow);
        }
            } else {
                console.error("Failed to insert variant row for asset", asset, variant);
            }
        } else {
            console.warn("makeRowOfVariant returned empty HTML for variant", variant);
        }
    });
    variantsContainer.classList.remove('hidden');
}

                // ================================================================== //
                // =================== END: THIS IS THE CRITICAL FIX ================ //
                // ================================================================== //

                addRowPlaceholder.insertAdjacentElement('beforebegin', mainRowElement);

                // Initialize the main variable row (this part was already correct)
                if (typeof initRowEventListeners === 'function') initRowEventListeners(mainRowElement);
                if (typeof window.initVariablePreviewsForRow === 'function') window.initVariablePreviewsForRow(mainRowElement);

            } else {
                console.error("makeRowOfVariable failed to create an element for asset:", asset.name);
            }
        });
    });
}

function processSelectorDeclarations(declarationAssets, mainselectorContainerId, inheritanceDataMap) {
    if (!declarationAssets || declarationAssets.length === 0) return;

    const mainselectorContainer = document.getElementById(mainselectorContainerId); 
    if (!mainselectorContainer) {
        console.error(`Main container for selectors (ID "${mainselectorContainerId}") not found.`);
        return;
    }

    const declarationsByUiGroupThenSelector = {};
    declarationAssets.forEach(declAsset => {
        const uiGroupName = declAsset.group_name || "General Selectors"; 
        const selectorString = declAsset.selector; 

        if (!declarationsByUiGroupThenSelector[uiGroupName]) {
            declarationsByUiGroupThenSelector[uiGroupName] = {};
        }
        if (!declarationsByUiGroupThenSelector[uiGroupName][selectorString]) {
            declarationsByUiGroupThenSelector[uiGroupName][selectorString] = [];
        }
        declarationsByUiGroupThenSelector[uiGroupName][selectorString].push(declAsset);
    });

    Object.keys(declarationsByUiGroupThenSelector).forEach(uiGroupName => {
        const selectorsInUiGroup = declarationsByUiGroupThenSelector[uiGroupName];
        
        const uiGroupId = `selector-${uiGroupName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`;
        let uiGroupContainerElement = document.getElementById(`${uiGroupId}-container`);

        if (!uiGroupContainerElement) {
            const groupHtmlContent = (typeof createGroupHtml === 'function') ?
                createGroupHtml('selector', uiGroupName, uiGroupId) : 
                `<div>Error creating UI group: ${escapeHtml(uiGroupName)}</div>`;  // escapeHtml should be defined
            mainselectorContainer.insertAdjacentHTML('beforeend', groupHtmlContent);
            uiGroupContainerElement = document.getElementById(`${uiGroupId}-container`);
            if (uiGroupContainerElement && typeof initGroupEventListeners === 'function') {
                initGroupEventListeners(uiGroupContainerElement, 'selector'); 
            }  else if (!uiGroupContainerElement) {
                 console.error(`Failed to create or find UI group container element for ID: ${uiGroupId}-container`);
                 return; 
            }
        }
        
        const targetDivForSelectorBlocks = uiGroupContainerElement.querySelector('.variable-group');
        const addSelectorPlaceholder = targetDivForSelectorBlocks ? targetDivForSelectorBlocks.querySelector('.add-variable-row[data-group^="selector-"]') : null;

        if (!targetDivForSelectorBlocks || !addSelectorPlaceholder) {
            console.error(`Cannot find .variable-group or .add-variable-row for selector UI group "${uiGroupName}" (ID: ${uiGroupId}).`);
            return;
        }

        Object.keys(selectorsInUiGroup).forEach(selectorString => {
            const individualDeclarations = selectorsInUiGroup[selectorString]; 
            if (!individualDeclarations.length) return;
            
            const representativeAssetIdForBlock = individualDeclarations[0].id; 
            
            const selectorStyleInfo = (typeof window.getSelectorTypeAndStyle === 'function') ?
                                      window.getSelectorTypeAndStyle(selectorString) :
                                      { color: 'var(--text-color-default, #ccc)', type: 'default' };
            
            const ruleDataForTemplate = individualDeclarations.map(declAsset => ({
                id: declAsset.id, 
                property: declAsset.name, 
                value: declAsset.value,  
                is_important: declAsset.is_important,
                enabled: declAsset.enabled !== undefined ? declAsset.enabled : true, 
                inheritanceData: inheritanceDataMap && declAsset.id ? inheritanceDataMap[declAsset.id] : null 
            }));

            if (typeof makeIndividualSelectorEntryHtml === 'function') { 
                const selectorBlockHtml = makeIndividualSelectorEntryHtml(
                    representativeAssetIdForBlock, 
                    selectorString,
                    uiGroupName, 
                    ruleDataForTemplate, 
                    selectorStyleInfo,
                    true 
                );
                addSelectorPlaceholder.insertAdjacentHTML('beforebegin', selectorBlockHtml);
                const newSelectorBlockElement = addSelectorPlaceholder.previousElementSibling;

                if (newSelectorBlockElement) {
                    if (typeof initClassRuleEntryListeners === 'function') { 
                        initClassRuleEntryListeners(newSelectorBlockElement);
                    }
                }
            } else {
                console.error("makeIndividualSelectorEntryHtml (from templates.js) is not defined.");
                addSelectorPlaceholder.insertAdjacentHTML('beforebegin', `<div>Error rendering selector: ${escapeHtml(selectorString)}</div>`); // escapeHtml should be defined
            }
        });
    });
}

function processLegacyClassRules(legacyClassRuleAssets, mainselectorContainerId, inheritanceDataMap) {
    if (!legacyClassRuleAssets || legacyClassRuleAssets.length === 0) return;
    console.warn("Processing legacy 'class_rule' assets. These should be migrated to 'css_declaration'.");

    const mainselectorContainer = document.getElementById(mainselectorContainerId);
    if (!mainselectorContainer) return;

    const legacyRulesByUiGroupThenSelector = {};
    legacyClassRuleAssets.forEach(legacyAsset => {
        const uiGroupName = legacyAsset.group_name || "Legacy Selectors";
        const selectorString = legacyAsset.name; 

        const parsedDeclarations = parseCssDeclarations(legacyAsset.value || "");
        if (parsedDeclarations.length === 0 && (legacyAsset.value || "").trim() !== "") {
            console.warn(`Legacy rule for selector "${selectorString}" had a value but no declarations were parsed from it. Value:`, legacyAsset.value);
        }
        // Even if no declarations, we might want to show an empty block if the legacy asset exists.
        // For now, only proceed if declarations were parsed or if we explicitly want to show empty legacy blocks.

        if (!legacyRulesByUiGroupThenSelector[uiGroupName]) {
            legacyRulesByUiGroupThenSelector[uiGroupName] = {};
        }
        if (!legacyRulesByUiGroupThenSelector[uiGroupName][selectorString]) {
            legacyRulesByUiGroupThenSelector[uiGroupName][selectorString] = [];
        }
        legacyRulesByUiGroupThenSelector[uiGroupName][selectorString].push({
            legacyAssetId: legacyAsset.id,
            declarations: parsedDeclarations, // Can be empty array
            inheritanceData: inheritanceDataMap && legacyAsset.id ? inheritanceDataMap[legacyAsset.id] : null
        });
    });

    Object.keys(legacyRulesByUiGroupThenSelector).forEach(uiGroupName => {
        const selectorsInUiGroup = legacyRulesByUiGroupThenSelector[uiGroupName];
        const uiGroupId = `selector-${uiGroupName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`;
        let uiGroupContainerElement = document.getElementById(`${uiGroupId}-container`);

        if (!uiGroupContainerElement) {
            const groupHtmlContent = (typeof createGroupHtml === 'function') ? 
                                     createGroupHtml('selector', uiGroupName, uiGroupId) : 
                                     `<div>Error creating UI group: ${escapeHtml(uiGroupName)}</div>`; // escapeHtml should be defined
            mainselectorContainer.insertAdjacentHTML('beforeend', groupHtmlContent);
            uiGroupContainerElement = document.getElementById(`${uiGroupId}-container`);
            if (uiGroupContainerElement && typeof initGroupEventListeners === 'function') {
                initGroupEventListeners(uiGroupContainerElement, 'selector');
            } else if (!uiGroupContainerElement) {
                console.error(`Failed to create or find legacy UI group container element for ID: ${uiGroupId}-container`);
                return;
            }
        }
        
        const targetDivForSelectorBlocks = uiGroupContainerElement.querySelector('.variable-group');
        const addSelectorPlaceholder = targetDivForSelectorBlocks ? targetDivForSelectorBlocks.querySelector('.add-variable-row[data-group^="selector-"]') : null;
        if (!targetDivForSelectorBlocks || !addSelectorPlaceholder) return;

        Object.keys(selectorsInUiGroup).forEach(selectorString => {
            selectorsInUiGroup[selectorString].forEach(legacyRuleBlock => { 
                const selectorStyleInfo = (typeof getSelectorTypeAndStyle === 'function') ? 
                                          getSelectorTypeAndStyle(selectorString) : 
                                          { color: 'var(--text-color-default, #ccc)', type: 'default' };
                
                const ruleDataForTemplate = legacyRuleBlock.declarations.map((decl, index) => ({
                    id: `legacy-${legacyRuleBlock.legacyAssetId}-${index}`, 
                    property: decl.property,
                    value: decl.value,
                    is_important: decl.is_important,
                    enabled: true, 
                    inheritanceData: legacyRuleBlock.inheritanceData 
                }));

                if (typeof makeIndividualSelectorEntryHtml === 'function') { // from templates.js
                    const selectorBlockHtml = makeIndividualSelectorEntryHtml(
                        legacyRuleBlock.legacyAssetId, 
                        selectorString,
                        uiGroupName,
                        ruleDataForTemplate,
                        selectorStyleInfo,
                        true 
                    );
                    addSelectorPlaceholder.insertAdjacentHTML('beforebegin', selectorBlockHtml);
                    const newSelectorBlockElement = addSelectorPlaceholder.previousElementSibling;
                    if (newSelectorBlockElement) {
                        newSelectorBlockElement.classList.add('legacy-rule-block'); 
                        if (typeof initClassRuleEntryListeners === 'function') { // from init.js
                            initClassRuleEntryListeners(newSelectorBlockElement);
                        }
                        const header = newSelectorBlockElement.querySelector('.class-rule-header .selector-name');
                        if (header) {
                            const legacyBadge = document.createElement('span');
                            legacyBadge.textContent = ' (Legacy Format)';
                            legacyBadge.style.fontSize = '0.8em';
                            legacyBadge.style.color = 'orange';
                            legacyBadge.title = 'This selector and its rules are stored in an old format. Editing may be limited or trigger migration.';
                            header.appendChild(legacyBadge);
                        }
                    }
                }
            });
        });
    });
}

// Helper for escaping HTML, define if not already globally available
function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return '';
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}


function showContentView(viewId) {
    const contentArea = document.getElementById('content-area');
    if (!contentArea) return;
    contentArea.querySelectorAll('.content-view').forEach(view => view.classList.add('hidden'));
    const viewToShow = document.getElementById(viewId);
    if (viewToShow) viewToShow.classList.remove('hidden');
}

function showHelpScreen() {showContentView('help-screen'); window.currentSiteId = null; window.currentStylingId = null; }
function showSettingsScreen() { showContentView('settings-screen'); window.currentSiteId = null; window.currentStylingId = null; }
function showWelcomeScreen() { showContentView('welcome-screen'); window.currentSiteId = null; window.currentStylingId = null; }
function showSiteView(siteId) { showContentView('site-view'); window.currentSiteId = siteId; window.currentStylingId = null; }
function showBrandStylingView(stylingId) { showContentView('brand-styling-view'); window.currentStylingId = stylingId; } // Assumes currentSiteId is already set
function showCssView() { showContentView('css-view'); }


function displayBrandStylingDescription(stylingObject) {
    const descriptionElement = document.getElementById('brand-styling-description');
    if (descriptionElement) {
        descriptionElement.textContent = stylingObject.description || 'No description provided.';
    } else {
        console.warn("Element with ID 'brand-styling-description' not found.");
    }
}

function setupTempRowTracking() {
    // Minimal placeholder, replace with your actual implementation if needed.
    // This function was mentioned in your original files.
    // console.log("setupTempRowTracking called - ensure your implementation is here.");
    document.querySelectorAll('.variable-row[data-temp-id], .variant-row[data-temp-id]').forEach(row => {
        // Example: perhaps re-initialize something if needed based on tempId
    });
}

// Ensure functions intended to be global are explicitly added to window if not using modules
window.renderBrandStylingView = renderBrandStylingView;
window.parseCssDeclarations = parseCssDeclarations; 
window.renderSiteTree = renderSiteTree;
window.renderSiteView = renderSiteView;
window.showContentView = showContentView;
window.showWelcomeScreen = showWelcomeScreen;
window.showHelpScreen = showHelpScreen;
window.showSettingsScreen = showSettingsScreen;
window.showSiteView = showSiteView;
window.showBrandStylingView = showBrandStylingView;
window.showCssView = showCssView;
window.displayBrandStylingDescription = displayBrandStylingDescription;
window.setupTempRowTracking = setupTempRowTracking;

// Call setupTempRowTracking on load if it's meant to initialize things globally
document.addEventListener('DOMContentLoaded', setupTempRowTracking);