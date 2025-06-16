// public/scripts/backup-system.js

/**
 * Initializes the entire backup system UI and event listeners.
 * This should be called once the DOM is loaded.
 */
function initBackupSystem() {
    setupBackupEventListeners();
    loadCurrentDbInfo();
    loadBackupList();
}

/**
 * Fetches and displays information about the current database.
 */
async function loadCurrentDbInfo() {
    const dbInfoDate = document.getElementById('db-info-date');
    const dbInfoRecords = document.getElementById('db-info-records');
    const dbPath = document.getElementById('db-info-path');

    if (!dbInfoDate || !dbInfoRecords || !dbPath) {
        console.warn("One or more DB info elements are missing from the DOM.");
        return;
    }

    try {
        const response = await apiFetch(`${API_BASE_URL}/system/db-info`);
        if (!response.ok) {
            throw new Error(`Server responded with status: ${response.status}`);
        }
        const data = await response.json();

        // Display database path and modification date
        dbPath.textContent = data.path;
        dbInfoDate.textContent = `Last modified: ${new Date(data.modified_time).toLocaleString()}`;
        
        // Display record counts
        const recordsText = `Sites: ${data.record_counts.sites}, 
                             Stylings: ${data.record_counts.brand_stylings}, 
                             Assets: ${data.record_counts.style_assets}`;
        dbInfoRecords.textContent = recordsText;

    } catch (error) {
        console.error('Error fetching current DB info:', error);
        dbInfoDate.textContent = 'Could not load database information.';
        dbInfoRecords.textContent = '';
        dbPath.textContent = 'N/A';
        if (typeof showToast === 'function') {
            showToast("Failed to load database info.", "error");
        }
    }
}

/**
 * Fetches and displays the list of available backup files.
 */
async function loadBackupList() {
    const listBox = document.getElementById('items-list-box');
    if (!listBox) return;

    try {
        const response = await apiFetch(`${API_BASE_URL}/system/backups`);
        if (!response.ok) {
            throw new Error(`Server responded with status: ${response.status}`);
        }
        const backups = await response.json();
        
        listBox.innerHTML = ''; // Clear existing list

        if (backups.length === 0) {
            listBox.innerHTML = '<option disabled>No backups found.</option>';
        } else {
            backups.forEach(backup => {
                const option = document.createElement('option');
                option.value = backup.filename;
                // Format size to be more readable
                const sizeInMB = (backup.size / (1024 * 1024)).toFixed(2);
                option.textContent = `${backup.filename} (${sizeInMB} MB) - ${new Date(backup.modified_time).toLocaleString()}`;
                listBox.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error fetching backup list:', error);
        listBox.innerHTML = '<option disabled>Failed to load backups.</option>';
        if (typeof showToast === 'function') {
            showToast("Failed to load backup list.", "error");
        }
    }
}

/**
 * Sets up event listeners for all buttons in the backup/restore UI.
 */
function setupBackupEventListeners() {
    // Backup Current Database
    document.getElementById('backup-btn').addEventListener('click', async () => {
        if (!confirm('Are you sure you want to back up the current database?')) return;

        try {
            const response = await apiFetch(`${API_BASE_URL}/system/backup`, { method: 'POST' });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Backup failed');
            }
            const result = await response.json();
            showToast(result.message, 'success');
            loadBackupList(); // Refresh the list
        } catch (error) {
            showToast(`Error: ${error.message}`, 'error');
        }
    });

    // Restore from Selected Backup
    document.getElementById('restore-btn').addEventListener('click', async () => {
        const selectedFile = document.getElementById('items-list-box').value;
        if (!selectedFile) {
            showToast('Please select a backup to restore.', 'warning');
            return;
        }

        if (!confirm(`This will back up the current database and then replace it with '${selectedFile}'. Are you sure you want to continue?`)) return;

        try {
            const response = await apiFetch(`${API_BASE_URL}/system/restore/${selectedFile}`, { method: 'POST' });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Restore failed');
            }
            const result = await response.json();
            showToast(result.message, 'success');
            
            // Reload the entire page to reflect the new database state
            setTimeout(() => window.location.reload(), 1500);
        } catch (error) {
            showToast(`Error: ${error.message}`, 'error');
        }
    });

    // Download Selected Backup
    document.getElementById('download-selected-btn').addEventListener('click', () => {
        const selectedFile = document.getElementById('items-list-box').value;
        if (!selectedFile) {
            showToast('Please select a backup to download.', 'warning');
            return;
        }
        // Trigger download by navigating to the download URL
        window.location.href = `${API_BASE_URL}/system/backups/download/${selectedFile}`;
    });

    // Delete Selected Backup
    document.getElementById('delete-backup-btn').addEventListener('click', async () => {
        const selectedFile = document.getElementById('items-list-box').value;
        if (!selectedFile) {
            showToast('Please select a backup to delete.', 'warning');
            return;
        }

        if (!confirm(`Are you sure you want to permanently delete the backup file '${selectedFile}'?`)) return;

        try {
            const response = await apiFetch(`${API_BASE_URL}/system/backups/${selectedFile}`, { method: 'DELETE' });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Delete failed');
            }
            const result = await response.json();
            showToast(result.message, 'success');
            loadBackupList(); // Refresh the list
        } catch (error) {
            showToast(`Error: ${error.message}`, 'error');
        }
    });

    // Create New/Clear Database
    document.getElementById('create-new-db-btn').addEventListener('click', async () => {
        if (!confirm('WARNING: This will back up the current database and then create a new, empty one. All sites will be gone. Are you sure?')) return;
        
        try {
            const response = await apiFetch(`${API_BASE_URL}/system/create-new-db`, { method: 'POST' });
             if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Operation failed');
            }
            const result = await response.json();
            showToast(result.message, 'success');
            
            // Reload the page to start fresh
            setTimeout(() => window.location.reload(), 1500);
        } catch (error) {
            showToast(`Error: ${error.message}`, 'error');
        }
    });
}