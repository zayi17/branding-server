// --- Helper: escapeHtml (ensure it's at the top or globally available) ---
if (typeof escapeHtml === 'undefined') {
    function escapeHtml(unsafe) {
        if (typeof unsafe !== 'string') return '';
        return unsafe.replace(/&/g, "&amp;")
                     .replace(/</g, "&lt;")
                     .replace(/>/g, "&gt;")
                     .replace(/"/g, "&quot;")
                     .replace(/'/g, "&#039;");
    }
}

// --- Helper: isValidColor (ensure it's at the top or globally available) ---
if (typeof isValidColor === 'undefined') {
    function isValidColor(strColor) {
        if (!strColor || typeof strColor !== 'string') return false;
        const s = new Option().style;
        s.color = strColor;
        return s.color !== '';
    }
}

// --- Modal Preview Logic (ensure these are present from your file) ---
function ensurePreviewModalExists() { //
    if (!document.getElementById('variable-preview-modal')) {
        const modalHTML = `
            <div id="variable-preview-modal" class="modal-backdrop hidden">
                <div class="preview-modal-content">
                    <div class="preview-modal-header">
                        <h3 class="preview-modal-title">Asset Preview</h3>
                        <button class="preview-close-btn" aria-label="Close preview">×</button>
                    </div>
                    <div class="preview-modal-body">
                        <div id="preview-content-modal"></div>
                    </div>
                    <div class="preview-modal-footer">
                        <div id="preview-info-modal"></div>
                        <button class="btn secondary-btn preview-close-btn">Close</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        const previewModal = document.getElementById('variable-preview-modal');
        if (previewModal) {
            previewModal.addEventListener('click', (e) => {
                if (e.target === previewModal) closePreviewModal();
            });
            previewModal.querySelectorAll('.preview-close-btn').forEach(btn => {
                btn.addEventListener('click', closePreviewModal);
            });
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && previewModal && !previewModal.classList.contains('hidden')) {
                    closePreviewModal();
                }
            });
        }
    }
}

function handleImagePreviewClick(event) {
    const img = event.currentTarget;
    const variableRow = img.closest('.variable-row');
    if (!variableRow) return;

    const nameInput = variableRow.querySelector('.variable-name .editable-field');
    const valueInput = variableRow.querySelector('.variable-value-wrapper .variable-value-input');
    const variableName = nameInput ? nameInput.value : 'Unknown Variable';
    const variableValue = valueInput ? valueInput.value : '';

    const modalTitle = document.querySelector('#variable-preview-modal .preview-modal-title');
    if (modalTitle) modalTitle.textContent = `Image Preview: ${escapeHtml(variableName)}`;

    const previewContentModal = document.getElementById('preview-content-modal');
    if (previewContentModal) {
        previewContentModal.innerHTML = ''; // Clear previous
        const previewImg = document.createElement('img');
        previewImg.src = img.src;
        previewImg.className = 'preview-image'; // Defined in previews.css
        previewImg.alt = `Preview of ${escapeHtml(variableName)}`;
        previewContentModal.appendChild(previewImg);
        
        const previewInfoModal = document.getElementById('preview-info-modal');
        if (previewInfoModal) {
            previewInfoModal.innerHTML = `
                <div class="preview-info-grid">
                    <div class="preview-info-label">Variable:</div> <div class="preview-info-value">${escapeHtml(variableName)}</div>
                    <div class="preview-info-label">URL:</div> <div class="preview-info-value">${escapeHtml(variableValue)}</div>
                    <div class="preview-info-label">Dimensions:</div> <div class="preview-info-value" id="image-dimensions-modal">Loading...</div>
                </div>`;
            previewImg.onload = function() {
                const dimensionsElement = document.getElementById('image-dimensions-modal');
                if (dimensionsElement) dimensionsElement.textContent = `${this.naturalWidth} × ${this.naturalHeight} pixels`;
            };
            previewImg.onerror = function() {
                 const dimensionsElement = document.getElementById('image-dimensions-modal');
                if (dimensionsElement) dimensionsElement.textContent = "Could not load image";
            };
        }
    }
    openPreviewModal();
}

function openPreviewModal() {
    const modal = document.getElementById('variable-preview-modal');
    if (modal) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
}

function closePreviewModal() {
    const modal = document.getElementById('variable-preview-modal');
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }
}

function ensurePreviewStylesLoaded() { //
    if (!document.querySelector('link[href="/css/previews.css"]')) {
        const cssLink = document.createElement('link');
        cssLink.rel = 'stylesheet';
        cssLink.href = '/css/previews.css';
        document.head.appendChild(cssLink);
    }
}





// In variable-previews.js

// Ensure helper functions like escapeHtml, isValidColor are available globally or defined above.
// Ensure modal functions like ensurePreviewModalExists are available.

/**
 * Sets up inline interactive previews for a single variable row,
 * resolving var() references for better preview accuracy.
 * @param {HTMLElement} row - The variable row element.
 */
function initVariablePreviewsForRow(row) {
    if (!row || !(row instanceof HTMLElement)) {
        console.error("[Preview System] initVariablePreviewsForRow: Row is invalid. Skipping.", row);
        return;
    }

    let variableRowName = row.dataset.variableName || row.dataset.id || `UnknownRow_${Date.now()}`;
    // console.log(`[Preview ${variableRowName}] initVariablePreviewsForRow: START.`);

    ensurePreviewModalExists(); 

    const type = row.dataset.type;
    const variablePreviewContainer = row.querySelector('.variable-preview');
    const textInput = row.querySelector('.variable-value-wrapper .variable-value-input, .variant-value .editable-field');

    if (!textInput) {
        return;
    }
if (type === 'color') {
        const colorSwatch = variablePreviewContainer.querySelector('.color-preview');
        const colorPickerInput = variablePreviewContainer.querySelector('.color-picker-input');

        if (colorSwatch && colorPickerInput && textInput) {
            const pickerWrapper = colorPickerInput.closest('.variable-preview');

            const syncPreviewFromTextInput = () => {
                const currentTextValue = textInput.value.trim();
                const isVar = currentTextValue.startsWith('var(');
                
                colorPickerInput.disabled = isVar;
                if (pickerWrapper) pickerWrapper.classList.toggle('picker-disabled', isVar);

                let colorForSwatch = 'transparent';
                if (isVar) {
                    let resolvedForSwatch = currentTextValue;
                    const varRefRegexUpdate = /^var\(\s*(--[a-zA-Z0-9-_]+)\s*(?:,[^)]*)?\)$/;
                    const newMatch = currentTextValue.match(varRefRegexUpdate);
                    if (newMatch && window.variableMap && typeof window.getResolvedCssVariableValue === 'function') {
                        const newTargetVar = newMatch[1];
                        const newRes = window.getResolvedCssVariableValue(newTargetVar, window.variableMap);
                        if (newRes.status === 'resolved' && isValidColor(newRes.value)) {
                            resolvedForSwatch = newRes.value;
                        }
                    }
                    if (isValidColor(resolvedForSwatch)) colorForSwatch = resolvedForSwatch;
                } else if (isValidColor(currentTextValue)) {
                    colorForSwatch = currentTextValue;
                    colorPickerInput.value = window.convertToHex ? window.convertToHex(currentTextValue) : currentTextValue;
                }
                colorSwatch.style.backgroundColor = colorForSwatch;
            };

            if (!textInput.hasAttribute('data-color-preview-listener-set')) {
                textInput.addEventListener('input', syncPreviewFromTextInput);
                textInput.setAttribute('data-color-preview-listener-set', 'true');
            }
            syncPreviewFromTextInput();

            colorSwatch.onclick = () => {
                if (!colorPickerInput.disabled) {
                    textInput.dataset.originalValue = textInput.value;
                    colorPickerInput.click();
                }
            };

            colorPickerInput.addEventListener('change', async () => {
                if (colorPickerInput.disabled) return;

                const valueInTextFieldBeforeCommit = textInput.value;
                const newColorFromPicker = colorPickerInput.value;

                if (valueInTextFieldBeforeCommit === newColorFromPicker) {
                    return; 
                }

                // Update UI first
                textInput.value = newColorFromPicker;
                colorSwatch.style.backgroundColor = newColorFromPicker;
                textInput.dispatchEvent(new Event('input', { bubbles: true }));
                textInput.dispatchEvent(new Event('change', { bubbles: true }));

                // --- NEW: Differentiated Save Logic ---
                const variantRowElement = textInput.closest('.variant-row');
                const parentRowElement = textInput.closest('.variable-row');

                if (variantRowElement) {
                    // --- This is a VARIANT ---
                    const variantId = variantRowElement.dataset.databaseId || variantRowElement.dataset.id;
                    const parentAssetId = parentRowElement ? parentRowElement.dataset.assetId : null;

                    if (!variantId || !parentAssetId || !window.currentStylingId) {
                        console.error("Cannot save variant: Missing variantId, parentAssetId, or stylingId.");
                        if (typeof showToast === 'function') showToast('Cannot save: missing data.', 'error');
                        return;
                    }

                    try {
                        // Call the specific updateVariant function from api.js
                        await updateVariant(window.currentStylingId, parentAssetId, variantId, { value: newColorFromPicker });
                        if (typeof showToast === 'function') showToast('Variant color updated.', 'success');
                        if (typeof updateCssOutput === 'function') updateCssOutput();
                    } catch (error) {
                        console.error("Error saving variant color:", error);
                        if (typeof showToast === 'function') showToast(`Error saving variant: ${error.message || 'Unknown'}`, 'error');
                        textInput.value = valueInTextFieldBeforeCommit; // Revert on error
                        syncPreviewFromTextInput();
                    }

                } else if (parentRowElement && !parentRowElement.classList.contains('editing-mode')) {
                    // --- This is a main VARIABLE (Original Logic) ---
                    const assetId = parentRowElement.dataset.assetId;
                    const currentStylingId = window.currentStylingId;
                    if (!assetId || !currentStylingId) return;

                    const nameInput = parentRowElement.querySelector('.variable-name .editable-field');
                    const importanceCheckbox = parentRowElement.querySelector('.importance-checkbox');
                    const assetData = { value: newColorFromPicker };
                    if (nameInput) assetData.name = nameInput.value;
                    if (importanceCheckbox) assetData.is_important = importanceCheckbox.checked;

                    try {
                        const updatedAsset = await window.updateAsset(currentStylingId, assetId, assetData);
                        if (updatedAsset) {
                            textInput.dataset.originalValue = newColorFromPicker;
                            if (typeof showToast === 'function') showToast('Color updated & saved.', 'success');
                            if (typeof window.initSharedCssVariableDiscovery === 'function') await window.initSharedCssVariableDiscovery(currentStylingId);
                            if (typeof updateCssOutput === 'function') updateCssOutput();
                            if (typeof updateAssetCounts === 'function') updateAssetCounts(currentStylingId);
                        }
                    } catch (error) {
                        textInput.value = valueInTextFieldBeforeCommit;
                        syncPreviewFromTextInput();
                    }
                }
            });


            colorPickerInput.addEventListener('input', () => {
                if (colorPickerInput.disabled) return;
                colorSwatch.style.backgroundColor = colorPickerInput.value;
            });
        }
    }

    let assetDirectValue = textInput.value;
    if (assetDirectValue === undefined || assetDirectValue === null || assetDirectValue.trim() === '') {
        assetDirectValue = row.dataset.value || '';
    }
    
    let valueForPreview = assetDirectValue; 

    if (typeof assetDirectValue === 'string' && assetDirectValue.trim().startsWith('var(')) {
        const varRefRegex = /^var\(\s*(--[a-zA-Z0-9-_]+)\s*(?:,[^)]*)?\)$/;
        const match = assetDirectValue.trim().match(varRefRegex);
        if (match && window.variableMap && typeof window.getResolvedCssVariableValue === 'function') {
            const targetVarName = match[1];
            const resolutionResult = window.getResolvedCssVariableValue(targetVarName, window.variableMap);
            if (resolutionResult.status === 'resolved') {
                valueForPreview = resolutionResult.value;
            } else {
                valueForPreview = assetDirectValue; 
            }
        } else {
            valueForPreview = assetDirectValue; 
        }
    }

    if (type === 'color') {
        const colorSwatch = variablePreviewContainer ? variablePreviewContainer.querySelector('.color-preview') : null;
        const colorPickerInput = variablePreviewContainer ? variablePreviewContainer.querySelector('.color-picker-input') : null;
        if (typeof updateColorPreviewUI === 'function') { 
            updateColorPreviewUI(textInput, colorSwatch, colorPickerInput, valueForPreview, variableRowName);
        } else {
             console.warn(`[Preview ${variableRowName}] updateColorPreviewUI function not defined.`);
        }
    } else if (type === 'image') {
        const imgElement = variablePreviewContainer ? variablePreviewContainer.querySelector('img.clickable-image-preview') : null;
        if (imgElement) {
            // Call updateImagePreview to set the src correctly
            if (typeof updateImagePreview === 'function') { // updateImagePreview is in this file
                updateImagePreview(textInput, imgElement, valueForPreview, variableRowName);
            } else {
                 console.warn(`[Preview ${variableRowName}] updateImagePreview function not defined. Image src might be incorrect.`);
                 // Fallback basic src set if updateImagePreview is missing
                 let basicSrc = '';
                 if (valueForPreview && typeof window.extractImageUrlForPreview === 'function') {
                    basicSrc = window.extractImageUrlForPreview(valueForPreview, window.variableMap || new Map(), new Set());
                 } else if (valueForPreview && !valueForPreview.startsWith('var(')) {
                    const matchUrl = valueForPreview.match(/url\(['"]?(.*?)['"]?\)/i);
                    basicSrc = matchUrl && matchUrl[1] ? matchUrl[1] : valueForPreview;
                 }
                 imgElement.src = basicSrc;
                 imgElement.style.display = basicSrc ? 'block' : 'none';
            }

            // **** ADD THIS BLOCK TO RE-ATTACH THE CLICK LISTENER ****
            if (!imgElement.hasAttribute('data-modal-click-listener-set')) {
                imgElement.addEventListener('click', handleImagePreviewClick);
                imgElement.setAttribute('data-modal-click-listener-set', 'true');
            }
            // **** END OF ADDED BLOCK ****

        } else if (variablePreviewContainer) {
            console.warn(`[Preview ${variableRowName}] Image element (img.clickable-image-preview) not found in preview container.`);
        }
    } else if (type === 'font') {
        const fontSampleElement = variablePreviewContainer ? variablePreviewContainer.querySelector('span') : null;
        if (fontSampleElement && typeof updateFontPreview === 'function') { 
             updateFontPreview(textInput, fontSampleElement, valueForPreview, variableRowName);
        }
    } else if (type === 'dimension') {
         const dimensionPreviewElement = variablePreviewContainer ? variablePreviewContainer.querySelector('div > div') : null;
         if (dimensionPreviewElement && typeof updateDimensionPreview === 'function') { 
             updateDimensionPreview(textInput, dimensionPreviewElement, valueForPreview, variableRowName);
         }
    }

    if (textInput && !textInput.hasAttribute('data-dynamic-preview-listener-set')) {
        textInput.addEventListener('input', () => {
            let currentTextValue = textInput.value.trim();
            let valForLivePreview = currentTextValue;

            if (currentTextValue.startsWith('var(')) {
                const varRefRegex = /^var\(\s*(--[a-zA-Z0-9-_]+)\s*(?:,[^)]*)?\)$/;
                const match = currentTextValue.match(varRefRegex);
                if (match && window.variableMap && typeof window.getResolvedCssVariableValue === 'function') {
                    const targetVarName = match[1];
                    const resolutionResult = window.getResolvedCssVariableValue(targetVarName, window.variableMap);
                    if (resolutionResult.status === 'resolved') {
                        valForLivePreview = resolutionResult.value;
                    }
                }
            }
            
            if (type === 'color') {
                const swatch = variablePreviewContainer ? variablePreviewContainer.querySelector('.color-preview') : null;
                const picker = variablePreviewContainer ? variablePreviewContainer.querySelector('.color-picker-input') : null;
                if (typeof updateColorPreviewUI === 'function') updateColorPreviewUI(textInput, swatch, picker, valForLivePreview, variableRowName);
            } else if (type === 'image') {
                const imgEl = variablePreviewContainer ? variablePreviewContainer.querySelector('img.clickable-image-preview') : null;
                if (imgEl && typeof updateImagePreview === 'function') updateImagePreview(textInput, imgEl, valForLivePreview, variableRowName);
            } else if (type === 'font') {
                const fontEl = variablePreviewContainer ? variablePreviewContainer.querySelector('span') : null;
                if (fontEl && typeof updateFontPreview === 'function') updateFontPreview(textInput, fontEl, valForLivePreview, variableRowName);
            } else if (type === 'dimension') {
                const dimEl = variablePreviewContainer ? variablePreviewContainer.querySelector('div > div') : null;
                if (dimEl && typeof updateDimensionPreview === 'function') updateDimensionPreview(textInput, dimEl, valForLivePreview, variableRowName);
            }
        });
        textInput.setAttribute('data-dynamic-preview-listener-set', 'true');
    }
    // console.log(`[Preview ${variableRowName}] initVariablePreviewsForRow END.`);
}

/**
 * Initialize/re-initialize preview functionality for all relevant variable previews on the page.
 */
function initVariablePreviews() {
    console.log('[Preview System] initVariablePreviews() CALLED.'); //

    ensurePreviewModalExists(); //
    ensurePreviewStylesLoaded(); //

    const rows = document.querySelectorAll('.variable-row'); //
    console.log(`[Preview System] Found ${rows.length} .variable-row elements to process for previews.`); //

    rows.forEach((row, index) => { //
        console.log(`[Preview System] Iteration ${index + 1}/${rows.length} in initVariablePreviews. Calling initVariablePreviewsForRow for:`, row.dataset.variableName || row.dataset.id);
        try {
            // Ensure the globally exposed function is called if preferred,
            // or the local one if this is self-contained.
            // Since window.initVariablePreviewsForRow is set, this will use the function defined above.
            window.initVariablePreviewsForRow(row);
        } catch (e) {
            console.error(`[Preview System] Error during initVariablePreviewsForRow call for row ${index + 1}:`, e, row);
        }
    });
    console.log('[Preview System] initVariablePreviews() FINISHED.');
}




// ADD THIS ENTIRE BLOCK
function updateColorPreviewUI(textInput, colorSwatch, colorPickerInput, resolvedColorValue) {
    if (!colorSwatch || !colorPickerInput || !textInput) return;
    if (isValidColor(resolvedColorValue)) {
        colorSwatch.style.backgroundColor = resolvedColorValue;
    } else {
        colorSwatch.style.backgroundColor = 'transparent';
    }
    if (!colorSwatch.hasAttribute('data-click-listener-set')) {
        colorSwatch.addEventListener('click', () => colorPickerInput.click());
        colorSwatch.setAttribute('data-click-listener-set', 'true');
    }
}
function updateImagePreview(textInput, imgElement, resolvedImageUrl) {
    if (!imgElement) return;
    let finalSrc = '';
    if (resolvedImageUrl) {
        const match = resolvedImageUrl.match(/url\(['"]?(.*?)['"]?\)/i);
        finalSrc = match ? match[1] : resolvedImageUrl;
    }
    imgElement.src = finalSrc;
    imgElement.style.display = finalSrc ? 'block' : 'none';
    if (!imgElement.hasAttribute('data-modal-click-listener-set')) {
        imgElement.addEventListener('click', handleImagePreviewClick);
        imgElement.setAttribute('data-modal-click-listener-set', 'true');
    }
}
function updateFontPreview(textInput, fontSampleElement, resolvedFontValue) {
    if (fontSampleElement && resolvedFontValue) {
        fontSampleElement.style.fontFamily = resolvedFontValue.split(',')[0].trim();
    }
}

function updateDimensionPreview(textInput, dimensionPreviewElement, resolvedDimensionValue) {
    if (dimensionPreviewElement && resolvedDimensionValue) {
        let height = '10px';
        if (typeof resolvedDimensionValue === 'string' && resolvedDimensionValue.includes('px')) {
            const match = resolvedDimensionValue.match(/(\d+)px/);
            if (match && match[1]) {
                height = Math.min(20, Math.max(4, parseInt(match[1]))) + 'px';
            }
        }
        dimensionPreviewElement.style.height = height;
    }
}




window.initVariablePreviews = initVariablePreviews; //
window.initVariablePreviewsForRow = initVariablePreviewsForRow;
