// modal-html.js - Group and Variable Modal Logic and HTML Generation

let modalAceEditor = null; // Holds the Ace editor instance for the modal


function openGroupModal(type) {
    const groupModalBackdrop = document.querySelector('.modal-backdrop#add-group-modal');
    const groupModalContent = groupModalBackdrop ? groupModalBackdrop.querySelector('.modal') : null;

    if (!groupModalBackdrop || !groupModalContent) {
        console.error("Add group modal backdrop or content not found");
        if (typeof showToast === 'function') showToast("Error: Modal for groups not available.", 'error');
        return;
    }

    const modalTitleElement = document.getElementById('modal-title');
    if (modalTitleElement) {
        modalTitleElement.textContent = `Add ${type.charAt(0).toUpperCase() + type.slice(1)} Group`;
    }

    groupModalBackdrop.dataset.type = type; // Store the type of group being added

    groupModalBackdrop.classList.remove('hidden');
    groupModalContent.classList.remove('hidden');

    const groupNameInput = document.getElementById('group-name');
    if (groupNameInput) {
        groupNameInput.value = '';
        groupNameInput.focus();
    }
    // window.modalOpen = true; // If you have a global modalOpen flag
}

function closeGroupModal() {
    const groupModalBackdrop = document.querySelector('.modal-backdrop#add-group-modal');
    const groupModalContent = groupModalBackdrop ? groupModalBackdrop.querySelector('.modal') : null;

    if (groupModalBackdrop) {
        groupModalBackdrop.classList.add('hidden');
    }
    if (groupModalContent) {
        groupModalContent.classList.add('hidden');
    }
    // window.modalOpen = false; // If you have a global modalOpen flag
}

function isDuplicateGroup(name, containerType) {
    const normalizedName = name.trim().toLowerCase();
    const allTitles = document.querySelectorAll('.css-elements-container .css-elements-title');
    
    // Remove the container type check to search across all groups
    return Array.from(allTitles).some(title => 
        title.textContent.trim().toLowerCase() === normalizedName
    );
}

function saveGroup() {
    // This function saves a new UI group (e.g., a group for "Buttons" within the "selector" section).
    // Its core logic for creating the group HTML structure should remain.
    const addGroupModalEl = document.getElementById('add-group-modal');
    const groupNameInputEl = document.getElementById('group-name');

    if (!addGroupModalEl || !groupNameInputEl) {
        console.error("SaveGroup: Modal or group name input not found.");
        return;
    }

    const type = addGroupModalEl.dataset.type; // e.g., 'color', 'selector'
    let userInputName = groupNameInputEl.value.trim();

    if (!userInputName) {
        if(typeof showToast === 'function') showToast('Please enter a group name', 'warning');
        groupNameInputEl.focus();
        return;
    }

    // For 'selector' type, the userInputName is the UI display name for the group of selectors.
    let finalDisplayName = userInputName;

    if (isDuplicateGroup(finalDisplayName, type)) {
        if(typeof showToast === 'function') showToast(
            `A group named "${finalDisplayName}" already exists. Group names must be unique across all sections.`, 
            'warning'
        );
        groupNameInputEl.focus();
        return;
    }

    // The groupId for the container is based on its display type and name
    const groupId = `${type}-${userInputName.toLowerCase().replace(/\s+/g, '-')}`;

    const containerMap = {
        'color': document.getElementById('colors-container'),
        'image': document.getElementById('images-container'),
        'typography': document.getElementById('typography-container'), 
        'dimension': document.getElementById('dimensions-container'),
        'selector': document.getElementById('selector-container'), // Main container for selector UI groups
        'other': document.getElementById('other-container')
    };

    const container = containerMap[type];
    if (!container) {
        console.error('Container not found for group type:', type);
        return;
    }

    // createGroupHtml (from this file) should generate the HTML for the new UI group container
    // makeRowOfStandardGroup or makeRowOfSelectorGroup (from templates.js) are called inside createGroupHtml
    const html = createGroupHtml(type, finalDisplayName, groupId); 
    container.insertAdjacentHTML('beforeend', html);

    const groupElement = container.lastElementChild; // The new .css-elements-container for this group

    if (groupElement && typeof initGroupEventListeners === 'function') {
        initGroupEventListeners(groupElement, type); // Initialize listeners for the new group
    } else if (!groupElement) {
        console.error("Failed to find newly added group element in DOM after saveGroup.");
    }


    closeGroupModal();
    if (typeof updateCssOutput === 'function') updateCssOutput();
}

// createGroupHtml: Calls templates to make the UI for a new asset group (e.g., "Primary Colors", or a "Buttons" group in selector section)
function createGroupHtml(type, name, id) { 
    // type is 'color', 'image', 'selector', etc.
    // name is the display name of the group, e.g., "Primary Colors" or "Button Styles"
    // id is the DOM id for this group's main container, e.g., "color-primary-colors" or "selector-button-styles"
    
    // This function relies on makeRowOfStandardGroup or makeRowOfSelectorGroup from templates.js
    if (type === 'selector') {
        // For a group within the "selector" section, e.g., "Buttons", "Cards"
        // This group will contain multiple selector blocks (.btn, .card-title etc.)
        if (typeof makeRowOfSelectorGroup === 'function') { // from templates.js
            return makeRowOfSelectorGroup(id, name, type); // type here is 'selector'
        } else {
            console.error("makeRowOfSelectorGroup (from templates.js) is not defined.");
            return `<div>Error: Template for selector group "${escapeHtml(name)}" is missing.</div>`;
        }
    } else {
        // For groups of CSS Variables (colors, dimensions, etc.)
        if (typeof makeRowOfStandardGroup === 'function') { // from templates.js
            return makeRowOfStandardGroup(id, name, type);
        } else {
            console.error("makeRowOfStandardGroup (from templates.js) is not defined.");
            return `<div>Error: Template for standard group "${escapeHtml(name)}" is missing.</div>`;
        }
    }
}

async function saveNewAsset(stylingId, assetData) {
    console.log("[modal-html.js] saveNewAsset called. Received assetData:", JSON.parse(JSON.stringify(assetData)));
    
    const formData = new FormData();
    
    // Directly try to append 'asset_type' using 'assetData.type'.
    // The backend requires 'asset_type'.
    if (assetData && typeof assetData.type === 'string' && assetData.type.trim() !== '') {
        formData.append('asset_type', assetData.type.trim());
    } else {
        // This case should ideally not happen if assetData is always correctly populated.
        // If it does, the backend will reject it, which is the current error.
        console.error("CRITICAL ERROR in saveNewAsset: assetData.type is missing or empty. Backend will reject.", assetData);
        // Optionally, you could throw an error here to stop before the API call:
        // throw new Error("Asset type is missing or invalid, cannot save.");
    }
    
    // Append all other properties from assetData, excluding 'type' itself
    // (as we've already handled it as 'asset_type') and 'asset_type' if it accidentally exists in assetData.
    for (const key in assetData) {
        if (assetData.hasOwnProperty(key) && key !== 'type' && key !== 'asset_type') {
            if (assetData[key] !== undefined && assetData[key] !== null) {
                formData.append(key, assetData[key]);
            }
        }
    }

    // For debugging: Log the actual FormData being sent
    // console.log("FormData entries to be sent:");
    // for (let pair of formData.entries()) {
    //     console.log(`  ${pair[0]}: ${pair[1]}`);
    // }
    
    try {
        const response = await apiFetch(`${API_BASE_URL}/brand-stylings/${stylingId}/assets/`, { // API_BASE_URL must be defined
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error("[modal-html.js] saveNewAsset API Error Response Text:", errorText);
            throw new Error(`Failed to create asset: ${response.status} ${response.statusText} - ${errorText}`);
        }
        
        const savedAsset = await response.json();
        console.log("[modal-html.js] Asset created successfully via API:", savedAsset);
        return savedAsset;
    } catch (error) {
        // The console.error here will include the detailed error from the try block.
        console.error("[modal-html.js] Error in saveNewAsset fetch/processing:", error.message);
        if(typeof showToast === 'function') showToast(`Error saving asset: ${error.message}`, 'error');
        throw error; // Re-throw for the calling function (e.g., saveInlineRow) to catch
    }
}


// Function to be REPLACED in modal-html.js
function openClassRuleModal(baseUiGroupId) { 
    console.log("[modal-html.js] openClassRuleModal called with baseUiGroupId:", baseUiGroupId);

    const classRuleModalElement = document.getElementById('add-class-rule-modal'); 
    if (!classRuleModalElement) {
        console.error("[modal-html.js] ERROR: Modal element #add-class-rule-modal NOT FOUND.");
        if (typeof showToast === 'function') showToast("Error: Modal for adding CSS rules not found.", 'error');
        return;
    }

    const modalDialogElement = classRuleModalElement.querySelector('.modal'); 
    if (!modalDialogElement) {
        console.error("[modal-html.js] ERROR: Inner dialog element (.modal) within #add-class-rule-modal NOT FOUND.");
        if (typeof showToast === 'function') showToast("Error: Modal content for adding CSS rules not found.", 'error');
        return;
    }

    if (!baseUiGroupId || typeof baseUiGroupId !== 'string' || baseUiGroupId.trim() === '') {
        console.error("[modal-html.js] ERROR: openClassRuleModal received invalid or empty baseUiGroupId.");
        if (typeof showToast === 'function') showToast("Error: Invalid group context for adding selector.", 'error');
        return;
    }

    const targetUiGroupContainerElementId = `${baseUiGroupId}-container`;
    const targetUiGroupContainerElement = document.getElementById(targetUiGroupContainerElementId);

    if (!targetUiGroupContainerElement) {
        console.error(`[modal-html.js] ERROR: Target UI group container (expected ID: "${targetUiGroupContainerElementId}") was NOT FOUND.`);
        if (typeof showToast === 'function') showToast("Error: Target UI group for selector not found.", 'error');
        return;
    }

    const assetGroupNameFromDataset = targetUiGroupContainerElement.dataset.originalGroupName;
    if (!assetGroupNameFromDataset || assetGroupNameFromDataset.trim() === '') {
        console.error(`[modal-html.js] ERROR: Target UI group (ID: "${targetUiGroupContainerElementId}") missing 'data-original-group-name'.`);
        if (typeof showToast === 'function') showToast("Error: UI group metadata missing.", 'error');
        return;
    }
    
    // Store context data
    classRuleModalElement.dataset.targetUiContainerId = targetUiGroupContainerElementId; 
    classRuleModalElement.dataset.assetGroupName = assetGroupNameFromDataset; 
    console.log(`[modal-html.js] Context set: targetUiContainerId=${targetUiGroupContainerElementId}, assetGroupName=${assetGroupNameFromDataset}`);

    const selectorInput = document.getElementById('class-rule-selector');
    if (selectorInput) selectorInput.value = '.'; 
    
    // --- ACE EDITOR INITIALIZATION ---
    const rulesContainer = document.getElementById('class-rules-input');
    if (rulesContainer) {
        // Initialize Ace editor if not already done
        if (!window.modalAceEditor) {
            try {
                window.modalAceEditor = ace.edit(rulesContainer);
                window.modalAceEditor.setTheme("ace/theme/idle_fingers");
                window.modalAceEditor.session.setMode("ace/mode/css");
                window.modalAceEditor.setOptions({
                    fontSize: "13px",
                    useWorker: false,
                    showGutter: true,
                    highlightActiveLine: true,
                    showPrintMargin: false,
                    wrap: true,
                    enableBasicAutocompletion: true,
                    enableLiveAutocompletion: true
                });
                
                // Ensure editor resizes properly when modal opens
                window.modalAceEditor.container.style.position = "absolute";
                window.modalAceEditor.container.style.width = "100%";
                window.modalAceEditor.container.style.height = "100%";
                
                console.log("[modal-html.js] Ace editor for modal initialized on #class-rules-input.");
            } catch (err) {
                console.error("[modal-html.js] Error initializing Ace editor for modal:", err);
            }
        }
        
        if (window.modalAceEditor) {
            window.modalAceEditor.setValue("", -1);
            // Force a resize after modal is visible
            setTimeout(() => {
                window.modalAceEditor.resize(true);
                window.modalAceEditor.renderer.updateFull();
            }, 50);
        }
    } else {
        console.error("[modal-html.js] #class-rules-input container not found for Ace editor.");
    }
    // --- END ACE EDITOR INITIALIZATION ---

    classRuleModalElement.classList.remove('hidden'); 
    modalDialogElement.classList.remove('hidden');   

    const globalBackdrop = document.getElementById('modal-backdrop');
    if (globalBackdrop && globalBackdrop !== classRuleModalElement) {
        globalBackdrop.classList.remove('hidden');
    }
    
    if (selectorInput) { // Focus selector input first
        selectorInput.focus();
        selectorInput.setSelectionRange(1, 1); 
    } else if (window.modalAceEditor) {
        window.modalAceEditor.focus(); // Then focus editor if selector input missing
    }
    console.log("[modal-html.js] Add Class/ID Rule modal should now be open with Ace editor.");
}

// Function to be REPLACED in modal-html.js
function closeClassRuleModal() {
    const classRuleModalElement = document.getElementById('add-class-rule-modal'); 
    if (classRuleModalElement) {
        // Don't destroy the editor, just hide the modal
        hideModal(classRuleModalElement);
    }
}

// Function to be REPLACED in modal-html.js
async function addClassRuleToGroup(targetUiContainerId, assetGroupNameForDeclarations, newSelectorString) {
    // Get rules directly from the persisted editor instance
    const rulesFromEditor = window.modalAceEditor ? window.modalAceEditor.getValue().trim() : "";
    
    if (!targetUiContainerId || !assetGroupNameForDeclarations || !newSelectorString || !window.currentStylingId) {
        console.error("addClassRuleToGroup: Missing context.");
        if(typeof showToast === 'function') showToast("Error: Cannot create selector, context missing.", 'error');
        return;
    }

    if (typeof parseCssDeclarations !== 'function') {
        console.error("parseCssDeclarations function is not available.");
        if(typeof showToast === 'function') showToast("Error: Rule parsing function missing.", 'error');
        return;
    }
    const declarationsToCreate = parseCssDeclarations(rulesFromEditor || "");

    if (declarationsToCreate.length === 0 && (rulesFromEditor || "").trim() !== "") {
        if(typeof showToast === 'function') showToast("Warning: No valid CSS rules found in editor. Selector not added.", 'warning');
        return; 
    }
    if (declarationsToCreate.length === 0) {
        if(typeof showToast === 'function') showToast("No CSS rules provided in editor. Please add rules.", 'info');
        if(window.modalAceEditor) window.modalAceEditor.focus();
        else document.getElementById('class-rules-input')?.focus();
        return; 
    }

    const createdDeclarationAssets = []; 
    let firstError = null;

    for (const decl of declarationsToCreate) {
        const assetData = {
            type: 'css_declaration',
            name: decl.property,           
            value: decl.value,             
            selector: newSelectorString,   
            is_important: decl.is_important,
            group_name: assetGroupNameForDeclarations,
            description: "" // Default empty description for new rules from modal
        };
        
        try {
            // saveNewAsset is in this file and should be globally available via window.saveNewAsset
            if (typeof window.saveNewAsset !== 'function') throw new Error("saveNewAsset function is not defined globally.");
            const savedAsset = await window.saveNewAsset(window.currentStylingId, assetData);
            createdDeclarationAssets.push(savedAsset);
        } catch (error) {
            firstError = error; 
            console.error(`Failed to save declaration "${decl.property}" for selector "${newSelectorString}". Error:`, error);
            if(typeof showToast === 'function') showToast(`Error saving rule "${decl.property}": ${error.message.substring(0,100)}`, 'error');
            break; 
        }
    }

    if (firstError && createdDeclarationAssets.length > 0) {
        console.warn("Partial success: Some declarations created before error.", createdDeclarationAssets);
        if(typeof showToast === 'function') showToast(`Error: Selector partially added. Some rules failed.`, 'error');
    } else if (firstError) {
        return; 
    }

    if (createdDeclarationAssets.length > 0) {
        const targetUiGroupContainerEl = document.getElementById(targetUiContainerId);
        // The placeholder to add a new SELECTOR BLOCK, not an individual rule.
        const addSelectorPlaceholder = targetUiGroupContainerEl ? targetUiGroupContainerEl.querySelector('.variable-group .add-variable-row[data-group^="selector-"]') : null;

        if (targetUiGroupContainerEl && addSelectorPlaceholder) {
            const selectorStyleInfo = (typeof window.getSelectorTypeAndStyle === 'function') ? 
                                      window.getSelectorTypeAndStyle(newSelectorString) : 
                                      { color: 'var(--text-color-default, #ccc)', type: 'default' };
            
            const ruleDataForTemplate = createdDeclarationAssets.map(asset => ({
                id: asset.id, property: asset.name, value: asset.value,
                is_important: asset.is_important, enabled: true, 
                description: asset.description || "", // Pass description
                inheritanceData: null 
            }));

            if (typeof window.makeIndividualSelectorEntryHtml === 'function') { 
                const newSelectorBlockHtml = window.makeIndividualSelectorEntryHtml(
                    createdDeclarationAssets[0].id, 
                    newSelectorString,
                    assetGroupNameForDeclarations, 
                    ruleDataForTemplate, 
                    selectorStyleInfo,
                    true 
                );
                addSelectorPlaceholder.insertAdjacentHTML('beforebegin', newSelectorBlockHtml);
                const newSelectorBlockElement = addSelectorPlaceholder.previousElementSibling;

                if (newSelectorBlockElement && typeof window.initClassRuleEntryListeners === 'function') { 
                    window.initClassRuleEntryListeners(newSelectorBlockElement);
                }
                if (typeof showToast === 'function' && !firstError) showToast(`Selector "${newSelectorString}" added.`, 'success');
            } else {
                console.error("makeIndividualSelectorEntryHtml (from templates.js) is not defined.");
                if(typeof showToast === 'function') showToast(`Error: UI template for selector block missing.`, 'error');
            }
        } else {
             console.error(`Target UI group or placeholder not found for rendering new selector in ${targetUiContainerId}.`);
             if(typeof showToast === 'function' && !firstError) showToast(`Error: Could not display new selector.`, 'error');
        }
    }
    
    if (typeof updateCssOutput === 'function') updateCssOutput();
    if (typeof closeClassRuleModal === 'function') closeClassRuleModal(); // This will clear Ace editor
    if (typeof updateAssetCounts === 'function' && window.currentStylingId && createdDeclarationAssets.length > 0) {
        updateAssetCounts(window.currentStylingId); 
    }
}

// Function to determine the type and style of a CSS selector
// This function is used by templates.js to style selectors in the UI.
// It returns an object with 'color' and 'type' properties.
function getSelectorTypeAndStyle(selector) {
    let color = "var(--text-color)"; // Default color
    let selectorType = "default";    // Default type
    const trimmedSelector = selector.trim();

    if (!trimmedSelector) {
        return { color, type: selectorType };
    }

    if (trimmedSelector.startsWith('#')) {
        color = "var(--color-id-selector, hsl(120, 60%, 65%))"; 
        selectorType = "id";
    } else if (trimmedSelector.startsWith('.')) {
        color = "var(--color-class-selector, hsl(200, 70%, 70%))"; 
        selectorType = "class";
    } else if (trimmedSelector.startsWith('::')) { 
        color = "var(--color-pseudo-element-selector, hsl(270, 60%, 70%))"; 
        selectorType = "pseudo-element";
    } else if (trimmedSelector.startsWith(':')) { 
        color = "var(--color-pseudo-class-selector, hsl(45, 80%, 65%))"; 
        selectorType = "pseudo-class";
    } else if (trimmedSelector.startsWith('[') && trimmedSelector.endsWith(']')) {
        color = "var(--color-attribute-selector, hsl(30, 80%, 65%))"; 
        selectorType = "attribute";
    } else if (trimmedSelector.startsWith('@')) { // <<< ADDED THIS CHECK FOR AT-RULES
        color = "var(--color-at-rule-selector, hsl(320, 60%, 70%))"; // New color: pink/magenta-ish
        selectorType = "at-rule";
    } else if (trimmedSelector === '*') {
        color = "var(--color-universal-selector, hsl(0, 0%, 60%))"; 
        selectorType = "universal";
    } else {
        const firstTokenMatch = trimmedSelector.match(/^([a-zA-Z][a-zA-Z0-9-]*)/);
        if (firstTokenMatch) {
            const firstToken = firstTokenMatch[0].toLowerCase();
            const knownTags = [
                "a", "abbr", "address", "article", "aside", "audio", "b", "bdi", "bdo", "blockquote", "body", 
                "button", "canvas", "caption", "cite", "code", "data", "datalist", "dd", "del", "details", 
                "dfn", "dialog", "div", "dl", "dt", "em", "embed", "fieldset", "figcaption", "figure", 
                "footer", "form", "h1", "h2", "h3", "h4", "h5", "h6", "head", "header", "hr", "html", 
                "i", "iframe", "img", "input", "ins", "kbd", "label", "legend", "li", "link", "main", 
                "map", "mark", "meta", "meter", "nav", "noscript", "object", "ol", "optgroup", "option", 
                "output", "p", "param", "picture", "pre", "progress", "q", "s", "samp", "script", 
                "section", "select", "small", "source", "span", "strong", "style", "sub", "summary", 
                "sup", "svg", "table", "tbody", "td", "template", "textarea", "tfoot", "th", "thead", 
                "time", "title", "tr", "u", "ul", "var", "video"
            ];
            if (knownTags.includes(firstToken)) {
                color = "var(--color-tag-selector, hsl(0, 70%, 70%))"; 
                selectorType = "tag";
            } else if (/^[a-zA-Z]/.test(firstToken)) { 
                color = "var(--color-custom-tag-selector, hsl(180, 50%, 65%))"; 
                selectorType = "custom-tag-or-complex";
            } else {
                color = "var(--color-complex-selector, var(--text-color))"; 
                selectorType = "complex";
            }
        } else {
            color = "var(--color-complex-selector, var(--text-color))"; 
            selectorType = "complex";
        }
    }
    return { color, type: selectorType };
}

// Ensure functions intended to be global are explicitly added to window
window.openGroupModal = openGroupModal;
window.closeGroupModal = closeGroupModal;
window.saveGroup = saveGroup;
window.createGroupHtml = createGroupHtml; // If called from elsewhere directly
window.saveNewAsset = saveNewAsset; // Used by modal-handlers.js

window.openClassRuleModal = openClassRuleModal;
window.closeClassRuleModal = closeClassRuleModal;
window.addClassRuleToGroup = addClassRuleToGroup; // This will be called from init.js event listener
window.getSelectorTypeAndStyle = getSelectorTypeAndStyle; // If used by templates.js directly

// Helper for escaping HTML, define if not already globally available from ui-renderings.js
if (typeof escapeHtml !== 'function') {
    function escapeHtml(unsafe) {
        if (typeof unsafe !== 'string') return '';
        return unsafe
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
    }
    window.escapeHtml = escapeHtml;
}