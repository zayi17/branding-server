// Enhanced CSS Editor UI
// Manages the CSS editor UI view and event listeners

/**
 * Initializes the CSS Editor view for a specific brand styling.
 * Creates the necessary DOM structure and sets up event handlers.
 * Includes helpful information about type detection.
 *
 * @param {string|number} stylingId The ID of the brand styling to open in the editor.
 */
async function initCssEditor(stylingId) {
    const cssView = document.getElementById('css-view');
  
    if (!cssView) {
        console.error('CSS View element not found');
        if (typeof showToast !== 'undefined') {
            showToast('Error: CSS view container not found.', 'error');
        }
        return;
    }
  
    // Check if the editor container already exists
    let aceContainer = document.getElementById('ace-editor-container');
    if (!aceContainer) {
        // Create enhanced editor container structure with type detection help
        cssView.innerHTML = `
          <div class="view-header">
            <h2 class="view-title" id="css-title">CSS Editor</h2>
            <div class="view-actions">
              <button id="save-css-btn" class="btn primary-btn">
                <i class="fas fa-save mr-1"></i> Save Changes
              </button>
              <button id="copy-css-btn" class="btn secondary-btn">
                <i class="fas fa-copy mr-1"></i> Copy CSS
              </button>
              <button id="view-docs-btn" class="btn secondary-btn">
                <i class="fas fa-book mr-1"></i> View Docs
              </button>
              <button id="back-to-styling-btn" class="btn secondary-btn">
                <i class="fas fa-arrow-left mr-1"></i> Back
              </button>
            </div>
          </div>
  
          <div class="css-import-box">
            <p>Import URL for this styling:</p>
            <div class="copy-container">
              <code id="css-import-url"></code>
              <button id="copy-import-btn" class="icon-btn copy-icon" title="Copy Import URL">
                <i class="fas fa-copy"></i>
              </button>
            </div>
          </div>
          
          <div class="css-help-box">
            <div class="help-header">
              <h4>CSS Variable Type Detection</h4>
              <button id="toggle-help-btn" class="icon-btn" title="Toggle Help">
                <i class="fas fa-chevron-down"></i>
              </button>
            </div>
            <div class="help-content" style="display: none;">
              <p>The editor automatically detects variable types, but you can specify types using comments:</p>
              <pre><code>/* GROUP: Colors */ /* TYPE: col */
--primary: #407196;
--accent: #ff5500;

/* GROUP: Mixed */
--spacing: 20px; /* TYPE: dim */
--font-primary: 'Arial'; /* TYPE: typ */</code></pre>
              <p>Supported type codes:</p>
              <ul>
                <li><strong>col</strong> - Colors</li>
                <li><strong>img</strong> - Images</li>
                <li><strong>typ</strong> - Typography/fonts</li>
                <li><strong>dim</strong> - Dimensions</li>
                <li><strong>cls</strong> - selector/IDs</li>
              </ul>
            </div>
          </div>
  
          <div id="ace-editor-container" class="ace-editor-container"></div>
  
          <div id="editor-status" class="url-helper-text"></div>
        `;
         
        // Get the reference to the newly created container
        aceContainer = document.getElementById('ace-editor-container');
    }
  
    // Store the current styling ID globally
    window.currentStylingId = stylingId;
    
    try {
        // Wait for editor to be initialized
        await initializeAndThemeAceEditor(stylingId);
        
        // Now load the CSS content
        if (typeof loadCssContent === 'function') {
            await loadCssContent(stylingId);
        }
        
        // Set up event listeners after editor is ready
        setupEnhancedEditorEventListeners(stylingId);
        
    } catch (error) {
        console.error("Error initializing CSS editor:", error);
        showToast("Error loading CSS editor", "error");
    }
}

/**
 * Sets up event listeners for the enhanced CSS editor UI.
 * Includes help toggle functionality.
 *
 * @param {string|number} stylingId The ID of the brand styling being edited.
 */
function setupEnhancedEditorEventListeners(stylingId) {
    // Standard editor buttons
    const saveBtn = document.getElementById('save-css-btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            if (typeof saveCssChanges === 'function') {
                saveCssChanges(stylingId);
            } else {
                console.error("saveCssChanges function not found.");
                if (typeof showToast !== 'undefined') {
                    showToast('Error: Save function not available.', 'error');
                }
            }
        });
    }
  
    const copyCssBtn = document.getElementById('copy-css-btn');
    if (copyCssBtn) {
        copyCssBtn.addEventListener('click', () => {
            if (window.editor) {
                if (typeof navigator.clipboard !== 'undefined' && typeof showToast === 'function') {
                    navigator.clipboard.writeText(window.editor.getValue())
                        .then(() => {
                            showToast('CSS copied to clipboard');
                        })
                        .catch(err => {
                            console.error('Failed to copy CSS:', err);
                            showToast('Failed to copy CSS', 'error');
                        });
                }
            }
        });
    }
  
    const copyImportBtn = document.getElementById('copy-import-btn');
    if (copyImportBtn) {
        copyImportBtn.addEventListener('click', () => {
            const importUrlElement = document.getElementById('css-import-url');
            if (importUrlElement) {
                if (typeof navigator.clipboard !== 'undefined' && typeof showToast === 'function') {
                    navigator.clipboard.writeText(importUrlElement.textContent)
                        .then(() => {
                            showToast('Import URL copied to clipboard');
                        })
                        .catch(err => {
                            console.error('Failed to copy import URL:', err);
                            showToast('Failed to copy import URL', 'error');
                        });
                }
            }
        });
    }
  
    const viewDocsBtn = document.getElementById('view-docs-btn');
    if (viewDocsBtn) {
        viewDocsBtn.addEventListener('click', () => {
            if (typeof API_BASE_URL !== 'undefined' && typeof stylingId !== 'undefined') {
                const docsUrl = `${API_BASE_URL}/brand/${stylingId}/docs`;
                window.open(docsUrl, '_blank');
            } else {
                if (typeof showToast !== 'undefined') {
                    showToast('Error: Documentation URL not available.', 'error');
                }
            }
        });
    }
  
    const backBtn = document.getElementById('back-to-styling-btn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            if (typeof exitCssEditor === 'function') {
                exitCssEditor();
            } else {
                console.error("exitCssEditor function not found.");
                if (typeof showToast !== 'undefined') {
                    showToast('Error: Exit function not available.', 'error');
                }
            }
        });
    }
    
    // Help toggle functionality
    const toggleHelpBtn = document.getElementById('toggle-help-btn');
    const helpContent = document.querySelector('.help-content');
    
    if (toggleHelpBtn && helpContent) {
        toggleHelpBtn.addEventListener('click', () => {
            const isHidden = helpContent.style.display === 'none';
            helpContent.style.display = isHidden ? 'block' : 'none';
            toggleHelpBtn.querySelector('i').className = isHidden ? 
                'fas fa-chevron-up' : 'fas fa-chevron-down';
        });
    }
    
    // Keyboard shortcut for save (Ctrl+S or Cmd+S)
    document.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault(); // Prevent default browser save dialog
            if (typeof saveCssChanges === 'function' && stylingId) {
                saveCssChanges(stylingId);
            }
        }
    });
}

// Make function globally available
window.initCssEditor = initCssEditor;
