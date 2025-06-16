// ------------------------------------------------------------------------------ //
//  region SITE HANDLERS                                                          //
// ------------------------------------------------------------------------------ //


// Create new site
// This function is called when the user clicks the new site button
async function handleNewSiteSubmit(event) {
    console.log("handleNewSiteSubmit called."); // <-- Added Logging
    // *** IMPORTANT: Ensure default form submission is prevented ***
  //  if (event && typeof event.preventDefault === 'function') {
        event.preventDefault();
  //      console.log("event.preventDefault() called in handleNewSiteSubmit."); // <-- Added Logging
  //  } else {
  //       console.warn("event.preventDefault() not available or not called in handleNewSiteSubmit."); // <-- Added Logging
  //  }


     // Ensure form element exists
    if (!newSiteForm) {
        console.error("New site form element not found."); // <-- Added Logging
        showToast("Error: Form not available.", 'error');
        return;
    }

    const name = document.getElementById('site-name-input').value;
    const description = document.getElementById('site-description-input').value;

    // The createSite API function now handles adding the node to the tree
    const site = await createSite({ name, description });
    if (site) {
        hideModal();
        newSiteForm.reset();
        console.log("New site submitted and modal hidden."); // <-- Added Logging
    } else {
        console.log("New site submission failed."); // <-- Added Logging
    }
}

// edit existing site
// This function is called when the user clicks the edit button for a site
async function handleEditSiteSubmit(event) {
    console.log("handleEditSiteSubmit called."); // <-- Added Logging
    // *** IMPORTANT: Ensure default form submission is prevented ***
   //  if (event && typeof event.preventDefault === 'function') {
        event.preventDefault();
        console.log("event.preventDefault() called in handleEditSiteSubmit."); // <-- Added Logging
  //  } else {
   //      console.warn("event.preventDefault() not available or not called in handleEditSiteSubmit."); // <-- Added Logging
   // }


     // Ensure form element exists
    if (!editSiteForm) {
        console.error("Edit site form element not found."); // <-- Added Logging
        showToast("Error: Form not available.", 'error');
        return;
    }

    const siteId = document.getElementById('edit-site-id').value;
    const name = document.getElementById('edit-site-name-input').value;
    const description = document.getElementById('edit-site-description-input').value;

    // The updateSite API function now handles updating the node in the tree
    const updatedSite = await updateSite(siteId, { name, description });
    if (updatedSite) {
        hideModal();
        console.log("Edit site submitted and modal hidden."); // <-- Added Logging
    } else {
        console.log("Edit site submission failed."); // <-- Added Logging
    }
}

// Delete existing site
// This function is called when the user clicks the delete button for a site
async function handleDeleteSiteClick() {
    console.log("handleDeleteSiteClick called."); // <-- Added Logging
    // *** IMPORTANT: This is a click handler, not a submit. No preventDefault needed here
    // unless the button is inside a form and missing type="button".
    // Ensure the button triggering this has type="button". ***


    if (!currentSiteId) {
        showToast("No site selected to delete.", 'warning');
        console.warn("No current site ID to delete."); // <-- Added Logging
        return;
    }

    if (confirm('Are you sure you want to delete this site and all its brand stylings and assets? This action cannot be undone.')) {
        // The deleteSite API function now handles removing the node from the tree
        await deleteSite(currentSiteId);
        console.log("Delete site confirmed and initiated."); // <-- Added Logging
    } else {
        console.log("Delete site cancelled."); // <-- Added Logging
    }
}

// ------------------------------------------------------------------------------ //
//  region BRAND HANDLERS                                                         //
// ------------------------------------------------------------------------------ //

// Edit existing site
// Handle click on edit site button (opens modal and populates form)
function handleEditSiteClick() {
    console.log("handleEditSiteClick called."); // <-- Added Logging
    // *** IMPORTANT: This is a click handler, not a submit. No preventDefault needed here
    // unless the button is inside a form and missing type="button".
    // Ensure the button triggering this has type="button". ***

    if (!currentSiteId) {
        showToast("No site selected to edit.", 'warning');
        console.warn("No current site ID to edit."); // <-- Added Logging
        return;
    }

    // Assuming you have a way to get the current site data,
    // either from a global state or by fetching it again.
    // For this example, let's assume we need to fetch it.
    apiFetch(`${API_BASE_URL}/sites/${currentSiteId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(site => {
            console.log("Fetched site for editing:", site); // <-- Added Logging
            // Populate the edit site modal form
            const editSiteIdInput = document.getElementById('edit-site-id');
            const editSiteNameInput = document.getElementById('edit-site-name-input');
            const editSiteDescriptionInput = document.getElementById('edit-site-description-input');

            if (editSiteIdInput) editSiteIdInput.value = site.id;
            if (editSiteNameInput) editSiteNameInput.value = site.name;
            if (editSiteDescriptionInput) editSiteDescriptionInput.value = site.description || '';

            // Show the modal
            showModal(editSiteModal);
            console.log("Edit site modal shown."); // <-- Added Logging
        })
        .catch(error => {
            console.error('Error fetching site for editing:', error); // <-- Added Logging
            showToast(`Failed to load site details for editing: ${error.message}`, 'error');
        });
}

//new brand styling
// Create new brand styling
async function handleNewBrandStylingSubmit(event) {
    console.log("handleNewBrandStylingSubmit called."); // <-- Added Logging
    event.preventDefault();


    if (!newBrandStylingForm) {
        console.error("New brand styling form element not found."); // <-- Added Logging
        showToast("Error: Form not available.", 'error');
        return;
    }

    const siteId = parseInt(document.getElementById('new-brand-styling-site-id').value);
    const name = document.getElementById('brand-name-input').value;
    const description = document.getElementById('brand-description-input').value;

    // Get selected master brand ID (if any)
    const masterBrandSelect = document.getElementById('brand-inherit-from-select');
    const masterBrandId = masterBrandSelect && masterBrandSelect.value ? parseInt(masterBrandSelect.value) : null;

    // The createBrandStyling API function now handles adding the node to the tree
    const styling = await createBrandStyling(siteId, {
        name,
        description,
        master_brand_id: masterBrandId
    });

    if (styling) {
        hideModal();
      //  newBrandStylingForm.reset();
         // After creating a brand styling, we should likely refresh the site view
         // to show the new brand styling card. The API call already triggers this.
         console.log("New brand styling submitted and modal hidden."); // <-- Added Logging
    } else {
         console.log("New brand styling submission failed."); // <-- Added Logging
    }
}

// Edit brand styling
// Edit existing brand styling
async function handleEditBrandStylingSubmit(event) {
    console.log("handleEditBrandStylingSubmit called."); // <-- Added Logging
    // *** IMPORTANT: Ensure default form submission is prevented ***
    // if (event && typeof event.preventDefault === 'function') {
        event.preventDefault();
        console.log("event.preventDefault() called in handleEditBrandStylingSubmit."); // <-- Added Logging
   //      console.warn("event.preventDefault() not available or not called in handleEditBrandStylingSubmit."); // <-- Added Logging
   // }

    if (!editBrandStylingForm) {
        console.error("Edit brand styling form element not found."); // <-- Added Logging
        showToast("Error: Form not available.", 'error');
        return;
    }

    const stylingId = document.getElementById('edit-brand-styling-id').value;
    const name = document.getElementById('edit-brand-styling-name-input').value;
    const description = document.getElementById('edit-brand-styling-description-input').value;

    // Get selected master brand ID (if any)
    const masterBrandSelect = document.getElementById('edit-brand-inherit-from-select');
    const masterBrandId = masterBrandSelect && masterBrandSelect.value ? parseInt(masterBrandSelect.value) : null;

    // The updateBrandStyling API function now handles updating the node in the tree
    const updatedStyling = await updateBrandStyling(stylingId, {
        name,
        description,
        master_brand_id: masterBrandId
    });

    if (updatedStyling) {
        hideModal();
         // After updating a brand styling, we should likely refresh the view
         // if the inheritance changed or if we were on the site view.
         // The API call already triggers reloading the styling view.
         // If we were on the site view, loadSite is called in updateBrandStyling.
         console.log("Edit brand styling submitted and modal hidden."); // <-- Added Logging
    } else {
         console.log("Edit brand styling submission failed."); // <-- Added Logging
    }
}

// Brand styling click
// This function is called when the user clicks on a brand styling in the tree
function handleEditBrandStylingClick() {
    console.log("handleEditBrandStylingClick called."); // <-- Added Logging
     // *** IMPORTANT: This is a click handler, not a submit. No preventDefault needed here
    // unless the button is inside a form and missing type="button".
    // Ensure the button triggering this has type="button". ***

    if (!currentStylingId) {
        showToast("No brand styling selected to edit.", 'warning');
        console.warn("No current styling ID to edit."); // <-- Added Logging
        return;
    }

    // Fetch the current styling data
    apiFetch(`${API_BASE_URL}/brand-stylings/${currentStylingId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(styling => {
            console.log("Fetched styling for editing:", styling); // <-- Added Logging
            // Populate the edit brand styling modal form
            const editBrandStylingIdInput = document.getElementById('edit-brand-styling-id');
            const editBrandStylingNameInput = document.getElementById('edit-brand-styling-name-input');
            const editBrandStylingDescriptionInput = document.getElementById('edit-brand-styling-description-input');
            const editBrandInheritFromSelect = document.getElementById('edit-brand-inherit-from-select');

            if (editBrandStylingIdInput) editBrandStylingIdInput.value = styling.id;
            if (editBrandStylingNameInput) editBrandStylingNameInput.value = styling.name;
            if (editBrandStylingDescriptionInput) editBrandStylingDescriptionInput.value = styling.description || '';

            // Populate the master brand select dropdown
            if (editBrandInheritFromSelect) {
                 // Fetch all stylings for the current site to populate the dropdown
                 if (currentSiteId) {
                     apiFetch(`${API_BASE_URL}/sites/${currentSiteId}/brand-stylings/`)
                         .then(response => response.json())
                         .then(stylings => {
                             console.log("Fetched stylings for inherit dropdown:", stylings); // <-- Added Logging
                             editBrandInheritFromSelect.innerHTML = '<option value="">-- None --</option>'; // Add default option
                             stylings.forEach(s => {
                                 // Don't allow a styling to inherit from itself
                                 if (s.id !== styling.id) {
                                     const option = document.createElement('option');
                                     option.value = s.id;
                                     option.textContent = s.name;
                                     if (styling.master_brand_id === s.id) {
                                         option.selected = true;
                                     }
                                     editBrandInheritFromSelect.appendChild(option);
                                 }
                             });
                         })
                         .catch(error => {
                             console.error('Error fetching stylings for inherit dropdown:', error); // <-- Added Logging
                             showToast("Failed to load brands for inheritance.", 'error');
                         });
                 } else {
                     editBrandInheritFromSelect.innerHTML = '<option value="">-- None (Site not selected) --</option>';
                     console.warn("currentSiteId not set, cannot load brands for inheritance dropdown."); // <-- Added Logging
                 }
            }


            // Show the modal
            showModal(editBrandStylingModal);
            console.log("Edit brand styling modal shown."); // <-- Added Logging
        })
        .catch(error => {
            console.error('Error fetching brand styling for editing:', error); // <-- Added Logging
            showToast(`Failed to load brand styling details for editing: ${error.message}`, 'error');
        });
}

// Delete existing brand styling
// This function is called when the user clicks the delete button for a brand styling
async function handleDeleteBrandStylingClick() {
    console.log("handleDeleteBrandStylingClick called."); // <-- Added Logging
     // *** IMPORTANT: This is a click handler, not a submit. No preventDefault needed here
    // unless the button is inside a form and missing type="button".
    // Ensure the button triggering this has type="button". ***

    if (!currentStylingId) {
        showToast("No brand styling selected to delete.", 'warning');
        console.warn("No current styling ID to delete."); // <-- Added Logging
        return;
    }

    if (confirm('Are you sure you want to delete this brand styling and all its assets? This action cannot be undone.')) {
        // The deleteBrandStyling API function now handles removing the node from the tree
        await deleteBrandStyling(currentStylingId);
        console.log("Delete brand styling confirmed and initiated."); // <-- Added Logging
        loadSites();
    } else {
        console.log("Delete brand styling cancelled."); // <-- Added Logging
    }
}

// ------------------------------------------------------------------------------ //
//  region ASSET HANDLERS                                                         //
// ------------------------------------------------------------------------------ //

// Create new asset
// This function is called when the user clicks the new asset button
async function handleNewAssetSubmit(event) {
    event.preventDefault();

    if (!newAssetForm) {
        console.error("New asset form element not found.");
        showToast("Error: Form not available.", 'error');
        return;
    }

    // Initialize formData
    const formData = new FormData();

    const stylingId = parseInt(document.getElementById('new-asset-styling-id').value);
    const name = document.getElementById('asset-name-input').value;
    const type = document.getElementById('asset-type-select').value;
    const description = document.getElementById('asset-description-input').value;
    
    // Get the currently active fields container based on type
    let activeFieldsContainer;
    if (type === 'color') {
        activeFieldsContainer = document.getElementById('color-fields');
    } else if (type === 'image') {
        activeFieldsContainer = document.getElementById('image-fields');
    } else {
        activeFieldsContainer = document.getElementById('generic-fields');
    }
    
    // Get the importance checkbox from the active container
    const importanceCheckbox = activeFieldsContainer ? 
                              activeFieldsContainer.querySelector('.importance-checkbox') : null;
    const isImportant = importanceCheckbox ? importanceCheckbox.checked : false;
    
    // Form validation
    if (!name || !type) {
        showToast('Name and type are required', 'error');
        return;
    }

    // Add common fields to formData
    formData.append('name', name);
    formData.append('asset_type', type);  // Direct from form selection - no detection
    formData.append('is_important', isImportant);
    formData.append('group_name', "General");  // Default group name
    
    if (description) {
        formData.append('description', description);
    }

    // Type-specific value handling - direct from inputs
    let valueAdded = false;
    
    if (type === 'color') {
        const colorInput = activeFieldsContainer.querySelector('input[type="color"]');
        if (colorInput && colorInput.value) {
            formData.append('value', colorInput.value);
            valueAdded = true;
        }
    } else if (type === 'image') {
        const fileInput = activeFieldsContainer.querySelector('input[type="file"]');
        if (fileInput && fileInput.files.length > 0) {
            formData.append('file', fileInput.files[0]);
            valueAdded = true;
        } else {
            // Check for direct URL input as fallback
            const urlInput = activeFieldsContainer.querySelector('input[type="text"]');
            if (urlInput && urlInput.value) {
                formData.append('value', urlInput.value);
                valueAdded = true;
            }
        }
    } else { // font, dimension, other
        const valueInput = activeFieldsContainer.querySelector('input[type="text"]');
        if (valueInput && valueInput.value) {
            formData.append('value', valueInput.value);
            valueAdded = true;
        }
    }

    // Verify a value was added for the asset
    if (!valueAdded) {
        showToast(`Please provide a value for the ${type} asset`, 'error');
        return;
    }

    try {
        // Send to backend with exact form values
        const response = await apiFetch(`${API_BASE_URL}/brand-stylings/${stylingId}/assets/`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to create asset: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const asset = await response.json();
        showToast('Asset created successfully', 'success');
        
        // Close modal and reset form
        hideModal();
        newAssetForm.reset();
        
        // Reset field visibility
        if (newColorFields) newColorFields.classList.add('hidden');
        if (newImageFields) newImageFields.classList.add('hidden');
        if (newGenericFields) newGenericFields.classList.add('hidden');
        if (newAssetTypeSelect) newAssetTypeSelect.value = '';
        
        // Reload styling view to refresh with new data from database
        loadBrandStyling(stylingId);
        
    } catch (error) {
        console.error('Error creating asset:', error);
        showToast(`Failed to create asset: ${error.message}`, 'error');
    }
}

// Edit existing asset
// This function is called when the user clicks the edit button for an asset
async function handleEditAssetSubmit(event) {
    console.log("handleEditAssetSubmit called."); // <-- Added Logging
    // *** IMPORTANT: Ensure default form submission is prevented ***
   //  if (event && typeof event.preventDefault === 'function') {
        event.preventDefault();
        console.log("event.preventDefault() called in handleEditAssetSubmit."); // <-- Added Logging
   // } else {
  //       console.warn("event.preventDefault() not available or not called in handleEditAssetSubmit."); // <-- Added Logging
   // }

     // Ensure form element exists
    if (!editAssetForm) {
         console.error("Edit asset form element not found."); // <-- Added Logging
         showToast("Error: Form not available.", 'error');
         return;
    }

    // Initialize formData at the beginning of the function
    const formData = new FormData();

    const assetId = document.getElementById('edit-asset-id').value;
    const stylingId = document.getElementById('edit-asset-styling-id').value;
     // Ensure edit-asset-name-input exists before accessing value
     const editAssetNameInput = document.getElementById('edit-asset-name-input');
     const name = editAssetNameInput ? editAssetNameInput.value : '';

     // Ensure edit-asset-type-display exists before accessing value
     const editAssetTypeDisplay = document.getElementById('edit-asset-type-display');
     const type = editAssetTypeDisplay ? editAssetTypeDisplay.value.toLowerCase() : '';


     // Ensure edit-asset-description-input exists before accessing value
     const editAssetDescriptionInput = document.getElementById('edit-asset-description-input');
     const description = editAssetDescriptionInput ? editAssetDescriptionInput.value : null;

     // Get the value of the is_important checkbox AFTER formData is initialized
     const isImportant = document.getElementById('edit-asset-important-checkbox').checked;
     // Now you can safely append it
     formData.append('is_important', isImportant);


    formData.append('name', name); // Name is required by API PUT endpoint

    // Add description if it's not undefined or null
    if (description !== undefined && description !== null) {
        formData.append('description', description);
    }

    // Handle different asset types for value/file
    switch(type) {
        case 'color':
            const colorValueInput = document.getElementById('edit-color-value-input');
             if (colorValueInput) formData.append('value', colorValueInput.value);
            break;

        case 'image':
            const fileInput = document.getElementById('edit-image-file-input');
            if (fileInput && fileInput.files.length > 0) {
                formData.append('file', fileInput.files[0]);
                // Server will handle setting the value based on the uploaded file
            } else {
                console.warn("No new file selected for image asset."); // <-- Added Logging
                 // If no new file, check if the value (URL) was modified directly in a hypothetical input
                 // (Assuming direct image URL editing is NOT the primary way via this form,
                 //  we don't append 'file' or 'value' if no new file is selected.
                 //  The backend will keep the existing value and file_path.)
                 // If direct URL editing IS intended via a text field, get its value and append it here.
            }
            break;

        case 'font':
        case 'dimension':

        case 'other':
            console.warn("Handling font, dimension, or other asset type."); // <-- Added Logging
            //const valueInput = document.getElementById('edit-asset-value-input');
            //if (valueInput) formData.append('value', valueInput.value);
            //break;

        default:
            console.error('Unknown asset type:', type); // <-- Added Logging
            showToast(`Unable to update asset of type ${type}`, 'error');
            return;
    }

    // The updateAsset API function now handles refreshing the view
    const updatedAsset = await updateAsset(assetId, formData);
    if (updatedAsset) {
        hideModal();
        // Reset dynamic fields visibility (Ensure elements exist)
        if (editColorFields) editColorFields.classList.add('hidden');
        if (editImageFields) editImageFields.classList.add('hidden');
        if (editGenericFields) editGenericFields.classList.add('hidden');
        if (document.getElementById('edit-image-preview')) document.getElementById('edit-image-preview').src = '';
        console.log("Edit asset submitted and modal hidden."); // <-- Added Logging
    } else {
        console.log("Edit asset submission failed."); // <-- Added Logging
    }
}

// Handle reassign asset group
// This function is called when the user selects a new group for an asset
function handleReassignAssetGroup(assetId, newGroupName) {
    if (!currentStylingId || !assetId) {
        showToast("Missing styling ID or asset ID", 'error');
        return;
    }
    
    const formData = new FormData();
    formData.append('group_name', newGroupName);
    
    apiFetch(`${API_BASE_URL}/brand-stylings/${currentStylingId}/assets/${assetId}`, {
        method: 'PUT',
        body: formData
    })
    .then(response => {
        if (!response.ok) return response.text().then(text => { throw new Error(text) });
        return response.json();
    })
    .then(data => {
        showToast('Asset moved to group: ' + newGroupName, 'success');
        loadBrandStyling(currentStylingId);
    })
    .catch(error => {
        console.error('Error reassigning asset group:', error);
        showToast('Error moving asset: ' + error.message, 'error');
    });
}

