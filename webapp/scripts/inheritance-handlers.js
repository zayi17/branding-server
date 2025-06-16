// inheritance-handlers.js - Simplified inheritance handling using temp IDs
const assetNameToIdMap = new Map();



// ------------------------------------------------------------ //
// INHERITANCE DATA FETCHING                                    //
// ------------------------------------------------------------ //

// Fetch all assets with inheritance data for a styling
async function fetchAssetsWithInheritance(stylingId) {
    if (!stylingId) {
        console.error("Cannot fetch inheritance: No styling ID provided");
        return null;
    }
    
    try {
        console.log(`Fetching inheritance data for styling: ${stylingId}`);
        const response = await apiFetch(`${API_BASE_URL}/brand-stylings/${stylingId}/assets-with-inheritance`);
        
        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }
        
        const assets = await response.json();
        console.log(`Fetched ${assets.length} assets with inheritance data`);
        return assets;
    } catch (err) {
        console.error("Error fetching inheritance data:", err);
        showToast(`Failed to load inheritance data: ${err.message}`, 'error');
        return null;
    }
}

// Load inheritance info for UI display
async function loadInheritanceInfo(stylingId) {
    try {
        const response = await apiFetch(`${API_BASE_URL}/brand-stylings/${stylingId}/inheritance`);
        if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Error loading inheritance info:', error);
        showToast(`Failed to load inheritance information: ${error.message}`, 'error');
        return null;
    }
}

// Load available master brands for dropdown
async function loadAvailableMasterBrands(stylingId) {
    try {
        const response = await apiFetch(`${API_BASE_URL}/brand-stylings/${stylingId}/available-masters`);
        if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Error loading available master brands:', error);
        showToast(`Failed to load potential master brands: ${error.message}`, 'error');
        return [];
    }
}

// ------------------------------------------------------------ //
// CORE INHERITANCE FUNCTIONS                                   //
// ------------------------------------------------------------ //

// KEY FUNCTION: Update inheritance icon using tempId
// function updateInheritanceIcon(rowElement) {
//     if (!rowElement) return;
    
//     const iconCell = rowElement.querySelector('.inheritance-icon-cell');
//     if (!iconCell) return;
    
//     // Clear existing icon first
//     iconCell.innerHTML = '';
    
//     try {
//         // Get inheritance data from row
//         const inheritanceDataAttr = rowElement.dataset.inheritanceData;
//         if (!inheritanceDataAttr) {
//             // No inheritance data = local variable
//             return;
//         }
        
//         let inheritanceData;
//         try {
//             inheritanceData = JSON.parse(inheritanceDataAttr);
//         } catch (jsonError) {
//             console.error("Error parsing inheritance data:", jsonError, inheritanceDataAttr);
//             return;
//         }
        
//         // Skip invalid data
//         if (!inheritanceData) return;
        
//         // Get importance state from checkbox
//         const importanceCheckbox = rowElement.querySelector('.importance-checkbox');
//         const localIsImportant = importanceCheckbox ? importanceCheckbox.checked : false;
        
//         // Determine which icon to show
//         let iconName = '';
//         let iconClass = 'material-icons inheritance-icon';
//         let iconTitle = '';
        
//         // More detailed logging to diagnose issues
//         console.log(`Inheritance data for ${inheritanceData.name || 'unknown'}: source=${inheritanceData.source}, overridden=${inheritanceData.overridden}, master_is_important=${inheritanceData.master_is_important}, localIsImportant=${localIsImportant}`);
        
//         if (inheritanceData.source === "inherited") {
//             // Variable is inherited from master (not locally defined)
//             iconName = 'link';
//             iconClass += ' inherited-simple';
//             iconTitle = `Inherited from master brand styling: ${inheritanceData.master_brand_name || 'Unknown Master'}`;
//         } else if (inheritanceData.overridden) {
//             // Variable exists in master but is overridden locally
//             iconTitle = `Overrides master variable from ${inheritanceData.master_brand_name || 'Unknown Master'}`;
            
//             if (inheritanceData.master_is_important && !localIsImportant) {
//                 // Master uses !important but local doesn't - overridden by master
//                 iconName = 'north_west'; 
//                 iconClass += ' overridden-orange';
//                 iconTitle += ' (!important in master)';
//             } else {
//                 // Local variable overrides the master
//                 iconName = 'south_east';
//                 iconClass += ' overridden-green';
//                 if (localIsImportant) iconTitle += ' (local !important)';
//             }
//         }
        
//         // Add icon if needed
//         if (iconName) {
//             iconCell.innerHTML = `<span class="${iconClass}" title="${iconTitle}">${iconName}</span>`;
//         }
        
//     } catch (error) {
//         console.error("Error updating inheritance icon:", error);
//         iconCell.innerHTML = '';
//     }
// }
// In inheritance-handlers.js
// Replace the existing updateInheritanceIcon function with this:
function updateInheritanceIcon(rowElement) {
    if (!rowElement) return;
    
    const iconCell = rowElement.querySelector('.inheritance-icon-cell');
    if (!iconCell) {
        // console.warn("No icon cell found for rowElement:", rowElement);
        return;
    }
    
    iconCell.innerHTML = ''; // Clear existing icon
    
    try {
        const inheritanceDataAttr = rowElement.dataset.inheritanceData;
        if (!inheritanceDataAttr) {
            // No inheritance data typically means it's a purely local variable with no master context yet analysed
            // or it's a new row not yet processed by refreshAllInheritanceStatus.
            // console.log("No inheritance data on row, no icon to set.", rowElement);
            return;
        }
        
        let inheritanceData;
        try {
            inheritanceData = JSON.parse(inheritanceDataAttr);
        } catch (jsonError) {
            console.error("Error parsing inheritanceData JSON:", jsonError, "Raw data:", inheritanceDataAttr, "on row:", rowElement);
            return;
        }
        
        if (!inheritanceData || !inheritanceData.name) { // Ensure data and name exist
            // console.warn("Invalid or incomplete inheritanceData, cannot determine icon.", inheritanceData, rowElement);
            return;
        }
        
        const importanceCheckbox = rowElement.querySelector('.importance-checkbox');
        const localIsImportant = importanceCheckbox ? importanceCheckbox.checked : false;
        
        let iconName = '';
        let iconClass = 'material-icons inheritance-icon'; // Base class
        let iconTitle = '';

        // Log the data being used for decision
        // console.log(`IconLogic for ${inheritanceData.name}: source=${inheritanceData.source}, overridden=${inheritanceData.overridden}, master_id=${inheritanceData.master_asset_id}, master_important=${inheritanceData.master_is_important}, local_important=${localIsImportant}`);

        if (inheritanceData.source === "inherited") {
            iconName = 'link';
            iconClass += ' inherited-simple';
            iconTitle = `Inherited. Winning definition from Brand ID: ${inheritanceData.brand_styling_id}.`;
            if(inheritanceData.is_important) iconTitle += ' (This inherited version is !important)';

        } else if (inheritanceData.source === "local") {
            if (inheritanceData.overridden === true) { 
                // Local asset is defined, but it IS OVERRIDDEN by an ancestor.
                // The 'master_asset_id' and 'master_is_important' refer to the winning ancestor.
                iconName = 'north_west'; // Orange arrow: "I am being overridden"
                iconClass += ' overridden-orange';
                iconTitle = `Overridden by an ancestor (Asset ID: ${inheritanceData.master_asset_id}).`;
                if (inheritanceData.master_is_important) {
                    iconTitle += ' Ancestor is !important.';
                }
                if (localIsImportant) {
                    iconTitle += ' Local is !important but still overridden (ancestor more specific or also !important and more specific).';
                }

            } else { // local is "source: local" AND "overridden: false" --> This local asset is the WINNER in the chain.
                // Now, check if it actively overrode an ancestor (indicated by master_asset_id being non-null from backend)
                if (inheritanceData.master_asset_id !== null && inheritanceData.master_asset_id !== undefined) {
                    // This local asset is the winner AND it overrode an ancestor.
                    iconName = 'south_east'; // Green arrow: "I am overriding an ancestor"
                    iconClass += ' overridden-green';
                    iconTitle = `Overrides ancestor asset (ID: ${inheritanceData.master_asset_id}).`;
                    if (localIsImportant) {
                        iconTitle += ' Local is !important.';
                    }
                    if (inheritanceData.master_is_important) {
                        iconTitle += ' Overridden ancestor was !important.';
                    }
                } else {
                    // Local asset is the winner, but no specific ancestor was overridden 
                    // (e.g., it's a new variable not present in any ancestor, or an error in backend logic).
                    // No conflict icon in this case, unless it's !important and you want to signify that.
                    iconName = ''; 
                    // if (localIsImportant) {
                    //     iconName = 'priority_high'; // Example for local !important winner without conflict
                    //     iconClass += ' local-important-winner';
                    //     iconTitle = 'Local !important variable, no conflict from ancestors.';
                    // }
                }
            }
        }
        
        if (iconName) {
            iconCell.innerHTML = `<span class="${iconClass}" title="${iconTitle}">${iconName}</span>`;
        }
        
    } catch (error) {
        console.error("Error in updateInheritanceIcon for row:", rowElement, "Error:", error);
        iconCell.innerHTML = ''; // Clear on error
    }
}



// Analyze inheritance for a variable by name
async function analyzeInheritanceByName(stylingId, variableName) {
    if (!stylingId || !variableName) return null;
    
    const allAssets = await fetchAssetsWithInheritance(stylingId);
    if (!allAssets) return null;
    
    // Find asset with matching name
    return allAssets.find(asset => asset.name === variableName) || {
        name: variableName,
        source: 'local',
        overridden: false,
        master_asset_id: null,
        master_brand_id: null,
        master_brand_name: null,
        master_is_important: false
    };
}


// In inheritance-handlers.js
// Modify the refreshAllInheritanceStatus function

async function refreshAllInheritanceStatus() {
    if (!window.currentStylingId) {
        console.warn("Cannot refresh inheritance: No current styling ID"); //
        return false;
    }
    
    console.log("Refreshing inheritance for styling:", window.currentStylingId); //
    
    try {
        let allAssetsData = null; //
        
        try {
            const controller = new AbortController(); //
            const timeoutId = setTimeout(() => controller.abort(), 5000); //
            
            const response = await apiFetch(
                `${API_BASE_URL}/brand-stylings/${window.currentStylingId}/assets-with-inheritance`, //
                { signal: controller.signal } //
            );
            
            clearTimeout(timeoutId); //
            
            if (!response.ok) { //
                throw new Error(`HTTP error: ${response.status}`); //
            }
            
            allAssetsData = await response.json(); //
            console.log(`Fetched ${allAssetsData.length} assets with inheritance data`); //
            
        } catch (fetchError) {
            if (fetchError.name === 'AbortError') { //
                console.error("Fetch timed out when getting inheritance data"); //
            } else {
                console.error("Error fetching inheritance data:", fetchError); //
            }
        }
        
        if (!allAssetsData) { //
            console.warn("No inheritance data available, cannot update inheritance status"); //
            return false;
        }
        
        const assetsByName = {}; //
        const assetsById = {}; //
        
        allAssetsData.forEach(asset => { //
            if (asset.name) assetsByName[asset.name] = asset; //
            if (asset.id) assetsById[asset.id.toString()] = asset; //
        });
        
        document.querySelectorAll('.variable-row').forEach(row => { //
            const assetId = row.dataset.assetId; //
            const nameInput = row.querySelector('.variable-name .editable-field'); //
            
            if (!nameInput) return; //
            
            const currentName = nameInput.value.trim(); //
            
            let assetData = assetId && assetsById[assetId]; //
            if (!assetData) assetData = assetsByName[currentName]; //
            
            if (assetData) { //
                const safeAssetData = JSON.parse(JSON.stringify(assetData)); //
                row.dataset.inheritanceData = JSON.stringify(safeAssetData); //
                
                if (assetData.id && assetData.id.toString() !== assetId) { //
                    row.dataset.assetId = assetData.id.toString(); //
                    console.log(`Updated asset ID for ${currentName}: ${assetId} -> ${assetData.id}`); //
                }
            } else {
                row.dataset.inheritanceData = JSON.stringify({ //
                    id: assetId, //
                    name: currentName, //
                    source: 'local', //
                    overridden: false, //
                    master_asset_id: null, //
                    master_brand_id: null, //
                    master_brand_name: null, //
                    master_is_important: false //
                });
            }
            
            updateInheritanceIcon(row); //
        });
        
        document.querySelectorAll('.variant-row').forEach(variantRow => { //
            const variantId = variantRow.dataset.databaseId || variantRow.dataset.id; //
            const parentRow = variantRow.closest('.variable-row'); //
            if (!parentRow || !variantId) return; //
            
            const parentInheritanceData = parentRow.dataset.inheritanceData; //
            if (!parentInheritanceData) return; //
            
            try {
                const parentData = JSON.parse(parentInheritanceData); //
                if (parentData.variants) { //
                    const variantData = parentData.variants.find(v =>  //
                        v.id && v.id.toString() === variantId.toString() //
                    );
                    
                    if (variantData) { //
                        const safeVariantData = JSON.parse(JSON.stringify(variantData)); //
                        variantRow.dataset.inheritanceData = JSON.stringify(safeVariantData); //
                        updateInheritanceIcon(variantRow); //
                    }
                }
            } catch (e) {
                console.error("Error processing variant inheritance:", e); //
            }
        });
        
        if (typeof updateCssOutput === 'function') { //
            updateCssOutput(); //
        }

        // ADD THE FOLLOWING BLOCK:
        if (typeof window.initSharedCssVariableDiscovery === 'function' && window.currentStylingId) {
            console.log('[refreshAllInheritanceStatus] All inheritance icons updated. Refreshing shared variable discovery.');
            await window.initSharedCssVariableDiscovery(window.currentStylingId);
            // initSharedCssVariableDiscovery will internally call reapplyAllVariableValueStyles and initVariablePreviews
        }
        
        return true; //
    } catch (err) {
        console.error("Error refreshing inheritance:", err); //
        return false; //
    }
}
// // Main function to refresh all inheritance statuses
// async function refreshAllInheritanceStatus() {
//     if (!window.currentStylingId) {
//         console.warn("Cannot refresh inheritance: No current styling ID");
//         return false;
//     }
    
//     console.log("Refreshing inheritance for styling:", window.currentStylingId);
    
//     try {
//         // Get all inheritance data from API with error handling and timeout
//         let allAssetsData = null;
        
//         try {
//             // Set up a timeout for the fetch
//             const controller = new AbortController();
//             const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
            
//             const response = await apiFetch(
//                 `${API_BASE_URL}/brand-stylings/${window.currentStylingId}/assets-with-inheritance`,
//                 { signal: controller.signal }
//             );
            
//             // Clear the timeout
//             clearTimeout(timeoutId);
            
//             if (!response.ok) {
//                 throw new Error(`HTTP error: ${response.status}`);
//             }
            
//             allAssetsData = await response.json();
//             console.log(`Fetched ${allAssetsData.length} assets with inheritance data`);
            
//         } catch (fetchError) {
//             if (fetchError.name === 'AbortError') {
//                 console.error("Fetch timed out when getting inheritance data");
//             } else {
//                 console.error("Error fetching inheritance data:", fetchError);
//             }
            
//             // Don't show toast here - it's distracting during recoveries
//             // Continue with null data - we'll handle it below
//         }
        
//         if (!allAssetsData) {
//             console.warn("No inheritance data available, cannot update inheritance status");
//             return false;
//         }
        
//         // Create lookup maps for faster access
//         const assetsByName = {};
//         const assetsById = {};
        
//         allAssetsData.forEach(asset => {
//             if (asset.name) assetsByName[asset.name] = asset;
//             if (asset.id) assetsById[asset.id.toString()] = asset;
//         });
        
//         // Process all rows using temp IDs
//         document.querySelectorAll('.variable-row').forEach(row => {
//             const assetId = row.dataset.assetId;
//             const nameInput = row.querySelector('.variable-name .editable-field');
            
//             if (!nameInput) return;
            
//             const currentName = nameInput.value.trim();
            
//             // Find asset data - first try ID, then name
//             let assetData = assetId && assetsById[assetId];
//             if (!assetData) assetData = assetsByName[currentName];
            
//             // Update row with inheritance data
//             if (assetData) {
//                 // Ensure we don't have circular JSON structures 
//                 const safeAssetData = JSON.parse(JSON.stringify(assetData));
//                 row.dataset.inheritanceData = JSON.stringify(safeAssetData);
                
//                 // Update the asset ID to match the server if it changed
//                 if (assetData.id && assetData.id.toString() !== assetId) {
//                     row.dataset.assetId = assetData.id.toString();
//                     console.log(`Updated asset ID for ${currentName}: ${assetId} -> ${assetData.id}`);
//                 }
//             } else {
//                 // Not found - mark as local
//                 row.dataset.inheritanceData = JSON.stringify({
//                     id: assetId,
//                     name: currentName,
//                     source: 'local',
//                     overridden: false,
//                     master_asset_id: null,
//                     master_brand_id: null,
//                     master_brand_name: null,
//                     master_is_important: false
//                 });
//             }
            
//             // Update icon based on data
//             updateInheritanceIcon(row);
//         });
        
//         // Process variant rows
//         document.querySelectorAll('.variant-row').forEach(variantRow => {
//             const variantId = variantRow.dataset.databaseId || variantRow.dataset.id;
//             const parentRow = variantRow.closest('.variable-row');
//             if (!parentRow || !variantId) return;
            
//             // Get parent asset data
//             const parentInheritanceData = parentRow.dataset.inheritanceData;
//             if (!parentInheritanceData) return;
            
//             // Find variant in parent data
//             try {
//                 const parentData = JSON.parse(parentInheritanceData);
//                 if (parentData.variants) {
//                     const variantData = parentData.variants.find(v => 
//                         v.id && v.id.toString() === variantId.toString()
//                     );
                    
//                     if (variantData) {
//                         const safeVariantData = JSON.parse(JSON.stringify(variantData));
//                         variantRow.dataset.inheritanceData = JSON.stringify(safeVariantData);
//                         updateInheritanceIcon(variantRow);
//                     }
//                 }
//             } catch (e) {
//                 console.error("Error processing variant inheritance:", e);
//             }
//         });
        
//         // Update CSS
//         if (typeof updateCssOutput === 'function') {
//             updateCssOutput();
//         }
        
//         return true;
//     } catch (err) {
//         console.error("Error refreshing inheritance:", err);
//         // Don't show toast here
//         return false;
//     }
// }


// ------------------------------------------------------------ //
// EVENT HANDLERS                                              //
// ------------------------------------------------------------ //

// Handle importance checkbox changes
async function handleCheckboxTick(event) {
    const checkbox = event.target;
    const rowElement = checkbox.closest('.variable-row');
    if (!rowElement) return;
    
    const assetId = rowElement.dataset.assetId;
    if (!assetId || assetId.startsWith('new-')) {
        console.warn("Asset unsaved or missing ID, skipping save");
        refreshAllInheritanceStatus();
        return true;
    }
    const stylingId = window.currentStylingId;

    const isImportant = checkbox.checked;
    
    // Skip unsaved assets
    if (!assetId || assetId.startsWith('new-') || !stylingId) {
        console.warn("Asset unsaved, skipping importance update");
        refreshAllInheritanceStatus();
        return;
    }
    
    try {
        // Save to backend
        await window.updateAsset(stylingId, assetId, { is_important: isImportant });
        console.log("Importance saved successfully");
        
        // Refresh inheritance for all rows (simple approach)
        refreshAllInheritanceStatus();
    } catch (err) {
        console.error("Error saving importance:", err);
        checkbox.checked = !isImportant; // Revert
        showToast("Error saving importance: " + err.message, 'error');
    }
}

// Handle asset name/value changes
// Fix for assetChangeHandler in inheritance-handlers.js
// Fix for assetChangeHandler in inheritance-handlers.js
async function assetChangeHandler(rowElement, changeType) {
    if (!rowElement || !window.currentStylingId) return false; //
    
    const assetId = rowElement.dataset.assetId; //
    // const tempId = rowElement.dataset.tempId; // Not directly used in this revised logic path for update
    const stylingId = window.currentStylingId; //
    const nameInput = rowElement.querySelector('.variable-name .editable-field'); //
    const valueInput = rowElement.querySelector('.variable-value-wrapper .variable-value-input:last-child'); //
    
    // Skip unsaved assets for backend updates
    if (!assetId || assetId.startsWith('new-')) { //
        console.warn("Asset unsaved, attempting local refresh only for icon consistency."); //
        // For unsaved assets, a full refresh might not have meaning, 
        // but ensure the local icon is re-evaluated with current checkbox state.
        // Or, if refreshAllInheritanceStatus can handle local-only states gracefully, call it.
        // For now, a simple icon update for local consistency:
        if (typeof updateInheritanceIcon === 'function') {
             updateInheritanceIcon(rowElement);
        }
        // And update CSS output if applicable
        if (typeof updateCssOutput === 'function') {
            updateCssOutput();
        }
        return true; // Allow UI interaction but don't proceed with backend save
    }
    
    if (!nameInput && changeType === 'name') return false; // Need nameInput for name changes
    
    // Build update data
    const updateData = {}; //
    let changesMade = false; //
    
    if (changeType === 'name') {
        const currentName = nameInput.value.trim(); //
        const originalName = nameInput.dataset.originalValue; //
        
        if (currentName !== originalName) { //
            updateData.name = currentName; //
            updateData.original_name = originalName; //
            changesMade = true; //
            
            try {
                console.log(`Name change attempt (via assetChangeHandler): ${originalName} -> ${currentName}`); //
                await window.updateAsset(stylingId, assetId, updateData); //
                console.log(`Successfully updated asset name (via assetChangeHandler) to: ${currentName}`); //
                
                if (originalName) assetNameToIdMap.delete(originalName); //
                assetNameToIdMap.set(currentName, assetId); //
                
                nameInput.dataset.originalValue = currentName; //
                
                // Refresh inheritance data for all rows
                await refreshAllInheritanceStatus(); //
                return true; //
            } catch (error) {
                console.error("Error in name change process (via assetChangeHandler):", error); //
                // Attempt recovery
                await refreshAllInheritanceStatus(); //
                return true; // Still return true to indicate attempt and recovery
            }
        } else {
            // No actual name change, no backend call needed, but refresh to ensure icon is consistent if other state implies it should
            // This case might be redundant if the caller (init.js) handles no-change scenarios
            await refreshAllInheritanceStatus();
            return true;
        }
    } else if (changeType === 'value' && valueInput) {
        const currentValue = valueInput.value.trim(); //
        if (currentValue !== valueInput.dataset.originalValue) { //
            updateData.value = currentValue; //
            changesMade = true; //
        }
    } else if (changeType === 'importance') {
        const importanceCheckbox = rowElement.querySelector('.importance-checkbox'); //
        if (importanceCheckbox) { //
            updateData.is_important = importanceCheckbox.checked; //
            changesMade = true; //
        }
    }
    
    // If no changes were identified for value/importance, no backend call needed.
    // However, even if no data changed, if this handler was invoked,
    // a refresh ensures UI consistency with any perceived interaction.
    if (!changesMade) {
        // It's possible that even without data change, a refresh is desired by the user interaction model
        // For example, if a click triggered this without actual data modification.
        // Let's refresh to be safe, as this function is about ensuring correct inheritance display.
        console.log("assetChangeHandler called without data changes, refreshing for UI consistency.");
        await refreshAllInheritanceStatus();
        return true;
    }
    
    // Proceed with saving value/importance changes and then refreshing
    try {
        // Get asset ID from map if available (fallback for safety, though assetId should be primary)
        let effectiveAssetId = assetId; //
        const nameValue = nameInput?.value; //
        if (nameValue && assetNameToIdMap.has(nameValue)) { //
            effectiveAssetId = assetNameToIdMap.get(nameValue); //
            if(rowElement.dataset.assetId !== effectiveAssetId) {
                 rowElement.dataset.assetId = effectiveAssetId; //
            }
        }
        
        // Use correct ID for API call
        const updatedAsset = await window.updateAsset(stylingId, effectiveAssetId, updateData); //
        
        if (changeType === 'value' && valueInput) { //
            valueInput.dataset.originalValue = valueInput.value; //
        }
        
        // After successful save of value or importance, refresh all inheritance status
        console.log("Value/Importance change successful, calling refreshAllInheritanceStatus.");
        await refreshAllInheritanceStatus();
        return true;

    } catch (err) {
        console.error("Error saving asset change (value/importance):", err); //
        
        if (err.message && err.message.includes("404")) { //
            console.warn("Asset ID not found during value/importance update, refreshing inheritance status"); //
            await refreshAllInheritanceStatus(); //
            return true; 
        } else {
            showToast("Error saving change: " + err.message, 'error'); //
            // Even on other errors, a refresh might help resync UI, though the save failed.
            await refreshAllInheritanceStatus();
            return false; // Indicate save failure
        }
    }
}
// ------------------------------------------------------------ //
// MASTER BRAND UI                                             //
// ------------------------------------------------------------ //

// Initialize inheritance UI
async function initInheritanceUI(stylingId) {
    console.log("Initializing inheritance UI for styling:", stylingId);
    const inheritanceSection = document.getElementById('inheritance-info');
    const inheritanceTitle = document.getElementById('inheritance-title');
    const masterBrandSelect = document.getElementById('edit-brand-inherit-from-select');
    const viewMasterBtn = document.getElementById('view-master-brand-btn');
    const statsElem = document.getElementById('inheritance-stats');
    
    if (!inheritanceSection || !masterBrandSelect || !inheritanceTitle || !viewMasterBtn) {
        console.error("Inheritance UI elements not found");
        return;
    }
    
    try {
        // Load inheritance info
        const inheritanceInfo = await loadInheritanceInfo(stylingId);
        console.log("Inheritance info:", inheritanceInfo);
        
        // Load available master brands
        const availableBrands = await loadAvailableMasterBrands(stylingId);
        console.log("Available master brands:", availableBrands);
        
        // Update dropdown
        masterBrandSelect.innerHTML = '<option value="">None (Master Brand)</option>';
        availableBrands.forEach(brand => {
            if (brand.id !== stylingId) {
                const option = document.createElement('option');
                option.value = brand.id;
                option.textContent = brand.name;
                masterBrandSelect.appendChild(option);
            }
        });
        
        // Set current master brand
        if (inheritanceInfo?.has_master && inheritanceInfo?.master_brand) {
            masterBrandSelect.value = inheritanceInfo.master_brand.id;
            inheritanceTitle.textContent = `Inheritance (from ${inheritanceInfo.master_brand.name})`;
            viewMasterBtn.style.display = 'inline-block';
            viewMasterBtn.textContent = `View ${inheritanceInfo.master_brand.name}`;
            viewMasterBtn.setAttribute('data-master-id', inheritanceInfo.master_brand.id);
        } else {
            masterBrandSelect.value = "";
            inheritanceTitle.textContent = 'Inheritance';
            viewMasterBtn.style.display = 'none';
            viewMasterBtn.removeAttribute('data-master-id');
        }
        
        // Show stats if available
        if (statsElem && inheritanceInfo?.stats) {
            statsElem.innerHTML = `
                <div class="stats-row">
                    <span>Local assets: ${inheritanceInfo.stats.local_assets}</span>
                    <span>Inherited assets: ${inheritanceInfo.stats.inherited_assets}</span>
                </div>
                <div class="stats-row">
                    <span>Overridden assets: ${inheritanceInfo.stats.overridden_assets}</span>
                    <span>Total assets: ${inheritanceInfo.stats.total_assets}</span>
                </div>
            `;
            statsElem.style.display = 'block';
        } else if (statsElem) {
            statsElem.style.display = 'none';
        }
    } catch (error) {
        console.error("Error initializing inheritance UI:", error);
        showToast("Failed to initialize inheritance UI", "error");
        
        // Reset on error
        masterBrandSelect.innerHTML = '<option value="">Error loading brands</option>';
        masterBrandSelect.disabled = true;
        inheritanceTitle.textContent = 'Inheritance (Error)';
        viewMasterBtn.style.display = 'none';
        if (statsElem) statsElem.style.display = 'none';
    }
}

// Handle master brand change
async function handleMasterBrandChange(event) {
    const select = event.target;
    const newMasterId = select.value ? parseInt(select.value) : null;
    const stylingId = window.currentStylingId;
    
    if (!stylingId) {
        showToast("No styling selected", "error");
        return;
    }
    
    console.log(`Setting master brand for styling ${stylingId} to ${newMasterId}`);
    
    try {
        if (typeof window.updateBrandStyling !== 'function') {
            throw new Error("Update function not available");
        }
        
        // Update master brand
        await window.updateBrandStyling(stylingId, { master_brand_id: newMasterId });
        
        // Update tree if needed
        if (window.currentSiteId && typeof window.fetchStylingsAndAddToTree === 'function') {
            window.fetchStylingsAndAddToTree(window.currentSiteId);
        }
        
        // Refresh inheritance UI
        initInheritanceUI(stylingId);
        
        // Refresh inheritance status for all variables
        refreshAllInheritanceStatus();
    } catch (error) {
        console.error("Error updating inheritance:", error);
        showToast(`Failed to update inheritance: ${error.message}`, "error");
        initInheritanceUI(stylingId);
    }
}


// New function for targeted inheritance icon update
async function updateSingleAssetInheritanceIcon(assetId, rowElement) {
    if (!window.currentStylingId || !assetId) return;
    
    try {
        // Fetch just the data we need for this asset
        const response = await apiFetch(`${API_BASE_URL}/brand-stylings/${window.currentStylingId}/assets-with-inheritance`);
        if (!response.ok) {
            console.warn(`Failed to fetch inheritance data for styling ${window.currentStylingId}`);
            return;
        }
        
        const allAssets = await response.json();
        const assetInheritance = allAssets.find(a => a.id.toString() === assetId.toString());
        
        if (assetInheritance && rowElement) {
            // Update the inheritance data attribute
            rowElement.dataset.inheritanceData = JSON.stringify(assetInheritance);
            
            // Update the icon
            if (typeof updateInheritanceIcon === 'function') {
                updateInheritanceIcon(rowElement);
            }
            return true;
        }
    } catch (error) {
        console.error("Error updating inheritance icon:", error);
    }
    return false;
}



// Export all handlers
window.inheritanceHandlers = {
    // Data fetching
    fetchAssetsWithInheritance,
    
    // Core functions
    updateInheritanceIcon,
    analyzeInheritanceByName,
    refreshAllInheritanceStatus,
    
    // Event handlers
    handleCheckboxTick,
    assetChangeHandler,
    
    // UI functions
    loadAvailableMasterBrands,
    loadInheritanceInfo,
    initInheritanceUI,
    handleMasterBrandChange,
    

};

// Additional global exports
// Additional global exports
window.updateInheritanceIcon = updateInheritanceIcon;
window.refreshInheritance = refreshAllInheritanceStatus;
window.updateSingleAssetInheritanceIcon = updateSingleAssetInheritanceIcon; // Add this line
