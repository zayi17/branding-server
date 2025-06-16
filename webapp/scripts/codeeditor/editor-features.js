// codeeditor/editor-features.js
// Adds features like completion suggestions to the Ace Editor

// Dependencies:
// - ace (available globally after loading by editor-setup.js)
// - window.editor (set and managed by editor-setup.js - assumed global)
// - API_BASE_URL (from index.html - assumed global)
// - window.currentStylingId (from main.js - assumed global)
// - parseCustomProperties (from css-parser.js - assumed global)

/**
 * Sets up context-sensitive CSS completion suggestions in the Ace Editor.
 * Provides suggestions for existing CSS variables within :root and common variable names.
 *
 * Assumes ace and window.editor are available globally.
 */
function setupCssCompletionSuggestions() {
  // Ensure ace and editor instance are available
  if (typeof ace === 'undefined' || !window.editor) {
      console.warn('Ace or editor instance not available. Skipping completion suggestions setup.');
      return;
  }

  // Ensure API_BASE_URL is available globally
  if (typeof API_BASE_URL === 'undefined') {
       console.warn("API_BASE_URL is not defined. Cannot fetch assets for completion suggestions.");
       // We can still provide basic static suggestions if API is missing,
       // so don't return here, just log the warning.
  }

  // Ensure window.currentStylingId is available globally
  if (typeof window.currentStylingId === 'undefined' || window.currentStylingId === null) {
       console.warn("window.currentStylingId is not set. Asset-based completion suggestions may not work.");
       // We can still provide basic static suggestions if stylingId is missing,
       // so don't return here, just log the warning.
  }

  // Ensure parseCustomProperties is available globally (from css-parser.js)
  if (typeof parseCustomProperties === 'undefined') {
       console.error("parseCustomProperties function not found. Cannot check for existing variables for suggestions.");
       // This is a critical dependency for excluding existing variables from common suggestions,
       // but we can still register the provider and let the API call potentially fail.
  }

  // Create a custom completer for Ace
  const cssVariableCompleter = {
      getCompletions: async function(editor, session, pos, prefix, callback) {
          const suggestions = [];
          // Get the current line and check if we're working with CSS variables
          const line = session.getLine(pos.row);
          const isVar = line.substring(0, pos.column).match(/--[a-zA-Z0-9-_]*$/);
          
          // Check if we're inside the :root block
          const allText = session.getValue();
          const rootMatch = allText.match(/:root\s*{([^}]*)}/);
          
          // Determine cursor position relative to document start
          const cursorPos = session.doc.positionToIndex(pos);
          
          // Check if cursor is inside the :root block
          const isInsideRoot = rootMatch && 
                               cursorPos > allText.indexOf(rootMatch[0]) && 
                               cursorPos < allText.indexOf(rootMatch[0]) + rootMatch[0].length;
          
          if (isInsideRoot && isVar && typeof API_BASE_URL !== 'undefined' && 
              typeof window.currentStylingId !== 'undefined' && window.currentStylingId !== null) {
              try {
                  // Fetch existing assets from the backend
                  const response = await apiFetch(`${API_BASE_URL}/brand-stylings/${window.currentStylingId}/assets/`);
                  if (response.ok) {
                      const assets = await response.json();
                      assets.forEach(asset => {
                          // Add suggestions for existing assets
                          suggestions.push({
                              caption: asset.name,
                              value: asset.name,
                              meta: asset.type.charAt(0).toUpperCase() + asset.type.slice(1) + 
                                    (asset.description ? ` - ${asset.description}` : '')
                          });
                      });
                  } else {
                      console.error('Failed to fetch assets for suggestions:', response.status, response.statusText);
                  }
              } catch (error) {
                  console.error('Error fetching assets for completion items:', error);
                  if (typeof showToast !== 'undefined') {
                      showToast('Error fetching assets for suggestions.', 'error');
                  }
              }
          }
          
          // Add completions for common variable name patterns
          if (isVar) {
              const commonVarPrefixes = [
                  { name: '--color-primary', detail: 'Primary brand color' },
                  { name: '--color-secondary', detail: 'Secondary brand color' },
                  { name: '--color-accent', detail: 'Accent color' },
                  { name: '--color-text', detail: 'Main text color' },
                  { name: '--color-background', detail: 'Background color' },
                  { name: '--font-family-base', detail: 'Base font family' },
                  { name: '--font-size-base', detail: 'Base font size' },
                  { name: '--spacing-unit', detail: 'Base spacing unit' },
                  { name: '--border-radius', detail: 'Default border radius' },
                  { name: '--border-width', detail: 'Default border width' },
                  { name: '--shadow-default', detail: 'Default shadow' }
              ];
              
              // Get existing variable names to avoid duplications
              let existingVarNames = [];
              if (typeof parseCustomProperties === 'function') {
                  existingVarNames = Object.keys(parseCustomProperties(allText));
              } else {
                  console.warn("parseCustomProperties not available, cannot filter common suggestions.");
              }
              
              commonVarPrefixes.forEach(varInfo => {
                  if (!existingVarNames.includes(varInfo.name)) {
                      suggestions.push({
                          caption: varInfo.name,
                          value: varInfo.name,
                          meta: varInfo.detail
                      });
                  }
              });
          }
          
          // Check if we're after a CSS variable and colon (e.g., `--my-var: `)
          const valueMatch = line.substring(0, pos.column).match(/(--[a-zA-Z0-9-_]+)\s*:\s*$/);
          
          // Also check if we're inside var() (e.g., `value: var(|)`)
          const varFuncMatch = line.substring(0, pos.column).match(/var\(\s*(--[a-zA-Z0-9-_]*)?$/);
          
          if ((valueMatch || varFuncMatch) && typeof API_BASE_URL !== 'undefined' && 
              typeof window.currentStylingId !== 'undefined' && window.currentStylingId !== null) {
              const variableNameBeingDefined = valueMatch ? valueMatch[1] : null;
              const variableNameInsideVar = varFuncMatch ? varFuncMatch[1] : null;
              
              try {
                  const response = await apiFetch(`${API_BASE_URL}/brand-stylings/${window.currentStylingId}/assets/`);
                  if (response.ok) {
                      const assets = await response.json();
                      
                      // If defining a variable, suggest the value of that specific asset
                      if (variableNameBeingDefined) {
                          const targetAsset = assets.find(asset => asset.name === variableNameBeingDefined);
                          if (targetAsset) {
                              suggestions.push({
                                  caption: targetAsset.value,
                                  value: targetAsset.value,
                                  meta: `Value for ${variableNameBeingDefined}`
                              });
                              
                              // If it's an image, suggest url() wrapper
                              if (targetAsset.type === 'image') {
                                  if (targetAsset.value.startsWith('http://') || 
                                      targetAsset.value.startsWith('https://') || 
                                      targetAsset.value.startsWith('/')) {
                                      suggestions.push({
                                          caption: `url('${targetAsset.value}')`,
                                          value: `url('${targetAsset.value}')`,
                                          meta: `Use as CSS url()`
                                      });
                                  }
                              }
                          }
                      }
                      
                      // Suggest var() for all assets except the one being defined
                      assets.forEach(asset => {
                          if (asset.name !== variableNameBeingDefined) {
                              suggestions.push({
                                  caption: `var(${asset.name})`,
                                  value: `var(${asset.name})`,
                                  meta: `Reference variable ${asset.name}`
                              });
                          }
                      });
                  }
              } catch (error) {
                  console.error('Error providing value completion items:', error);
                  if (typeof showToast !== 'undefined') {
                      showToast('Error fetching asset values for suggestions.', 'error');
                  }
              }
          }
          
          // Return the suggestions to Ace editor
          callback(null, suggestions);
      }
  };
  
  // Add our custom completer to Ace editor
  if (window.editor && window.editor.completers) {
      window.editor.completers.push(cssVariableCompleter);
  } else {
      console.warn("Cannot add custom completers to Ace editor.");
  }
}