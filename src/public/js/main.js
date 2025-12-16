// Toast notification helper
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');

    const bgColors = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        warning: 'bg-yellow-500',
        info: 'bg-blue-500'
    };

    toast.className = `${bgColors[type]} text-white px-6 py-3 rounded-lg shadow-lg transform transition-all duration-300 opacity-0`;
    toast.textContent = message;

    container.appendChild(toast);

    // Animate in
    setTimeout(() => {
        toast.classList.remove('opacity-0');
        toast.classList.add('opacity-100');
    }, 10);

    // Remove after 3 seconds
    setTimeout(() => {
        toast.classList.remove('opacity-100');
        toast.classList.add('opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// HTMX event listeners
document.body.addEventListener('htmx:afterRequest', (event) => {
    if (event.detail.successful) {
        // Handle successful requests
        const xhr = event.detail.xhr;
        if (xhr.status >= 200 && xhr.status < 300) {
            // Check for success message in response headers
            const message = xhr.getResponseHeader('X-Success-Message');
            if (message) {
                showToast(message, 'success');
            }
        }
    } else {
        // Handle errors
        showToast('Something went wrong. Please try again.', 'error');
    }
});

// Listen for custom events from the server
document.body.addEventListener('showToast', (event) => {
    showToast(event.detail.message, event.detail.type);
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('QueryJam initialized');
    if (window.lucide) {
        lucide.createIcons();
    }
});

// Refresh icons after HTMX swaps
document.body.addEventListener('htmx:afterSwap', () => {
    if (window.lucide) {
        lucide.createIcons();
    }
});
