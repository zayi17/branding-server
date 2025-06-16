function initVariantRowEventListeners(variantRow, parentAssetId) {
    if (!variantRow) return;

    // Corrected Delete button handler
    const deleteBtn = variantRow.querySelector('.action-button.delete');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to delete this variant?')) {
                const variantId = variantRow.dataset.databaseId || variantRow.dataset.id;
                if (window.currentStylingId && parentAssetId && variantId) {
                    
                    // This calls the correct function from api.js
                    deleteVariant(window.currentStylingId, parentAssetId, variantId)
                        .then(success => {
                            // The code inside this "if" block only runs if the
                            // variant is successfully deleted from the database.
                            if (success) {
                                // THIS LINE DELETES THE UI ELEMENT
                                variantRow.remove();
                                
                                const variantsContainer = variantRow.closest('.variable-variants');
                                if (variantsContainer && variantsContainer.children.length === 0) {
                                    variantsContainer.classList.add('hidden');
                                }
                                if (typeof updateCssOutput === 'function') {
                                    updateCssOutput();
                                }
                            }
                        })
                        .catch(err => {
                            console.error("The deleteVariant promise was rejected:", err);
                        });
                }
            }
        });
    }

    // --- Logic for other fields ---
    const importanceCheckbox = variantRow.querySelector('.importance-checkbox');
    console.log("Importance checkbox element:", importanceCheckbox);
    if (importanceCheckbox) {
        importanceCheckbox.addEventListener('change', async function() {
            const variantId = variantRow.dataset.databaseId || variantRow.dataset.id;
            if (variantId && parentAssetId && window.currentStylingId) {
                try {
                    await updateVariant(window.currentStylingId, parentAssetId, variantId, { is_important: this.checked });
                    if (typeof updateCssOutput === 'function') updateCssOutput();
                } catch (error) {
                    this.checked = !this.checked;
                }
            }
        });
    }

    const valueField = variantRow.querySelector('.variant-value .editable-field');
    if (valueField) {
        valueField.addEventListener('focus', function() { this.dataset.originalValue = this.value; });
        valueField.addEventListener('blur', async function() {
            if (this.value !== this.dataset.originalValue) {
                const variantId = variantRow.dataset.databaseId || variantRow.dataset.id;
                if (variantId && parentAssetId && window.currentStylingId) {
                    try {
                        await updateVariant(window.currentStylingId, parentAssetId, variantId, { value: this.value });
                        this.dataset.originalValue = this.value;
                        if (typeof updateCssOutput === 'function') updateCssOutput();
                    } catch (error) {
                        this.value = this.dataset.originalValue;
                    }
                }
            }
        });
        valueField.addEventListener('keydown', (e) => { if (e.key === 'Enter') e.target.blur(); });
    }

    // ADD THIS SECTION: Image preview click handler for variants
    const imagePreview = variantRow.querySelector('.variable-preview img');
    console.log("Image preview element:", imagePreview);
    if (imagePreview) {
        imagePreview.addEventListener('click', (event) => {
            event.stopPropagation();
            handleImagePreviewClick(event);
        });
    }
}

// Helper function to update variant in database using existing updateVariant function
function updateVariantInDatabase(variantRow, assetId) {
    if (!variantRow || !window.currentStylingId || !assetId) return;
    
    const variantId = variantRow.dataset.databaseId || variantRow.dataset.id;
    if (!variantId) return;
    
    const valueField = variantRow.querySelector('.editable-field');
    const importanceCheckbox = variantRow.querySelector('.importance-checkbox');
    
    const variantData = {
        value: valueField ? valueField.value : '',
        is_important: importanceCheckbox ? importanceCheckbox.checked : false
    };
    
    // Use existing updateVariant function if available
    if (typeof updateVariant === 'function') {
        updateVariant(window.currentStylingId, assetId, variantId, variantData)
            .catch(error => console.error('Error updating variant:', error));
    }
}

// Utility to copy text to clipboard
function copyToClipboard(text) {
   const textArea = document.createElement('textarea');
   textArea.value = text;
   textArea.style.position = 'fixed'; // Avoid scrolling to bottom
   document.body.appendChild(textArea);
   textArea.select();
   try {
       document.execCommand('copy');
       // showToast('Copied to clipboard', 'success'); // Moved toast to calling functions
   } catch (err) {
       console.error('Unable to copy to clipboard', err);
       showToast('Failed to copy to clipboard', 'error');
   } finally {
       document.body.removeChild(textArea);
   }
}


// REPLACE the existing handleExport function in ui-elements.js with this:

function handleExport(stylingId) {
    // Check the ID passed directly to the function
    if (!stylingId) {
        showToast("No brand selected.", "warning");
        return;
    }

    const tempBackdrop = document.createElement('div');
    tempBackdrop.className = 'modal-backdrop';

    const formatOptions = ['json', 'scss', 'docs'];
    tempBackdrop.innerHTML = `
        <div class="modal">
            <div class="modal-content">
                <h3 class="modal-title">Export Brand Styling</h3>
                <p style="margin-top: 1rem;">Choose an export format:</p>
                <div class="asset-list" style="display: flex; flex-direction: column; gap: 10px; margin-top: 1rem;">
                    ${formatOptions.map(format => `
                        <button class="btn secondary-btn" data-format="${format}">
                            Export as ${format.toUpperCase()}
                        </button>
                    `).join('')}
                </div>
                <div class="form-actions" style="margin-top: 1.5rem;">
                    <button type="button" class="btn secondary-btn" id="temp-export-cancel-btn">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(tempBackdrop);

    const closeExportModal = () => {
        if (document.body.contains(tempBackdrop)) {
            document.body.removeChild(tempBackdrop);
        }
    };

    tempBackdrop.querySelectorAll('button[data-format]').forEach(button => {
        button.addEventListener('click', () => {
            const format = button.dataset.format;
            let url;

            if (format === 'docs') {
                url = `${API_BASE_URL}/brand/${stylingId}/docs`;
            } else {
                url = `${API_BASE_URL}/brand/${stylingId}/export/${format}`;
            }

            window.open(url, '_blank');
            closeExportModal();
        });
    });

    tempBackdrop.querySelector('#temp-export-cancel-btn').addEventListener('click', closeExportModal);
    tempBackdrop.addEventListener('click', (event) => {
        if (event.target === tempBackdrop) {
            closeExportModal();
        }
    });
}


// Basic implementation to update an asset (variable) in the database
// This function is called when a variable row field changes (value, name, important checkbox)
async function updateAssetInDatabase(rowElement) {
    if (!rowElement || !window.currentStylingId) return;

    const assetId = rowElement.dataset.assetId;
    if (!assetId || isNaN(parseInt(assetId))) return;

    // Get the values from the row
    const nameInput = rowElement.querySelector('.variable-name input') || 
                      rowElement.querySelector('.variable-name .editable-field');
    const valueInput = rowElement.querySelector('.variable-value input') || 
                       rowElement.querySelector('.variable-value-wrapper .variable-value-input');
    const importanceCheckbox = rowElement.querySelector('.importance-checkbox');
    
    if (!nameInput) return;
    
    // Save to backend
    try {
        const updateData = {
            name: nameInput.value,
            value: valueInput ? valueInput.value : undefined,
            is_important: importanceCheckbox ? importanceCheckbox.checked : undefined
        };
        
        await apiFetch(`${API_BASE_URL}/brand-stylings/${window.currentStylingId}/assets/${assetId}`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(updateData)
        });
        

    } catch (err) {
        console.error("Error updating asset:", err);
    }
}

// Basic implementation to update a variant in the database
// This function is called when a variant row field changes (value, important checkbox)
async function updateVariantInDatabase(variantRow, assetId) {
     if (!variantRow || !window.currentStylingId || !assetId) {
         console.error("updateVariantInDatabase: variantRow, currentStylingId, or assetId missing.");
         return;
     }

     const variantId = variantRow.dataset.databaseId || variantRow.dataset.id;
     if (!variantId) {
         console.error("updateVariantInDatabase: variantId missing.");
         return;
     }

     // Collect data from the row
     const valueField = variantRow.querySelector('.editable-field');
     const importanceCheckbox = variantRow.querySelector('.importance-checkbox');

     const variantData = {
         value: valueField ? valueField.value : undefined,
         is_important: importanceCheckbox ? importanceCheckbox.checked : undefined // Include important status
     };

    // Filter out undefined values
     const filteredVariantData = Object.fromEntries(
        Object.entries(variantData).filter(([_, value]) => value !== undefined)
    );

     if (Object.keys(filteredVariantData).length === 0) {
          console.warn("updateVariantInDatabase: No data to update.");
          return; // No changes to save
     }

    try {
        // Use the PUT endpoint for variants from api.js (assuming it exists)
         // Assumes updateVariant in api.js takes stylingId, assetId, variantId, variantData
         if (typeof updateVariant === 'function') {
             const updatedVariant = await updateVariant(window.currentStylingId, assetId, variantId, filteredVariantData);
             console.log('Variant updated successfully:', updatedVariant);
              // showToast('Variant updated', 'success'); // Optional: show success toast
         } else {
             console.error("updateVariant function not found in api.js. Cannot save changes.");
              if (typeof showToast === 'function') showToast("Error: Save functionality not available.", 'error');
             // Optionally, revert UI changes if save fails
         }


    } catch (error) {
        console.error('Error updating variant:', error);
         if (typeof showToast === 'function') showToast('Error saving variant: ' + error.message, 'error');
        // Optionally, revert the UI change if the save failed
    }
}



/**
 * Updates the status icon displayed next to a variable value input field.
 * @param {HTMLElement} valueInputElement - The input field for the variable's value.
 * @param {string} statusType - Type of status ('none', 'warning', 'error', 'valid_var').
 * @param {string} [message=''] - Tooltip message for the icon.
 */
window.updateValueStatusIcon = function(valueInputElement, statusType = 'none', message = '') {
    if (!valueInputElement) {
        return;
    }
    const wrapper = valueInputElement.closest('.variable-value-wrapper');
    if (!wrapper) {
        return;
    }
    const iconElement = wrapper.querySelector('.value-status-icon');
    if (!iconElement) {
        return;
    }

    // iconElement.textContent = ''; // Keep this to clear previous (if any)
    iconElement.title = message || '';
    iconElement.classList.remove('icon-warning', 'icon-error', 'icon-valid', 'dot-error', 'dot-warning'); // Remove new dot selector too
    iconElement.style.display = 'none';

    valueInputElement.classList.remove(
        'value-input-var-exists',
        'value-input-var-not-exists',
        'value-input-error-circular'
    );

    switch (statusType) {
        case 'warning':
            // iconElement.textContent = 'warning'; // REMOVE/COMMENT OUT
            iconElement.classList.add('dot-warning'); // Add class for dot styling
            iconElement.style.display = 'inline-block';
            valueInputElement.classList.add('value-input-var-not-exists');
            break;
        case 'error':
            // iconElement.textContent = 'stop'; // REMOVE/COMMENT OUT
            iconElement.classList.add('dot-error'); // Add class for dot styling
            iconElement.style.display = 'inline-block';
            valueInputElement.classList.add('value-input-error-circular');
            break;
        case 'valid_var':
            valueInputElement.classList.add('value-input-var-exists');
            break;
        case 'none':
        default:
            break;
    }
};