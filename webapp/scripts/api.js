// ------------------------------------------------------------------------------ //
//  region SITES API FUNCITONS                                                    //
// ------------------------------------------------------------------------------ //


const API_KEY = '8592yt035x98tkuy3567vj35yfxqholmwrogjy3469t2pqu4xmf';


// In scripts/api.js, replace the old window.apiFetch function with this one.
// This is the only change you need to make.

window.apiFetch = function(url, options = {}) {
    const API_KEY = '8592yt035x98tkuy3567vj35yfxqholmwrogjy3469t2pqu4xmf';

    const headers = {
        ...options.headers,
        'X-API-Key': API_KEY
    };

    // This function now does only one thing:
    // It calls the browser's fetch with the added API key header
    // and returns the original, untouched response.
    return fetch(url, { ...options, headers });
};


// Define renderSiteTree at the top of api.js
function renderSiteTree(sites) {
    if (!siteTree) {
        console.error("Site tree element not found, cannot render tree.");
        return;
    }

    siteTree.innerHTML = '';

    if (sites.length === 0) {
        siteTree.innerHTML = '<li class="tree-item text-secondary">No sites created yet.</li>';
        return;
    }

    sites.forEach(site => {
        if (typeof addSiteToTree === 'function') {
            addSiteToTree(site, true);
        } else {
            console.error("addSiteToTree function not defined");
        }
    });
}

// Load sites from the API and render them in the site tree
// This function is called when the DOM is fully loaded
// and when the user clicks on the "Sites" tab in the sidebar.
async function loadSites() {
    try {
        // Use global API_BASE_URL
        const response = await apiFetch(`${API_BASE_URL}/sites/`);
        if (!response.ok) {
             throw new Error(`HTTP error! status: ${response.status}`);
        }
        const sites = await response.json();
        // Ensure siteTree element exists before rendering
        if (siteTree) {
             renderSiteTree(sites);
        } else {
             console.error("Site tree element not found, cannot render sites.");
        }

    } catch (error) {
        console.error('Error loading sites:', error);
        showToast(`Failed to load sites: ${error.message}`, 'error');
    }
}

// Load a specific site by ID
// This function is called when the user clicks on a site in the site tree.
// It fetches the site details and its brand stylings from the API.
async function loadSite(siteId) {
    try {
         // Use global API_BASE_URL
        const response = await apiFetch(`${API_BASE_URL}/sites/${siteId}`);
        if (!response.ok) {
             throw new Error(`HTTP error! status: ${response.status}`);
       }
        const site = await response.json();

        // Load brand stylings for this site (remains a potential optimization area)
         // Use global API_BASE_URL
        const stylingsResponse = await apiFetch(`${API_BASE_URL}/sites/${siteId}/brand-stylings/`);
         if (!stylingsResponse.ok) {
             throw new Error(`HTTP error! status: ${stylingsResponse.status}`);
        }
        const stylings = await stylingsResponse.json();

        renderSiteView(site, stylings);
    } catch (error) {
        console.error('Error loading site:', error);
        showToast(`Failed to load site details: ${error.message}`, 'error');
    }
}

// Create a new Site
// This function is called when the user submits the new site form.
// It sends a POST request to the API with the new site data.
async function createSite(data) {
    try {
         // Use global API_BASE_URL
        const response = await apiFetch(`${API_BASE_URL}/sites/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
             const errorText = await response.text();
            throw new Error(`Failed to create site: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const newSite = await response.json();
        showToast('Site created successfully', 'success'); // Added success type
        addSiteToTree(newSite); // Refresh site list
        return newSite;
    } catch (error) {
        console.error('Error creating site:', error);
        showToast(`Failed to create site: ${error.message}`, 'error');
        return null;
    }
}

// Edit a Site
// This function is called when the user submits the edit site form.
// It sends a PUT request to the API with the updated site data.
async function updateSite(siteId, data) {
    console.log(`[API-US-1] updateSite called for siteId: ${siteId} with data:`, data); // Existing log

    try {
       // Use global API_BASE_URL
       const response = await apiFetch(`${API_BASE_URL}/sites/${siteId}`, {
           method: 'PUT',
           headers: {
               'Content-Type': 'application/json'
           },
           body: JSON.stringify(data)
       });

       console.log(`[API-US-1] Fetch response status: ${response.status}`); // Added log

       if (!response.ok) {
           const errorText = await response.text();
           console.error(`[API-US-1] API Error Response: ${errorText}`); // Added log for API error body
           throw new Error(`Failed to update site: ${response.status} ${response.statusText} - ${errorText}`);
       }

       const updatedSite = await response.json();
       console.log(`[API-US-1] Successfully fetched updated site data:`, updatedSite); // Added log

       showToast('Site updated successfully', 'success'); // Re-enabled success toast

       // Check if updateSiteInTree is defined and call it
       if (typeof updateSiteInTree === 'function') {
           console.log(`[API-US-1] Calling updateSiteInTree with:`, updatedSite); // Added log
           updateSiteInTree(updatedSite); // <-- This should now be reached
           console.log(`[API-US-1] updateSiteInTree called.`); // Added log
       } else {
           console.error(`[API-US-1] Error: updateSiteInTree function is not defined.`); // Added log
           // Fallback: Reload sites if the update function isn't available
           if (typeof loadSites === 'function') {
               console.warn(`[API-US-1] Falling back to loadSites as updateSiteInTree is not defined.`); // Added log
               loadSites();
           } else {
               console.error(`[API-US-1] Error: loadSites function is also not defined.`); // Added log
           }
       }

       return updatedSite;
   } catch (error) {
       console.error('[API-US-1] Error updating site:', error); // Existing log
       showToast(`Failed to update site: ${error.message}`, 'error');
       return null;
   }
}

// Delete a Site
// This function is called when the user clicks the delete site button.
// It sends a DELETE request to the API to remove the site.
async function deleteSite(siteId) {
    try {
         // Use global API_BASE_URL
        const response = await apiFetch(`${API_BASE_URL}/sites/${siteId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to delete site: ${response.status} ${response.statusText} - ${errorText}`);
        }

        showToast('Site deleted successfully', 'success'); // Added success type
        removeSiteFromTree(siteId) ; // Refresh site list
        showWelcomeScreen(); // Go back to welcome screen after deleting site
        return true;
    } catch (error) {
        console.error('Error deleting site:', error);
        showToast(`Failed to delete site: ${error.message}`, 'error');
        return false;
    }
}

// ------------------------------------------------------------------------------ //
//  region BRANDS API FUNCITONS                                                    //
// ------------------------------------------------------------------------------ //


// load the brand styling information when the tree is clicked.
// This function is called when the user clicks on a brand styling in the site view.
// It fetches the brand styling details and its assets from the API.
async function loadBrandStyling(stylingId) {
    try {
        const response = await apiFetch(`${API_BASE_URL}/brand-stylings/${stylingId}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const styling = await response.json();

        // Load site info (needed for breadcrumb/context)
        const siteResponse = await apiFetch(`${API_BASE_URL}/sites/${styling.site_id}`);
        if (!siteResponse.ok) {
            throw new Error(`HTTP error! status: ${siteResponse.status}`);
        }
        const site = await siteResponse.json();

        // Load assets WITH VARIANTS using assets-with-inheritance endpoint
        const assetsResponse = await apiFetch(`${API_BASE_URL}/brand-stylings/${stylingId}/assets-with-inheritance`);
        if (!assetsResponse.ok) {
            throw new Error(`HTTP error! status: ${assetsResponse.status}`);
        }
        const assets = await assetsResponse.json();
        
        console.log('Loaded assets with variants:', assets); // Debug log
        
        renderBrandStylingView(styling, site, assets);

    } catch (error) {
        console.error('Error loading brand styling:', error);
        showToast(`Failed to load brand styling details: ${error.message}`, 'error');
    }
}

async function deleteBrandStyling(stylingId) {
     try {
          // Use global API_BASE_URL
        const response = await apiFetch(`${API_BASE_URL}/brand-stylings/${stylingId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
             const errorText = await response.text();
            throw new Error(`Failed to delete brand styling: ${response.status} ${response.statusText} - ${errorText}`);
        }

        showToast('Brand styling deleted successfully', 'success'); // Added success type
         // Assuming currentSiteId is still valid
        loadSite(currentSiteId); // Refresh site view
        showSiteView(currentSiteId); // Go back to site view after deleting styling
        return true;
    } catch (error) {
        console.error('Error deleting brand styling:', error);
        showToast(`Failed to delete brand styling: ${error.message}`, 'error');
        return false;
    }
}

// Create a new Brand Styling
// This function is called when the user submits the new brand styling form.
// It sends a POST request to the API with the new brand styling data.
async function createBrandStyling(siteId, data) {
    console.log(`createBrandStyling called for siteId: ${siteId} with data:`, data);
    try {
        const response = await apiFetch(`${API_BASE_URL}/sites/${siteId}/brand-stylings/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to create brand styling: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const newStyling = await response.json();
        console.log("New brand styling created:", newStyling);
        showToast('Brand styling created successfully', 'success');

        // *** MODIFIED: Fetch and dynamically update stylings for the site ***
        // This will add the new styling node and re-sort the list without clearing.
        fetchStylingsAndAddToTree(siteId);


       //loadSite(siteId); // Refresh the site view to show the new styling card
        console.log("createBrandStyling complete.");
        return newStyling;
    } catch (error) {
        console.error('Error creating brand styling:', error);
        showToast(`Failed to create brand styling: ${error.message}`, 'error');
        return null;
    }
}

// Edit an existing Brand Styling
// This function is called when the user submits the edit brand styling form.
// It sends a PUT request to the API with the updated brand styling data.
async function updateBrandStyling(stylingId, data) {
    console.log(`updateBrandStyling called for stylingId: ${stylingId} with data:`, data);
    try {
        const response = await apiFetch(`${API_BASE_URL}/brand-stylings/${stylingId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to update brand styling: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const updatedStyling = await response.json();
        console.log("Brand styling updated:", updatedStyling);
        showToast('Brand styling updated successfully', 'success');

        // *** MODIFIED: Fetch and dynamically update stylings for the site ***
        // This will update the styling node and handle potential re-positioning if inheritance changed.
        fetchStylingsAndAddToTree(updatedStyling.site_id);


        loadBrandStyling(stylingId); // Reload current styling view
        console.log("updateBrandStyling complete.");
        return updatedStyling;
    } catch (error) {
        console.error('Error updating brand styling:', error);
        showToast(`Failed to update brand styling: ${error.message}`, 'error');
        return null;
    }
}


// Fetch breakpoints for a styling
// This function is called when the user clicks on a brand styling in the site view.
// It fetches the breakpoints from the API and returns them in a formatted list.

async function fetchBreakpoints(stylingId) {
    try {
        // Fetch all dimension assets
        // Corrected URL to fetch all assets and filter locally
        const response = await apiFetch(`${API_BASE_URL}/brand-stylings/${stylingId}/assets/`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const assets = await response.json();

        // Filter for assets that are dimensions
        // REMOVED: .filter(asset => asset.name.toLowerCase().includes('breakpoint'))
        const dimensions = assets.filter(asset =>
            asset.type === 'dimension'
        );

        // Create a formatted list of breakpoints from ALL dimensions
        // You might want to add a different filter here if not ALL dimensions are breakpoints
        // For now, we include all dimensions
        const breakpoints = dimensions.map(bp => ({
            id: bp.id,
            // Use the full name if it doesn't start with --breakpoint-, otherwise format
            key: bp.name.startsWith('--breakpoint-') ? bp.name.replace(/^--breakpoint-/i, '').toLowerCase() : bp.name.replace(/^--/, ''), // Use clean name or formatted key
            name: bp.name, // Use the original variable name for display
            value: bp.value // The CSS value
        }));


        // You might still want default breakpoints if none are defined in DB,
        // but the original new code didn't include this fallback.
        // Re-adding a fallback for clarity if the DB query returns nothing.
         if (breakpoints.length === 0) {
             console.warn("No dimension assets found in the styling, using default breakpoints as fallback.");
             return [
                 { key: 'mobile', name: '--breakpoint-mobile', value: 'max-width: 767px' },
                 { key: 'tablet', name: '--breakpoint-tablet', value: 'min-width: 768px) and (max-width: 1023px' },
                 { key: 'desktop', name: '--breakpoint-desktop', value: 'min-width: 1024px' }
             ];
         }


        return breakpoints; // Return all found dimension assets as potential breakpoints
    } catch (error) {
        console.error('Error fetching breakpoints:', error);
        // Fallback to default breakpoints on error
        return [
            { key: 'mobile', name: '--breakpoint-mobile', value: 'max-width: 767px' },
            { key: 'tablet', name: '--breakpoint-tablet', value: 'min-width: 768px) and (max-width: 1023px' },
            { key: 'desktop', name: '--breakpoint-desktop', value: 'min-width: 1024px' }
        ];
    }
}

// Ensure window.fetchBreakpoints is still set if needed globally
window.fetchBreakpoints = fetchBreakpoints;




// ------------------------------------------------------------------------------ //
//  region BRAND STYLING ASSETS API FUNCTIONS                                     //
// ------------------------------------------------------------------------------ //

// Sync CSS content with the database
// This function is called when the user clicks the "Save" button in the CSS editor.

async function syncCssWithDatabase(stylingId, properties, groups) {
    if (!stylingId) return false;

    try {
        // Create form data
        const formData = new FormData();
        formData.append('css_content', generateCssWithGroups(properties, groups));
        
        // Add parsed data if available
        if (properties && groups) {
            formData.append('parsed_data', JSON.stringify({ properties, groups }));
        }
        
        // Send to backend
        const response = await apiFetch(`${API_BASE_URL}/brand-stylings/${stylingId}/sync`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const result = await response.json();
        showToast('Changes saved successfully', 'success');

        // After saving, fetch the updated CSS from API
        apiFetch(`${API_BASE_URL}/brand/${stylingId}/css`)
            .then(response => response.text())
            .then(css => {
                if (cssOutput) cssOutput.textContent = css;
            });

        return true;
    } catch (error) {
        console.error('Error syncing CSS with database:', error);
        showToast(`Failed to save changes: ${error.message}`, 'error');
        return false;
    }
}


// Add this function to api.js if it's not already there
async function deleteAsset(assetId) {
    try {
        if (!window.currentStylingId) {
            throw new Error("Missing styling ID");
        }
        
        const response = await apiFetch(`${API_BASE_URL}/brand-stylings/${window.currentStylingId}/assets/${assetId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const text = await response.text();
            console.error("API Error Response:", text);
            throw new Error(`Failed to delete asset: ${response.status} ${response.statusText}`);
        }

        console.log('Asset deleted from database:', assetId);
        showToast('Asset deleted', 'success');
        return true;

    } catch (error) {
        console.error('Error deleting asset:', error);
        showToast('Error deleting asset: ' + error.message, 'error');
        throw error;
    }
}

// Make sure the function is globally accessible
window.deleteAsset = deleteAsset;

// Load CSS content from the database
// This function is called when the user clicks the "Load" button in the CSS editor.
// function loadCssContent(stylingId) {
//     apiFetch(`${API_BASE_URL}/brand-stylings/${stylingId}/css`)
//         .then(response => {
//             if (!response.ok) {
//                 throw new Error(`HTTP error! Status: ${response.status}`);
//             }
//             return response.text();
//         })
//         .then(css => {
//             // Parse CSS to get variables and their groups (assuming parseCustomPropertiesWithGroups is available)
//             if (typeof parseCustomPropertiesWithGroups === 'function') {
//                  const { properties, groups } = parseCustomPropertiesWithGroups(css);
//                 // Update UI from parsed CSS (assuming updateUiFromParsedCss is available)
//                  if (typeof updateUiFromParsedCss === 'function') {
//                     updateUiFromParsedCss(properties, groups);
//                  } else {
//                     console.warn("updateUiFromParsedCss function not found. Cannot update UI from loaded CSS.");
//                  }
//             } else {
//                 console.warn("parseCustomPropertiesWithGroups function not found. Cannot parse loaded CSS.");
//                  // Fallback to just showing raw CSS if parsing is not available
//                  if (cssOutput) {
//                      cssOutput.textContent = css;
//                  }
//             }


//         })
//         .catch(error => {
//             console.error('Error loading CSS:', error);
//             showToast(`Failed to load CSS: ${error.message}`, 'error');
//         });
// }

// function loadCssContent(stylingId) {
//     apiFetch(`${API_BASE_URL}/brand/${stylingId}/css`)
//         .then(response => {
//             if (!response.ok) {
//                 throw new Error(`HTTP error! Status: ${response.status}`);
//             }
//             return response.text();
//         })
//         .then(css => {
//             // Always update the CSS output directly first
//             if (cssOutput) {
//                 cssOutput.textContent = css;
//             }
            
//             // Then parse CSS to get variables and their groups for UI updates
//             if (typeof parseCustomPropertiesWithGroups === 'function') {
//                 const { properties, groups } = parseCustomPropertiesWithGroups(css);
//                 // Update UI from parsed CSS
//                 if (typeof updateUiFromParsedCss === 'function') {
//                     updateUiFromParsedCss(properties, groups);
//                 }
//             }
//         })
//         .catch(error => {
//             console.error('Error loading CSS:', error);
//             showToast(`Failed to load CSS: ${error.message}`, 'error');
//         });
// }

// api.js

function loadCssContent(stylingId) {
    // Fetch CSS content
    const fetchCss = apiFetch(`${API_BASE_URL}/brand/${stylingId}/css`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.text();
        });

    // Fetch inheritance data
    const fetchInheritance = apiFetch(`${API_BASE_URL}/brand-stylings/${stylingId}/assets-with-inheritance`)
        .then(response => {
            if (!response.ok) {
                // Log a warning but don't throw if inheritance data isn't strictly required for basic rendering
                 console.warn(`HTTP error fetching inheritance data: ${response.status}`);
                 return null; // Return null or empty data if fetch fails
            }
            return response.json();
        })
         .catch(error => {
             console.error('Error fetching inheritance data:', error);
             return null; // Return null on error
         });


    // Wait for both fetches to complete
    Promise.all([fetchCss, fetchInheritance])
        .then(([css, inheritanceData]) => {
            // Always update the CSS output directly first
            if (cssOutput) {
                cssOutput.textContent = css;
            }

            // Then parse CSS to get variables and their groups for UI updates
            if (typeof parseCustomPropertiesWithGroups === 'function') {
                const { properties, groups } = parseCustomPropertiesWithGroups(css);

                // Update UI from parsed CSS, now passing inheritanceData
                if (typeof updateUiFromParsedCss === 'function') {
                    // Pass the fetched inheritanceData to the UI update function
                    updateUiFromParsedCss(properties, groups, inheritanceData);
                } else {
                     console.warn("updateUiFromParsedCss function not found.");
                }
            } else {
                 console.warn("parseCustomPropertiesWithGroups function not found.");
            }
        })
        .catch(error => {
            console.error('Error loading CSS or inheritance data:', error);
            showToast(`Failed to load styling data: ${error.message}`, 'error');
             // Fallback to showing just raw CSS if parsing fails after fetch
             if (cssOutput) {
                 // This might already be set by the first part of the promise, but ensure
                 apiFetch(`${API_BASE_URL}/brand/${stylingId}/css`)
                     .then(response => response.text())
                     .then(css => { cssOutput.textContent = css; })
                     .catch(err => console.error("Failed to set raw CSS output on error:", err));
             }
        });
}

// Create a new variant for an asset
// This function is called when the user submits the new variant form.
async function createVariant(stylingId, assetId, variantData) {
    try {
        // Ensure correct URL format and data structure
        const response = await apiFetch(`${API_BASE_URL}/brand-stylings/${stylingId}/assets/${assetId}/variants/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(variantData)
        });

        if (!response.ok) {
            throw new Error(`Failed to save variant: ${response.status}`);
        }

        const data = await response.json();
        showToast('Variant saved successfully', 'success');
        
        // Add this line to reload all data after saving
        loadBrandStyling(stylingId);
        
        return data;
    } catch (error) {
        console.error('Error saving variant:', error);
        showToast('Error saving variant: ' + error.message, 'error');
        throw error;
    }
}

// Update an existing variant
// This function is called when the user submits the edit variant form.
async function updateVariant(stylingId, assetId, variantId, variantData) {
     console.log(`Updating variant ${variantId} for styling: ${stylingId}, asset: ${assetId}`);
     try {
        const response = await apiFetch(`${API_BASE_URL}/brand-stylings/${stylingId}/assets/${assetId}/variants/${variantId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(variantData)
        });

        if (!response.ok) {
            const text = await response.text();
            console.error("API Error Response:", text);
            throw new Error(`Failed to update variant: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Variant updated successfully:', data);
        showToast('Variant updated successfully', 'success');
        return data; // Return the updated variant data

    } catch (error) {
        console.error('Error updating variant:', error);
         showToast('Error updating variant: ' + error.message, 'error');
        throw error; // Re-throw
    }
}

// Delete a variant
// This function is called when the user clicks the delete variant button.
async function deleteVariant(stylingId, assetId, variantId) {
     console.log(`Deleting variant ${variantId} for styling: ${stylingId}, asset: ${assetId}`);
     try {
        const response = await apiFetch(`${API_BASE_URL}/brand-stylings/${stylingId}/assets/${assetId}/variants/${variantId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
             const text = await response.text();
             console.error("API Error Response:", text);
             throw new Error(`Failed to delete variant from database: ${response.status} ${response.statusText}`);
        }
        console.log('Variant deleted from database:', variantId);
         showToast('Variant deleted', 'success');
         return true; // Indicate success

     } catch (error) {
         console.error('Error deleting variant from database:', error);
          showToast('Error deleting variant: ' + error.message, 'error');
         throw error; // Re-throw
     }
}


// Update an existing asset
// This function is called when the user edits an asset's name, value, or importance.
// In api.js
// Replace the existing updateAsset function with this:
async function updateAsset(stylingId, assetId, data) {
    console.log(`Updating asset ${assetId} for styling: ${stylingId} with data:`, data); //
    
    const formData = new FormData();
    // Append fields from the data object to FormData
    // Note: The backend Form(...) parameters will receive these as strings.
    // FastAPI handles conversion for simple types like bool ("true" -> True).
    if (data.name !== undefined) {
        formData.append('name', data.name);
    }
    if (data.original_name !== undefined) { // Important for rename logic on backend if it uses it
        formData.append('original_name', data.original_name);
    }
    if (data.value !== undefined) {
        formData.append('value', data.value);
    }
    if (data.description !== undefined) {
        formData.append('description', data.description);
    }
    if (data.is_important !== undefined) {
        formData.append('is_important', data.is_important); // Will be sent as "true" or "false"
    }
    if (data.selector !== undefined) {
        formData.append('selector', data.selector);
    }
    // If a 'file' object (for image uploads) were part of 'data', it would be appended here:
    // if (data.file instanceof File) { formData.append('file', data.file); }

    try {
        const response = await apiFetch(`${API_BASE_URL}/brand-stylings/${stylingId}/assets/${assetId}`, { //
            method: 'PUT',
            // For FormData, the browser automatically sets the 'Content-Type' header
            // to 'multipart/form-data' (or similar) and includes the boundary.
            // Do NOT manually set 'Content-Type': 'application/json'.
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: `HTTP error ${response.status} ${response.statusText}` }));
            throw new Error(`Failed to update asset in database: ${response.status} (${errorData.detail || 'Unknown error'})`);
        }

        const updatedAsset = await response.json();
        console.log("Asset updated successfully (via FormData):", updatedAsset); //
        
        // The background refresh on name change:
        // This was in your original code. If the main refresh (refreshAllInheritanceStatus)
        // is now reliable after this FormData fix, this background fetch might be redundant.
        // However, keeping it for now to match structure, unless you want it removed.
        if (data.name !== undefined && window.currentStylingId) { //
            console.log("Name changed - refreshing asset data in background (FormData flow)"); //
            apiFetch(`${API_BASE_URL}/brand-stylings/${window.currentStylingId}/assets-with-inheritance`) //
                .then(res => {
                    if (!res.ok) return Promise.reject(new Error(`Background refresh HTTP error ${res.status}`));
                    return res.json();
                })
                .then(assets => {
                    window.latestAssetData = assets; //
                    console.log("Asset data refreshed successfully in background (FormData flow)"); //
                })
                .catch(error => console.warn("Background asset refresh failed (FormData flow):", error)); //
        }
        return updatedAsset; //
    } catch (error) {
        console.error("Error updating asset (FormData flow):", error); //
        if (error.message && error.message.includes("404")) { //
            console.warn("Asset ID not found (FormData flow). Refreshing inheritance status..."); //
            if (window.inheritanceHandlers && typeof window.inheritanceHandlers.refreshAllInheritanceStatus === 'function') { //
                await window.inheritanceHandlers.refreshAllInheritanceStatus(); //
            }
        }
        throw error; // Re-throw for the calling function to handle if needed
    }
}

