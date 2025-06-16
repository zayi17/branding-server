// Modal handling

function showModal(modal) {
    if (!modal) return;
    modal.classList.remove('hidden');
    const backdrop = modal.closest('.modal-backdrop');
    if (backdrop) backdrop.classList.remove('hidden');
}

function hideModal(modal) {
    if (!modal) return;
    modal.classList.add('hidden');
    const backdrop = modal.closest('.modal-backdrop');
    if (backdrop) backdrop.classList.add('hidden');
}

window.showModal = showModal;
window.hideModal = hideModal;



// Hide Modal window
// This function hides the modal and resets the form fields
function hideModal() {
    // Hide all modal backdrops and modals by adding only the 'hidden' class
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
        backdrop.classList.add('hidden');
        backdrop.querySelectorAll('.modal').forEach(modal => {
            modal.classList.add('hidden');
        });
    });

    // Specifically ensure variant modal is hidden
    const addVariantModal = document.getElementById('add-variant-modal');
    if (addVariantModal) {
        addVariantModal.classList.add('hidden');
        const variantModalBackdrop = addVariantModal.closest('.modal-backdrop');
        if (variantModalBackdrop) {
            variantModalBackdrop.classList.add('hidden');
        }
    }

    window.modalOpen = false;

    // Clear form fields
    document.querySelectorAll('form').forEach(form => form.reset());
}

// Open the Variant Modal
// This function opens the variant modal and populates it with data from the selected row
async function openVariantModal(row) {
    console.log("Opening variant modal");
    if (!addVariantModal || !row || !variantValueContainer || !variantBreakpointSelect) {
        console.error("Required elements not found for variant modal:", {
            addVariantModal: !!addVariantModal,
            row: !!row,
            variantValueContainer: !!variantValueContainer,
            variantBreakpointSelect: !!variantBreakpointSelect // Ensuring breakpoint select exists
        });
        return;
    }

    // Get variant data from row
    const nameField = row.querySelector('.variable-name .editable-field');
    const valueField = row.querySelector('.variable-value-wrapper .variable-value-input:last-child');
    const variableType = row.dataset.type ||
                         (row.querySelector('.color-preview') ? 'color' :
                         (row.querySelector('.variable-preview span') ? 'font' : 'dimension'));

    if (!nameField || !valueField) {
        console.error("Name or value field not found in row");
        return;
    }

    const variableName = nameField.value;
    const variableValue = valueField.value;

    console.log("Variable data:", { name: variableName, value: variableValue, type: variableType });

    // Store variable info in modal
    addVariantModal.dataset.rowId = row.dataset.id;
    addVariantModal.dataset.variableType = variableType;
    addVariantModal.dataset.variableName = variableName;

    // Show loading state in dropdown
    variantBreakpointSelect.innerHTML = '<option value="">Loading breakpoints...</option>';
    variantBreakpointSelect.disabled = true;

    // --- Corrected Breakpoint Fetching Logic ---
    // Use the fetchBreakpoints function to get breakpoints from dimensions
    try {
        // Only proceed if we have a current styling ID
        if (!window.currentStylingId) {
            // Instead of throwing, perhaps handle this case gracefully if the modal can open without breakpoints
            console.warn("No current styling ID available. Cannot fetch breakpoints.");
            variantBreakpointSelect.innerHTML = '<option value="">Cannot load breakpoints</option>';
            variantBreakpointSelect.disabled = true;
            showToast("No current styling ID available to fetch breakpoints.", "warning");
             // Optionally return here if breakpoints are essential
            // return;
        } else {
            // Use the fetchBreakpoints function from api.js
            // Assumes fetchBreakpoints handles the API call and error checking internally
            const breakpoints = await fetchBreakpoints(window.currentStylingId);

            // Clear and populate the dropdown
            variantBreakpointSelect.innerHTML = '';
            variantBreakpointSelect.disabled = false;

            if (breakpoints.length === 0) {
                // If no breakpoints found in the database, show a message
                variantBreakpointSelect.innerHTML = '<option value="">No breakpoints defined</option>';
                variantBreakpointSelect.disabled = true;
                showToast("No breakpoint dimensions found in the styling. Add dimensions with names starting with '--breakpoint-'", "warning");
            } else {
                // Add each breakpoint as an option
                breakpoints.forEach(bp => {
                    const option = document.createElement('option');
                    // Assuming bp has key, name, and value properties as expected by fetchBreakpoints return format
                    option.value = bp.key; // Use key for the option value
                    option.textContent = `${bp.name} (${bp.value})`; // Display name and value
                    variantBreakpointSelect.appendChild(option);
                });
            }
        }
    } catch (error) {
        console.error("Error loading breakpoints:", error);
        variantBreakpointSelect.innerHTML = '<option value="">Error loading breakpoints</option>';
        variantBreakpointSelect.disabled = true;
        showToast("Failed to load breakpoints", "error");
    }
    // --- End of Corrected Breakpoint Fetching Logic ---


    // Set modal content based on variable type
    let valueHtml = '';

    if (variableType === 'color') {
        valueHtml = `
            <label for="variant-value">Color Value</label>
            <div class="color-picker-wrapper">
                <input type="color" id="variant-color-input" value="${variableValue}">
                <input type="text" id="variant-value" value="${variableValue}" placeholder="Enter color value">
            </div>
        `;
    } else { // dimension or font
        valueHtml = `
            <label for="variant-value">Value</label>
            <input type="text" id="variant-value" value="${variableValue}" placeholder="Enter value">
        `;
    }

    variantValueContainer.innerHTML = valueHtml;

    // Initialize color input if present
    const colorInput = document.getElementById('variant-color-input');
    if (colorInput) {
        const textInput = document.getElementById('variant-value');
        if (textInput) {
            colorInput.addEventListener('input', () => {
                textInput.value = colorInput.value;
            });

            textInput.addEventListener('input', () => {
                 // Simple check for hex codes, adjust if you have isValidColor
                 if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(textInput.value)) {
                     colorInput.value = textInput.value;
                 }
            });
        }
    }

    if (variantImportantCheckbox) {
        variantImportantCheckbox.checked = false;
    }

    // Make modal visible
    addVariantModal.classList.remove('hidden');
    console.log("Variant modal opened");
}

// Close the Variant Modal
// This function hides the modal and resets the form fields
function closeVariantModal() {
    if (addVariantModal) {
        addVariantModal.classList.add('hidden');
    }
}

// Save the Variant
// This function saves the variant to the database and updates the UI
// REPLACE the entire saveVariant function in modal-handlers.js with this.
async function saveVariant(value) {
    const addVariantModal = document.getElementById('add-variant-modal');
    if (!addVariantModal) return;

    const rowId = addVariantModal.dataset.rowId;
    const row = document.querySelector(`.variable-row[data-id="${rowId}"]`);
    if (!row) return;

    const assetId = row.dataset.assetId;
    const breakpoint = variantBreakpointSelect.value;
    const important = variantImportantCheckbox ? variantImportantCheckbox.checked : false;

    if (!breakpoint) {
        showToast('Please select a valid breakpoint', 'warning');
        return;
    }
    if (value === undefined || value === null) {
        showToast('Please enter a value for the variant', 'warning');
        return;
    }

    const variantsContainer = row.querySelector('.variable-variants');
    const existingVariantRow = variantsContainer ? variantsContainer.querySelector(`.variant-row[data-breakpoint="${breakpoint}"]`) : null;

    if (existingVariantRow) {
        // --- UPDATE an existing variant ---
        const variantId = existingVariantRow.dataset.databaseId || existingVariantRow.dataset.id;
        if (!confirm(`A variant for ${breakpoint} already exists. Do you want to update it?`)) {
            closeVariantModal();
            return;
        }
        
        try {
            await updateVariant(window.currentStylingId, assetId, variantId, { value: value, is_important: important });
            showToast('Variant updated successfully', 'success');
        } catch (error) {
            showToast('Error updating variant: ' + error.message, 'error');
        }

    } else {
        // --- CREATE a new variant ---
        try {
            await createVariant(window.currentStylingId, assetId, { breakpoint: breakpoint, value: value, is_important: important });
            showToast('Variant saved successfully', 'success');
        } catch (error) {
            showToast('Error creating variant: ' + error.message, 'error');
        }
    }
    
    // This is the most reliable way to update the UI after a change.
    closeVariantModal();
    //loadBrandStyling(window.currentStylingId);
}


function createInlineVariableRow(groupId, originalGroupName, type) {
    console.log('createInlineVariableRow called with:', { groupId, originalGroupName, type });

    // --- START MODIFICATION ---
    // Attempt to find the specific group container first
    // The group container ID is constructed as groupId + '-container' by makeRowOfStandardGroup in templates.js
    const groupContainerId = `${groupId}-container`;
    const groupContainerElement = document.getElementById(groupContainerId);

    if (!groupContainerElement) {
        console.error(`Group container element with ID "${groupContainerId}" not found.`);
        // Optionally, inform the user if showToast is available
        if(typeof showToast === 'function') showToast('Error: Could not find the target group.', 'error');
        return;
    }

    // Now search for the addRow *within* this specific group container.
    // The .add-variable-row still has data-group="${groupId}"
    const addRow = groupContainerElement.querySelector(`.add-variable-row[data-group="${groupId.replace(/"/g, '\\"')}"]`);
    // --- END MODIFICATION ---

    console.log('Found addRow within group container:', addRow);
    if (!addRow) {
        console.error(`.add-variable-row with data-group="${groupId}" not found within group container "${groupContainerId}".`);
        if(typeof showToast === 'function') showToast('Error: Could not find where to add the variable.', 'error');
        return;
    }

    const tempAsset = {
        id: `new-${Date.now()}`,
        name: '',
        value: '',
        type: type,
        is_important: false,
        group_name: originalGroupName,
        variants: []
    };
    
    const rowHtml = makeRowOfVariable(tempAsset, null); // makeRowOfVariable is in templates.js
    
    if (!rowHtml) {
        console.error('makeRowOfVariable returned null or undefined.');
        if(typeof showToast === 'function') showToast('Error: Failed to generate new variable HTML.', 'error');
        return;
    }

    addRow.insertAdjacentHTML('beforebegin', rowHtml);
    
    const newRow = addRow.previousElementSibling;
    if (newRow) {
        newRow.classList.add('editing-mode');
        
        const actionsDiv = newRow.querySelector('.variable-actions');
        if (actionsDiv) {
            actionsDiv.innerHTML = `
                <button class="action-button save-inline" title="Save">
                    <i class="fas fa-check"></i>
                </button>
                <button class="action-button cancel-inline" title="Cancel">
                    <i class="fas fa-times"></i>
                </button>
            `;
        } else {
             console.error("'.variable-actions' div not found in new inline row.");
        }
        
        setupInlineRowListeners(newRow, originalGroupName, type);
        
        const nameInput = newRow.querySelector('.variable-name .editable-field');
        if (nameInput) {
            nameInput.select();
        } else {
            console.error("'.variable-name .editable-field' not found in new inline row.");
        }
    } else {
        console.error("Failed to find the newly added inline row (newRow is null).");
        if(typeof showToast === 'function') showToast('Error: Failed to insert new variable input.', 'error');
    }
}

function setupInlineRowListeners(row, groupName, type) {
    const saveBtn = row.querySelector('.save-inline');
    const cancelBtn = row.querySelector('.cancel-inline');
    const nameInput = row.querySelector('.variable-name .editable-field');
    // *** CORRECTED SELECTOR to match templates.js ***
    const valueInput = row.querySelector('.variable-value-wrapper .variable-value-input');

    const attemptSaveOnBlurOrEnter = () => {
        if (row.classList.contains('editing-mode')) {
            const name = nameInput ? nameInput.value.trim() : "";
            const currentVal = valueInput ? valueInput.value.trim() : "";
            if (name && currentVal) {
                console.log("[MODAL-HANDLERS] Attempting auto-save for new inline row (blur/enter).");
                saveInlineRow(row, groupName, type);
            }
        }
    };

    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            console.log("[MODAL-HANDLERS] Tick (save-inline) button clicked.");
            saveInlineRow(row, groupName, type);
        });
    }
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => row.remove());
    }

    if (nameInput) {
        nameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                attemptSaveOnBlurOrEnter();
            }
            if (e.key === 'Escape') {
                row.remove();
            }
        });
        nameInput.addEventListener('blur', () => {
            console.log("[MODAL-HANDLERS] Name input blurred for new inline row.");
            if (row && nameInput) {
                row.dataset.variableName = nameInput.value.trim(); // Update data attribute
            }
            attemptSaveOnBlurOrEnter();
        });
    }

// In modal-handlers.js, within setupInlineRowListeners(row, groupName, type)

    // ... (nameInput listeners) ...

    if (valueInput) { // Crucial check: only add listeners if valueInput is found
        valueInput.addEventListener('focus', async () => {
            console.log("[MODAL-HANDLERS DEBUG] FOCUS event: valueInput focused.");
            valueInput.dataset.originalValue = valueInput.value; // Store original value
            const currentId = window.currentStylingId;

            if (typeof window.initSharedCssVariableDiscovery === 'function' && currentId) {
                try {
                    // Await discovery to ensure variableMap is fresh before styling/validation
                    await window.initSharedCssVariableDiscovery(currentId);
                    // No need to call updateValueInputVariableStyle or showSuggestions here,
                    // as initSharedCssVariableDiscovery now calls reapplyAll... which handles styling.
                    // However, if suggestions are needed immediately on focus *before typing*:
                    if (typeof window.showSuggestionsForEditor === 'function') {
                         window.showSuggestionsForEditor(valueInput, valueInput.value);
                    }
                    // And ensure the style is applied based on current value after map is ready
                     if (typeof window.updateValueInputVariableStyle === 'function') {
                        window.updateValueInputVariableStyle(valueInput);
                    }

                } catch (error) {
                    console.error("[MODAL-HANDLERS DEBUG] Error on valueInput focus during discovery:", error);
                }
            } else {
                // Fallback if discovery can't run but styling might still be possible
                 if (typeof window.updateValueInputVariableStyle === 'function') {
                    window.updateValueInputVariableStyle(valueInput);
                }
                console.warn("[MODAL-HANDLERS DEBUG] Suggestions/full styling may not work: initSharedCssVariableDiscovery or currentStylingId missing.");
            }
        });

        valueInput.addEventListener('input', () => {
            if (typeof window.showSuggestionsForEditor === 'function') {
                window.showSuggestionsForEditor(valueInput, valueInput.value);
            }
            // Call the updated styling/validation function on input
            if (typeof window.updateValueInputVariableStyle === 'function') {
                window.updateValueInputVariableStyle(valueInput);
            }
        });

        valueInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                // Ensure save attempt happens, which should also involve final validation if needed.
                // The existing attemptSaveOnBlurOrEnter should be sufficient if it calls blur or save.
                // If not, directly call blur or the save function that includes validation.
                valueInput.blur(); // Blurring will trigger the blur listener which calls attemptSave.
            }
            if (e.key === 'Escape') {
                if (typeof window.hideSuggestionsForEditor === 'function') {
                    window.hideSuggestionsForEditor();
                }
                // Revert to original value on escape and re-validate/style
                valueInput.value = valueInput.dataset.originalValue || ""; // Revert
                if (typeof window.updateValueInputVariableStyle === 'function') {
                    window.updateValueInputVariableStyle(valueInput); // Re-style/validate
                }
                // The existing code also removes the row on Escape if it's a new inline row.
                // That behavior should be reviewed if it's not desired after this.
                // For now, assuming the existing logic handles the row removal correctly:
                // row.remove(); // This is from your existing code, might conflict with re-validation.
                               // Consider if row should only be removed if it was empty.
            }
        });

        valueInput.addEventListener('blur', () => {
            if (typeof window.hideSuggestionsForEditor === 'function') {
                setTimeout(window.hideSuggestionsForEditor, 150); // Delay to allow click on suggestion
            }
            // Call the updated styling/validation function on blur
            if (typeof window.updateValueInputVariableStyle === 'function') {
                window.updateValueInputVariableStyle(valueInput);
            }
            console.log("[MODAL-HANDLERS] Value input blurred for new inline row.");
            // The existing attemptSaveOnBlurOrEnter handles the save logic.
            // Ensure that the save process (saveInlineRow) correctly updates the variableMap
            // if a new variable is successfully saved.
            attemptSaveOnBlurOrEnter();
        });
    } else {
        console.error("CRITICAL: valueInput not found in setupInlineRowListeners for row:", row.innerHTML);
    }
}

async function saveInlineRow(row, groupName, type) { 
    const nameInput = row.querySelector('.variable-name .editable-field');
    const valueInput = row.querySelector('.variable-value-wrapper .variable-value-input');
    const descriptionInput = row.querySelector('.variable-description-input'); // GET DESCRIPTION INPUT
    const importanceCheckbox = row.querySelector('.importance-checkbox');

    if (!nameInput || !valueInput) {
        console.error("saveInlineRow (Variable): Name or value input not found.");
        if(typeof showToast === 'function') showToast("Error: Input fields missing for variable.", 'error');
        return;
    }
    const name = nameInput.value.trim();
    const value = valueInput.value.trim();
    const description = descriptionInput ? descriptionInput.value.trim() : ""; // GET DESCRIPTION VALUE

    if (!name) { 
        if(typeof showToast === 'function') showToast('CSS Variable name cannot be empty.', 'warning');
        nameInput.focus();
        return;
    }
    // Value can sometimes be empty for variables, so no strict check on !value here.

    const assetData = {
        type: type, 
        name: (typeof format_asset_name === 'function' && !name.startsWith('--')) ? format_asset_name(name) : name,
        value: value,
        description: description, // INCLUDE DESCRIPTION
        is_important: importanceCheckbox ? importanceCheckbox.checked : false,
        group_name: groupName,
        selector: null 
    };

    if (window.currentStylingId && typeof window.saveNewAsset === 'function') {
        try {
            const savedAsset = await window.saveNewAsset(window.currentStylingId, assetData);
            
            row.dataset.assetId = savedAsset.id;
            row.dataset.id = savedAsset.id; 
            if (savedAsset.name) { 
                row.dataset.variableName = savedAsset.name; 
                nameInput.value = savedAsset.name;
            }
            if (savedAsset.value !== undefined) valueInput.value = savedAsset.value;
            if (descriptionInput && savedAsset.description !== undefined) descriptionInput.value = savedAsset.description; // Update UI with saved description
            if (importanceCheckbox && savedAsset.is_important !== undefined) importanceCheckbox.checked = savedAsset.is_important;


            row.classList.remove('editing-mode');
            const actionsDiv = row.querySelector('.variable-actions');
            if (actionsDiv && typeof makeStandardActionsHtml === 'function') { 
                 actionsDiv.innerHTML = makeStandardActionsHtml('variable'); 
            } else if (actionsDiv) { 
                actionsDiv.innerHTML = ``;
            }

            if (typeof initRowEventListeners === 'function') initRowEventListeners(row); 
            if (typeof window.initVariablePreviewsForRow === 'function') window.initVariablePreviewsForRow(row);
            if (typeof showToast === 'function') showToast(`Variable '${savedAsset.name}' saved.`, 'success');
            if (typeof updateCssOutput === 'function') updateCssOutput();
            if (typeof updateAssetCounts === 'function') updateAssetCounts(window.currentStylingId);
            if (typeof window.initSharedCssVariableDiscovery === 'function') { 
                await window.initSharedCssVariableDiscovery(window.currentStylingId);
            }
        } catch (error) {
            console.error("Error in saveInlineRow (Variable) > saveNewAsset:", error);
            // Toast is likely shown by saveNewAsset if it's configured to throw and show.
        }
    } else {
        console.error("Cannot save inline variable: Missing context or saveNewAsset function.");
        if(typeof showToast === 'function') showToast("Error: Save function for variable missing.", 'error');
    }
}

function createInlineCssRuleRow(addButtonElement) { 
    // addButtonElement is the "+ Add property" text/button inside a .class-rule-entry
    const parentRuleEntryElement = addButtonElement.closest('.class-rule-entry');
    if (!parentRuleEntryElement) {
        console.error('createInlineCssRuleRow: Parent .class-rule-entry element not found.');
        if(typeof showToast === 'function') showToast("Error: Cannot determine selector context.", "error");
        return;
    }

    // Get context from the parent selector block. These should be set by makeIndividualSelectorEntryHtml.
    const parentSelectorString = parentRuleEntryElement.dataset.selectorString; 
    const assetUiGroupNameForDeclarations = parentRuleEntryElement.dataset.assetUiGroupName; 

    if (!parentSelectorString || !assetUiGroupNameForDeclarations) {
        console.error('createInlineCssRuleRow: Missing data-selector-string or data-asset-ui-group-name on parent selector block.', parentRuleEntryElement);
        if(typeof showToast === 'function') showToast("Error: Selector context attributes missing for new property.", "error");
        return;
    }

    const declarationsList = parentRuleEntryElement.querySelector('.css-declarations-list');
    if (!declarationsList) {
        console.error(`createInlineCssRuleRow: .css-declarations-list not found within selector block for "${parentSelectorString}".`);
        if(typeof showToast === 'function') showToast("Error: Cannot find where to add property.", "error");
        return;
    }

    const tempRuleData = { 
        id: `new-decl-${Date.now()}`, // Temporary frontend ID for the row
        property: '', 
        value: '', 
        is_important: false, 
        enabled: true // New rows are enabled by default
    };

    if (typeof makeRowOfRule !== 'function') { // makeRowOfRule is expected from templates.js
        console.error('createInlineCssRuleRow ERROR: makeRowOfRule function (from templates.js) is not defined.');
        if(typeof showToast === 'function') showToast("Error: UI template for property row is missing.", "error");
        return;
    }
    // makeRowOfRule should generate the HTML for one property:value line
    const ruleRowHtml = makeRowOfRule(tempRuleData, null); // Pass null for inheritanceData for new rule
    
    declarationsList.insertAdjacentHTML('beforeend', ruleRowHtml);
    const newRuleRowElement = declarationsList.lastElementChild;

    if (newRuleRowElement) {
        newRuleRowElement.classList.add('editing-mode'); // To show save/cancel for this new row

        const actionsDiv = newRuleRowElement.querySelector('.css-rule-actions'); // Selector from makeRowOfRule template
        if (actionsDiv) {
            // Replace default actions (usually just delete for existing rows) with Save/Cancel
            actionsDiv.innerHTML = `
                <button class="action-button save-inline-declaration" title="Save Property"><i class="fas fa-check"></i></button>
                <button class="action-button cancel-inline-declaration" title="Cancel"><i class="fas fa-times"></i></button>
            `;
        }
        // Call the new listener setup function for this temporary declaration row
        // This function (setupInlineCssDeclarationListeners) needs to be added to this file.
        if (typeof setupInlineCssDeclarationListeners === 'function') {
            setupInlineCssDeclarationListeners(newRuleRowElement, parentSelectorString, assetUiGroupNameForDeclarations); 
        } else {
            console.error("setupInlineCssDeclarationListeners function is missing. New inline property row will not be fully interactive.");
        }


        const propertyInput = newRuleRowElement.querySelector('.css-property-name .editable-field');
        if (propertyInput) propertyInput.focus();
    } else {
        console.error("CreateInlineCssRuleRow: New property row element not found after insertion.");
    }
}

function setupInlineCssRuleListeners(ruleRow, selectorBlockId) {
    const saveBtn = ruleRow.querySelector('.save-inline-rule') || ruleRow.querySelector('.save-inline-declaration');
    const cancelBtn = ruleRow.querySelector('.cancel-inline-rule') || ruleRow.querySelector('.cancel-inline-declaration');
    const propertyInput = ruleRow.querySelector('.css-property-name .editable-field');
    const valueInput = ruleRow.querySelector('.css-rule-value-wrapper .editable-field');
    const descriptionInput = ruleRow.querySelector('.variable-description-input'); // GET DESCRIPTION INPUT
    const importanceCheckbox = ruleRow.querySelector('.variable-importance .importance-checkbox');

    const parentRuleEntryElement = document.querySelector(`.class-rule-entry[data-asset-id="${selectorBlockId}"]`);
    let parentSelectorString;
    let assetUiGroupName;

    if (parentRuleEntryElement) {
        parentSelectorString = parentRuleEntryElement.dataset.selectorString;
        assetUiGroupName = parentRuleEntryElement.dataset.assetUiGroupName;
    } else {
        console.error(`setupInlineCssRuleListeners: Could not find parent selector block ID "${selectorBlockId}".`);
        if (typeof showToast === 'function') showToast("Error: Parent selector context lost.", "error");
        ruleRow.remove();
        return;
    }

    if (!parentSelectorString || !assetUiGroupName) {
        console.error('setupInlineCssRuleListeners: Missing data from parent selector block for context.');
        if (typeof showToast === 'function') showToast("Error: Selector context attributes missing.", "error");
        ruleRow.remove();
        return;
    }

    const saveNewDeclaration = async () => {
        if (!propertyInput || !valueInput || !importanceCheckbox) {
            console.error("saveNewDeclaration: Input elements missing from new rule row.");
            return;
        }
        const propName = propertyInput.value.trim();
        const finalPropValue = valueInput.value.trim();
        const description = descriptionInput ? descriptionInput.value.trim() : ""; // GET DESCRIPTION VALUE
        
        if (!propName) { 
            if (typeof showToast === 'function') showToast('CSS Property name cannot be empty.', 'warning');
            propertyInput.focus();
            return;
        }

        const assetData = {
            type: 'css_declaration', 
            name: propName,           
            value: finalPropValue,    
            selector: parentSelectorString, 
            description: description, // INCLUDE DESCRIPTION
            is_important: importanceCheckbox.checked,
            group_name: assetUiGroupName 
        };

        if (window.currentStylingId && typeof window.saveNewAsset === 'function') { 
            try {
                const savedAsset = await window.saveNewAsset(window.currentStylingId, assetData); 
                
                ruleRow.dataset.assetId = savedAsset.id; 
                ruleRow.dataset.id = savedAsset.id; 
                ruleRow.dataset.ruleId = savedAsset.id;
                propertyInput.value = savedAsset.name; 
                valueInput.value = savedAsset.value;   
                if (descriptionInput && savedAsset.description !== undefined) descriptionInput.value = savedAsset.description; // Update UI
                if (importanceCheckbox && savedAsset.is_important !== undefined) importanceCheckbox.checked = savedAsset.is_important;

                ruleRow.classList.remove('editing-mode');
                const actionsDiv = ruleRow.querySelector('.css-rule-actions');
                
                if (actionsDiv) {
                    if (typeof makeStandardActionsHtml === 'function') {
                        actionsDiv.innerHTML = makeStandardActionsHtml('declaration'); 
                    } else { 
                         actionsDiv.innerHTML = `<button class="action-button delete" title="Delete Property"><i class="fas fa-times"></i></button>`;
                    }
                }

                if (typeof initCssPropertyRowListeners === 'function') { 
                    initCssPropertyRowListeners(ruleRow, selectorBlockId);
                } else {
                    console.warn("initCssPropertyRowListeners (from init.js) not defined.");
                }
                
                if (typeof showToast === 'function') showToast(`Property '${savedAsset.name}' added.`, 'success');
                if (typeof updateCssOutput === 'function') updateCssOutput();
                if (typeof updateAssetCounts === 'function' && window.currentStylingId) {
                    updateAssetCounts(window.currentStylingId); 
                }

            } catch (error) {
                console.error("Error in setupInlineCssRuleListeners > saveNewAsset:", error);
            }
        } else {
            console.error("Cannot save new CSS declaration: Missing context or saveNewAsset function.");
            if(typeof showToast === 'function') showToast("Error: Save functionality missing.", 'error');
        }
    };

    if (saveBtn) {
        saveBtn.addEventListener('click', saveNewDeclaration);
    } else {
        console.warn("Save button (.save-inline-rule or .save-inline-declaration) not found in new inline CSS rule row:", ruleRow);
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => ruleRow.remove());
    }

    [propertyInput, valueInput, descriptionInput].forEach(inputField => { // Added descriptionInput to this loop
        if (inputField) {
            inputField.dataset.fieldType = inputField.classList.contains('css-property-name') ? 'property' : (inputField.classList.contains('variable-description-input') ? 'description' : 'value');
            inputField.addEventListener('focus', function() {
                this.dataset.originalValue = this.value;
                if (inputField !== descriptionInput && typeof window.showCssKeywordSuggestions === 'function') { // Suggestions not for description
                    window.showCssKeywordSuggestions(this);
                }
            });
            inputField.addEventListener('input', function() {
                 if (inputField !== descriptionInput && typeof window.showCssKeywordSuggestions === 'function') {
                    window.showCssKeywordSuggestions(this);
                 }
            });
            inputField.addEventListener('blur', function() { 
                if (inputField !== descriptionInput && typeof window.hideSuggestionsForEditor === 'function') {
                    setTimeout(() => window.hideSuggestionsForEditor(), 150); 
                }
            });
            inputField.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault(); 
                    saveNewDeclaration(); 
                } else if (e.key === 'Escape') {
                    if (inputField !== descriptionInput && typeof window.hideSuggestionsForEditor === 'function') window.hideSuggestionsForEditor();
                    ruleRow.remove(); 
                }
            });
        }
    });
}

