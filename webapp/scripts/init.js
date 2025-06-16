// init.js - Initialization and event listener setup

// ------------------------------------------------------------ //
// CODE EDITOR INIT                                             //
// ------------------------------------------------------------ //
  let isProcessingUpdate = false;


window.initEnhancedCssSupport = function() {
    console.log("Initialization wrapper called for CSS support");
    if (window._realInitEnhancedCssSupport) {
        window._realInitEnhancedCssSupport();
    } else {
        console.log("Real CSS support initialization function not ready yet, will initialize later");
        // Queue this to be called when the real function becomes available
        window._pendingCssInitCall = true;
    }
};

// Function to check for css module availability
function checkForCssModule() {
    if (typeof ace !== 'undefined' && ace.require) {
        console.log("Ace editor available, attempting to initialize CSS highlight rules");
        try {
            // Use Ace's module loading system
            ace.config.loadModule(["ace/mode/css_highlight_rules"], function(cssModule) {
                if (cssModule && cssModule.CssHighlightRules) {
                    console.log("CSS highlight rules loaded successfully");
                    
                    // Add CSS variable highlighting
                    const rules = cssModule.CssHighlightRules.prototype.$rules;
                    if (rules && rules.start) {
                        // Add variable rule
                        rules.start.push({
                            token: "variable.css",
                            regex: "(--[a-zA-Z0-9-_]+)"
                        });
                        
                        // Add TYPE comment rule
                        rules.start.push({
                            token: "comment.type",
                            regex: "/\\*\\s*TYPE:\\s*\\w+\\s*\\*/"
                        });
                        
                        // Add GROUP comment rule
                        rules.start.push({
                            token: "comment.group",
                            regex: "/\\*\\s*GROUP:\\s*.*?\\s*\\*/"
                        });
                        
                        console.log("Added CSS variable and type highlighting rules");
                    }
                }
            });
        } catch (error) {
            console.warn("Error loading CSS highlighting rules:", error);
        }
    }
}


// At the end of the file, add this observer to watch for when the real init function becomes available
// This runs after document load to catch late-loading CSS support module


// ------------------------------------------------------------ //
// GENERAL INIT                                                 //
// ------------------------------------------------------------ //

function initRowEventListeners(rowElement) {
    if (!rowElement) return;

    // Correctly query elements from the row FIRST
    const nameInput = rowElement.querySelector('.variable-name .editable-field');
    const importanceCheckbox = rowElement.querySelector('.variable-importance .importance-checkbox');
    // const textInput = rowElement.querySelector('.variable-value-wrapper .variable-value-input'); // textInput is handled by initEditableField below
    // const colorPreview = rowElement.querySelector('.color-preview'); // Color preview logic moved to variable-previews.js
    // const colorPickerInput = rowElement.querySelector('.color-picker-input'); // Color picker logic moved to variable-previews.js

    // Name input event handlers
    if (nameInput) {
        // Store original value when focusing
        nameInput.addEventListener('focus', function() {
            this.dataset.originalValue = this.value;
        });

        
        nameInput.addEventListener('blur', async function() {
            if (isProcessingUpdate) return; //
            
            const newName = this.value.trim();
            const originalName = this.dataset.originalValue;

            if (newName !== originalName) {
                console.log(`Name changed from "${originalName}" to "${newName}"`); 
                isProcessingUpdate = true; //
                
                const rowElement = this.closest('.variable-row');
                let assetId = rowElement.dataset.assetId;
                
                if (!assetId || !window.currentStylingId) {
                    console.warn("Cannot update asset name: Missing assetId or currentStylingId.");
                    isProcessingUpdate = false; //
                    return;
                }
                
                try {
                    // Call the updated window.updateAsset function which now uses FormData
                    const assetUpdateData = {
                        name: newName,
                        original_name: originalName // Pass original_name for backend
                    };
                    
                    const updatedAsset = await window.updateAsset(window.currentStylingId, assetId, assetUpdateData); //
                    // window.updateAsset already logs "Asset updated successfully"

                    // Update assetId on the row IF the response from updateAsset indicates it changed.
                    // The updatedAsset object is the direct response from the PUT.
                    if (updatedAsset && updatedAsset.id && updatedAsset.id.toString() !== assetId) { //
                        console.log(`Asset ID for '${newName}' changed in PUT response: ${assetId} -> ${updatedAsset.id}. Updating rowElement.dataset.assetId.`); //
                        assetId = updatedAsset.id.toString(); 
                        rowElement.dataset.assetId = assetId; 
                    }
                    
                    // Update stored original value in the DOM to the new name
                    this.dataset.originalValue = newName; //
                    // Ensure the input field reflects the confirmed new name (especially if format_asset_name changed it)
                    if (updatedAsset && updatedAsset.name) { //
                        this.value = updatedAsset.name; 
                    }
                    
                    if (typeof window.refreshInheritance === 'function') { //
                        console.log("Name change successful via updateAsset, calling refreshAllInheritanceStatus."); //
                        await window.refreshInheritance(); 
                    } else {
                        console.warn("window.refreshInheritance function not found. Icons might not update correctly."); //
                        if (typeof updateCssOutput === 'function') { 
                            updateCssOutput(); 
                        }
                    }
                    
                } catch (error) {
                    console.error("Error during name update process:", error); //
                    this.value = originalName; //

                    if (typeof window.refreshInheritance === 'function') { //
                        console.warn("Error during name update, attempting refresh for recovery."); //
                        await window.refreshInheritance(); //
                    }
                } finally {
                    setTimeout(() => { isProcessingUpdate = false; }, 300); //
                }
            }
        });
                
        // Handle Enter key press
        nameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') nameInput.blur();
        });
    }

    // Importance checkbox event handler - unified implementation
    if (importanceCheckbox) {
        importanceCheckbox.addEventListener('change', async function() {
            console.log(`Importance changed to: ${this.checked}`); //
            
            if (window.inheritanceHandlers && typeof window.inheritanceHandlers.assetChangeHandler === 'function') { //
                await window.inheritanceHandlers.assetChangeHandler(rowElement, 'importance'); //
            } else {
                if (typeof updateInheritanceIcon === 'function') { //
                    updateInheritanceIcon(rowElement); //
                }
                
                if (typeof updateAssetInDatabase === 'function') { //
                    await updateAssetInDatabase(rowElement); //
                }

                if (typeof updateAssetCounts === 'function' && window.currentStylingId) { //
                    console.log(`[initRowEventListeners - delete variable] Triggering updateAssetCounts for styling ID: ${window.currentStylingId}`); //
                    updateAssetCounts(window.currentStylingId); 
                }
                
                if (typeof updateCssOutput === 'function') { //
                    updateCssOutput(); //
                }
            }
        });
    }

    // Initialize other editable fields (like value field)
    const editableFields = rowElement.querySelectorAll('.editable-field');
    editableFields.forEach(field => {
        if (field === nameInput) return; // Skip the name input as we already set it up
        
        if (typeof initEditableField === 'function') { //
            initEditableField(field); //
        } else {
            // Fallback manual listeners
            field.addEventListener('focus', () => { 
                field.dataset.originalValue = field.value;
                if (typeof showSuggestionsForEditor === 'function') { //
                    showSuggestionsForEditor(field, field.value); //
                }
            });
            
            field.addEventListener('input', () => {
                if (typeof showSuggestionsForEditor === 'function') { //
                    showSuggestionsForEditor(field, field.value); //
                }
            });
                
            field.addEventListener('blur', async () => { //
                if (field.value !== field.dataset.originalValue) { //
                    try {
                        await updateAssetInDatabase(rowElement); //
                        field.dataset.originalValue = field.value; 
                    } catch(e) {
                        console.error("Error updating asset value:", e); //
                    }
                    if (typeof updateCssOutput === 'function') { //
                        updateCssOutput(); //
                    }
                }
            });
            
            field.addEventListener('keydown', (e) => { 
                if (e.key === 'Enter') field.blur(); 
            });
        }
    });

    // Set up add variant button
    const addVariantBtn = rowElement.querySelector('.variable-actions .fa-layer-group')?.closest('button'); //
    if (addVariantBtn) {
        addVariantBtn.addEventListener('click', () => { //
            if (typeof handleAddVariantClick === 'function') { //
                handleAddVariantClick(rowElement.dataset.assetId); //
            } else {
                console.error("handleAddVariantClick function not found."); //
                if (typeof showToast === 'function') showToast("Add variant functionality not available.", 'error'); //
            }
        });
    }

    // Set up duplicate button
    const duplicateBtn = rowElement.querySelector('.variable-actions .fa-clone')?.closest('button');
    if (duplicateBtn) {
        duplicateBtn.addEventListener('click', () => {
            handleDuplicateAsset(rowElement.dataset.assetId);  // Fix: Use assetId from dataset
        });
    }

    // Set up delete button
    const deleteBtn = rowElement.querySelector('.variable-actions .delete'); //
    if (deleteBtn) {
        deleteBtn.addEventListener('click', async (e) => { //
            e.stopPropagation(); //
            
            const clickedElement = e.target; //
            const button = clickedElement.closest('.delete'); //
            if (!button) return;
            
            const row = button.closest('.variable-row'); //
            if (!row) return;
            
            const assetId = row.dataset.assetId; //
            console.log("Attempting to delete asset with ID:", assetId); //
            
            if (assetId && assetId.toString().startsWith('new-')) { //
                if (confirm('Delete this unsaved variable?')) { //
                    row.remove(); //
                    if (typeof updateCssOutput === 'function') { //
                        updateCssOutput(); //
                    }

                    if (typeof updateAssetCounts === 'function' && window.currentStylingId) { //
                        console.log(`[initRowEventListeners - delete variable] Triggering updateAssetCounts for styling ID: ${window.currentStylingId}`); //
                        updateAssetCounts(window.currentStylingId); 
                    }
                    
                    const variableGroup = row.closest('.variable-group'); //
                    if (variableGroup) {
                        const remainingRows = variableGroup.querySelectorAll('.variable-row'); //
                        const addRow = variableGroup.querySelector('.add-variable-row'); //
                        if (remainingRows.length === 0 || (remainingRows.length === 1 && remainingRows[0] === addRow)) { //
                            const groupContainer = variableGroup.closest('.css-elements-container'); //
                            if (groupContainer) groupContainer.remove(); //
                        }
                    }
                    return;
                }
                return;
            }
            
            if (confirm('Are you sure you want to delete this asset?')) { //
                try {
                    if (typeof deleteAsset === 'function') { //
                        await deleteAsset(assetId); //
                        
                        row.remove(); //

                        if (typeof updateAssetCounts === 'function' && window.currentStylingId) { //
                            console.log(`[initRowEventListeners - delete variable] Triggering updateAssetCounts for styling ID: ${window.currentStylingId}`); //
                            updateAssetCounts(window.currentStylingId); //
                        }

                        if (typeof updateCssOutput === 'function') { //
                            updateCssOutput(); //
                        }
                        
                        // ADD THE FOLLOWING LINE:
                        if (typeof window.initSharedCssVariableDiscovery === 'function' && window.currentStylingId) {
                            console.log(`[initRowEventListeners - delete variable] Asset ${assetId} deleted. Refreshing shared variable discovery.`);
                            await window.initSharedCssVariableDiscovery(window.currentStylingId);
                            // initSharedCssVariableDiscovery will internally call reapplyAllVariableValueStyles and initVariablePreviews
                        }

                        const variableGroup = row.closest('.variable-group'); //
                        if (variableGroup) { //
                            const remainingRows = variableGroup.querySelectorAll('.variable-row'); //
                            const addRow = variableGroup.querySelector('.add-variable-row'); //
                            if (remainingRows.length === 0 || (remainingRows.length === 1 && remainingRows[0] === addRow)) { //
                                const groupContainer = variableGroup.closest('.css-elements-container'); //
                                if (groupContainer) groupContainer.remove(); //
                            }
                        }
                    } else {
                        console.error("handleDuplicateAsset function not found."); //
                        if (typeof showToast === 'function') showToast("Delete functionality not available.", 'error'); //
                    }
                } catch (error) {
                    console.error("Error deleting asset:", error); //
                    showToast('Error deleting asset: ' + error.message, 'error'); //
                }
            }

        });
    }


}

// Initialize all event listeners
function initEventListeners() {


    // Group creation buttons
    const addColorGroup = document.getElementById('add-color-group');
    const addImageGroup = document.getElementById('add-image-group');
    const addTypographyGroup = document.getElementById('add-typography-group');
    const addDimensionGroup = document.getElementById('add-dimension-group');
    const addselectorGroupButton = document.getElementById('add-selector-group'); // Main button in "selector" section
    const addOtherGroup = document.getElementById('add-other-group');

     // --- "Add <Type> Class Group.." buttons should open the 'selector' group modal ---
    const addColorClass = document.getElementById('add-color-class'); //
    const addImageClass = document.getElementById('add-image-class'); //
    const addTypographyClass = document.getElementById('add-typography-class'); //
    const addDimensionClass = document.getElementById('add-dimension-class'); //
    const addOtherClass = document.getElementById('add-other-class'); //


    // ----------------------------------- //
    // -------------- TYPES -------------- //
    // ----------------------------------- //

    if (addImageGroup) { 
        addImageGroup.addEventListener('click', () => {
            if (typeof openGroupModal === 'function') openGroupModal('image');
        });
    }

    if (addColorGroup) { 
        addColorGroup.addEventListener('click', () => {
            if (typeof openGroupModal === 'function') openGroupModal('color');
        });
    }

    if (addTypographyGroup) { 
        addTypographyGroup.addEventListener('click', () => {
            if (typeof openGroupModal === 'function') openGroupModal('typography');
        });
    }

    if (addDimensionGroup) { 
        addDimensionGroup.addEventListener('click', () => {
            if (typeof openGroupModal === 'function') openGroupModal('dimension');
        });
    }

    if (addselectorGroupButton) { 
        addselectorGroupButton.addEventListener('click', () => { 
            if (typeof openGroupModal === 'function') {
                openGroupModal('selector'); 
            } else {
                console.error('openGroupModal function is not defined. Check modal-html.js.');
                if (typeof showToast === 'function') showToast("Error: Cannot open 'Add Group' modal.", 'error');
            }
        });
    }
    
    if (addOtherGroup) { 
        addOtherGroup.addEventListener('click', () => {
            if (typeof openGroupModal === 'function') {
                openGroupModal('other'); 
            } else {
                console.error('openGroupModal function is not defined. Check modal-html.js.');
                if (typeof showToast === 'function') showToast("Error: Cannot open 'Add Group' modal.", 'error');
            }
        });
    }

    const typeSpecificClassGroupButtons = [
        addColorClass, addImageClass, addTypographyClass, addDimensionClass
    ];

    typeSpecificClassGroupButtons.forEach(button => {
        if (button) {
            button.addEventListener('click', () => {
                console.log(`Button ${button.id} clicked, opening 'selector' group modal.`);
                if (typeof openGroupModal === 'function') {
                    openGroupModal('selector'); // CORRECTED: Open the modal to create a 'selector' type group
                } else {
                    console.error('openGroupModal function is not defined for ' + button.id);
                    if(typeof showToast === 'function') showToast('Error: Cannot open group modal.', 'error');
                }
            });
        }
    });


    // ----------------------------------- //
    // -------------- GROUPS ------------- //
    // ----------------------------------- //

        // Initialize delete group buttons
    document.querySelectorAll('.delete-group').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const groupContainer = e.target.closest('.css-elements-container');
            if (!groupContainer) return; 
            const groupTitleElement = groupContainer.querySelector('.css-elements-title');
            if (!groupTitleElement) return; 
            const groupTitle = groupTitleElement.textContent;

            if (confirm(`Are you sure you want to delete the "${groupTitle}" group and all its variables?`)) {
                groupContainer.remove();
                if (typeof updateCssOutput === 'function') { 
                    updateCssOutput();
                }
            }
        });
    });

    if (typeof cancelModalBtn !== 'undefined' && cancelModalBtn) { 
        cancelModalBtn.addEventListener('click', () => {
            if (typeof closeGroupModal === 'function') closeGroupModal(); 
        });
    }

    if (typeof saveGroupBtn !== 'undefined' && saveGroupBtn) { 
        saveGroupBtn.addEventListener('click', () => {
            if (typeof saveGroup === 'function') saveGroup(); 
        });
    }

    
    // ----------------------------------- //
    // ------------- VARIABLES ----------- //
    // ----------------------------------- //

    if (typeof cancelVariableModalBtn !== 'undefined' && cancelVariableModalBtn) { 
        cancelVariableModalBtn.addEventListener('click', () => {
            if (typeof closeVariableModal === 'function') closeVariableModal(); 
        });
    }


    if (typeof saveVariableBtn !== 'undefined' && saveVariableBtn) { 
        saveVariableBtn.addEventListener('click', () => {
            if (typeof saveVariable === 'function') saveVariable(); 
        });
    }


    // ----------------------------------- //
    // ------------- VARIANTS ------------ //
    // ----------------------------------- //

    if (typeof cancelVariantModalBtn !== 'undefined' && cancelVariantModalBtn) { 
        cancelVariantModalBtn.addEventListener('click', () => {
            if (typeof closeVariantModal === 'function') closeVariantModal(); 
        });
    }



    const saveVariantBtn = document.getElementById('save-variant'); 
        if (saveVariantBtn) { 
            saveVariantBtn.addEventListener('click', function(e) {
                e.preventDefault(); 
                const variantValueInput = document.getElementById('variant-value'); 
                let variantValue = '';
                if (variantValueInput) {
                    // FIX: Assign the input's current value to the variable.
                    variantValue = variantValueInput.value; 
                } else {
                    console.error("Save Variant button click: Variant value input (#variant-value) not found."); 
                    if (typeof showToast === 'function') showToast("Cannot save variant: Value input not found.", "error");
                    return;
                }
                if (typeof saveVariant === 'function') {
                    // Now the correct value from the modal is passed.
                    saveVariant(variantValue); 
                }
            });
        }


    // ----------------------------------- //
    // -------------- OTHERS ------------- //
    // ----------------------------------- //

    if (typeof initColorInputs === 'function') { 
        initColorInputs(); 
    }

    // if (typeof initActionButtons === 'function') { 
    //     initActionButtons(); 
    // }

    if (typeof copyCssBtn !== 'undefined' && copyCssBtn && typeof cssOutput !== 'undefined' && cssOutput) { 
        copyCssBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(cssOutput.textContent) 
                .then(() => {
                    copyCssBtn.textContent = 'Copied!'; 
                    setTimeout(() => {
                        copyCssBtn.textContent = 'Copy CSS'; 
                    }, 2000); 
                })
                .catch(err => {
                    console.error('Failed to copy text: ', err); 
                    if (typeof showToast === 'function') showToast("Failed to copy CSS.", "error");
                });
        });
    }

    if (typeof checkForCssModule === 'function') { 
        checkForCssModule(); 
    }

    if (typeof initEnhancedCssSupport === 'function') { 
        initEnhancedCssSupport(); 
    }

    const cancelClassRuleButton = document.getElementById('cancel-class-rule-modal'); 
    if (cancelClassRuleButton) {
        cancelClassRuleButton.addEventListener('click', () => {
            if (typeof closeClassRuleModal === 'function') {
                closeClassRuleModal(); 
            } else {
                console.error('closeClassRuleModal function is not defined. Check modal-html.js.');
            }
        });
    }

    const saveClassRuleButton = document.getElementById('save-class-rule'); 
    if (saveClassRuleButton) {
        saveClassRuleButton.addEventListener('click', () => {
            const selectorInput = document.getElementById('class-rule-selector');
            const modalElement = document.getElementById('add-class-rule-modal');
        
            const rulesStringFromModal = window.modalAceEditor ? window.modalAceEditor.getValue().trim() : '';

            const newSelectorString = selectorInput ? selectorInput.value.trim() : '';
        

            
            // Retrieve context set by openClassRuleModal (in modal-html.js)
            const targetUiContainerId = modalElement ? modalElement.dataset.targetUiContainerId : null;
            const assetGroupNameForDeclarations = modalElement ? modalElement.dataset.assetGroupName : null;

            if (!newSelectorString) {
                if (typeof showToast === 'function') showToast('Selector cannot be empty.', 'warning');
                selectorInput?.focus();
                return;
            }
            // rulesStringFromModal can be empty initially if the user intends to add rules later.
            // addClassRuleToGroup (in modal-html.js) will handle this; it currently requires at least one valid rule to proceed.
            
            if (!targetUiContainerId || !assetGroupNameForDeclarations) {
                console.error("Cannot save class rule: target UI container ID or asset group name is missing from modal dataset.");
                if (typeof showToast === 'function') showToast('Error: Cannot determine target group for the new selector.', 'error');
                return;
            }

            // window.addClassRuleToGroup is defined in modal-html.js
            // It now parses rulesStringFromModal and creates individual css_declaration assets.
            if (typeof window.addClassRuleToGroup === 'function') { 
                window.addClassRuleToGroup(targetUiContainerId, assetGroupNameForDeclarations, newSelectorString, rulesStringFromModal);
            } else {
                console.error("addClassRuleToGroup function (from modal-html.js) is not defined.");
                if (typeof showToast === 'function') showToast('Error: Save rule functionality missing.', 'error');
            }

            // closeClassRuleModal is called by addClassRuleToGroup itself upon completion or error.
            // No need to explicitly call it here unless that behavior changes.
        });
    }

    // Global click listener to hide suggestions when clicking outside
    document.addEventListener('click', (event) => {
        if (typeof window.currentEditorSuggestionInput === 'function' &&
            typeof window.editorSuggestionsBoxElement === 'function' &&
            typeof window.hideSuggestionsForEditor === 'function') {

            const currentInput = window.currentEditorSuggestionInput();
            const suggestionsBox = window.editorSuggestionsBoxElement();

            if (currentInput && suggestionsBox &&
                !suggestionsBox.contains(event.target) &&
                event.target !== currentInput) {
                window.hideSuggestionsForEditor();
            }
        }
    });


    document.addEventListener('click', function(event) {
        const addRuleButton = event.target.closest('.add-css-declaration-to-selector-row');
        if (addRuleButton) {
            event.preventDefault();
            createInlineCssRuleRow(addRuleButton);
        }
    });

}

// Color input functionality
function initColorInputs() {
    document.querySelectorAll('.color-input').forEach(colorInput => {
        const textInput = colorInput.nextElementSibling;
        if (!textInput) return;

        // Update text input when color input changes
        colorInput.addEventListener('input', () => {
            textInput.value = colorInput.value;
            updateColorPreview(textInput);
        });

        // Update color input when text input changes
        textInput.addEventListener('input', () => {
            if (isValidColor(textInput.value)) {
                colorInput.value = textInput.value;
            }
            updateColorPreview(textInput);
        });
    });
}



function initEditableField(field) {
    field.addEventListener('focus', async () => {
        field.dataset.originalValue = field.value;
        if (field.classList.contains('variable-value-input') || field.closest('.variant-value')) {
            // console.log('[INIT.JS - initEditableField] Focus on variable value input. Field value:', field.value);
            if (typeof window.initSharedCssVariableDiscovery === 'function' && window.currentStylingId) {
                await window.initSharedCssVariableDiscovery(window.currentStylingId);
            }
            if (typeof window.showSuggestionsForEditor === 'function') {
                window.showSuggestionsForEditor(field, field.value);
            }
            if (typeof window.updateValueInputVariableStyle === 'function') {
                window.updateValueInputVariableStyle(field);
            }
        }
    });

    field.addEventListener('input', () => {
        if (field.classList.contains('variable-value-input') || field.closest('.variant-value')) {
            if (typeof window.showSuggestionsForEditor === 'function') {
                window.showSuggestionsForEditor(field, field.value);
            }
            if (typeof window.updateValueInputVariableStyle === 'function') {
                window.updateValueInputVariableStyle(field);
            }
        }
    });

    field.addEventListener('blur', async () => {
        if (field.classList.contains('variable-value-input') || field.closest('.variant-value')) {
            if (typeof window.hideSuggestionsForEditor === 'function') {
                setTimeout(() => window.hideSuggestionsForEditor(), 150);
            }
            if (typeof window.updateValueInputVariableStyle === 'function') {
                window.updateValueInputVariableStyle(field);
            }
        }

        // Check if the value of THIS field (name, value, or description) has changed
        const valueChanged = field.value.trim() !== (field.dataset.originalValue || "").trim();
        
        const rowElement = field.closest('.variable-row'); // Covers both variable rows and css-rule-rows
        const variantRowElement = field.closest('.variant-row');

        if (rowElement && !variantRowElement && !rowElement.classList.contains('editing-mode')) {
            // This part handles saving existing StyleAssets (CSS Variables or CSS Declarations)
            const assetId = rowElement.dataset.assetId;
            if (!assetId || !window.currentStylingId) {
                console.warn("Cannot update asset: Missing assetId or currentStylingId on blur for existing row.");
                return;
            }

            // Gather all potentially changed data from the row
            const nameInput = rowElement.querySelector('.variable-name .editable-field');
            const valueInput = rowElement.querySelector('.variable-value-wrapper .variable-value-input');
            const descriptionInput = rowElement.querySelector('.variable-description-input'); // Get description input
            const importanceCheckbox = rowElement.querySelector('.importance-checkbox');

            let dataHasChanged = false;
            const assetData = {};

            if (nameInput && nameInput.value.trim() !== (nameInput.dataset.originalValueFromLoad || nameInput.dataset.originalValue || "").trim()) {
                assetData.name = nameInput.value.trim();
                assetData.original_name = nameInput.dataset.originalValueFromLoad || nameInput.dataset.originalValue; // Send original if name changed
                dataHasChanged = true;
            } else if (nameInput) {
                assetData.name = nameInput.value.trim(); // Always send name if present, even if unchanged for context if other fields changed
            }

            if (valueInput && valueInput.value.trim() !== (valueInput.dataset.originalValueFromLoad || valueInput.dataset.originalValue || "").trim()) {
                assetData.value = valueInput.value.trim();
                dataHasChanged = true;
            }

            if (descriptionInput && descriptionInput.value.trim() !== (descriptionInput.dataset.originalValueFromLoad || descriptionInput.dataset.originalValue || "").trim()) {
                assetData.description = descriptionInput.value.trim(); // <<< ADD description to assetData
                dataHasChanged = true;
            }
            
            // Always send importance if the checkbox itself was the source of blur or if other data changed
            // Or, more simply, just always send its current state if dataHasChanged
            if (importanceCheckbox && (field === importanceCheckbox || dataHasChanged || importanceCheckbox.checked.toString() !== (rowElement.dataset.originalImportance || "false"))) {
                assetData.is_important = importanceCheckbox.checked.toString();
                dataHasChanged = true; // Ensure save if only importance changed
            }


            if (!dataHasChanged && field.value.trim() === (field.dataset.originalValue || "").trim()){
                // console.log("[INIT.JS - blur] Field value hasn't changed from original, no save needed for this specific field.", field);
                return; // If the blurred field itself didn't change, and no other data seems to have changed based on simple check
            }
            
            // Ensure at least one of name, value, description, or is_important is being sent if dataHasChanged.
            // If only importance changed, assetData might only have is_important.
            // The backend PUT should handle partial updates.

            // If assetData is empty but dataHasChanged was true (e.g. only importance toggled to original state), ensure is_important is sent
            if(dataHasChanged && Object.keys(assetData).length === 0 && importanceCheckbox){
                assetData.is_important = importanceCheckbox.checked.toString();
            }

            if (rowElement.classList.contains('css-rule-row')) {
                const parentSelectorBlock = rowElement.closest('.class-rule-entry');
                if (parentSelectorBlock && parentSelectorBlock.dataset.selectorString) {
                    assetData.selector = parentSelectorBlock.dataset.selectorString;
                }
            }

            console.log(`[INIT.JS - blur] Attempting to update asset ${assetId}. Data changed: ${dataHasChanged}. Data to send:`, JSON.parse(JSON.stringify(assetData)));

            if (!dataHasChanged) return; // Do not proceed if no meaningful data changed

            try {
                if (typeof window.updateAsset === 'function') { 
                    const updatedAsset = await window.updateAsset(window.currentStylingId, assetId, assetData);
                    if (updatedAsset) {
                        // Update originalValue datasets for all fields in this row to prevent re-saving
                        if(nameInput) nameInput.dataset.originalValue = nameInput.dataset.originalValueFromLoad = updatedAsset.name || nameInput.value;
                        if(valueInput) valueInput.dataset.originalValue = valueInput.dataset.originalValueFromLoad = updatedAsset.value || valueInput.value;
                        if(descriptionInput) descriptionInput.dataset.originalValue = descriptionInput.dataset.originalValueFromLoad = updatedAsset.description || descriptionInput.value;
                        if(importanceCheckbox) rowElement.dataset.originalImportance = updatedAsset.is_important.toString();


                        // If backend formatted/changed values, update the inputs
                        if (nameInput && updatedAsset.name) nameInput.value = updatedAsset.name;
                        if (valueInput && updatedAsset.value !== undefined) valueInput.value = updatedAsset.value;
                        if (descriptionInput && updatedAsset.description !== undefined) descriptionInput.value = updatedAsset.description;
                        if (importanceCheckbox && updatedAsset.is_important !== undefined) importanceCheckbox.checked = updatedAsset.is_important;


                        if (typeof showToast === 'function') showToast('Asset updated.', 'success');
                        if (assetData.name && typeof window.initSharedCssVariableDiscovery === 'function') { // If name might have changed
                            await window.initSharedCssVariableDiscovery(window.currentStylingId);
                        }
                        if (typeof updateCssOutput === 'function') {
                            updateCssOutput();
                        }
                        if (typeof updateAssetCounts === 'function') {
                            updateAssetCounts(window.currentStylingId); 
                        }
                    }
                } else {
                    console.error("window.updateAsset (from api.js) function is not defined.");
                    if (typeof showToast === 'function') showToast("Error: Save functionality for asset update is missing.", "error");
                }
            } catch (error) {
                console.error("Error during asset update on blur:", error);
                if (typeof showToast === 'function') showToast(`Error saving asset: ${error.message || 'Unknown error'}`, "error");
                // Revert the specific field that was blurred if save failed
                // field.value = field.dataset.originalValue || "";
            }

        } else if (variantRowElement) {
            // Handle variant saving (existing logic for variants)
            const parentAssetId = variantRowElement.closest('.variable-row')?.dataset.assetId;
            if (parentAssetId) {
                if (typeof updateVariantInDatabase === 'function') { 
                    await updateVariantInDatabase(variantRowElement, parentAssetId);
                } else {
                    console.warn("updateVariantInDatabase function not defined in init.js context.");
                }
            }
        }
    });

    field.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            field.blur(); // Trigger blur to save
        } else if (e.key === 'Escape') {
            if (field.classList.contains('variable-value-input') || field.closest('.variant-value')) {
                if (typeof window.hideSuggestionsForEditor === 'function') {
                    window.hideSuggestionsForEditor();
                }
            }
            field.value = field.dataset.originalValue || ""; // Revert current field
            if (field.classList.contains('variable-value-input') && typeof window.updateValueInputVariableStyle === 'function') {
                 window.updateValueInputVariableStyle(field); // Re-style if it's a value input
            }
            field.blur(); // Remove focus
        }
    });
}
// Helper function to initialize auto-save functionality
// This function tracks changes in the UI and saves them automatically
function initAutoSave() {
    // Track when content changes
    let saveTimeout;

    // Listen for input events that should trigger saves
    document.addEventListener('input', function(e) {
    if (modalOpen) {
        console.log("Input detected while modal is open, skipping update.");
        return;
    }  
      const variableRow = e.target.closest('.variable-row');
      if (variableRow && (
        e.target.classList.contains('editable-field') ||
        e.target.classList.contains('importance-checkbox')
      )) {
        // Clear previous timeout
        clearTimeout(saveTimeout);

        // Set new timeout to save changes after user stops typing
        saveTimeout = setTimeout(() => {
          if (window.currentStylingId) {
            // Assuming generateCssWithGroups, collectProperties, collectGroups, syncCssWithDatabase are available globally or imported
            const css = generateCssWithGroups(collectProperties(), collectGroups());
            syncCssWithDatabase(window.currentStylingId);
          }
        }, 1500); // 1.5 second delay
      }
    });

    // Also handle action button clicks that modify content
    document.addEventListener('click', function(e) {
      if (e.target.closest('.action-button[title="Delete"]') ||
          e.target.closest('.action-button[title="Duplicate"]')) {
        // Clear previous timeout
        clearTimeout(saveTimeout);

        // Set shorter timeout for immediate actions
        saveTimeout = setTimeout(() => {
          if (window.currentStylingId) {
             // Assuming syncCssWithDatabase is available globally or imported
            syncCssWithDatabase(window.currentStylingId);
          }
        }, 500); // 0.5 second delay
      }
    });
}


function initGroupEventListeners(groupElement, type) {
    if (!groupElement) return;

    // The groupId is usually like 'color-my-group' or 'selector-my-selectors'
    // It's used by openClassRuleModal and createInlineVariableRow
    const groupId = groupElement.id ? groupElement.id.replace('-container', '') : null;
    if (!groupId) {
        console.error("initGroupEventListeners: Could not derive groupId from groupElement.id:", groupElement.id);
        return;
    }

    const originalGroupName = groupElement.dataset.originalGroupName || 'General';

    // Listener for the HEADER "+ Add <Type>" button
    const headerAddButton = groupElement.querySelector('.css-elements-actions .button.button-primary');
    if (headerAddButton) {
        // Remove existing listener to prevent duplicates if re-initializing
        const newButton = headerAddButton.cloneNode(true);
        headerAddButton.parentNode.replaceChild(newButton, headerAddButton);

        newButton.addEventListener('click', () => {
            if (type === 'selector') { // Check the 'type' of the group
                if (typeof openClassRuleModal === 'function') { // From modal-html.js
                    openClassRuleModal(groupId); // Pass the base group ID, e.g., "selector-my-group"
                } else {
                    console.error('openClassRuleModal function not found.');
                }
            } else {
                // For other types (color, image, etc.)
                if (typeof createInlineVariableRow === 'function') { // From modal-handlers.js
                    createInlineVariableRow(groupId, originalGroupName, type);
                } else {
                    console.error('createInlineVariableRow function not found.');
                }
            }
        });
    }

    // Listener for the TEXT ROW "+ Add <Type> variable/rule" at the bottom of the group
    const addRowInGroup = groupElement.querySelector(`.variable-group .add-variable-row[data-group="${groupId}"]`);
    if (addRowInGroup) {
        // Remove existing listener
        const newAddRow = addRowInGroup.cloneNode(true);
        addRowInGroup.parentNode.replaceChild(newAddRow, addRowInGroup);

        newAddRow.addEventListener('click', () => {
            if (type === 'selector') { // Check the 'type' of the group
                if (typeof openClassRuleModal === 'function') {
                    openClassRuleModal(groupId);
                } else {
                    console.error('openClassRuleModal function not found.');
                }
            } else {
                if (typeof createInlineVariableRow === 'function') {
                    createInlineVariableRow(groupId, originalGroupName, type);
                } else {
                    console.error('createInlineVariableRow function not found.');
                }
            }
        });
    }

    // Delete group button listener (seems okay but ensure it's robust)
    const deleteGroupButton = groupElement.querySelector('.delete-group');
    if (deleteGroupButton) {
        const newDeleteButton = deleteGroupButton.cloneNode(true);
        deleteGroupButton.parentNode.replaceChild(newDeleteButton, deleteGroupButton);
        newDeleteButton.addEventListener('click', (e) => {
            e.stopPropagation();
            const groupTitleElement = groupElement.querySelector('.css-elements-title');
            const groupTitle = groupTitleElement ? groupTitleElement.textContent : 'this group';
            if (confirm(`Are you sure you want to delete the "${groupTitle}" group and all its items?`)) {
                groupElement.remove();
                if (typeof updateCssOutput === 'function') updateCssOutput();
                // Also update tree counts if an entire group of selectors/variables is removed
                if (typeof updateAssetCounts === 'function' && window.currentStylingId) {
                    updateAssetCounts(window.currentStylingId);
                }
            }
        });
    }
}

// This function seems to be related to live updates triggered by mutations
// It might need to be called from your main initialization after other setups are complete
function initAutoUpdate() {

    if (modalOpen) {
    // If a modal is open, skip the rest of this click handler to prevent interference
    return;
}
    // Monitor editor changes and update visual UI on save (This part seems related to a CSS editor, possibly separate)
    if (window.editor && !window.editor._syncHandler) {
        // Monitor save button in CSS view (Assumes #save-css-btn exists and saveCssChanges is defined)
        const saveCssBtn = document.getElementById('save-css-btn');
        if (saveCssBtn) {
        saveCssBtn.addEventListener('click', async () => {
            if (window.currentStylingId && typeof saveCssChanges === 'function') {
            const success = await saveCssChanges(window.currentStylingId);

            // If save was successful and we have the CSS data
            if (success && window.lastSavedCssData) {
                // Store the data for use when returning to visual UI
                window.lastParsedProperties = window.lastSavedCssData.properties;
                window.lastParsedGroups = window.lastSavedCssData.groups;
            }
            }
        });
        }
    }

    // Continue with existing auto-update functionality (triggered by input/click in the UI)
    document.addEventListener('input', function(e) {
        const variableRow = e.target.closest('.variable-row');
        if (variableRow && (
        e.target.classList.contains('editable-field') ||
        e.target.classList.contains('importance-checkbox')
        )) {
        // Assuming updateCssOutput is available globally or imported
        clearTimeout(window.updateTimeout);
        window.updateTimeout = setTimeout(updateCssOutput, 300);
        }
    });

    // Listen for action buttons or add variable row clicks
    document.addEventListener('click', function(e) {
        if (e.target.closest('.action-button') ||
            e.target.closest('.add-variable-row') ||
            e.target.closest('[data-group]')) {
         // Assuming updateCssOutput is available globally or imported
         if (modalOpen) {
            // If a modal is open, skip the rest of this click handler to prevent interference
            return;
        }
        setTimeout(updateCssOutput, 100);
        }
    });

    // Monitor structure changes (e.g., adding/removing rows)
    // const observer = new MutationObserver(function(mutations) {
    //      // Assuming updateCssOutput is available globally or imported
     
    //     clearTimeout(window.mutationTimeout);
    //     window.mutationTimeout = setTimeout(updateCssOutput, 300);
    // });
    const observer = new MutationObserver(function(mutations) {
        // Add the check here
        if (modalOpen) {
            console.log("Mutation detected while modal is open, skipping update.");
            return;
        }
        // ... rest of the observer callback
        clearTimeout(window.mutationTimeout);
        window.mutationTimeout = setTimeout(updateCssOutput, 300);
    });


    // Observe all containers that hold variables/groups
    const containers = [
        document.getElementById('colors-container'),
        document.getElementById('images-container'),
        document.getElementById('typography-container'),
        document.getElementById('dimensions-container'),
        document.getElementById('selector-container') // Added selector container based on your HTML
    ];

    containers.forEach(container => {
        if (container) {
        observer.observe(container, { childList: true, subtree: true });
        }
    });
}



function initCssPropertyRowListeners(propertyRowElement, parentSelectorContext_UNUSED) {
    if (!propertyRowElement) return;

    const propertyInput = propertyRowElement.querySelector('.variable-name.css-property-name .editable-field');
    const valueInput = propertyRowElement.querySelector('.variable-value-wrapper.css-rule-value-wrapper .editable-field');
    const descriptionInput = propertyRowElement.querySelector('.variable-description-input');
    const importanceCheckbox = propertyRowElement.querySelector('.variable-importance .importance-checkbox');
    const deleteButton = propertyRowElement.querySelector('.variable-actions .delete'); 
    const enableCheckbox = propertyRowElement.querySelector('.variable-content > .enable-disable-checkbox');

    const declarationAssetId = propertyRowElement.dataset.assetId;

    if (!declarationAssetId) {
        console.warn("initCssPropertyRowListeners: Missing data-asset-id on an existing declaration row. Interactions will fail.", propertyRowElement);
        return;
    }
    
    const autoSaveChangesToDeclaration = async (fieldNameChanged) => {
        if (!window.currentStylingId || !declarationAssetId) {
            console.error("autoSaveChangesToDeclaration: Missing currentStylingId or declarationAssetId for asset:", declarationAssetId);
            if(typeof showToast === 'function') showToast("Error: Cannot save property, context missing.", "error");
            return false;
        }
        
        const formData = new FormData();
        let dataToSend = false;
        let nameValueForUpdate = propertyInput ? propertyInput.value.trim() : propertyRowElement.dataset.variableName; // Corrected fallback

        if (fieldNameChanged === 'property' && propertyInput) {
            const newValue = propertyInput.value.trim();
            if (newValue !== (propertyInput.dataset.originalValue || "").trim()) {
                if (!newValue) { 
                    if(typeof showToast === 'function') showToast('CSS Property name cannot be empty.', 'warning');
                    propertyInput.value = propertyInput.dataset.originalValue || ""; 
                    return false;
                }
                formData.append('name', newValue); 
                nameValueForUpdate = newValue; 
                dataToSend = true;
            }
        } else if (fieldNameChanged === 'value' && valueInput) {
            const newValue = valueInput.value.trim(); 
             if (newValue !== (valueInput.dataset.originalValue || "").trim()) {
                formData.append('value', newValue);
                dataToSend = true;
            }
        } else if (fieldNameChanged === 'description' && descriptionInput) {
            const newValue = descriptionInput.value.trim();
            if (newValue !== (descriptionInput.dataset.originalValue || "").trim()) {
                formData.append('description', newValue);
                dataToSend = true;
            }
        } else if (fieldNameChanged === 'importance' && importanceCheckbox) {
            formData.append('is_important', importanceCheckbox.checked.toString());
            dataToSend = true; 
        } else if (fieldNameChanged === 'enable' && enableCheckbox) {
            console.log(`UI Toggle: Declaration asset ${declarationAssetId} 'enabled' state set to ${enableCheckbox.checked}.`);
            if (typeof updateCssOutput === 'function') updateCssOutput();
            return true;
        }

        if (!dataToSend) return false; 

        if (nameValueForUpdate && !formData.has('name')) {
            formData.append('name', nameValueForUpdate);
        }
        
        console.log(`[SAVE-EXISTING-DECLARATION] Updating asset ${declarationAssetId}. Data:`, Object.fromEntries(formData));
        try {
            if (typeof window.updateAsset !== 'function') {
                 console.error("window.updateAsset function is not defined.");
                 if(typeof showToast === 'function') showToast("Error: Save functionality missing.", "error");
                 return false;
            }
            const updatedDeclarationAsset = await window.updateAsset(window.currentStylingId, declarationAssetId, Object.fromEntries(formData));

            if (updatedDeclarationAsset) {
                if(propertyInput && updatedDeclarationAsset.name !== undefined) {
                     propertyInput.value = updatedDeclarationAsset.name; 
                     propertyInput.dataset.originalValue = updatedDeclarationAsset.name;
                }
                if(valueInput && updatedDeclarationAsset.value !== undefined) {
                    valueInput.value = updatedDeclarationAsset.value; 
                    valueInput.dataset.originalValue = updatedDeclarationAsset.value;
                }
                if(descriptionInput && updatedDeclarationAsset.description !== undefined) {
                    descriptionInput.value = updatedDeclarationAsset.description;
                    descriptionInput.dataset.originalValue = updatedDeclarationAsset.description;
                }
                if(importanceCheckbox && updatedDeclarationAsset.is_important !== undefined) {
                    importanceCheckbox.checked = updatedDeclarationAsset.is_important;
                }
                if (typeof showToast === 'function') showToast('CSS property updated.', 'success');
                if (typeof updateCssOutput === 'function') updateCssOutput();

                // --- MODIFICATION START ---
                // This is the critical step to trigger the live icon update.
                if (window.inheritanceHandlers && typeof window.inheritanceHandlers.refreshAllInheritanceStatus === 'function') {
                    console.log("CSS property updated, refreshing all inheritance statuses to update icons.");
                    await window.inheritanceHandlers.refreshAllInheritanceStatus();
                } else {
                    console.warn("Could not find refreshAllInheritanceStatus function to update icons.");
                }
                // --- MODIFICATION END ---

                return true;
            }
            return false; 
        } catch (error) { 
            console.error("Error saving existing CSS property declaration:", error);
            if (typeof showToast === 'function') showToast(`Error updating property: ${error.message}`, 'error');
            // Revert UI on failure
            if(propertyInput && (fieldNameChanged === 'property')) propertyInput.value = propertyInput.dataset.originalValue || "";
            if(valueInput && (fieldNameChanged === 'value')) valueInput.value = valueInput.dataset.originalValue || "";
            if(descriptionInput && (fieldNameChanged === 'description')) descriptionInput.value = descriptionInput.dataset.originalValue || "";
            if(importanceCheckbox && (fieldNameChanged === 'importance')) importanceCheckbox.checked = !importanceCheckbox.checked;
            return false;
        }
    };

    // --- Event listeners for Property Name ---
    if (propertyInput) {
        propertyInput.addEventListener('focus', function() { this.dataset.originalValue = this.value; });
        propertyInput.addEventListener('blur', function() {
            if (this.value.trim() !== (this.dataset.originalValue || "").trim()) autoSaveChangesToDeclaration('property'); 
        });
        propertyInput.addEventListener('keydown', function(e) { 
            if (e.key === 'Enter') {e.preventDefault(); this.blur();} 
            else if (e.key === 'Escape') {this.value = this.dataset.originalValue || ""; this.blur();} 
        });
    }

    // --- Event listeners for Value Input (Crucial for suggestions/styling) ---
    if (valueInput) {
        valueInput.addEventListener('focus', async function() {
            this.dataset.originalValue = this.value;
            if (typeof window.showSuggestionsForEditor === 'function') {
                window.showSuggestionsForEditor(this, this.value);
            }
            if (typeof window.updateValueInputVariableStyle === 'function') {
                window.updateValueInputVariableStyle(this);
            }
        });

        valueInput.addEventListener('blur', function() {
            if (this.value.trim() !== (this.dataset.originalValue || "").trim()) autoSaveChangesToDeclaration('value'); 
        });
        
        valueInput.addEventListener('input', function() {
            if (typeof window.showSuggestionsForEditor === 'function') {
                window.showSuggestionsForEditor(this, this.value);
            }
            if (typeof window.updateValueInputVariableStyle === 'function') {
                window.updateValueInputVariableStyle(this);
            }
        });

        valueInput.addEventListener('keydown', function(e) { 
            if (e.key === 'Enter') {e.preventDefault(); this.blur();} 
            else if (e.key === 'Escape') {
                if(typeof window.hideSuggestionsForEditor === 'function') window.hideSuggestionsForEditor();
                this.value = this.dataset.originalValue || ""; 
                this.blur();
            } 
        });
    }
    
    // --- Event listeners for Description Input ---
    if (descriptionInput) {
        descriptionInput.addEventListener('focus', function() { this.dataset.originalValue = this.value; });
        descriptionInput.addEventListener('blur', function() {
            if (this.value.trim() !== (this.dataset.originalValue || "").trim()) autoSaveChangesToDeclaration('description');
        });
        descriptionInput.addEventListener('keydown', function(e) { 
            if (e.key === 'Enter') {e.preventDefault(); this.blur();} 
            else if (e.key === 'Escape') {this.value = this.dataset.originalValue || ""; this.blur();}
        });
    }

    if (importanceCheckbox) {
        importanceCheckbox.addEventListener('change', () => autoSaveChangesToDeclaration('importance'));
    }

    if (enableCheckbox) {
        const newEnableCheckbox = enableCheckbox.cloneNode(true);
        enableCheckbox.parentNode.replaceChild(newEnableCheckbox, enableCheckbox);
        newEnableCheckbox.addEventListener('change', () => {
            propertyRowElement.classList.toggle('disabled-rule-property', !newEnableCheckbox.checked);
            autoSaveChangesToDeclaration('enable'); 
        });
        propertyRowElement.classList.toggle('disabled-rule-property', !newEnableCheckbox.checked);
    }

    if (deleteButton) {
        const newDeleteButton = deleteButton.cloneNode(true);
        deleteButton.parentNode.replaceChild(newDeleteButton, deleteButton);
        newDeleteButton.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (confirm('Are you sure you want to delete this CSS property?')) {
                if (typeof window.deleteAsset === 'function' && window.currentStylingId && declarationAssetId) {
                    // --- MODIFICATION START ---
                    // The deleteAsset function also needs to trigger a refresh.
                    const success = await window.deleteAsset(declarationAssetId);
                    if (success) {
                        propertyRowElement.remove();
                        if (typeof showToast === 'function') showToast('CSS property deleted.', 'success');
                        if (typeof updateCssOutput === 'function') updateCssOutput();
                        if (typeof updateAssetCounts === 'function') updateAssetCounts(window.currentStylingId);
                        // Refresh inheritance status after deletion as well.
                        if (window.inheritanceHandlers && typeof window.inheritanceHandlers.refreshAllInheritanceStatus === 'function') {
                            await window.inheritanceHandlers.refreshAllInheritanceStatus();
                        }
                    }
                    // --- MODIFICATION END ---
                } else { console.error("deleteAsset function or context missing."); }
            }
        });
    }
}



// Function to be REPLACED in init.js
function initClassRuleEntryListeners(classRuleEntryElement) {
    if (!classRuleEntryElement) return;

    const selectorString = classRuleEntryElement.dataset.selectorString;
    const representativeBlockAssetId = classRuleEntryElement.dataset.assetId; // For legacy, this IS the asset ID. For new, it's representative.

    if (!selectorString && !classRuleEntryElement.classList.contains('legacy-rule-block')) {
        // For new model blocks, selectorString is crucial for deleting its declarations if the block ID is just representative.
        // For legacy blocks, representativeBlockAssetId is the actual ID.
        console.warn("initClassRuleEntryListeners: Missing data-selector-string on a non-legacy rule entry element. Delete block functionality might be impaired if block ID is not the true asset ID.", classRuleEntryElement);
    }
     if (!representativeBlockAssetId && classRuleEntryElement.classList.contains('legacy-rule-block')) {
        console.warn("initClassRuleEntryListeners: Missing data-asset-id on a legacy rule entry element. Cannot delete.", classRuleEntryElement);
    }


    const deleteRuleBlockBtn = classRuleEntryElement.querySelector('.class-rule-header .action-button.delete');
    if (deleteRuleBlockBtn) {
        // Clone and replace to ensure only one listener is attached if this function is called multiple times on same element
        const newDeleteRuleBlockBtn = deleteRuleBlockBtn.cloneNode(true);
        deleteRuleBlockBtn.parentNode.replaceChild(newDeleteRuleBlockBtn, deleteRuleBlockBtn);

        newDeleteRuleBlockBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const selectorNameToConfirm = selectorString || classRuleEntryElement.querySelector('.selector-name')?.textContent || 'this selector block';
            
            if (confirm(`Are you sure you want to delete the selector "${selectorNameToConfirm}" and all its properties?`)) {
                try {
                    if (!window.currentStylingId) {
                        throw new Error("Missing currentStylingId to delete selector block.");
                    }

                    let mainDeletionSuccess = false;

                    if (classRuleEntryElement.classList.contains('legacy-rule-block')) {
                        // Handle LEGACY 'class_rule' block deletion (one asset)
                        if (!representativeBlockAssetId || representativeBlockAssetId.startsWith('legacy-')) {
                            // The representativeBlockAssetId for legacy blocks should be the integer ID from the database.
                            // The 'legacy-X-Y' format was for individual rules within a legacy block if rendered, not the block itself.
                            // If makeIndividualSelectorEntryHtml was called by processLegacyClassRules,
                            // representativeBlockAssetId is `legacyRuleBlock.legacyAssetId`.
                            throw new Error("Invalid or missing asset ID for legacy block deletion. Expected integer ID.");
                        }
                        if (typeof window.deleteAsset === 'function') {
                            mainDeletionSuccess = await window.deleteAsset(representativeBlockAssetId); // representativeBlockAssetId IS the actual asset ID
                            if (mainDeletionSuccess) {
                                if (typeof showToast === 'function') showToast(`Legacy selector "${selectorNameToConfirm}" deleted.`, 'success');
                            }
                        } else {
                            throw new Error("deleteAsset function is unavailable.");
                        }
                    } else {
                        // Handle NEW model: delete all individual "css_declaration" assets for this selectorString
                        if (!selectorString) {
                             throw new Error("Missing selector string to delete its declarations for new model block.");
                        }
                        const declarationRows = classRuleEntryElement.querySelectorAll('.css-declarations-list .variable-row.css-rule-row[data-asset-id]');
                        let allDeletionsSucceeded = true;
                        const deletionPromises = [];

                        declarationRows.forEach(declRow => {
                            const declAssetId = declRow.dataset.assetId;
                            if (declAssetId && !declAssetId.startsWith('legacy-') && !declAssetId.startsWith('new-decl-')) { // Ensure it's a real DB ID
                                if (typeof window.deleteAsset === 'function') {
                                    deletionPromises.push(
                                        window.deleteAsset(declAssetId).catch(err => {
                                            console.error(`Failed to delete property asset ${declAssetId} for selector "${selectorString}":`, err);
                                            allDeletionsSucceeded = false; 
                                        })
                                    );
                                } else {
                                    console.error("window.deleteAsset function is not available.");
                                    allDeletionsSucceeded = false; 
                                }
                            } else if (!declAssetId || declAssetId.startsWith('legacy-') || declAssetId.startsWith('new-decl-')) {
                                 // Rows with temporary IDs or legacy internal rule IDs are just removed from UI, not deleted from backend individually here.
                                 console.warn("Found a declaration row with a temporary or legacy internal ID during block delete, it will be removed from UI only:", declRow);
                            }
                        });
                        
                        if(deletionPromises.length === 0 && declarationRows.length > 0 && !(typeof window.deleteAsset === 'function')){
                             if(typeof showToast === 'function') showToast("Error: Delete asset function not available.", "error");
                             return; // Stop if delete function missing and there were rows to delete
                        }
                        
                        if (deletionPromises.length > 0) {
                            await Promise.all(deletionPromises);
                        }
                        // If all backend deletions succeeded (or there were no backend declarations to delete),
                        // consider the main deletion successful for UI removal.
                        mainDeletionSuccess = allDeletionsSucceeded; 

                        if (mainDeletionSuccess) {
                            if (typeof showToast === 'function') showToast(`Selector "${selectorNameToConfirm}" and its properties deleted.`, 'success');
                        } else if (deletionPromises.length > 0) { // If there were promises but not all succeeded
                             if (typeof showToast === 'function') showToast(`Error: Some properties of "${selectorNameToConfirm}" could not be deleted. Please refresh.`, 'error');
                             if(window.currentStylingId && typeof loadBrandStyling === 'function') loadBrandStyling(window.currentStylingId); // Attempt to resync UI
                        }
                    }

                    // Common UI updates if main deletion (either legacy or all new declarations) was successful
                    if (mainDeletionSuccess) {
                        classRuleEntryElement.remove();
                        if (typeof updateCssOutput === 'function') updateCssOutput();
                        if (typeof updateAssetCounts === 'function' && window.currentStylingId) {
                            updateAssetCounts(window.currentStylingId);
                        }
                        const parentUiGroup = classRuleEntryElement.closest('.css-elements-container[data-original-group-name]');
                        if (parentUiGroup && !parentUiGroup.querySelector('.class-rule-entry')) {
                            parentUiGroup.remove(); 
                        }
                    }

                } catch (error) { 
                    console.error("Error during selector block deletion process:", error);
                    if(typeof showToast === 'function') showToast(`Error deleting selector: ${error.message}`, 'error');
                }
            }
        });
    }

    const editSelectorBtn = classRuleEntryElement.querySelector('.class-rule-header .btn-edit-class-rule');
    if (editSelectorBtn) {
        const newEditSelectorBtn = editSelectorBtn.cloneNode(true);
        editSelectorBtn.parentNode.replaceChild(newEditSelectorBtn, editSelectorBtn);
        newEditSelectorBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            console.log(`Edit selector clicked for: ${selectorString}. Renaming a selector requires further implementation.`);
            if (typeof showToast === 'function') showToast(`Renaming selector "${selectorString}" is not yet implemented.`, 'info');
        });
    }

    // The "+ Add property" button (.add-css-declaration-to-selector-row) within this block:
    // This listener is added to ensure it works even if a global listener in initEventListeners fails or is removed.
    // It's better to have it here for robustness specific to this component.
    const addPropertyBtn = classRuleEntryElement.querySelector('.add-css-declaration-to-selector-row');
    if (addPropertyBtn) {
        const newAddPropertyBtn = addPropertyBtn.cloneNode(true);
        addPropertyBtn.parentNode.replaceChild(newAddPropertyBtn, addPropertyBtn);
        newAddPropertyBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (typeof createInlineCssRuleRow === 'function') { // from modal-handlers.js
                createInlineCssRuleRow(newAddPropertyBtn); // Pass the button itself to get context
            } else {
                console.error("createInlineCssRuleRow function (from modal-handlers.js) not found.");
            }
        });
    }

    // Initialize listeners for ALREADY EXISTING property rows within this selector block
    const declarationRows = classRuleEntryElement.querySelectorAll('.css-declarations-list .variable-row.css-rule-row');
    declarationRows.forEach(declRow => {
        // initCssPropertyRowListeners is the function we modified previously in init.js
        if (typeof initCssPropertyRowListeners === 'function') {
            // representativeBlockAssetId is passed as the second argument (parentSelectorContext_UNUSED)
            // but initCssPropertyRowListeners now primarily uses declRow.dataset.assetId
            initCssPropertyRowListeners(declRow, representativeBlockAssetId); 
        } else {
            console.warn("initCssPropertyRowListeners not found during initClassRuleEntryListeners. Existing properties in selector block may not be interactive.");
        }
    });

    const mainEnableCheckbox = classRuleEntryElement.querySelector('.class-rule-header > .enable-disable-checkbox');
    if (mainEnableCheckbox) {
        const newMainEnableCheckbox = mainEnableCheckbox.cloneNode(true);
        mainEnableCheckbox.parentNode.replaceChild(newMainEnableCheckbox, mainEnableCheckbox);
        newMainEnableCheckbox.addEventListener('change', () => {
            const isEnabled = newMainEnableCheckbox.checked;
            classRuleEntryElement.classList.toggle('disabled-rule-block', !isEnabled);
            if (typeof updateCssOutput === 'function') updateCssOutput();
            console.log(`Selector block "${selectorString}" UI enabled state: ${isEnabled}.`);
        });
        classRuleEntryElement.classList.toggle('disabled-rule-block', !newMainEnableCheckbox.checked);
    }
}





// Initialize event listeners when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
  initEventListeners();
  initEnhancedCssSupport();
  initVariablePreviews(); 

});

window.addEventListener('load', function() {
    // Set interval to check for the real init function
    const checkInterval = setInterval(function() {
        if (window._realInitEnhancedCssSupport && window._pendingCssInitCall) {
            console.log("Real CSS support init function now available, calling it");
            window._realInitEnhancedCssSupport();
            window._pendingCssInitCall = false;
            clearInterval(checkInterval);
        }
    }, 500);
    
    // Stop checking after 10 seconds no matter what
    setTimeout(function() {
        clearInterval(checkInterval);
    }, 10000);
});

window.inheritanceHandlers.refreshAllInheritanceStatus();