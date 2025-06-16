function updateCssFromApi(stylingId) {
  if (!cssOutput || !stylingId) return;
    apiFetch(`${API_BASE_URL}/brand/${stylingId}/css`)

    //apiFetch(`${API_BASE_URL}/brand-stylings/${stylingId}/css`)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.text();
    })
    .then(css => {
      // Update the CSS output display
      cssOutput.textContent = css;
      
      // If we want to keep the parsed CSS for other UI elements, 
      // we can still parse it but not use it for the CSS output display
      if (typeof parseCustomPropertiesWithGroups === 'function') {
        const { properties, groups } = parseCustomPropertiesWithGroups(css);
        window.lastSavedCssData = { properties, groups };
        
        // Update visual UI (if needed)
        if (typeof updateUiFromParsedCss === 'function') {
          updateUiFromParsedCss(properties, groups);
        }
      }
      
      // Store the original CSS for comparison
      window.originalCssContent = css;
    })
    .catch(error => {
      console.error('Error fetching CSS from API:', error);
      if (typeof showToast === 'function') {
        showToast(`Failed to load CSS: ${error.message}`, 'error');
      }
    });
}