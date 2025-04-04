// Player management functions
function createPlayerCard(player) {
    return `
        <div class="player-card">
            <div class="d-flex align-items-center">
                <div class="player-avatar me-3">
                    <img src="https://minotar.net/avatar/${player.name}/100.png" alt="${player.name}" />
                </div>
                <div class="player-info flex-grow-1">
                    <div class="d-flex align-items-center justify-content-between">
                        <div>
                            <h5 class="mb-1">${player.name}</h5>
                            <small class="text-muted">
                                <i class="fas fa-clock me-1"></i>${player.connectionTime}
                            </small>
                        </div>
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-primary" onclick="messagePlayer('${player.name}')" data-bs-toggle="tooltip" data-bs-title="Send Message">
                                <i class="fas fa-comment"></i>
                            </button>
                            <button class="btn btn-success" onclick="toggleOP('${player.name}')" data-bs-toggle="tooltip" data-bs-title="Toggle Operator Status">
                                <i class="fas fa-star"></i>
                            </button>
                            <button class="btn btn-warning" onclick="kickPlayer('${player.name}')" data-bs-toggle="tooltip" data-bs-title="Kick Player">
                                <i class="fas fa-sign-out-alt"></i>
                            </button>
                            <button class="btn btn-danger" onclick="banPlayer('${player.name}')" data-bs-toggle="tooltip" data-bs-title="Ban Player">
                                <i class="fas fa-ban"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Initialize tooltips
function initTooltips() {
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
}

// Update the updatePlayersList function to reinitialize tooltips
function updatePlayersList(players) {
    const container = document.getElementById('players-list');
    if (!players || players.length === 0) {
        container.innerHTML = '<div class="text-center text-muted p-4">No players currently connected</div>';
        return;
    }
    container.innerHTML = players.map(player => createPlayerCard(player)).join('');
    initTooltips();
}

function refreshPlayers() {
    fetch('/api/status')
        .then(response => response.json())
        .then(data => {
            if (data && data.players && Array.isArray(data.players)) {
                // Transform the players data to include all required fields
                const formattedPlayers = data.players.map(player => ({
                    name: player.name || 'Unknown',
                    connectionTime: formatConnectionTime(player.connectionTime),
                    ip: player.ip || 'Hidden'
                }));
                updatePlayersList(formattedPlayers);
            }
        })
        .catch(error => {
            console.error('Error fetching players:', error);
            updatePlayersList([]);
        });
}

// Add helper function to format connection time
function formatConnectionTime(timestamp) {
    if (!timestamp) return 'Unknown';
    
    const now = Date.now();
    const connectedTime = now - timestamp;
    const minutes = Math.floor(connectedTime / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
        return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
}

// Player action functions
function messagePlayer(player) {
    const message = prompt(`Enter message for ${player}:`);
    if (message) {
        fetch('/api/run_command', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command: `tell ${player} ${message}` })
        });
    }
}

function toggleOP(player) {
    if (confirm(`Toggle OP status for ${player}?`)) {
        fetch('/api/run_command', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command: `op ${player}` })
        });
    }
}

function kickPlayer(player) {
    const reason = prompt(`Enter kick reason for ${player}:`) || 'Kicked by admin';
    if (confirm(`Kick ${player}?\nReason: ${reason}`)) {
        fetch('/api/run_command', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command: `kick ${player} ${reason}` })
        });
    }
}

function banPlayer(player) {
    const reason = prompt(`Enter ban reason for ${player}:`) || 'Banned by admin';
    if (confirm(`Ban ${player}?\nReason: ${reason}`)) {
        fetch('/api/run_command', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command: `ban ${player} ${reason}` })
        });
    }
}

function whitelistManager() {
    fetch('/api/run_command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: 'whitelist list' })
    })
    .then(response => response.json())
    .then(data => {
        // Show whitelist dialog
        const action = prompt(
            `Current whitelist:\n${data.output}\n\n` +
            "Enter command:\n" +
            "1. add <player> - Add player to whitelist\n" +
            "2. remove <player> - Remove player from whitelist\n" +
            "3. on - Enable whitelist\n" +
            "4. off - Disable whitelist"
        );

        if (action) {
            fetch('/api/run_command', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ command: `whitelist ${action}` })
            });
        }
    });
}

function banManager() {
    fetch('/api/run_command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: 'banlist' })
    })
    .then(response => response.json())
    .then(data => {
        // Show ban list dialog
        const action = prompt(
            `Current bans:\n${data.output}\n\n` +
            "Enter command:\n" +
            "1. ban <player> [reason] - Ban a player\n" +
            "2. pardon <player> - Unban a player\n" +
            "3. banip <player|ip> - Ban an IP\n" +
            "4. pardon-ip <ip> - Unban an IP"
        );

        if (action) {
            const [cmd, ...args] = action.split(' ');
            fetch('/api/run_command', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ command: `${cmd} ${args.join(' ')}` })
            });
        }
    });
}

// Refresh players list periodically
refreshPlayers();
setInterval(refreshPlayers, 5000);

// Initial tooltip initialization
document.addEventListener('DOMContentLoaded', function() {
    initTooltips();
});