// Add to the appropriate file

// v.5.0.0 
function handleDuplicateAsset(assetId) {
    if (!assetId || !window.currentStylingId) {
        console.error("Missing asset ID or styling ID for duplication");
        return;
    }
    
    // Find the row for this asset - look for both variable and variant rows
    const row = document.querySelector(`.variable-row[data-asset-id="${assetId}"], .variant-row[data-asset-id="${assetId}"]`);
    if (!row) {
        console.error(`No row found for asset ID ${assetId}`);
        return;
    }
    
    // Get the data from the row
    const nameInput = row.querySelector('.variable-name .editable-field, .variant-name .editable-field');
    const valueInput = row.querySelector('.variable-value-wrapper .variable-value-input, .variant-value .editable-field');
    const importanceCheckbox = row.querySelector('.importance-checkbox');
    const type = row.dataset.type;
    const groupName = row.dataset.groupName;
    
    if (!nameInput || !valueInput) {
        console.error("Could not find required inputs for duplication");
        return;
    }
    
    // Create a new asset with similar properties
    const baseName = nameInput.value;
    const newName = baseName + "-copy";
    
    // Prepare asset data for saving
    const assetData = {
        name: newName,
        type: type,
        value: valueInput.value,
        is_important: importanceCheckbox ? importanceCheckbox.checked : false,
        group_name: groupName
    };
    
    // Save to backend
    if (typeof saveNewAsset === 'function') {
        saveNewAsset(window.currentStylingId, assetData)
            .then(savedAsset => {
                showToast(`Duplicated as '${savedAsset.name}'`, 'success');
                
                // Refresh the current styling view to show the new asset
                if (typeof loadBrandStyling === 'function') {
                    loadBrandStyling(window.currentStylingId);
                } else {
                    updateCssOutput();
                }
            })
            .catch(error => {
                console.error("Error duplicating asset:", error);
                showToast(`Error duplicating asset: ${error.message}`, 'error');
            });
    } else {
        console.error("saveNewAsset function not found");
        showToast("Cannot duplicate asset: saving function not available", 'error');
    }
}



// Toggle variant section visibility
function handleVariantToggle(event) {
    const button = event.currentTarget;
    const assetId = button.getAttribute('data-asset-id');
    const variantsContainer = document.getElementById(`variants-${assetId}`);
    
    if (variantsContainer.classList.contains('hidden')) {
      // Load variants if opening
      loadAssetVariants(assetId);
    }
    
    variantsContainer.classList.toggle('hidden');
  }
  
// Fetch and display asset variants
async function loadAssetVariants(assetId) {
    try {
        const response = await apiFetch(`${API_BASE_URL}/brand-stylings/${currentStylingId}/assets/${assetId}/variants/`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const variants = await response.json();
        
        // Update badges display
        const badgesContainer = document.querySelector(`#variants-${assetId} .variant-badges`);
        if (variants.length === 0) {
            badgesContainer.innerHTML = '<span class="text-secondary">No variants</span>';
        } else {
            badgesContainer.innerHTML = variants.map(v => 
                `<span class="breakpoint-badge ${v.breakpoint}" data-variant-id="${v.id}">
                    ${v.breakpoint}
                    <button class="icon-btn tiny-btn edit-variant-btn" data-variant-id="${v.id}" data-asset-id="${assetId}">
                        <i class="fas fa-pencil-alt"></i>
                    </button>
                    <button class="icon-btn tiny-btn delete-variant-btn" data-variant-id="${v.id}" data-asset-id="${assetId}">
                        <i class="fas fas fa-times"></i>
                    </button>
                </span>`
            ).join('');
            
            // Add event listeners to edit/delete buttons
            badgesContainer.querySelectorAll('.edit-variant-btn').forEach(btn => {
                btn.addEventListener('click', handleEditVariantClick);
            });
            
            badgesContainer.querySelectorAll('.delete-variant-btn').forEach(btn => {
                btn.addEventListener('click', handleDeleteVariantClick);
            });
        }

        // After badges are updated, re-initialize variant event listeners
        // setupVariantEventListeners();

    } catch (error) {
        console.error('Error loading variants:', error);
        showToast('Failed to load variants', 'error');
    }
}

// Handle "Add Variant" button click
// Modify handleAddVariantClick to handle both event and assetId
async function handleAddVariantClick(eventOrAssetId) {
    let assetId;
    
    if (eventOrAssetId instanceof Event) {
        const button = eventOrAssetId.currentTarget;
        const row = button.closest('.variable-row');
        assetId = row?.getAttribute('data-asset-id');
    } else {
        assetId = eventOrAssetId;
    }

    if (!assetId) {
        console.error('No asset ID found for variant creation');
        return;
    }

    // Get the parent row to get additional context
    const parentRow = document.querySelector(`.variable-row[data-asset-id="${assetId}"]`);
    if (!parentRow) {
        console.error('Could not find parent variable row');
        return;
    }

    // Get the original value from the parent row
    const originalValue = parentRow.querySelector('.variable-value-input')?.value;
    if (!originalValue) {
        console.error('Could not find original value');
        return;
    }

    // Get variant modal elements
    const variantModal = document.getElementById('add-variant-modal');
    if (!variantModal) {
        console.error('Variant modal not found');
        return;
    }

    // Set the required data attributes on the modal
    variantModal.dataset.rowId = assetId;
    variantModal.dataset.variableType = parentRow.dataset.type || 'color';
    variantModal.dataset.variableName = parentRow.dataset.variableName;

    // Reset form and set asset ID and value
    const variantForm = document.getElementById('variant-form');
    const variantAssetId = document.getElementById('variant-asset-id');
    const variantValue = document.getElementById('variant-value');
    const breakpointSelect = document.getElementById('variant-breakpoint');
    
    if (!variantForm || !variantAssetId || !breakpointSelect || !variantValue) {
        console.error('Required variant modal elements not found');
        return;
    }

    variantForm.reset();
    variantAssetId.value = assetId;
    variantValue.value = originalValue; // Pre-populate with original value

    // Clear and populate breakpoint select
    breakpointSelect.innerHTML = '<option value="">Loading breakpoints...</option>';
    
    try {
        // Fetch all dimension variables
        const response = await apiFetch(`${API_BASE_URL}/brand-stylings/${currentStylingId}/assets?type=dimension`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const dimensions = await response.json();
        const options = ['<option value="">Select breakpoint</option>'];
        
        // Add theme modes first (these are system defaults)
        options.push(
            '<option value="light-mode">Light Mode</option>',
            '<option value="dark-mode">Dark Mode</option>'
        );

        // Add breakpoints from dimensions
        const breakpoints = new Set(); // Use Set to prevent duplicates
        dimensions.forEach(dim => {
            if (dim.name.toLowerCase().includes('breakpoint')) {
                const breakpointName = dim.name.replace(/^--breakpoint-/i, '');
                breakpoints.add(breakpointName);
            }
        });

        // Add unique breakpoints to options
        breakpoints.forEach(breakpoint => {
            options.push(`<option value="${breakpoint}">${breakpoint}</option>`);
        });

        breakpointSelect.innerHTML = options.join('');
    } catch (error) {
        console.error('Error loading breakpoints:', error);
        breakpointSelect.innerHTML = '<option value="">Error loading breakpoints</option>';
    }

    // Clear any existing variant ID
    const variantIdInput = document.getElementById('variant-id');
    if (variantIdInput) {
        variantIdInput.value = '';
    }

    // Update modal title
    const modalTitle = variantModal.querySelector('.modal-title');
    if (modalTitle) {
        modalTitle.textContent = 'Add Responsive Variant';
    }

    // Show the modal
    const addVariantModalBackdrop = document.getElementById('add-variant-modal');
    const addVariantModalDialog = addVariantModalBackdrop.querySelector('.modal');
    showModal(addVariantModalDialog);
}

// Handle edit variant button click
async function handleEditVariantClick(event) {
  event.stopPropagation(); // Prevent parent click events
  
  const button = event.currentTarget;
  const variantId = button.getAttribute('data-variant-id');
  const assetId = button.getAttribute('data-asset-id');
  
  try {
    // Fetch variant data
    const response = await apiFetch(`${API_BASE_URL}/brand-stylings/${currentStylingId}/assets/${assetId}/variants/${variantId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const variant = await response.json();
    
    // Populate form
    document.getElementById('variant-asset-id').value = assetId;
    document.getElementById('variant-id').value = variantId;
    document.getElementById('variant-breakpoint').value = variant.breakpoint;
    document.getElementById('variant-value').value = variant.value;
    document.getElementById('variant-important-checkbox').checked = variant.is_important;
    
    // Update modal title
    document.querySelector('#variant-modal .modal-title').textContent = 'Edit Responsive Variant';
    
    // Show the modal
    showModal(document.getElementById('variant-modal'));
  } catch (error) {
    console.error('Error fetching variant:', error);
    showToast('Failed to load variant', 'error');
  }
}

// Handle variant form submission
async function handleVariantFormSubmit(event) {
    event.preventDefault();
    
    const assetId = document.getElementById('variant-asset-id').value;
    const breakpoint = document.getElementById('variant-breakpoint').value;
    const value = document.getElementById('variant-value').value;
    const isImportant = document.getElementById('variant-important-checkbox')?.checked || false;
    
    if (!assetId || !breakpoint || !value) {
        showToast('Please fill in all required fields', 'error');
        return;
    }
    
    try {
        const response = await apiFetch(`${API_BASE_URL}/brand-stylings/${currentStylingId}/assets/${assetId}/variants`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                asset_id: parseInt(assetId),
                breakpoint: breakpoint,
                value: value,
                is_important: isImportant
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // Close modal
        const variantModal = document.getElementById('add-variant-modal');
        const modalBackdrop = document.querySelector('.modal-backdrop');
        
        if (variantModal) {
            variantModal.classList.add('hidden');
        }
        if (modalBackdrop) {
            modalBackdrop.classList.add('hidden');
        }
        
        // Refresh the variants list
        // await loadAssetVariants(assetId);
        if (typeof loadBrandStyling === 'function') {
            loadBrandStyling(window.currentStylingId);
        }
        
        showToast('Variant saved successfully', 'success');
    } catch (error) {
        console.error('Error saving variant:', error);
        showToast('Failed to save variant', 'error');
    }
}

// Handle delete variant button click
async function handleDeleteVariantClick(event) {
  event.stopPropagation(); // Prevent parent click events
  
  const button = event.currentTarget;
  const variantId = button.getAttribute('data-variant-id');
  const assetId = button.getAttribute('data-asset-id');
  
  if (!confirm('Are you sure you want to delete this variant?')) {
    return;
  }
  
  try {
    const response = await apiFetch(`${API_BASE_URL}/brand-stylings/${currentStylingId}/assets/${assetId}/variants/${variantId}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    showToast('Variant deleted successfully', 'success');
    loadAssetVariants(assetId);
  } catch (error) {
    console.error('Error deleting variant:', error);
    showToast(`Failed to delete variant: ${error.message}`, 'error');
  }
}

// Ensure the event listeners are properly set up
function setupVariantEventListeners() {
    console.log('Setting up variant event listeners');
    
    // Get variant form
    const variantForm = document.getElementById('variant-form');
    if (variantForm) {
        variantForm.addEventListener('submit', handleVariantFormSubmit);
    }
    
    // Add listeners to all add variant buttons
    document.querySelectorAll('.action-button.add-variant').forEach(btn => {
        btn.addEventListener('click', handleAddVariantClick);
    });

    // Add listeners to all variant rows
    document.querySelectorAll('.variant-row').forEach(variantRow => {
        const assetId = variantRow.dataset.assetId;
        initVariantRowEventListeners(variantRow, assetId);
    });
}

// Make functions globally available
window.handleAddVariantClick = handleAddVariantClick;
window.handleVariantFormSubmit = handleVariantFormSubmit;
window.handleDeleteVariantClick = handleDeleteVariantClick;
window.handleEditVariantClick = handleEditVariantClick;
window.loadAssetVariants = loadAssetVariants;
window.handleVariantToggle = handleVariantToggle;
window.setupVariantEventListeners = setupVariantEventListeners;

// Call setup when document is ready
document.addEventListener('DOMContentLoaded', setupVariantEventListeners);