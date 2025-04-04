class VersionChecker {
    constructor() {
        this.banner = null;
        this.currentVersionSpan = null;
        this.latestVersionSpan = null;
        this.closeButton = null;
        this.checkInterval = 3600000; // 1 hour in milliseconds
    }

    init() {
        this.banner = document.getElementById('update-banner');
        this.currentVersionSpan = document.getElementById('currentVersion');
        this.latestVersionSpan = document.getElementById('latestVersion');
        this.closeButton = document.getElementById('close-update-banner');

        // Add click event listener for close button
        this.closeButton.addEventListener('click', () => {
            this.banner.style.display = 'none';
            // Store the closed state in sessionStorage
            sessionStorage.setItem('updateBannerClosed', 'true');
        });

        // Check if banner was previously closed in this session
        if (sessionStorage.getItem('updateBannerClosed') === 'true') {
            this.banner.style.display = 'none';
        } else {
            this.checkVersion();
            setInterval(() => this.checkVersion(), this.checkInterval);
        }
    }

    async checkVersion() {
        try {
            const currentVersion = '1.02';
            const response = await fetch('https://raw.githubusercontent.com/TBindloss/BlockAdmin/main/version.txt');
            const latestVersion = await response.text();
            
            this.currentVersionSpan.textContent = currentVersion;
            this.latestVersionSpan.textContent = latestVersion.trim();
            
            if (parseFloat(latestVersion) > parseFloat(currentVersion) && 
                sessionStorage.getItem('updateBannerClosed') !== 'true') {
                this.banner.style.display = 'flex';
            } else {
                this.banner.style.display = 'none';
            }
        } catch (error) {
            console.error('Error checking version:', error);
            this.banner.style.display = 'none';
        }
    }
}

// Initialize version checker when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    const versionChecker = new VersionChecker();
    versionChecker.init();
});