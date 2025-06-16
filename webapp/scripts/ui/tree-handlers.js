// tree-handlers.js - Site tree click handling, search, and expanded state management

// Store the expanded state of tree nodes
const expandedNodes = new Set();

// Capture the IDs of currently expanded nodes
function captureExpandedState() {
    expandedNodes.clear();
    if (!siteTree) return;
    siteTree.querySelectorAll('.tree-item-container.expanded').forEach(item => {
        const targetId = item.querySelector('[data-toggle="collapse"]').getAttribute('data-target');
        if (targetId) {
            expandedNodes.add(targetId);
        }
    });
    console.log("Captured expanded state:", Array.from(expandedNodes));
}

// Restore the expanded state based on captured IDs
function restoreExpandedState() {
    if (!siteTree) return;
    console.log("Attempting to restore expanded state:", Array.from(expandedNodes));
    expandedNodes.forEach(targetId => {
        const targetElement = document.getElementById(targetId);
        // Find the tree-item div that toggles this target
        const toggleItem = siteTree.querySelector(`[data-target="${targetId}"]`);
        const container = toggleItem ? toggleItem.closest('.tree-item-container') : null;

        if (targetElement && container) {
            targetElement.classList.remove('hidden');
            container.classList.add('expanded');
            console.log(`Restored expansion for: ${targetId}`);
        } else {
             console.warn(`Could not find elements to restore expansion for target: ${targetId}`);
        }
    });
}

// Handle clicks on the site tree using event delegation
// REPLACE the entire handleSiteTreeClick function with this:

async function handleSiteTreeClick(event) {
    const target = event.target.closest('.tree-item');

    if (!target) return;

    // Handle collapsible toggles
    if (target.hasAttribute('data-toggle')) {
        const targetId = target.getAttribute('data-target');
        const targetElement = document.getElementById(targetId);
        const container = target.closest('.tree-item-container');

        if (targetElement && container) {
            const isHidden = targetElement.classList.contains('hidden');
            if (isHidden) {
                targetElement.classList.remove('hidden');
                container.classList.add('expanded');
                expandedNodes.add(targetId);
            } else {
                targetElement.classList.add('hidden');
                container.classList.remove('expanded');
                expandedNodes.delete(targetId);
            }
        }

        if (event.target.classList.contains('tree-toggle-icon') ||
            event.target.closest('.tree-toggle-icon')) {
            event.stopPropagation();
            return;
        }
    }
    
    // Handle site click
    if (target.hasAttribute('data-site-id')) {
        const siteId = target.getAttribute('data-site-id');
        currentSiteId = parseInt(siteId);
        loadSite(siteId);
    }
    // Handle brand styling or asset type click
    else if (target.hasAttribute('data-styling-id') && !target.hasAttribute('data-action')) {
        const stylingId = parseInt(target.getAttribute('data-styling-id'));
        const assetType = target.getAttribute('data-asset-type');

        // *** THIS IS THE FIX ***
        // Explicitly set the global styling ID to fix the stale state issue.
        window.currentStylingId = stylingId;

        const isAlreadyLoaded = (window.currentStylingId === stylingId);
        
        // Load the brand styling view
        loadBrandStyling(stylingId);

        // If a specific asset type (like 'colors') was clicked, trigger scrolling
        if (assetType) {
            const scrollDelay = isAlreadyLoaded ? 50 : 250;
            setTimeout(() => {
                scrollToAssetSection(assetType);
            }, scrollDelay);
        }
    }
    // Handle CSS URL click in tree (copy action)
    else if (target.hasAttribute('data-action') && target.getAttribute('data-action') === 'copy-css-url') {
        const cssUrl = target.getAttribute('data-css-url');
        if (cssUrl) {
            copyToClipboard(cssUrl);
            if (typeof showToast === 'function') {
                showToast('CSS URL copied to clipboard!', 'success');
            }
        }
    }
}

// Handle search input filtering of the tree
function handleSearch(event) {
    const searchTerm = event.target.value.toLowerCase();
     if (!siteTree) { // Assuming siteTree is global
         console.error("Site tree element not found, cannot perform search.");
         return;
     }

    const allTreeItems = siteTree.querySelectorAll('.tree-item-container, .tree-item[data-asset-type], .tree-item[data-action="copy-css-url"]');

    allTreeItems.forEach(item => {
        const textContent = (item.textContent || '').toLowerCase();
        const isContainer = item.classList.contains('tree-item-container');

        const shouldShow = textContent.includes(searchTerm);

        if (searchTerm === '') {
             item.style.display = 'list-item';
             if (isContainer) {
                 const subTree = item.querySelector('.sub-tree');
                 if(subTree) subTree.classList.add('hidden');
                 item.classList.remove('expanded');
             }
        } else {
             item.style.display = 'none';

             if (shouldShow) {
                 item.style.display = 'list-item';
                 let parent = item.parentElement;
                 while(parent && parent !== siteTree) {
                     const parentContainer = parent.closest('.tree-item-container');
                     if (parentContainer) {
                         parentContainer.style.display = 'list-item';
                         parentContainer.classList.add('expanded');
                         const parentSubTree = parentContainer.querySelector('.sub-tree');
                         if(parentSubTree) parentSubTree.classList.remove('hidden');
                     }
                     parent = parent.parentElement;
                 }
             }
        }
    });

     if (searchTerm === '') {
     } else {
         restoreExpandedState();
     }
}


/**
 * Scrolls the main content area to the specified asset section.
 * @param {string} assetType - The type of asset, e.g., 'colors', 'images'.
 */
function scrollToAssetSection(assetType) {
    // This maps the 'data-asset-type' from the tree to the actual container ID in the HTML
    const containerIdMap = {
        'colors': 'colors-container',
        'images': 'images-container',
        'fonts': 'typography-container',
        'dimensions': 'dimensions-container',
        'selector': 'selector-container',
        'css': 'selector-container'
    };

    const containerId = containerIdMap[assetType];
    if (!containerId) {
        console.warn(`No container ID mapped for asset type: ${assetType}`);
        return;
    }

    const sectionContainer = document.getElementById(containerId);
    // The main scrollable area is '.main-content'
    const mainContentArea = document.querySelector('.main-content');

    if (sectionContainer && mainContentArea) {
        // Calculate the position of the target section relative to the scrollable container's top
        const scrollTargetY = sectionContainer.offsetTop - mainContentArea.offsetTop;

        mainContentArea.scrollTo({
            top: scrollTargetY,
            behavior: 'smooth'
        });
    } else {
        console.warn(`Could not find element to scroll to: #${containerId}`);
    }
}

// addSiteNode is now in tree-operations.js
// updateSiteNode is now in tree-operations.js
// fetchStylingsAndAddToTree is now in tree-operations.js
// addBrandStylingNode is now in tree-operations.js
// updateBrandStylingNode is now in tree-operations.js
// removeNode is now in tree-operations.js (used by api.js delete functions)
// sortTreeItems is now in tree-operations.js