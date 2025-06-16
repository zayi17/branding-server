// dom-elements.js - DOM element declarations and assignments

// Declare DOM elements variables at the top, but assign them inside loadDomElements
let siteTree;
let searchInput;
let refreshBtn;
let newSiteBtn;

let welcomeScreen;
let siteView;
let brandStylingView;
let cssView; // Keep the reference to the container

let stylingCssUrlCode;
let copyStylingCssUrlBtn;

let modalBackdrop;
let newSiteModal;
let editSiteModal;
let newBrandStylingModal;
let editBrandStylingModal;
let newAssetModal;
let editAssetModal;

let newSiteForm;
let editSiteForm;
let newBrandStylingForm;
let editBrandStylingForm;
let newAssetForm;
let editAssetForm;

let newAssetTypeSelect;
let newColorFields;
let newImageFields;
let newGenericFields;

let editAssetTypeDisplay;
let editColorFields;
let editImageFields;
let editGenericFields;

const colorsContainer = document.getElementById('colors-container');
const typographyContainer = document.getElementById('typography-container');
const dimensionsContainer = document.getElementById('dimensions-container');
const selectorContainer = document.getElementById('selector-container');
const cssOutput = document.getElementById('css-output');
const copyCssBtn = document.getElementById('copy-css');
const toggleThemeBtn = document.getElementById('toggle-theme');

// Modal Elements
const addGroupModal = document.querySelector('.modal-backdrop#add-group-modal');
const modalTitle = document.getElementById('modal-title');
const groupNameInput = document.getElementById('group-name');
const saveGroupBtn = document.getElementById('save-group');
const cancelModalBtn = document.getElementById('cancel-modal');

const addVariableModal = document.getElementById('add-variable-modal');
const variableNameInput = document.getElementById('variable-name');
const valueContainer = document.getElementById('value-container');
const variableImportantCheckbox = document.getElementById('variable-important');
const saveVariableBtn = document.getElementById('save-variable');
const cancelVariableModalBtn = document.getElementById('cancel-variable-modal');

const addVariantModal = document.getElementById('add-variant-modal');
const variantBreakpointSelect = document.getElementById('variant-breakpoint');
const variantValueContainer = document.getElementById('variant-value-container');
const variantImportantCheckbox = document.getElementById('variant-important');
const saveVariantBtn = document.getElementById('save-variant');
const cancelVariantModalBtn = document.getElementById('cancel-variant-modal');
const imagesContainer = document.getElementById('images-container');
const otherContainer = document.getElementById('other-container');

// buttons
const editDescriptionBtn = document.getElementById('edit-description-btn');



modalOpen = false;



// Assign DOM elements, guaranteeing they exist
function loadDomElements() {
    // Assign DOM elements here, guaranteeing they exist
    siteTree = document.getElementById('site-tree');
    searchInput = document.getElementById('search-input');
    refreshBtn = document.getElementById('refresh-btn');
    newSiteBtn = document.getElementById('new-site-btn');

    welcomeScreen = document.getElementById('welcome-screen');
    siteView = document.getElementById('site-view');
    brandStylingView = document.getElementById('brand-styling-view');
    cssView = document.getElementById('css-view');

    stylingCssUrlCode = document.getElementById('styling-css-url');
    copyStylingCssUrlBtn = document.getElementById('copy-styling-css-url-btn');

    modalBackdrop = document.getElementById('modal-backdrop');
    newSiteModal = document.getElementById('new-site-modal');
    editSiteModal = document.getElementById('edit-site-modal');
    newBrandStylingModal = document.getElementById('new-brand-styling-modal');
    editBrandStylingModal = document.getElementById('edit-brand-styling-modal');
    newAssetModal = document.getElementById('new-asset-modal');
    editAssetModal = document.getElementById('edit-asset-modal');


    newSiteForm = document.getElementById('new-site-form');
    editSiteForm = document.getElementById('edit-site-form');
    newBrandStylingForm = document.getElementById('new-brand-styling-form');
    editBrandStylingForm = document.getElementById('edit-brand-styling-form');
    newAssetForm = document.getElementById('new-asset-form');
    editAssetForm = document.getElementById('edit-asset-form');

    newAssetTypeSelect = document.getElementById('asset-type-select');
    newColorFields = document.getElementById('color-fields');
    newImageFields = document.getElementById('image-fields');
    newGenericFields = document.getElementById('generic-fields');

    editAssetTypeDisplay = document.getElementById('edit-asset-type-display');
    editColorFields = document.getElementById('edit-color-fields');
    editImageFields = document.getElementById('edit-image-fields');
    editGenericFields = document.getElementById('edit-generic-fields');

}





// Set up all event listeners for the application
function setupEventListeners() {
    if (refreshBtn) refreshBtn.addEventListener('click', loadSites);
    if (newSiteBtn) newSiteBtn.addEventListener('click', () => showModal(newSiteModal));

    // Site tree click handlers
    if (siteTree) siteTree.addEventListener('click', handleSiteTreeClick);

    // Search functionality
    if (searchInput) searchInput.addEventListener('input', handleSearch);

    // Modal close buttons (use event delegation on modalBackdrop)
    if (modalBackdrop) {
        modalBackdrop.addEventListener('click', (event) => {
            // Check if the clicked element is the backdrop itself or a button with class 'close-modal'
            if (event.target === modalBackdrop || event.target.closest('.close-modal')) {
                 hideModal();
            }
        });
    }

    // Form submissions
    //if (newSiteForm) newSiteForm.addEventListener('submit', handleNewSiteSubmit);
    //if (editSiteForm) editSiteForm.addEventListener('submit', handleEditSiteSubmit);
    //if (newBrandStylingForm) newBrandStylingForm.addEventListener('submit', handleNewBrandStylingSubmit);
    if (editBrandStylingForm) editBrandStylingForm.addEventListener('submit', handleEditBrandStylingSubmit);
    //if (newAssetForm) newAssetForm.addEventListener('submit', handleNewAssetSubmit);
    //if (editAssetForm) editAssetForm.addEventListener('submit', handleEditAssetSubmit);

    if (newSiteForm) {
        const submitBtn = newSiteForm.querySelector('.btn.primary-btn');
        if (submitBtn) submitBtn.addEventListener('click', function(e) {
            e.preventDefault();
            handleNewSiteSubmit(e);
        });
    }

    if (editSiteForm) {
        editSiteForm.addEventListener('submit', function(e) {
          e.preventDefault();
          return false;
        });
      }
      
      const editSiteSaveBtn = document.getElementById('edit-site-save-btn');
      if (editSiteSaveBtn) {
        editSiteSaveBtn.addEventListener('click', handleEditSiteSubmit);
      }
      
    // Brand styling form submission listener
    if (newBrandStylingForm) {
        newBrandStylingForm.addEventListener('submit', function(event) {
            handleNewBrandStylingSubmit(event);
        });
    } else {
        console.warn("newBrandStylingForm element NOT found. Submit listener NOT added."); // ADD THIS LOG
    }

    // Content view buttons (check if element exists before adding listener)
    const addBrandStylingBtn = document.getElementById('add-brand-styling-btn');
    if (addBrandStylingBtn) {
        addBrandStylingBtn.addEventListener('click', () => {
            // Store site ID in the form data
            if (document.getElementById('new-brand-styling-site-id')) {
                document.getElementById('new-brand-styling-site-id').value = currentSiteId;
            }
            showModal(newBrandStylingModal);
        });
    }



    // Edit Site button
    const editSiteBtn = document.getElementById('edit-site-btn');
    if (editSiteBtn)            editSiteBtn.addEventListener('click', handleEditSiteClick);

    // Delete Site button
    const deleteSiteBtn = document.getElementById('delete-site-btn');
    if (deleteSiteBtn)          deleteSiteBtn.addEventListener('click', handleDeleteSiteClick);

    const exportBtn = document.getElementById('export-btn');
    if (exportBtn)              exportBtn.addEventListener('click', handleExport);

   // const viewDocsBtn = document.getElementById('view-docs-btn'); // Get reference to View Docs button
   // if (viewDocsBtn) viewDocsBtn.addEventListener('click', handleViewDocs);

    const editBrandStylingBtn = document.getElementById('edit-brand-styling-btn');
    if (editBrandStylingBtn)   editBrandStylingBtn.addEventListener('click', handleEditBrandStylingClick);

    const deleteBrandStylingBtn = document.getElementById('delete-brand-styling-btn');
    if (deleteBrandStylingBtn) deleteBrandStylingBtn.addEventListener('click', handleDeleteBrandStylingClick);

    // Add event listener for description edit button
    if (editDescriptionBtn)    editDescriptionBtn.addEventListener('click', handleEditBrandStylingClick);
    


    const addAssetBtn = document.getElementById('add-asset-btn');
    if (addAssetBtn) {
        addAssetBtn.addEventListener('click', () => {
            // Store styling ID in the form data
             if (document.getElementById('new-asset-styling-id')) {
                 document.getElementById('new-asset-styling-id').value = currentStylingId;
             }
             // Reset asset type select and fields on main add asset button click
             if (newAssetTypeSelect) newAssetTypeSelect.value = '';
             if (newColorFields) newColorFields.classList.add('hidden');
             if (newImageFields) newImageFields.classList.add('hidden');
             if (newGenericFields) newGenericFields.classList.add('hidden');
            showModal(newAssetModal);
        });
    }

    const viewCssBtn = document.getElementById('view-css-btn');
     if (viewCssBtn) {
         viewCssBtn.addEventListener('click', () => showCssView(currentStylingId));
     }



    // Added Copy Styling CSS URL button handler (in styling view)
     if (copyStylingCssUrlBtn) {
         copyStylingCssUrlBtn.addEventListener('click', () => {
             const url = stylingCssUrlCode ? stylingCssUrlCode.textContent : '';
             if (url) {
                 copyToClipboard(url);
                 showToast('CSS URL copied to clipboard', 'success'); // Added success type
             } else {
                 showToast('CSS URL not available', 'error');
             }
         });
     }

    // Asset type selection handling in New Asset modal
    if (newAssetTypeSelect) {
        newAssetTypeSelect.addEventListener('change', () => {
            if (newColorFields) newColorFields.classList.add('hidden');
            if (newImageFields) newImageFields.classList.add('hidden');
            if (newGenericFields) newGenericFields.classList.add('hidden');

            const selectedType = newAssetTypeSelect.value;
            if (selectedType === 'color') {
                if (newColorFields) newColorFields.classList.remove('hidden');
            } else if (selectedType === 'image') {
                if (newImageFields) newImageFields.classList.remove('hidden');
            } else if (selectedType) {
                if (newGenericFields) newGenericFields.classList.remove('hidden');
            }
        });
    }



    // Copy CSS button
    if (copyCssBtn) {
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
                });
        });
    }


    // inheritance 
    const inheritFromSelect = document.getElementById('edit-brand-inherit-from-select');
    if (inheritFromSelect && window.inheritanceHandlers) {
        inheritFromSelect.removeEventListener('change', window.inheritanceHandlers.handleMasterBrandChange);
        inheritFromSelect.addEventListener('change', window.inheritanceHandlers.handleMasterBrandChange);
    }

        // Connect edit brand styling save button
    const editBrandStylingSaveBtn = document.getElementById('edit-brand-styling-save-btn');
    if (editBrandStylingSaveBtn) {
        editBrandStylingSaveBtn.addEventListener('click', handleEditBrandStylingSubmit);
    }

    // live update of the css preview.
   // initAutoUpdate();

       const homeBtn = document.getElementById('home-btn');
    if (homeBtn) {
        homeBtn.addEventListener('click', () => {
            showWelcomeScreen();
        });
    }

    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            showSettingsScreen();
        });
    }

    const helpBtn = document.getElementById('help-btn');
    if (helpBtn) {
        helpBtn.addEventListener('click', () => {
            showHelpScreen();
        });
    }

    const aboutBtn = document.getElementById('about-btn');
    if (aboutBtn) {
        aboutBtn.addEventListener('click', () => {
            // First, ensure the help screen is visible
            showHelpScreen();

            // Then, find the about section and scroll to it.
            // A small timeout ensures the view is visible before scrolling.
            setTimeout(() => {
                const aboutSection = document.getElementById('about-section');
                if (aboutSection) {
                    aboutSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                } else {
                    console.warn("About section not found on the help page.");
                }
            }, 100); // 100ms delay to allow the view to switch.
        });
    }

}




