// Toast notification
function showToast(message, type = 'info') { // Default to info type
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
 
    if (!toast || !toastMessage) {
        console.error("Toast elements not found.");
        console.log(`Toast message: ${message} (type: ${type})`); // Log to console as fallback
        return;
    }
 
    toastMessage.textContent = message;
 
    // Apply styles based on type
    toast.className = 'toast show'; // Reset selector and add 'show'
 
    if (type === 'success') {
        toast.classList.add('success');
    } else if (type === 'error') {
        toast.classList.add('error');
    }
    // 'info' is the default, no extra class needed
 
    // Hide after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
 }