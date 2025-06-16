// main.js - Core initialization and global state for the Branding Server

// Global state (keep global as they track the current selection)
let currentSiteId = null;
let currentStylingId = null;


Object.defineProperty(window, 'currentStylingId', {
    get: function() { return currentStylingId; },
    set: function(value) { currentStylingId = value; }
  });


/**
 * Unified function to save CSS changes for a styling
 * @param {number} stylingId - The ID of the brand styling
 * @param {string} cssContent - The CSS content to save
 * @param {Object} options - Additional options
 * @param {Function} options.onSuccess - Success callback
 * @param {Function} options.onError - Error callback
 * @param {string} options.source - Source of the change ('editor' or 'ui')
 * @returns {Promise<Object>} - Result with success flag and data
 */
async function saveStylingChanges(stylingId, cssContent, options = {}) {
    const { 
        onSuccess = null, 
        onError = null, 
        source = 'unknown'
    } = options;
    
    // Default feedback function using toast
    const showFeedback = (message, type) => {
        if (typeof showToast === 'function') {
            showToast(message, type);
        } else {
            console.log(`${type}: ${message}`);
        }
    };
    
    try {
        // Create form data
        const formData = new FormData();
        formData.append('css_content', cssContent);
        
        // Call the sync endpoint
        const response = await apiFetch(`${API_BASE_URL}/brand-stylings/${stylingId}/sync`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            let errorMessage = `Failed to save changes: ${response.status}`;
            try {
                const errorData = await response.json();
                errorMessage = errorData.detail || errorMessage;
            } catch (e) {
                // If error response isn't JSON, use text instead
                const errorText = await response.text();
                errorMessage = errorText || errorMessage;
            }
            throw new Error(errorMessage);
        }

        const result = await response.json();
        
        // Parse the CSS to store variables and groups for both views
        if (typeof parseCustomPropertiesWithGroups === 'function') {
            const parsedData = parseCustomPropertiesWithGroups(cssContent);
            window.lastSavedCssData = parsedData;
        }

        // Format success message
        const changes = [];
        if (result.added > 0) changes.push(`${result.added} asset(s) added`);
        if (result.updated > 0) changes.push(`${result.updated} asset(s) updated`);
        if (result.removed > 0) changes.push(`${result.removed} asset(s) removed`);
        
        const successMessage = changes.length > 0 
            ? `Changes saved: ${changes.join(', ')}` 
            : 'Changes saved successfully';
            
        // Show feedback
        showFeedback(successMessage, 'success');
        
        // Call success callback if provided
        if (onSuccess && typeof onSuccess === 'function') {
            onSuccess(result);
        }
        
        // Store the original CSS for the editor to compare against
        window.originalCssContent = cssContent;
        
        return { success: true, data: result, source };
        
    } catch (error) {
        const errorMessage = `Failed to save changes: ${error.message}`;
        
        // Show feedback
        showFeedback(errorMessage, 'error');
        
        // Call error callback if provided
        if (onError && typeof onError === 'function') {
            onError(error);
        }
        
        return { success: false, error: error.message, source };
    }
}

// Initialize the application - Called when DOM is fully loaded
// In main.js

// In scripts/main.js

// In scripts/main.js, replace your existing init() function with this one.

function init() {
    console.log("Initializing application...");

    // This checks the OIDC setting we configured.
    if (window.OIDC_ENABLED) {
        console.log("OIDC is enabled. Waiting for Keycloak library...");

        // This small helper function will check every 100ms
        // until the Keycloak library is loaded and ready.
        const attemptKeycloakInit = () => {
            if (typeof Keycloak !== 'undefined') {
                // --- Keycloak is ready, now we can use it ---
                console.log("Keycloak library is now available. Initializing login...");
                const keycloak = new Keycloak({
                    url: window.OIDC_URL,
                    realm: window.OIDC_REALM,
                    clientId: window.OIDC_CLIENT_ID
                });

                keycloak.init({ onLoad: 'login-required' }).then(authenticated => {
                    if (authenticated) {
                        console.log("Keycloak authentication successful.");
                        // The user is logged in, so we can run the app.
                        runApp(); 
                    } else {
                        // This case usually happens after a logout.
                        console.warn("User is not authenticated.");
                    }
                }).catch(() => {
                    console.error('Failed to initialize Keycloak.');
                    alert('Could not connect to the authentication server.');
                });
            } else {
                // Keycloak is not ready yet, wait 100ms and check again.
                setTimeout(attemptKeycloakInit, 100);
            }
        };

        // Start the process.
        attemptKeycloakInit();

    } else {
        // OIDC is disabled, run the app immediately, as before.
        console.log("OIDC is disabled. Running app directly.");
        runApp();
    }
}

// All your original startup logic is now in this function.
function runApp() {
    console.log("Running main application logic...");
    // Load DOM elements
    loadDomElements();

    // Load sites from the API
    loadSites();

    // Add event listeners
    setupEventListeners();

    if (typeof initBackupSystem === 'function') {
        initBackupSystem();
    } else {
        console.error("Backup system initialization function not found.");
    }
}

// Function to initialize the CSS editor and view
function showCssView(stylingId) {
    if (!stylingId || !welcomeScreen || !siteView || !brandStylingView || !cssView) {
         console.error("One or more view elements not found.");
         return;
    }

    // Hide other views
    welcomeScreen.classList.add('hidden');
    siteView.classList.add('hidden');
    brandStylingView.classList.add('hidden');

    // Show CSS view
    cssView.classList.remove('hidden');

    // Store current styling ID
    currentStylingId = stylingId;
    console.log("Set currentStylingId to:", currentStylingId);

    // Initialize CSS editor
    if (typeof initCssEditor === 'function') {
       initCssEditor(stylingId);
    } else {
        console.error("CSS editor initialization function not found");
        cssView.classList.add('hidden');
        brandStylingView.classList.remove('hidden');
        return;
    }

    // Load CSS content using loadCssContent directly
    if (typeof loadCssContent === 'function') {
        loadCssContent(stylingId);
    } else {
        console.warn("loadCssContent function not found");
    }
}

// Helper function to manage view transitions
function showView(viewToShow) {
    console.log("Showing view:", viewToShow);
    
    // Hide all views first
    const views = [welcomeScreen, siteView, brandStylingView, cssView];
    views.forEach(view => {
        if (view) view.classList.add('hidden');
    });
    
    // Show the requested view
    if (viewToShow) {
        viewToShow.classList.remove('hidden');
    } else {
        console.error("Attempted to show a null view");
    }
}

// Function to parse CSS content and extract custom properties and groups
// This function is called when loading CSS content
function generateCssWithGroups(properties, groups) {
    let css = ":root {\n";
    for (const groupName in groups) {
        if (groups[groupName].length === 0) continue;
        css += `  /* GROUP: ${groupName} */\n`;
        for (const propertyName of groups[groupName]) {
            const property = properties[propertyName];
            if (!property) continue;
            const importantStr = property.isImportant ? " !important" : "";
            css += `  ${propertyName}: ${property.value}${importantStr};\n`;
        }
        css += "\n";
    }
    css += "}";
    return css;
}

// Function to update the visual UI from the CSS data
// This function is called after saving CSS changes
function updateVisualUiFromCssData() {
    if (!window.lastSavedCssData) return;
    
    const { properties, groups } = window.lastSavedCssData;
    
    // Check if updateUiFromParsedCss function exists
    if (typeof updateUiFromParsedCss === 'function') {
      updateUiFromParsedCss(properties, groups);
    } else {
      console.warn("updateUiFromParsedCss function not found, cannot update visual UI");
    }
  }



  // Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', init);
