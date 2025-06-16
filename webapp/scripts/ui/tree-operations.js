// tree-operations.js - Corrected logic for site tree manipulation (WITH asset counts and removeSiteFromTree)

// Add a site to the tree, handles creation, appending, fetching stylings, and making name editable.
// This function is called by renderSiteTree in ui-renderings.js
function addSiteToTree(site, sortTree = true) {
    if (!site || !site.id) {
        console.error("Invalid site object provided to addSiteToTree");
        return;
    }

    if (!siteTree) { // Assuming siteTree is global from dom-elements.js
        console.error("Site tree element not found, cannot add site node.");
        return;
    }

    // Check if node already exists to prevent duplicates on partial updates
    const existingNode = document.getElementById(`site-${site.id}-container`);
    if (existingNode) {
        console.log(`Site node with ID site-${site.id}-container already exists. Updating.`);
        // If it exists, update it (handles name change and re-applying editable)
        updateSiteNode(site);
        // Also ensure its stylings are loaded/updated (which includes asset counts)
        fetchStylingsAndAddToTree(site.id); // Assuming fetchStylingsAndAddToTree is in this file
        return;
    }

    // Check for and remove the "No sites created yet" placeholder if it exists
    const noSitesPlaceholder = siteTree.querySelector('.tree-item.text-secondary');
    if (noSitesPlaceholder) {
        noSitesPlaceholder.remove();
        console.log("Removed 'No sites created yet' placeholder.");
    }

    // Create the site item element directly here
    const siteItem = document.createElement('li');
    siteItem.className = 'tree-item-container'; // Container for item and sub-list
    siteItem.id = `site-${site.id}-container`; // Add an ID for easy removal/update
    const siteNodeHTML = `
        <div class="tree-item" data-toggle="collapse" data-target="site-${site.id}" data-site-id="${site.id}">
            <i class="fas fa-chevron-right tree-toggle-icon site-toggle-icon"></i>
            <i class="fas fa-globe tree-item-icon"></i>
            <span class="tree-item-content" data-editable-listener-added="true">${site.name}</span>
        </div>
        <ul id="site-${site.id}" class="tree-list sub-tree hidden"></ul>
    `;
    siteItem.innerHTML = siteNodeHTML;

    // Append the new site item to the tree
    siteTree.appendChild(siteItem);

    // Make the newly added site name editable
    makeSiteNameEditable(siteItem, site.id); // Assuming makeSiteNameEditable is in this file

    // Fetch and add stylings for the new site (THIS INCLUDES FETCHING ASSET COUNTS)
    fetchStylingsAndAddToTree(site.id); // Assuming fetchStylingsAndAddToTree is in this file

    // Re-sort the top-level site items if needed (e.g., after adding)
    if (sortTree) {
        sortTreeItems(siteTree); // Assuming sortTreeItems is global
    }
}

// Update a site in the tree without triggering a full refresh
function updateSiteNode(site) {
    if (!site || !site.id) {
        console.error("Invalid site object provided to updateSiteNode");
        return;
    }

    const siteItemContainer = document.getElementById(`site-${site.id}-container`);
    if (siteItemContainer) {
        const siteNameElement = siteItemContainer.querySelector('.tree-item-content');
        if (siteNameElement) {
            siteNameElement.textContent = site.name;

            makeSiteNameEditable(siteItemContainer, site.id); // Re-apply editable listeners

            const parentList = siteItemContainer.parentElement;
            if (parentList) {
                sortTreeItems(parentList); // Assuming sortTreeItems is global
            }
        } else {
            console.warn(`Site name element not found for site ID: ${site.id}`);
        }
    } else {
        console.warn(`Site node with ID site-${site.id}-container not found for update.`);
        addSiteToTree(site); // If node doesn't exist, add it
    }
}

// Make site name element editable inline
function makeSiteNameEditable(siteElement, siteId) {
    const nameSpan = siteElement.querySelector('.tree-item-content');

    if (!nameSpan) {
        console.error("Site name span not found for editing.");
        return;
    }

    let originalName = nameSpan.textContent;

    if (!nameSpan.dataset.editableListenerAdded) {
         nameSpan.addEventListener('click', (event) => {
              event.preventDefault(); // Prevent default if it's a link or has other click behaviors
              if (!nameSpan.contentEditable || nameSpan.contentEditable === 'false') {
                  nameSpan.contentEditable = true;
                  nameSpan.focus();
                  originalName = nameSpan.textContent;

                  const range = document.createRange();
                  const selection = window.getSelection();
                  range.selectNodeContents(nameSpan);
                  selection.removeAllRanges();
                  selection.addRange(range);

                  nameSpan.classList.add('editing');
              }
         });
         nameSpan.dataset.editableListenerAdded = 'true';
    }

    if (nameSpan._blurHandler) {
        nameSpan.removeEventListener('blur', nameSpan._blurHandler);
    }
    if (nameSpan._keydownHandler) {
        nameSpan.removeEventListener('keydown', nameSpan._keydownHandler);
    }

     const newBlurHandler = async () => {
         if (nameSpan.contentEditable === 'true') {
             nameSpan.contentEditable = false;
             nameSpan.classList.remove('editing');

             const newName = nameSpan.textContent.trim();

             if (newName === '') {
                 nameSpan.textContent = originalName;
                 showToast('Site name cannot be empty.', 'warning'); // Assuming showToast is global
                 return;
             }

             if (newName !== originalName) {
                 console.log(`Saving site name for ID ${siteId}: "${newName}"`);
                 const updatedSite = await updateSite(siteId, { name: newName }); // Assuming updateSite is global in api.js

                 if (updatedSite) {
                     originalName = updatedSite.name;
                     // updateSite function in api.js should call updateSiteNode to update the tree if successful
                 } else {
                     // Revert to original name if API update fails
                     nameSpan.textContent = originalName;
                 }
             }
         }
     };
     nameSpan.addEventListener('blur', newBlurHandler);
     nameSpan._blurHandler = newBlurHandler;


     const newKeydownHandler = (event) => {
         if (event.key === 'Enter') {
             event.preventDefault(); // Prevent newline
             nameSpan.blur(); // Trigger blur to save
         }
     };
     nameSpan.addEventListener('keydown', newKeydownHandler);
     nameSpan._keydownHandler = newKeydownHandler;
}

// Fetch stylings for a site, INCLUDING asset counts, and dynamically update the tree.
// This is the function that needs to fetch asset data.
async function fetchStylingsAndAddToTree(siteId) {
    try {
        const response = await apiFetch(`${API_BASE_URL}/sites/${siteId}/brand-stylings/`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const stylings = await response.json();

        const stylingsList = document.getElementById(`site-${siteId}`);
        if (!stylingsList) {
            console.error(`Stylings list element for site ${siteId} not found.`);
            return;
        }

        // Clear existing nodes
        const siteContainer = document.getElementById(`site-${siteId}-container`);
        if (siteContainer) {
            const itemsToClear = siteContainer.querySelectorAll(
                '.tree-item-container[id^="styling-"], ' +
                '.tree-item[data-asset-type], ' +
                '.tree-item[data-action], ' +
                '.tree-item.text-secondary, ' +
                '.tree-item.text-danger'
            );
            itemsToClear.forEach(item => item.remove());
            Array.from(stylingsList.children).forEach(child => child.remove());
        } else {
            Array.from(stylingsList.children)
                .filter(child =>
                    child.classList.contains('tree-item-container') ||
                    (child.classList.contains('tree-item') && (child.hasAttribute('data-asset-type') || child.hasAttribute('data-action'))) ||
                    child.classList.contains('text-secondary') || child.classList.contains('text-danger')
                )
                .forEach(child => child.remove());
        }

        // Create mapping for inheritance display
        const stylingNameMap = new Map(stylings.map(s => [s.id, s.name]));

        // Separate master brands and sub-brands
        const masterBrands = stylings.filter(s => !s.master_brand_id);
        const subBrands = stylings.filter(s => s.master_brand_id);

        // Add master brands first
        masterBrands.forEach(styling => {
            addBrandStylingNode(siteId, styling, stylingNameMap, null, false);
        });

        // Then add sub-brands
        subBrands.forEach(styling => {
            addBrandStylingNode(siteId, styling, stylingNameMap, null, false);
        });

        // Sort the main site styling list
        sortTreeItems(stylingsList);

        // Update asset counts for all stylings
        stylings.forEach(styling => {
            updateAssetCounts(styling.id);
        });

        // Add "No brand stylings" placeholder if empty
        const remainingItems = Array.from(stylingsList.children).filter(item =>
            item.classList.contains('tree-item-container') ||
            (item.classList.contains('tree-item') && !item.classList.contains('text-secondary') && !item.classList.contains('text-danger'))
        );

        if (remainingItems.length === 0) {
            const emptyItem = document.createElement('li');
            emptyItem.className = 'tree-item text-secondary';
            emptyItem.textContent = 'No brand stylings';
            stylingsList.appendChild(emptyItem);
        }

    } catch (error) {
        console.error(`Error loading brand stylings for site ${siteId}:`, error);
        showToast(`Failed to load stylings for site ${siteId}`, 'error');
        
        const stylingsList = document.getElementById(`site-${siteId}`);
        if (stylingsList && stylingsList.children.length === 0) {
            const errorItem = document.createElement('li');
            errorItem.className = 'tree-item text-danger';
            errorItem.textContent = 'Error loading stylings';
            stylingsList.appendChild(errorItem);
        }
    }
}

// Add this function to tree-operations.js
// MODIFY THIS FUNCTION in tree-operations.js

// MODIFY THIS FUNCTION in tree-operations.js

// In tree-operations.js
// REPLACE your existing updateAssetCounts function with this:

// In tree-operations.js
// MODIFY your updateAssetCounts function

async function updateAssetCounts(stylingId) {
    // Added a small delay to allow DOM to settle from any prior manipulation
    await new Promise(resolve => setTimeout(resolve, 50)); // 50ms delay
    console.log("Starting count ..")

    try {
        const colorsValueSpan = document.querySelector(`#value-colors-${stylingId}`);
        const imagesValueSpan = document.querySelector(`#value-images-${stylingId}`);
        const fontsValueSpan = document.querySelector(`#value-fonts-${stylingId}`);
        const selectorValueSpan = document.querySelector(`#value-selector-${stylingId}`);
        const dimensionsValueSpan = document.querySelector(`#value-dimensions-${stylingId}`);
        const ValueSpan = document.querySelector(`#value-selector-${stylingId}`);

        if (!selectorValueSpan && !colorsValueSpan && !imagesValueSpan && !fontsValueSpan && !dimensionsValueSpan) {
            return;
        }
        
        const response = await apiFetch(`${API_BASE_URL}/brand-stylings/${stylingId}/assets/`, {
            cache: 'no-store'
        });

        if (!response.ok) {
            console.warn(`[updateAssetCounts] Failed to fetch assets for styling ${stylingId} (status: ${response.status})`);
            return;
        }
        
        const assets = await response.json();
        
        const groupedAssetsCounts = {
            color: 0, image: 0, font: 0, dimension: 0, class_rule: 0, other: 0
        };
        
        assets.forEach(asset => {
            const assetType = asset.type ? asset.type.toLowerCase() : 'other';
            if (assetType === 'typography') {
                groupedAssetsCounts.font++;
            } else if (groupedAssetsCounts.hasOwnProperty(assetType)) {
                groupedAssetsCounts[assetType]++;
            } else {
                groupedAssetsCounts.other++;
            }
        });
        
        console.log(`[updateAssetCounts] StylingID: ${stylingId}, Fetched ${assets.length} assets. Class rule count: ${groupedAssetsCounts.class_rule}`);

        if (colorsValueSpan) colorsValueSpan.textContent = groupedAssetsCounts.color > 0 ? groupedAssetsCounts.color : '';
        if (imagesValueSpan) imagesValueSpan.textContent = groupedAssetsCounts.image > 0 ? groupedAssetsCounts.image : '';
        if (fontsValueSpan) fontsValueSpan.textContent = groupedAssetsCounts.font > 0 ? groupedAssetsCounts.font : '';
        if (dimensionsValueSpan) dimensionsValueSpan.textContent = groupedAssetsCounts.dimension > 0 ? groupedAssetsCounts.dimension : '';
        
        if (ValueSpan) {
            const currentDisplayCount = selectorValueSpan.textContent;
            const newCalculatedCount = groupedAssetsCounts.class_rule > 0 ? groupedAssetsCounts.class_rule.toString() : '';
            if (currentDisplayCount !== newCalculatedCount) {
                selectorValueSpan.textContent = newCalculatedCount;
                console.log(`[updateAssetCounts] StylingID: ${stylingId}, Selectors count CHANGED from '${currentDisplayCount}' to: '${newCalculatedCount}'`);
            } else {
                console.log(`[updateAssetCounts] StylingID: ${stylingId}, Selectors count REMAINS: '${newCalculatedCount}'`);
            }
        }
        
    } catch (error) {
        console.error(`[updateAssetCounts] Error updating asset counts for styling ${stylingId}:`, error);
    }
}

// Add a single brand styling node to the tree, handles placement and asset counts.
function addBrandStylingNode(siteId, styling, stylingNameMap, stylingAssetsMap, sortParent = true) { // Added stylingAssetsMap
    const isSubBrand = styling.master_brand_id != null;
    let parentList; // The UL element where this styling node will be appended

    // Determine the correct parent list based on inheritance
    if (isSubBrand) {
        // If it's a sub-brand, its parent list is the sub-tree UL of its master brand
        const masterBrandContainer = document.getElementById(`styling-${styling.master_brand_id}-container`);
         if (masterBrandContainer) {
              parentList = masterBrandContainer.querySelector('.sub-tree');
         }

        if (!parentList) {
            console.warn(`Master brand sub-tree UL with ID brand-${styling.master_brand_id} not found for sub-brand ${styling.id}. Adding to site list as fallback.`);
             parentList = document.getElementById(`site-${siteId}`); // Fallback to site list
        }
    } else {
        // If it's a master brand, its parent list is the main stylingsList UL for the site
        parentList = document.getElementById(`site-${siteId}`);
    }

    // Ensure a valid parent list element was found
    if (!parentList) {
        console.error(`Parent list element for styling ${styling.id} not found, cannot add styling node.`);
        return;
    }

    // Check if a node for this styling already exists to avoid duplicates
     if (document.getElementById(`styling-${styling.id}-container`)) {
        console.log(`Styling node with ID styling-${styling.id}-container already exists. Skipping add.`);
        // If it exists, call update instead of adding a duplicate
         updateBrandStylingNode(styling, stylingNameMap, stylingAssetsMap); // Call update, pass asset map
         return;
     }

    // Create the main list item container for the styling node
    const stylingItem = document.createElement('li');
    stylingItem.className = 'tree-item-container'; // Container for the main item and its sub-list (assets/sub-brands)
    stylingItem.id = `styling-${styling.id}-container`; // Add an ID for easy reference, removal, and updating

    // Add inheritance info to the display text if it's a sub-brand
    let inheritanceInfo = '';
    if (isSubBrand && stylingNameMap.has(styling.master_brand_id)) {
        inheritanceInfo = ` <span class="text-secondary">(${stylingNameMap.get(styling.master_brand_id)})</span>`;
    }

    // --- Populate Asset Counts ---
    // Get assets for this styling from the map (fetched in fetchStylingsAndAddToTree).
    // Use empty array if stylingAssetsMap or the entry for this styling is missing.
    const assetsForStyling = stylingAssetsMap ? (stylingAssetsMap.get(styling.id) || []) : [];
    const groupedAssets = { // Group assets by type
        color: [],
        image: [],
        font: [], // Assuming 'font' is the type key for typography assets
        dimension: [],
        css: [], // Include CSS if it's treated as an asset type with its own count
        other: []
    };

    // Iterate through the assets and group them by type
     assetsForStyling.forEach(asset => {
         const assetType = asset.type ? asset.type.toLowerCase() : 'other';
         if (groupedAssets[assetType]) {
             groupedAssets[assetType].push(asset);
         } else {
             groupedAssets.other.push(asset);
         }
     });

    // Get counts for each type
    const colorsCount = groupedAssets.color.length;
    const imagesCount = groupedAssets.image.length;
    const fontsCount = groupedAssets.font.length;
    const dimensionsCount = groupedAssets.dimension.length;
    const cssCount = groupedAssets.css.length; // Count assets with type 'css' if any


    // Set the inner HTML for the styling item, including asset type list items with counts
 stylingItem.innerHTML = `
    <div class="tree-item ${isSubBrand ? 'sub-brand-item' : ''}"
            data-toggle="collapse"
            data-target="brand-${styling.id}"
            data-styling-id="${styling.id}"
            ${isSubBrand ? `data-inherits-from="${styling.master_brand_id}"` : ''}>
        <i class="fas fa-chevron-right tree-toggle-icon"></i>
        
        <i class="tree-item-icon"></i> 
        
        <span class="tree-item-content">${styling.name}${inheritanceInfo}</span>
    </div>
    <ul id="brand-${styling.id}" class="tree-list sub-tree hidden">
        <li class="tree-item" data-styling-id="${styling.id}" data-asset-type="colors">
            <div class="tree-item-row">
                <span class="tree-label">
                    <i class="tree-item-icon"></i>
                    Colors
                </span>
                <span class="tree-item-value" id="value-colors-${styling.id}">${colorsCount > 0 ? colorsCount : ''}</span>
            </div>
        </li>
        <li class="tree-item" data-styling-id="${styling.id}" data-asset-type="images">
            <div class="tree-item-row">
                <span class="tree-label">
                    <i class="tree-item-icon"></i>
                    Images
                </span>
                <span class="tree-item-value" id="value-images-${styling.id}">${imagesCount > 0 ? imagesCount : ''}</span>
            </div>
        </li>
        <li class="tree-item" data-styling-id="${styling.id}" data-asset-type="fonts">
            <div class="tree-item-row">
                <span class="tree-label">
                    <i class="tree-item-icon"></i>
                    Typography
                </span>
                <span class="tree-item-value" id="value-fonts-${styling.id}">${fontsCount > 0 ? fontsCount : ''}</span>
            </div>
        </li>
        <li class="tree-item" data-styling-id="${styling.id}" data-asset-type="dimensions">
            <div class="tree-item-row">
                <span class="tree-label">
                    <i class="tree-item-icon"></i>
                    Dimensions
                </span>
                <span class="tree-item-value" id="value-dimensions-${styling.id}">${dimensionsCount > 0 ? dimensionsCount : ''}</span>
            </div>
        </li>
        <li class="tree-item" data-styling-id="${styling.id}" data-asset-type="selector"> 
             <div class="tree-item-row">
                 <span class="tree-label">
                    <i class="tree-item-icon"></i>
                     Selectors
                 </span>
                 <span class="tree-item-value" id="value-selector-${styling.id}">${cssCount > 0 ? cssCount : ''}</span>
             </div>
         </li>
         <li class="tree-item" data-styling-id="${styling.id}" data-asset-type="css">
             <div class="tree-item-row">
                 <span class="tree-label">
                    <i class="tree-item-icon" id="css-editor-icon"></i>
                     CSS Editor
                 </span>
                 <span class="tree-item-value" id="value-css-${styling.id}">${cssCount > 0 ? '✓' : ''}</span>
             </div>
         </li>
        <li class="tree-item" data-styling-id="${styling.id}" data-action="copy-css-url" data-css-url="${API_BASE_URL}/brand/${styling.id}/css">
            <div class="tree-item-row">
                <span class="tree-label">
                    <i class="tree-item-icon" id="css-url-icon"></i>
                    CSS URL
                </span>
                <span class="tree-item-value" id="value-css-url-${styling.id}"></span>
            </div>
        </li>
    </ul>
`;
    // --- END Populate Asset Counts ---


    // Append the new styling item to the determined parent list
    parentList.appendChild(stylingItem);


    // Re-sort the parent list if requested (true by default when called from fetchStylingsAndAddToTree)
    if (sortParent) {
         sortTreeItems(parentList); // Assuming sortTreeItems is global
    }

     // Ensure the master brand's sub-list is visible if a sub-brand is added to it, and expand the master node
     if (isSubBrand) {
          const masterBrandUl = document.getElementById(`brand-${styling.master_brand_id}`);
          if(masterBrandUl) {
              masterBrandUl.classList.remove('hidden');
              const masterBrandToggle = masterBrandUl.previousElementSibling; // The tree-item div of the master
              if(masterBrandToggle && masterBrandToggle.classList.contains('tree-item') && masterBrandToggle.hasAttribute('data-toggle')) {
                  const masterBrandContainer = masterBrandToggle.closest('.tree-item-container'); // The container of the master
                  if(masterBrandContainer) {
                       masterBrandContainer.classList.add('expanded');
                  }
              }
          }
     }
}

// Dynamically update a single brand styling node in the tree
function updateBrandStylingNode(styling, stylingNameMap, stylingAssetsMap) { // Added stylingAssetsMap
    const stylingItemContainer = document.getElementById(`styling-${styling.id}-container`);
    if (stylingItemContainer) {
        const stylingNameElement = stylingItemContainer.querySelector('.tree-item-content');
        const stylingItemDiv = stylingItemContainer.querySelector('.tree-item');

        if (stylingNameElement && stylingItemDiv) {
            // Update the display name (handles name changes and inheritance info)
            const isSubBrand = styling.master_brand_id != null;
            let inheritanceInfo = '';
            // Use the provided map or build one from DOM if not available
            const currentStylingNameMap = stylingNameMap || buildStylingNameMapFromDOM();
            if (isSubBrand && currentStylingNameMap.has(styling.master_brand_id)) {
                inheritanceInfo = ` <span class="text-secondary">(${currentStylingNameMap.get(styling.master_brand_id)})</span>`;
            }
            stylingNameElement.innerHTML = `${styling.name}${inheritanceInfo}`; // Use innerHTML to include the span


            // Update the sub-brand class and data attribute on the tree-item div
            if (isSubBrand) {
                stylingItemDiv.classList.add('sub-brand-item');
                stylingItemDiv.setAttribute('data-inherits-from', styling.master_brand_id);
            } else {
                stylingItemDiv.classList.remove('sub-brand-item');
                stylingItemDiv.removeAttribute('data-inherits-from');
            }


            // --- Update Asset Counts in existing node ---
            // Only update counts if stylingAssetsMap is provided (it should be when called from fetchStylingsAndAddToTree)
            if (stylingAssetsMap) {
                 const assetsForStyling = stylingAssetsMap.get(styling.id) || []; // Get assets for this styling
                 const groupedAssets = {
                     color: [], image: [], font: [], dimension: [], selector: [], css: [], other: []
                 };
                  assetsForStyling.forEach(asset => {
                      const assetType = asset.type ? asset.type.toLowerCase() : 'other';
                      if (groupedAssets[assetType]) groupedAssets[assetType].push(asset);
                      else groupedAssets.other.push(asset);
                  });

                 const colorsCount = groupedAssets.color.length;
                 const imagesCount = groupedAssets.image.length;
                 const fontsCount = groupedAssets.font.length;
                 const dimensionsCount = groupedAssets.dimension.length;
                 const selectorCount = groupedAssets.selector.length;
                 const cssCount = groupedAssets.css.length; 

                 // Find the span elements by their IDs and update their text content
                 const colorsValueSpan = stylingItemContainer.querySelector('#value-colors-' + styling.id);
                 if(colorsValueSpan) colorsValueSpan.textContent = colorsCount > 0 ? colorsCount : '';
                 const imagesValueSpan = stylingItemContainer.querySelector('#value-images-' + styling.id);
                 if(imagesValueSpan) imagesValueSpan.textContent = imagesCount > 0 ? imagesCount : '';
                 const fontsValueSpan = stylingItemContainer.querySelector('#value-fonts-' + styling.id);
                 if(fontsValueSpan) fontsValueSpan.textContent = fontsCount > 0 ? fontsCount : '';
                 const dimensionsValueSpan = stylingItemContainer.querySelector('#value-dimensions-' + styling.id);
                 if(dimensionsValueSpan) dimensionsValueSpan.textContent = dimensionsCount > 0 ? dimensionsCount : '';
                 const selectorValueSpan = stylingItemContainer.querySelector('#value-selector-' + styling.id);
                 if(selectorValueSpan) selectorValueSpan.textContent = selectorCount > 0 ? selectorCount : '';
                  const cssValueSpan = stylingItemContainer.querySelector('#value-css-' + styling.id);
                  if(cssValueSpan) cssValueSpan.textContent = cssCount > 0 ? '✓' : '';

            }
            // --- End Update Asset Counts ---


            // Handle moving the node if inheritance changed (parent list is different)
            const currentParentList = stylingItemContainer.parentElement;
            const currentParentListId = currentParentList ? currentParentList.id : null;
            const expectedParentListId = isSubBrand ? `brand-${styling.master_brand_id}` : `site-${styling.site_id}`;
            const expectedParentList = document.getElementById(expectedParentListId);


            if (currentParentList && expectedParentList && currentParentListId !== expectedParentListId) {
                 console.log(`Moving styling node ${styling.id} from ${currentParentListId} to ${expectedParentListId}`);
                 // Remove the node from its current parent list
                 stylingItemContainer.remove();

                 // Add the node to its new parent list (using the add function which handles placement logic)
                 // Pass the asset map along during the re-add
                 addBrandStylingNode(styling.site_id, styling, stylingNameMap, stylingAssetsMap, false); // Add without immediate sorting

                  // Sort both the old and the new parent lists to maintain order
                 if (currentParentList) sortTreeItems(currentParentList); // Sort the list it was removed from
                 sortTreeItems(expectedParentList); // Sort the list it was added to


                  // If the old parent list is now empty and was a sub-tree, add the "No brand stylings" placeholder
                  // (Relevant when a sub-brand is moved out of a master brand's sub-tree)
                 if (currentParentList && currentParentList.classList.contains('sub-tree') && currentParentList.children.length === 0) {
                     const emptyItem = document.createElement('li');
                     emptyItem.className = 'tree-item text-secondary';
                     emptyItem.textContent = 'No brand stylings';
                     currentParentList.appendChild(emptyItem);
                 }

                 // If the new parent list is a sub-tree and it was previously hidden, make it visible and expand the master
                 if (isSubBrand) {
                     const masterBrandUl = document.getElementById(`brand-${styling.master_brand_id}`);
                     if(masterBrandUl) {
                         masterBrandUl.classList.remove('hidden'); // Ensure the master's sub-list is visible
                         const masterBrandToggle = masterBrandUl.previousElementSibling; // The master brand's tree-item div
                         if(masterBrandToggle && masterBrandToggle.classList.contains('tree-item') && masterBrandToggle.hasAttribute('data-toggle')) {
                             const masterBrandContainer = masterBrandToggle.closest('.tree-item-container'); // The container of the master
                             if(masterBrandContainer) {
                                  masterBrandContainer.classList.add('expanded'); // Expand the master brand node
                             }
                         }
                     }
                 }


            } else if (stylingItemContainer.parentElement) {
                 // If the parent didn't change, just re-sort the current parent list to maintain order
                 sortTreeItems(stylingItemContainer.parentElement);
            }
        } else {
             console.warn(`Styling name element (.tree-item-content) or tree-item div not found for styling ID: ${styling.id}`);
        }
    } else {
        console.warn(`Styling node container with ID styling-${styling.id}-container not found for update.`);
        // Fallback: If the node wasn't found for update, trigger a full reload of the site's stylings
        // This will refetch everything and rebuild the tree for that site, including asset counts.
        fetchStylingsAndAddToTree(styling.site_id);
    }
}

// Dynamically remove a node from the tree by its container ID (e.g., site or styling)
// This function is called internally by removeSiteFromTree and removeBrandStylingFromTree
function removeNode(nodeContainerId) {
    const nodeToRemove = document.getElementById(nodeContainerId);
    if (nodeToRemove) {
        const parentList = nodeToRemove.parentElement;
        console.log(`Removing node: ${nodeContainerId}`);
        nodeToRemove.remove();

        // Check if the parent list is now empty and add a placeholder if needed
        if (parentList && parentList.classList.contains('sub-tree') && parentList.children.length === 0) {
            const emptyItem = document.createElement('li');
            emptyItem.className = 'tree-item text-secondary';
            emptyItem.textContent = 'No brand stylings';
            parentList.appendChild(emptyItem);
        }
         // If the parent list is the main siteTree and is now empty, add the "No sites" placeholder
         else if (parentList === siteTree && parentList.children.length === 0) { // Assuming siteTree is global from dom-elements.js
             const emptyItem = document.createElement('li');
             emptyItem.className = 'tree-item text-secondary';
             emptyItem.textContent = 'No sites created yet.';
             siteTree.appendChild(emptyItem);
         }

    } else {
        console.warn(`Node with ID ${nodeContainerId} not found for removal.`);
    }
}


// This function is specifically for removing a site node from the tree.
// It calls the generic removeNode function with the correct site container ID.
// This function is created to fulfill the user's explicit request and resolve the "not defined" error
// without modifying the api.js file where it is called.
function removeSiteFromTree(siteId) {
    const siteNodeId = `site-${siteId}-container`;
    // Call the existing generic remove function to perform the actual DOM removal
    removeNode(siteNodeId);
}

// Helper function to sort tree items alphabetically by text content
// with special handling for item types within sub-trees.
function sortTreeItems(listElement) {
    if (!listElement) return;

    // Filter out placeholder items (like "No sites" or "Error loading") before sorting
    const items = Array.from(listElement.children).filter(item =>
        item.classList.contains('tree-item-container') || // Site or Styling containers
        (item.classList.contains('tree-item') && !item.classList.contains('text-secondary') && !item.classList.contains('text-danger')) // Asset type or action items
    );

    // Separate placeholder items (like "No sites created yet" or "No brand stylings")
    const placeholderItems = Array.from(listElement.children).filter(item =>
         item.classList.contains('text-secondary') || item.classList.contains('text-danger')
    );


    // Custom sorting logic
     if (listElement.classList.contains('sub-tree')) {
          // For master brand sub-trees, sort asset items before brand styling containers (sub-brands),
          // and sort alphabetically within those groups.
          items.sort((a, b) => {
              const isAssetA = a.classList.contains('tree-item') && (a.hasAttribute('data-asset-type') || a.hasAttribute('data-action'));
              const isAssetB = b.classList.contains('tree-item') && (b.hasAttribute('data-asset-type') || b.hasAttribute('data-action'));

              // Asset items always come before brand styling containers (sub-brands) in a sub-tree
              if (isAssetA && !isAssetB) return -1;
              if (!isAssetA && isAssetB) return 1;

              // If both are the same type (both assets or both sub-brands), sort alphabetically by name/label
              const textAElement = a.querySelector('.tree-item-content') || a.querySelector('.tree-label');
              const textBElement = b.querySelector('.tree-item-content') || b.querySelector('.tree-label');

              let textA = '';
              if (textAElement) {
                  // Remove inheritance info in parentheses for sorting if present
                  textA = textAElement.textContent.replace(/\s+\(.+?\)$/, '').toLowerCase();
              } else {
                  textA = a.textContent.toLowerCase(); // Fallback for items without a specific text element
              }

              let textB = '';
               if (textBElement) {
                   // Remove inheritance info in parentheses for sorting if present
                  textB = textBElement.textContent.replace(/\s+\(.+?\)$/, '').toLowerCase();
              } else {
                  textB = b.textContent.toLowerCase(); // Fallback
               }

              return textA.localeCompare(textB); // Perform alphabetical comparison
          });

          // Re-append sorted items to the list (clearing first is often simpler, but appendChild reorders)
          listElement.innerHTML = ''; // Clear existing children
          items.forEach(item => listElement.appendChild(item)); // Append sorted items

     } else {
         // Default alphabetical sort for non-sub-trees (like the main siteTree list or a site's main stylingsList)
         items.sort((a, b) => {
             const textAElement = a.querySelector('.tree-item-content') || a.querySelector('.tree-label');
             const textBElement = b.querySelector('.tree-item-content') || b.querySelector('.tree-label');

             let textA = '';
             if (textAElement) {
                  // Remove inheritance info in parentheses for sorting if present
                 textA = textAElement.textContent.replace(/\s+\(.+?\)$/, '').toLowerCase();
             } else {
                 textA = a.textContent.toLowerCase(); // Fallback
             }

             let textB = '';
              if (textBElement) {
                   // Remove inheritance info in parentheses for sorting if present
                 textB = textBElement.textContent.replace(/\s+\(.+?\)$/, '').toLowerCase();
             } else {
                 textB = b.textContent.toLowerCase(); // Fallback
             }

             return textA.localeCompare(textB); // Perform alphabetical comparison
         });

          // Re-append sorted items to the list
          listElement.innerHTML = ''; // Clear existing children
          items.forEach(item => listElement.appendChild(item)); // Append sorted items
     }

    // Append placeholder items back at the end
    placeholderItems.forEach(item => listElement.appendChild(item));
}

// Helper function to build a map of styling IDs to names from the current DOM.
function buildStylingNameMapFromDOM() {
    const map = new Map();
    document.querySelectorAll('#site-tree .tree-item-container[id^="styling-"] .tree-item-content').forEach(span => {
         const stylingItemDiv = span.closest('.tree-item');
         if(stylingItemDiv) {
              const stylingId = stylingItemDiv.dataset.stylingId;
              const stylingName = span.textContent.replace(/\s+\(.+?\)$/, '');
              if(stylingId) {
                   map.set(parseInt(stylingId, 10), stylingName);
               }
         }
    });
    return map;
}


// Helper function to build a map of styling IDs to names from the current DOM.
function buildStylingNameMapFromDOM() {
    const map = new Map();
    document.querySelectorAll('#site-tree .tree-item-container[id^="styling-"] .tree-item-content').forEach(span => {
         const stylingItemDiv = span.closest('.tree-item');
         if(stylingItemDiv) {
              const stylingId = stylingItemDiv.dataset.stylingId;
              const stylingName = span.textContent.replace(/\s+\(.+?\)$/, '');
              if(stylingId) {
                   map.set(parseInt(stylingId, 10), stylingName);
               }
         }
    });
    return map;
}
