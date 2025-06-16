// Ultra-Robust CSS Variable Support with Global Initialization
// Handles Ace module loading with extra safety checks and global function

/**
 * Global initialization function that will be called from init.js
 */
window.initEnhancedCssSupport = function() {
    console.log("Global initEnhancedCssSupport called");
    
    // Check if internal implementation is ready
    if (window._internalCssSupportInit) {
        window._internalCssSupportInit();
    } else {
        console.log("Internal CSS support implementation not ready yet");
        // Set flag to initialize once internal implementation is ready
        window._pendingCssSupportInit = true;
    }
};

// Safe wrapper for module loading and initialization
(function() {
    // Define the internal implementation function
    window._internalCssSupportInit = function() {
        console.log("Internal CSS support initialization starting");
        
        // Flag to prevent multiple initializations
        if (window._cssSupport && window._cssSupport.initializing) {
            console.log("CSS support initialization already in progress");
            return;
        }
        
        // Set initializing flag
        window._cssSupport = { initializing: true, initialized: false };
        
        // Check for global Ace
        if (typeof window.ace === 'undefined') {
            console.warn("Ace editor not available yet");
            waitForAce();
            return;
        }
        
        // If Ace is already available, proceed with setup
        setupCssSupport();
    };
    
    /**
     * Wait for Ace to become available
     */
    function waitForAce() {
        let checkCount = 0;
        const maxChecks = 20;
        
        function checkAce() {
            if (typeof window.ace !== 'undefined') {
                console.log("Ace detected, initializing CSS support");
                setupCssSupport();
                return;
            }
            
            checkCount++;
            if (checkCount < maxChecks) {
                console.log(`Waiting for Ace (attempt ${checkCount}/${maxChecks})...`);
                setTimeout(checkAce, 500);
            } else {
                console.error("Ace editor not found after multiple attempts");
                window._cssSupport.initializing = false;
            }
        }
        
        // Start checking after a short delay
        setTimeout(checkAce, 500);
    }
    
    /**
     * Set up CSS support once Ace is available
     */
    function setupCssSupport() {
        if (!window.editor || !window.editor.session) {
            console.warn("Editor not ready for CSS support setup");
            return;
        }

        // Ensure CSS mode is properly loaded
        ace.require(['ace/mode/css', 'ace/mode/css_highlight_rules'], function(cssMode, cssHighlightRules) {
            if (!cssMode || !cssHighlightRules) {
                console.error("Required CSS modules not available");
                return;
            }

            try {
                // Create fresh CSS mode instance
                const mode = new cssMode.Mode();
                
                // Extend highlight rules for CSS variables
                const CssHighlightRules = cssHighlightRules.CssHighlightRules;
                if (CssHighlightRules && CssHighlightRules.prototype) {
                    const rules = CssHighlightRules.prototype.$rules;
                    if (rules && rules.start) {
                        // Add or update CSS variable highlighting rule
                        const variableRule = {
                            token: "variable",
                            regex: "--[a-zA-Z0-9-_]+"
                        };
                        
                        // Remove any existing variable rules to avoid duplicates
                        rules.start = rules.start.filter(rule => 
                            !(rule.token === "variable" && rule.regex.toString().includes("--"))
                        );
                        
                        // Add the new rule
                        rules.start.push(variableRule);
                    }
                }
                
                // Apply the updated mode
                window.editor.session.setMode(mode);
                
                console.log("CSS variable highlighting enabled");
            } catch (error) {
                console.error("Error setting up CSS variable support:", error);
            }
        });
    }
    
    /**
     * Initialize CSS features once prerequisites are available
     */
    function initCssFeatures() {
        // Use built-in module loading system
        try {
            console.log("Loading CSS modules...");
            
            // Load needed modules with proper dependency chain
            window.ace.config.loadModule(["ace/lib/oop", "ace/mode/css"], function(oop, cssMode) {
                if (!oop || !cssMode) {
                    console.error("Required Ace modules could not be loaded");
                    window._cssSupport.initializing = false;
                    return;
                }
                
                console.log("Required Ace modules loaded successfully");
                
                // Load CSS highlight rules
                window.ace.config.loadModule(["ace/mode/css_highlight_rules"], function(cssHighlightRules) {
                    if (!cssHighlightRules || !cssHighlightRules.CssHighlightRules) {
                        console.error("CSS highlight rules could not be loaded");
                        window._cssSupport.initializing = false;
                        return;
                    }
                    
                    console.log("CSS highlight rules loaded successfully");
                    
                    // Extend the highlight rules
                    try {
                        extendCssHighlightRules(cssHighlightRules.CssHighlightRules);
                        
                        // Add completions and snippets after a short delay
                        setTimeout(function() {
                            addTypeAwareCssCompletion();
                            addCssTypeSnippets();
                            
                            // Mark as fully initialized
                            window._cssSupport.initializing = false;
                            window._cssSupport.initialized = true;
                            console.log("CSS support fully initialized");
                        }, 300);
                    } catch (error) {
                        console.error("Error extending CSS highlight rules:", error);
                        window._cssSupport.initializing = false;
                    }
                });
            });
        } catch (error) {
            console.error("Error during CSS support initialization:", error);
            window._cssSupport.initializing = false;
        }
    }
    
    /**
     * Extend CSS highlight rules 
     */
    function extendCssHighlightRules(CssHighlightRules) {
        if (!CssHighlightRules || !CssHighlightRules.prototype || !CssHighlightRules.prototype.$rules) {
            console.error("Invalid CssHighlightRules passed to extension function");
            return;
        }
        
        console.log("Extending CSS highlight rules...");
        
        // Make a local reference to the rules
        const rules = CssHighlightRules.prototype.$rules;
        
        // Check if we have the start rules
        if (!rules.start || !Array.isArray(rules.start)) {
            console.error("CSS highlight rules missing expected 'start' array");
            return;
        }
        
        // Check if rules already exist before adding
        const hasVarRule = rules.start.some(r => 
            r.token && r.token.indexOf("variable") >= 0 && r.regex && r.regex.toString().indexOf("--") >= 0);
            
        const hasTypeRule = rules.start.some(r => 
            r.token && r.token.indexOf("comment.type") >= 0);
            
        const hasGroupRule = rules.start.some(r => 
            r.token && r.token.indexOf("comment.group") >= 0);
        
        // Add CSS variable rule if not already present
        if (!hasVarRule) {
            try {
                rules.start.push({
                    token: "variable.css",
                    regex: "(--[a-zA-Z0-9-_]+)"
                });
                console.log("Added CSS variable highlighting rule");
            } catch (e) {
                console.warn("Error adding variable highlighting rule:", e);
            }
        }
        
        // Add TYPE comment rule if not already present
        if (!hasTypeRule) {
            try {
                rules.start.push({
                    token: "comment.type",
                    regex: "/\\*\\s*TYPE:\\s*\\w+\\s*\\*/"
                });
                console.log("Added TYPE comment highlighting rule");
            } catch (e) {
                console.warn("Error adding TYPE comment highlighting rule:", e);
            }
        }
        
        // Add GROUP comment rule if not already present
        if (!hasGroupRule) {
            try {
                rules.start.push({
                    token: "comment.group",
                    regex: "/\\*\\s*GROUP:\\s*.*?\\s*\\*/"
                });
                console.log("Added GROUP comment highlighting rule");
            } catch (e) {
                console.warn("Error adding GROUP comment highlighting rule:", e);
            }
        }
        
        // If editor exists, try to refresh its mode
        if (window.editor && window.editor.session) {
            try {
                // Store cursor position
                const pos = window.editor.getCursorPosition();
                
                // Try to reload the mode
                window.editor.session.setMode("ace/mode/css");
                
                // Restore cursor
                window.editor.moveCursorToPosition(pos);
                window.editor.clearSelection();
                
                console.log("Applied new highlighting rules to editor");
            } catch (e) {
                console.warn("Error applying highlighting rules to editor:", e);
            }
        }
    }
    
    /**
     * Simplified type-aware completion implementation
     */
    function addTypeAwareCssCompletion() {
        if (!window.editor || !window.editor.completers) {
            console.warn("Editor not ready for completions");
            return;
        }
        
        // Remove any existing completers to avoid duplicates
        window.editor.completers = window.editor.completers.filter(c => !c.isCssTypeCompleter);
        
        // Add simple completer with basic CSS variable suggestions
        const typeCompleter = {
            isCssTypeCompleter: true,
            getCompletions: function(editor, session, pos, prefix, callback) {
                // Check if we're in a comment that might need completions
                const line = session.getLine(pos.row);
                const beforeCursor = line.substring(0, pos.column);
                
                // If we're typing in a TYPE comment
                if (beforeCursor.match(/\/\*\s*TYPE:\s*\w*$/)) {
                    callback(null, [
                        { caption: "col", value: "col */", meta: "Color type" },
                        { caption: "dim", value: "dim */", meta: "Dimension type" },
                        { caption: "typ", value: "typ */", meta: "Typography type" },
                        { caption: "img", value: "img */", meta: "Image type" },
                        { caption: "cls", value: "cls */", meta: "Class type" }
                    ]);
                    return;
                }
                
                // If we're typing a GROUP comment
                if (beforeCursor.match(/\/\*\s*GROUP:\s*\w*$/)) {
                    callback(null, [
                        { caption: "Colors", value: "Colors */", meta: "Color group" },
                        { caption: "Typography", value: "Typography */", meta: "Font group" },
                        { caption: "Dimensions", value: "Dimensions */", meta: "Size group" },
                        { caption: "Spacing", value: "Spacing */", meta: "Space group" },
                        { caption: "Layout", value: "Layout */", meta: "Layout group" }
                    ]);
                    return;
                }
                
                // Default completions
                callback(null, []);
            }
        };
        
        // Add the completer
        window.editor.completers.push(typeCompleter);
        console.log("Added type-aware CSS completions");
    }
    
    /**
     * Add CSS type snippets
     */
    function addCssTypeSnippets() {
        try {
            window.ace.config.loadModule(["ace/snippets"], function(snippetModule) {
                if (!snippetModule || !snippetModule.snippetManager) {
                    console.warn("Snippet manager not available");
                    return;
                }
                
                // Basic snippets
                const snippets = [
                    {
                        name: "typecomment",
                        content: "/* TYPE: ${1:col} */",
                        tabTrigger: "type"
                    },
                    {
                        name: "groupcomment",
                        content: "/* GROUP: ${1:Name} */",
                        tabTrigger: "group"
                    },
                    {
                        name: "colorgroup",
                        content: "/* GROUP: ${1:Colors} */ /* TYPE: col */\n--${2:color-name}: ${3:#000000};",
                        tabTrigger: "colgroup"
                    }
                ];
                
                // Register the snippets
                snippetModule.snippetManager.register(snippets, "css");
                console.log("CSS type snippets registered");
            });
        } catch (e) {
            console.warn("Error setting up CSS snippets:", e);
        }
    }
    
    // Check if we need to initialize immediately
    if (window._pendingCssSupportInit) {
        console.log("Pending CSS support initialization found, executing now");
        window._internalCssSupportInit();
        window._pendingCssSupportInit = false;
    }
})();
