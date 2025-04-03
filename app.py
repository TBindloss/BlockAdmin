from flask import Flask, render_template, request, jsonify, redirect, url_for, session, flash
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user
from mcrcon import MCRcon
from datetime import datetime
import os
import threading
import time
import functools
from dotenv import load_dotenv
import requests
from typing import Dict, List
import json
import signal

load_dotenv()
app = Flask(__name__)
app.secret_key = os.getenv('FLASK_SECRET_KEY', 'dev-key-please-change-in-production')
# Store RCON configuration
CONFIG_FILE = 'config.json'

def load_config():
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, 'r') as f:
            return json.load(f)
    return None

config = load_config()
if config:
    ADMIN_PASSWORD = config.get('ADMIN_PASSWORD', os.getenv('ADMIN_PASSWORD', 'admin'))
    RCON_HOST = config.get('RCON_HOST', os.getenv('RCON_HOST', 'localhost'))
    RCON_PORT = config.get('RCON_PORT', int(os.getenv('RCON_PORT', 25575)))
    RCON_PASSWORD = config.get('RCON_PASSWORD', os.getenv('RCON_PASSWORD'))
else:
    ADMIN_PASSWORD = os.getenv('ADMIN_PASSWORD', 'admin')
    RCON_HOST = os.getenv('RCON_HOST', 'localhost')
    RCON_PORT = os.getenv('RCON_PORT', 25575)
    RCON_PASSWORD = os.getenv('RCON_PASSWORD')

# Initialize Flask-Login
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

class User(UserMixin):
    def __init__(self, id):
        self.id = id

@login_manager.user_loader
def load_user(user_id):
    return User(user_id)


def save_config(config):
    with open(CONFIG_FILE, 'w') as f:
        json.dump(config, f)

def get_external_ip():
    try:
        response = requests.get('https://api.ipify.org')
        return response.text
    except:
        return "Unable to fetch IP"

def get_rcon_connection():
    config = load_config()
    if not config:
        # Fallback to environment variables if no config file exists
        return MCRcon(
            host=os.getenv('RCON_HOST', 'localhost'),
            port=int(os.getenv('RCON_PORT', 25575)),
            password=os.getenv('RCON_PASSWORD')
        )
    
    return MCRcon(
        host=config['RCON_HOST'],
        port=config['RCON_PORT'],
        password=config['RCON_PASSWORD']
    )

def login_required(f):
    @functools.wraps(f)
    def decorated_function(*args, **kwargs):
        if 'logged_in' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

@app.route('/players')
@login_required
def players():
    return render_template('players.html')

# Store server status information
server_status = {
    "last_check": None,
    "online": False,
    "players": [],
    "version": "",
    "uptime": 0,
    "start_time": datetime.now(),
    "server_ip": RCON_HOST
}



# Data structures to store player information
connected_players: Dict[str, Dict] = {}

# Function to update player information
def update_player_info(player_name: str) -> None:
    if player_name not in connected_players:
        connected_players[player_name] = {
            "name": player_name,
            "connectionTime": time.time() * 1000,  # Convert to milliseconds
            "ip": "Hidden"  # Removed for user privacy
        }

# Background monitoring thread
def monitor_server():
    global server_status, connected_players
    while True:
        try:
            with get_rcon_connection() as mcr:
                # Get player list
                player_list = mcr.command("list")
                # Update status
                server_status["online"] = True
                server_status["last_check"] = datetime.now()  
                
                # Calculate uptime
                uptime_seconds = (server_status["last_check"] - server_status["start_time"]).total_seconds()
                server_status["uptime"] = uptime_seconds
                
                # Parse player info 
                current_players = []
                if "There are" in player_list:
                    try:
                        # Try to extract player names - this depends on server output format but should work with the default
                        if ":" in player_list:
                            players_part = player_list.split(":")[1].strip()
                            if players_part and players_part != "":
                                current_players = [p.strip() for p in players_part.split(",")]
                                # Update connection times for players
                                for player in current_players:
                                    update_player_info(player)
                                # Clean up disconnected players
                                connected_players = {name: info for name, info in connected_players.items() 
                                if name in current_players}
                    except Exception:
                        current_players = []
                
                server_status["players"] = current_players
                
        except Exception:
            server_status["online"] = False
            server_status["players"] = []
        
        # Check every 30 seconds
        time.sleep(30)

# Login route
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        # Use the get_admin_password function instead of ADMIN_PASSWORD
        if username == "admin" and password == get_admin_password():
            session['logged_in'] = True
            session['username'] = username
            return redirect(url_for('index'))
        else:
            return render_template('login.html', error="Invalid credentials")
    
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))


command_history: List[Dict] = []
MAX_HISTORY_SIZE = 100  # Limit history to prevent memory issues


@app.route("/", methods=["GET", "POST"])
@login_required
def index():
    if request.method == "POST" and request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        command = request.form.get("command")
        if command:
            timestamp = datetime.now().strftime('%d/%m/%y - %H:%M:%S')
            try:
                with get_rcon_connection() as mcr:
                    output = mcr.command(command)
                    return jsonify({
                        'status': 'success',
                        'timestamp': timestamp,
                        'command': command,
                        'response': output
                    })
            except Exception as e:
                return jsonify({
                    'status': 'error',
                    'timestamp': timestamp,
                    'command': command,
                    'response': str(e)
                })
    
    return render_template("index.html", command_history=command_history)


@app.route("/clear_history", methods=["POST"])
@login_required
def clear_history():
    global command_history
    command_history = []
    return jsonify({"status": "success", "message": "Command history cleared"})


def format_connection_time(connection_time_ms):
    """Format connection time from milliseconds to a human readable string"""
    if not connection_time_ms:
        return "0m"
    
    current_time = time.time() * 1000
    elapsed_ms = current_time - connection_time_ms
    
    # Convert to minutes
    minutes = int(elapsed_ms / (1000 * 60))
    hours = int(minutes / 60)
    
    if hours > 0:
        return f"{hours}h {minutes % 60}m"
    return f"{minutes}m"


def get_admin_password():
    config = load_config()
    if config and 'ADMIN_PASSWORD' in config:
        return config['ADMIN_PASSWORD']
    return os.getenv('ADMIN_PASSWORD', 'admin')


@app.route("/api/status", methods=["GET"])
@login_required
def get_status():
    global server_status
    try:
        with get_rcon_connection() as mcr:
            # Force status update
            player_list = mcr.command("list")
            server_status["online"] = True
            server_status["last_check"] = datetime.now()
            
            # Update uptime
            uptime_seconds = (server_status["last_check"] - server_status["start_time"]).total_seconds()
            
            # Get server IP if not already set
            if not server_status["server_ip"]:
                server_status["server_ip"] = get_external_ip()
            
            # Parse player list
            online_players = []
            if "There are" in player_list:
                try:
                    if ":" in player_list:
                        players_part = player_list.split(":")[1].strip()
                        if players_part and players_part != "":
                            player_names = [p.strip() for p in players_part.split(",")]
                            for player in player_names:
                                update_player_info(player)
                                player_info = connected_players[player].copy()
                                player_info['connectionTimeFormatted'] = format_connection_time(player_info['connectionTime'])
                                online_players.append(player_info)
                except Exception as e:
                    print(f"Error parsing player list: {e}")
            
            return jsonify({
                "success": True,
                "online": True,
                "uptime": int(uptime_seconds),  # Ensure uptime is an integer
                "server_ip": server_status["server_ip"],
                "players": online_players
            })
            
    except Exception as e:
        return jsonify({
            "success": False,
            "online": False,
            "uptime": 0,
            "server_ip": server_status.get("server_ip", ""),
            "players": [],
            "error": str(e)
        })

@app.route("/api/run_command", methods=["POST"])
def api_run_command():
    command = request.json.get("command")
    try:
        with get_rcon_connection() as mcr:
            output = mcr.command(command)
            return jsonify({"success": True, "output": output})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})


@app.route("/api/player/kick", methods=["POST"])
@login_required
def kick_player():
    player = request.json.get("player")
    reason = request.json.get("reason", "Kicked by admin")
    try:
        with get_rcon_connection() as mcr:
            result = mcr.command(f"kick {player} {reason}")
            return jsonify({"success": True, "message": result})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

@app.route("/api/player/ban", methods=["POST"])
@login_required
def ban_player():
    player = request.json.get("player")
    reason = request.json.get("reason", "Banned by admin")
    try:
        with get_rcon_connection() as mcr:
            result = mcr.command(f"ban {player} {reason}")
            return jsonify({"success": True, "message": result})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

@app.route("/api/player/op", methods=["POST"])
@login_required
def toggle_op():
    player = request.json.get("player")
    try:
        with get_rcon_connection() as mcr:
            result = mcr.command(f"op {player}")
            return jsonify({"success": True, "message": result})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

@app.route('/admin')
@login_required
def admin():
    config = load_config()
    return render_template('admin.html', config=config)

@app.route('/save_rcon_config', methods=['POST'])
@login_required
def save_rcon_config():
    config = {
        'RCON_HOST': request.form['rcon_host'],
        'RCON_PORT': int(request.form['rcon_port']),
        'RCON_PASSWORD': request.form['rcon_password']
    }
    
    try:
        save_config(config)
        flash('Configuration saved successfully. Application will restart.', 'success')
        
        # Schedule a restart after the response is sent
        def restart_app():
            os.kill(os.getppid(), signal.SIGHUP)
        
        from threading import Timer
        Timer(1, restart_app).start()
        
        return redirect(url_for('index'))
    except Exception as e:
        flash(f'Error saving configuration: {str(e)}', 'danger')
        return redirect(url_for('admin'))

@app.route('/save_admin_config', methods=['POST'])
@login_required
def save_admin_config():
    new_password = request.form.get('admin_password')
    if new_password:
        config = load_config() or {}
        config['ADMIN_PASSWORD'] = new_password
        save_config(config)
        flash('Admin password updated successfully. Application will restart.', 'success')
        
        # Schedule a restart after the response is sent
        def restart_app():
            os.kill(os.getppid(), signal.SIGHUP)
        
        from threading import Timer
        Timer(1, restart_app).start()
        
    return redirect(url_for('index'))

if __name__ == "__main__":
    # Start the monitoring thread
    monitor_thread = threading.Thread(target=monitor_server, daemon=True)
    monitor_thread.start()
    
    # Run the Flask app
    app.run(host="0.0.0.0", port=5000, threaded=False)