// Fixed Editor Setup Module
// Ensures proper loading of Ace editor and all required modules

/**
 * Initialize and theme the Ace Editor with improved module loading
 * @param {string|number} stylingId - The ID of the styling being edited
 */
function initializeAndThemeAceEditor(stylingId) {
    console.log("Initializing Ace editor for styling ID:", stylingId);
    
    return new Promise((resolve, reject) => {
        const aceContainer = document.getElementById('ace-editor-container');
        if (!aceContainer) {
            reject(new Error("Editor container not found"));
            return;
        }
        
        // Check if ace.js is loaded
        if (typeof ace === 'undefined') {
            reject(new Error("Ace editor not loaded"));
            return;
        }
        
        // Load required modules first
        ace.require(['ace/mode/css', 'ace/mode/css_highlight_rules'], function(cssMode, cssHighlightRules) {
            // Create editor if it doesn't exist
            if (!window.editor) {
                window.editor = ace.edit("ace-editor-container");
                
                // Create a new CSS mode instance
                const mode = new cssMode.Mode();
                
                // Extend CSS highlight rules to support CSS variables
                const CssHighlightRules = cssHighlightRules.CssHighlightRules;
                if (CssHighlightRules && CssHighlightRules.prototype) {
                    const rules = CssHighlightRules.prototype.$rules;
                    if (rules && rules.start) {
                        // Add CSS variable highlighting rule
                        rules.start.push({
                            token: "variable",
                            regex: "--[a-zA-Z0-9-_]+"
                        });
                    }
                }
                
                // Apply the mode
                window.editor.session.setMode(mode);
                window.editor.setTheme("ace/theme/idle_fingers");
                
                // Set initial basic config
                window.editor.setShowPrintMargin(false);
                window.editor.setOptions({
                    fontSize: 14,
                    wrap: true,
                    enableBasicAutocompletion: true,
                    enableLiveAutocompletion: true
                });
            }
            
            // Resolve with editor instance
            resolve(window.editor);
        });
    });
}

/**
 * Configure the editor by loading required modules in correct sequence
 * @param {string|number} stylingId - The ID of the styling being edited
 */
function configureEditorWithModules(stylingId) {
    // Set initial basic config
    window.editor.setShowPrintMargin(false);
    window.editor.setOptions({
        fontSize: 14,
        wrap: true
    });
    
    // Use a loading queue to ensure proper module dependency loading
    console.log("Loading required Ace modules...");
    
    // Queue of modules to load in sequence
    const moduleQueue = [
        {
            name: "base modules",
            modules: ["ace/lib/oop", "ace/mode/css", "ace/theme/idle_fingers"],
            callback: function(oop, cssMode, theme) {
                console.log("Base modules loaded");
                
                // Apply theme
                window.editor.setTheme("ace/theme/idle_fingers");
                
                // Check if cssMode is properly loaded
                if (cssMode && cssMode.Mode) {
                    window.editor.session.setMode(new cssMode.Mode());
                    console.log("CSS mode applied");
                } else {
                    console.warn("CSS mode not properly loaded");
                }
            }
        },
        {
            name: "completion modules",
            modules: ["ace/ext/language_tools"],
            callback: function(langTools) {
                console.log("Language tools loaded");
                
                // Enable completions
                window.editor.setOptions({
                    enableBasicAutocompletion: true,
                    enableSnippets: true,
                    enableLiveAutocompletion: true
                });
            }
        },
        {
            name: "linter modules",
            modules: [],
            callback: function() {
                // Initialize ace-linters if available in global scope
                if (typeof LanguageProvider !== 'undefined') {
                    try {
                        const provider = LanguageProvider.fromCdn("https://www.unpkg.com/ace-linters@latest/build/");
                        provider.registerEditor(window.editor);
                        console.log("Ace-linters initialized");
                    } catch (error) {
                        console.warn("Failed to initialize ace-linters:", error);
                    }
                }
            }
        },
        {
            name: "content",
            modules: [],
            callback: function() {
                // Load content after all modules are ready
                console.log("All modules loaded, loading content for styling ID:", stylingId);
                
                // Load the CSS content
                if (typeof loadCssContent === 'function') {
                    loadCssContent(stylingId);
                } else {
                    console.error("loadCssContent function not found");
                }
                
                // Initialize enhanced CSS support
                setTimeout(function() {
                    if (typeof initEnhancedCssSupport === 'function') {
                        initEnhancedCssSupport();
                    }
                }, 500); // Delay to ensure editor is fully ready
            }
        }
    ];
    
    // Process module queue sequentially
    processModuleQueue(moduleQueue, 0);
}

/**
 * Process module loading queue sequentially to ensure proper dependencies
 * @param {Array} queue - Array of module loading tasks
 * @param {number} index - Current index in the queue
 */
function processModuleQueue(queue, index) {
    if (index >= queue.length) {
        console.log("Module queue processing complete");
        return;
    }
    
    const task = queue[index];
    console.log(`Loading ${task.name}...`);
    
    // If no modules to load, just execute callback and move on
    if (!task.modules || task.modules.length === 0) {
        task.callback();
        processModuleQueue(queue, index + 1);
        return;
    }
    
    // Load modules and then process callback
// Load modules safely with error handling
    try {
        // Add delay to ensure Ace is fully loaded
        setTimeout(() => {
            try {
                ace.config.loadModule(task.modules, function() {
                    try {
                        // Convert arguments to array to pass to callback
                        const args = Array.prototype.slice.call(arguments);
                        task.callback.apply(null, args);
                    } catch (err) {
                        console.error("Error in module callback:", err);
                    }
                    
                    // Process next task
                    processModuleQueue(queue, index + 1);
                });
            } catch (err) {
                console.error("Error loading module:", err);
                // Skip to next task on error
                processModuleQueue(queue, index + 1);
            }
        }, 100);
    } catch (err) {
        console.error("Critical error in module loading:", err);
        // Skip to next task on error
        processModuleQueue(queue, index + 1);
    }
}

/**
 * Set up change handler for the editor
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
    console.log("Editor change handler setup complete");
}

// Make functions globally available
window.initializeAndThemeAceEditor = initializeAndThemeAceEditor;
window.setupEditorChangeHandler = setupEditorChangeHandler;