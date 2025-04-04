// Store command history in local storage
let commandHistory = JSON.parse(localStorage.getItem('mcCommandHistory')) || [];

// Function to add a command to history
function addToHistory(command) {
    if (command && command.trim() !== '') {
        commandHistory = commandHistory.filter(cmd => cmd !== command);
        
        // Add to beginning of array
        commandHistory.unshift(command);
        
        // Keep only the last 10 commands
        if (commandHistory.length > 10) {
            commandHistory.pop();
        }
        
        // Save to local storage
        localStorage.setItem('mcCommandHistory', JSON.stringify(commandHistory));
        
        // Update display
        updateHistoryDisplay();
    }
}

// Update the history display
function updateHistoryDisplay() {
    const historyContainer = document.getElementById('commandHistory');
    historyContainer.innerHTML = '';
    
    commandHistory.forEach(cmd => {
        const item = document.createElement('div');
        item.className = 'command-history-item';
        item.textContent = cmd;
        item.onclick = () => setCommand(cmd);
        historyContainer.appendChild(item);
    });
    
    // Show "No history" if empty
    if (commandHistory.length === 0) {
        const item = document.createElement('div');
        item.className = 'p-3 text-center text-muted';
        item.textContent = 'No command history';
        historyContainer.appendChild(item);
    }
}

// Set a command in the input field
function setCommand(command) {
    document.getElementById('commandInput').value = command;
    document.getElementById('commandInput').focus();
}

// Ask for confirmation before running dangerous commands
function confirmCommand(command) {
    if (confirm(`Are you sure you want to run: ${command}?`)) {
        setCommand(command);
        document.getElementById('commandForm').submit();
    }
}

// Auto-scroll console to bottom
function scrollConsoleToBottom() {
    const consoleOutput = document.getElementById('consoleOutput');
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
}

// Clear console output
function clearConsole() {
    if (confirm('Clear console output? This will remove all command history.')) {
        document.getElementById('consoleOutput').innerHTML = 
            '<div class="console-entry"><span class="console-timestamp">[System]</span><span class="console-command">Console cleared.</span></div>';
    }
}

// Clear command history
function clearHistory() {
    if (confirm('Clear command history?')) {
        commandHistory = [];
        localStorage.removeItem('mcCommandHistory');
        updateHistoryDisplay();
    }
}

// Format uptime
function formatUptime(seconds) {
    seconds = Math.floor(seconds);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Update server status indicator color
function updateStatusIndicator(status) {
    const indicator = document.getElementById('status-indicator');
    if (status === 'online') {
        indicator.classList.add('text-success');
        indicator.classList.remove('text-danger', 'text-warning');
    } else if (status === 'offline') {
        indicator.classList.add('text-danger');
        indicator.classList.remove('text-success', 'text-warning');
    } else {
        indicator.classList.add('text-warning');
        indicator.classList.remove('text-success', 'text-danger');
    }
}

function updateServerStatus() {
    fetch('/api/status')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (!data) {
                throw new Error('Empty response from server');
            }

            // Update status
            const statusElement = document.getElementById('server-status');
            statusElement.textContent = data.online ? 'Online' : 'Offline';
            statusElement.className = data.online ? 'status-online' : 'status-offline';
            updateStatusIndicator(data.online ? 'online' : 'offline');

            // Update server info only if we have valid data
            if (data.server_ip) {
                document.getElementById('server-ip').textContent = data.server_ip;
            }

            // Update player count and list
            const players = data.players || [];
            const playerCount = Array.isArray(players) ? players.length : 0;
            document.getElementById('player-count').textContent = playerCount;

            // Update uptime if available
            const uptime = parseInt(data.uptime) || 0;
            document.getElementById('server-uptime').textContent = formatUptime(uptime);
        })
        .catch(error => {
            console.error('Error fetching server status:', error.message);
            const statusElement = document.getElementById('server-status');
            statusElement.textContent = 'Connection Error';
            statusElement.className = 'status-error';
            updateStatusIndicator('error');
            
            // Show more specific error messages
            document.getElementById('server-ip').textContent = 'Server unavailable';
            document.getElementById('server-uptime').textContent = '--:--:--';
            document.getElementById('player-count').textContent = '--';
        });
}

function copyIP() {
    const ipElement = document.getElementById('server-ip');
    const ip = ipElement.textContent;
    navigator.clipboard.writeText(ip).then(() => {
        // Visual feedback that IP was copied
        const button = ipElement.nextElementSibling;
        button.innerHTML = '<i class="fas fa-check"></i>';
        setTimeout(() => {
            button.innerHTML = '<i class="fas fa-copy"></i>';
        }, 2000);
    });
}

// Run when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Display command history
    updateHistoryDisplay();
    
    // Scroll console to bottom
    scrollConsoleToBottom();
    
    // Add command to history on form submit
    document.getElementById('commandForm').addEventListener('submit', function() {
        const commandInput = document.getElementById('commandInput');
        addToHistory(commandInput.value);
    });
});

// Update status every 3 seconds
setInterval(updateServerStatus, 3000);
// Initial update
updateServerStatus();

document.getElementById('commandForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const commandInput = document.getElementById('commandInput');
    const command = commandInput.value.trim();
    
    if (command) {
        try {
            const response = await fetch('/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: `command=${encodeURIComponent(command)}`
            });
            
            if (response.ok) {
                const data = await response.json();
                
                // Add command to history
                addToHistory(command);
                
                // Add command to console output without clearing previous entries
                const consoleOutput = document.getElementById('consoleOutput');
                const newEntry = document.createElement('div');
                newEntry.className = 'console-entry';
                newEntry.innerHTML = `
                    <div class="command-line">
                        <span class="timestamp">[${data.timestamp}]</span>
                        <span class="command">${data.command}</span>
                    </div>
                    <div class="response">${data.response}</div>
                `;
                
                consoleOutput.appendChild(newEntry);
                scrollConsoleToBottom();
                
                // Clear input
                commandInput.value = '';
            }
        } catch (error) {
            console.error('Error executing command:', error);
        }
    }
});

// Add function to clear console
function clearConsole() {
    if (confirm('Are you sure you want to clear the console history?')) {
        const consoleOutput = document.getElementById('consoleOutput');
        consoleOutput.innerHTML = '';
        command_history = [];
    }
}