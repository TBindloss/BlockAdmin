// Form submission handling with spinner
document.getElementById('rconForm').addEventListener('submit', function(e) {
    const submitBtn = this.querySelector('button[type="submit"]');
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Saving...';
    submitBtn.disabled = true;
    
    // Wait for form submission and redirect
    setTimeout(() => {
        window.location.href = '/';
    }, 2000);
});
