document.addEventListener('DOMContentLoaded', function() {
    const seedMapButton = document.getElementById('seed-map');
    
    if (seedMapButton) {
        seedMapButton.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Show loading state
            seedMapButton.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Loading...';
            
            // Fetch the seed from API
            fetch('/api/get_seed')
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        // Redirect to ChunkBase with the seed
                        window.open(`https://www.chunkbase.com/apps/seed-map#seed=${data.seed}`, '_blank');
                    } else {
                        alert('Error fetching seed: ' + data.error);
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('Could not fetch seed. Make sure the server is running.');
                })
                .finally(() => {
                    // Reset button text
                    seedMapButton.innerHTML = '<i class="fas fa-map me-1"></i>Seed Map';
                });
        });
    }
});