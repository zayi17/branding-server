// Enhanced CSS Editor Operations
// Handles loading, saving, and syncing CSS with the database

/**
 * Loads the CSS content from the backend API into the Ace editor.
 * Updates the import URL display and editor status.
 *
 * @param {string|number} stylingId The ID of the brand styling to load CSS for.
 */
async function loadCssContent(stylingId) {
  // Ensure stylingId is valid and editor instance exists
  if (!stylingId || !window.editor) {
    if (!window.editor) console.error('Ace editor instance not available.');
    return;
  }

  try {
    // Use a cache-busting query parameter to ensure fresh content
    const cacheBuster = new Date().getTime();
    const response = await apiFetch(`${API_BASE_URL}/brand/${stylingId}/css?v=${cacheBuster}`, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to load CSS: ${response.status} ${response.statusText}`);
    }
    
    const cssContent = await response.text();
    
    // Store the original CSS content for comparisons
    window.originalCssContent = cssContent;
    
    // Important: completely reset the editor session to avoid any merge issues
    if (window.editor.session) {
      // Create a new clean session
      const oldSession = window.editor.session;
      const newSession = ace.createEditSession(cssContent, "ace/mode/css");
      window.editor.setSession(newSession);
      
      // Clean up old session if needed
      if (oldSession && typeof oldSession.destroy === 'function') {
        oldSession.destroy();
      }
    } else {
      // If no session exists yet, just set the value
      window.editor.setValue(cssContent, -1); // -1 places cursor at start
    }
    
    // Set up change handler to detect modifications
    setupEditorChangeHandler();
    
    // Make sure cursor is positioned at the beginning
    window.editor.gotoLine(0, 0);

    // Set the import URL display
    const cssImportUrlElement = document.getElementById('css-import-url');
    if (cssImportUrlElement) {
      cssImportUrlElement.textContent = `@import url('${API_BASE_URL}/brand/${stylingId}/css');`;
    }

    // Clear status
    const editorStatusElement = document.getElementById('editor-status');
    if (editorStatusElement) {
      editorStatusElement.textContent = 'No changes';
      editorStatusElement.className = 'url-helper-text';
    }

    // Parse the CSS for the editor's internal reference
    if (typeof parseCustomPropertiesWithGroups === 'function') {
      const { properties, groups } = parseCustomPropertiesWithGroups(cssContent);
      window.lastSavedCssData = { properties, groups };
    }

  } catch (error) {
    console.error('Error loading CSS:', error);
    if (typeof showToast !== 'undefined') {
      showToast(`Failed to load CSS: ${error.message}`, 'error');
    }
    const editorStatusElement = document.getElementById('editor-status');
    if (editorStatusElement) {
      editorStatusElement.textContent = 'Error loading CSS';
      editorStatusElement.className = 'url-helper-text error';
    }
  }
}

/**
 * Saves the current CSS content from the editor to the backend API.
 * Uses enhanced CSS parsing to detect variable types and groups.
 *
 * @param {string|number} stylingId The ID of the brand styling to save changes for.
 * @returns {Promise<boolean>} Whether the save was successful
 */
async function saveCssChanges(stylingId) {
  if (!stylingId || !window.editor) {
    if (!window.editor) console.error('Ace editor instance not available.');
    return false;
  }

  const editorStatusElement = document.getElementById('editor-status');
  if (editorStatusElement) {
    editorStatusElement.textContent = 'Parsing and saving changes...';
  }

  const cssContent = window.editor.session.getValue();
  
  try {
    // Parse the CSS to extract variables, types, and groups
    let parsedData = null;
    if (typeof parseCustomPropertiesWithGroups === 'function') {
      const { properties, groups } = parseCustomPropertiesWithGroups(cssContent);
      parsedData = { properties, groups };
      window.lastSavedCssData = parsedData;
    } else {
      console.warn("parseCustomPropertiesWithGroups function not found. Cannot extract variable types.");
    }
    
    // Create form data with CSS content and parsed data
    const formData = new FormData();
    formData.append('css_content', cssContent);
    
    // Add parsed data if available
    if (parsedData) {
      formData.append('parsed_data', JSON.stringify(parsedData));
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
    
    // Update editor status
    if (editorStatusElement) {
      // Create a message showing what changed
      const changes = [];
      if (result.added > 0) changes.push(`${result.added} asset(s) added`);
      if (result.updated > 0) changes.push(`${result.updated} asset(s) updated`);
      if (result.removed > 0) changes.push(`${result.removed} asset(s) removed`);
      
      const statusMessage = changes.length > 0 
          ? `Saved: ${changes.join(', ')}` 
          : 'CSS saved successfully';
      
      editorStatusElement.textContent = statusMessage;
      editorStatusElement.className = 'url-helper-text';
    }
    
    // Show toast notification
    if (typeof showToast !== 'undefined') {
      showToast('CSS saved successfully', 'success');
    }
    
    // Store the newly saved CSS as the original for comparison
    window.originalCssContent = cssContent;
    
    return true;
  } catch (error) {
    console.error('Error saving CSS changes:', error);
    
    // Update editor status with error
    if (editorStatusElement) {
      editorStatusElement.textContent = 'Error saving changes';
      editorStatusElement.className = 'url-helper-text error';
    }
    
    // Show toast notification
    if (typeof showToast !== 'undefined') {
      showToast(`Error saving CSS: ${error.message}`, 'error');
    }
    
    return false;
  }
}

/**
 * Helper function to exit the CSS editor view and return to the styling view.
 * Prompts the user to save if there are unsaved changes.
 */
function exitCssEditor() {
  const editorStatusElement = document.getElementById('editor-status');
  const hasUnsavedChanges = editorStatusElement && 
                           (editorStatusElement.textContent === 'Unsaved changes' || 
                            editorStatusElement.className.includes('modified'));

  if (hasUnsavedChanges) {
    if (confirm('You have unsaved changes. Save before leaving?')) {
      if (typeof saveCssChanges === 'function' && window.currentStylingId) {
        saveCssChanges(window.currentStylingId).then(success => {
          performExit(success);
        });
      } else {
        console.error("Save function or currentStylingId not available.");
        if (typeof showToast !== 'undefined') {
          showToast('Error saving changes. Exiting without saving.', 'error');
        }
        performExit(false);
      }
      return;
    }
  }
  
  performExit(false);
}

/**
 * Performs the actual UI view transition after saving or discarding changes.
 */
function performExit(applySavedChanges) {
  const cssView = document.getElementById('css-view');
  const brandStylingView = document.getElementById('brand-styling-view');

  if (!cssView || !brandStylingView) {
    console.error("CSS or Brand Styling view elements not found.");
    return;
  }

  cssView.classList.add('hidden');
  brandStylingView.classList.remove('hidden');

  // Always reload the styling view to ensure UI is updated
  if (typeof loadBrandStyling === 'function' && window.currentStylingId) {
    loadBrandStyling(window.currentStylingId);
  }
}

/**
 * Sets up the change handler for the editor to detect modifications.
 */
function setupEditorChangeHandler() {
  if (!window.editor || !window.editor.session) return;
  
  // Remove any existing handlers to prevent duplication
  if (window.editor._changeHandler) {
    window.editor.session.off('change', window.editor._changeHandler);
  }
  
  // Create new change handler
  window.editor._changeHandler = function(delta) {
    // Update editor status to indicate unsaved changes
    const editorStatusElement = document.getElementById('editor-status');
    if (editorStatusElement) {
      editorStatusElement.textContent = 'Unsaved changes';
      editorStatusElement.className = 'url-helper-text modified';
    }
  };
  
  // Register the change handler
  window.editor.session.on('change', window.editor._changeHandler);
}

// Make functions globally available
window.loadCssContent = loadCssContent;
window.saveCssChanges = saveCssChanges;
window.exitCssEditor = exitCssEditor;
window.setupEditorChangeHandler = setupEditorChangeHandler;
