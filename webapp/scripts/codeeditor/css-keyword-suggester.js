// css-keyword-suggester.js

// Assume 'mdnCssData' is loaded and available globally or imported.
// This would be the data you've sourced, e.g., from an MDN data package.
// For this example, it's a placeholder:
// const mdnCssData = { properties: { 'color': { syntax: '<color>', keywords: ['red', 'blue', ...] } }, ... };

function getMdnSuggestionsForField(fieldElement, mdnCssData) {
    if (!mdnCssData || !mdnCssData.properties) {
        console.warn("MDN CSS data not available for suggestions.");
        return [];
    }

    const currentValue = fieldElement.value.toLowerCase();
    let suggestions = [];
    const fieldType = fieldElement.dataset.fieldType; // 'property' or 'value'

    if (fieldType === 'property') {
        suggestions = Object.keys(mdnCssData.properties)
            .filter(prop => prop.toLowerCase().includes(currentValue))
            .map(prop => ({ name: prop, meta: 'property' })); // Structure for display
    } else if (fieldType === 'value') {
        const ruleRow = fieldElement.closest('.css-rule-row');
        const propertyInput = ruleRow ? ruleRow.querySelector('.css-property-name .editable-field') : null;
        const currentProperty = propertyInput ? propertyInput.value.toLowerCase() : null;

        if (currentProperty && mdnCssData.properties[currentProperty]) {
            const propertyData = mdnCssData.properties[currentProperty];
            // Extracting keywords or common values based on MDN data structure can be complex.
            // MDN data often provides syntax strings like "<color> | <length>", etc.
            // A more robust solution would parse this syntax string.
            // For a simpler start, if 'keywords' were directly available:
            if (propertyData.keywords) {
                 suggestions = suggestions.concat(propertyData.keywords.map(kw => ({ name: kw, meta: 'keyword' })));
            }
            // Or you might look up common data types like <color> in mdnCssData.syntaxes
            // This part heavily depends on the exact structure of your chosen MDN data subset.
        }
        // Always add generic CSS-wide values
        const genericKeywords = ['inherit', 'initial', 'unset', 'revert', 'var(--)'];
        suggestions = suggestions.concat(genericKeywords.map(kw => ({ name: kw, meta: 'global' })));

        if (currentValue) {
            suggestions = suggestions.filter(sugg => sugg.name.toLowerCase().includes(currentValue));
        }
    }

    // Sort and limit
    suggestions.sort((a, b) => {
        const aStartsWith = a.name.toLowerCase().startsWith(currentValue);
        const bStartsWith = b.name.toLowerCase().startsWith(currentValue);
        if (aStartsWith && !bStartsWith) return -1;
        if (!aStartsWith && bStartsWith) return 1;
        return a.name.localeCompare(b.name);
    });
    return suggestions.slice(0, 10).map(s => s.name); // Return just names for the existing UI
}

window.showCssKeywordSuggestions = function(fieldElement) {
    // This function needs access to your loaded MDN-like data.
    // For example, if you load it into a global variable `window.myMdnCssData`.
    if (typeof window.myMdnCssData === 'undefined') {
        console.warn("CSS data (e.g., from MDN) not loaded into window.myMdnCssData.");
        if (typeof window.hideSuggestionsForEditor === 'function') window.hideSuggestionsForEditor();
        return;
    }
    if (typeof window.editorSuggestionsBoxElement !== 'function' || typeof window.currentEditorSuggestionInput !== 'function') {
        console.warn("Suggestion box elements/functions not globally available.");
        return;
    }

    const suggestions = getMdnSuggestionsForField(fieldElement, window.myMdnCssData);
    const suggestionsBox = window.editorSuggestionsBoxElement();
    if (!suggestionsBox) return;

    suggestionsBox.innerHTML = '';

    if (suggestions.length === 0) {
        if (typeof window.hideSuggestionsForEditor === 'function') window.hideSuggestionsForEditor();
        return;
    }

    suggestions.forEach(suggestionText => {
        const item = document.createElement('div');
        item.classList.add('suggestion-item'); // Ensure you have CSS for this class
        item.textContent = suggestionText;
        item.addEventListener('mousedown', (e) => {
            e.preventDefault();
            fieldElement.value = suggestionText;
            if (typeof window.hideSuggestionsForEditor === 'function') window.hideSuggestionsForEditor();
            fieldElement.focus();
            fieldElement.dispatchEvent(new Event('input', { bubbles: true }));
            fieldElement.dispatchEvent(new Event('change', { bubbles: true }));
        });
        suggestionsBox.appendChild(item);
    });

    const rect = fieldElement.getBoundingClientRect();
    suggestionsBox.style.left = `${rect.left}px`;
    suggestionsBox.style.top = `${rect.bottom + window.scrollY}px`;
    suggestionsBox.style.width = `${rect.width}px`;
    suggestionsBox.classList.remove('hidden');
    window.currentEditorSuggestionInput(fieldElement);
};