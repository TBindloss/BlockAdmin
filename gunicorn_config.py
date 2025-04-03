# Gunicorn configuration for Minecraft Control Panel

# Server socket
bind = "0.0.0.0:8000" 
workers = 4
worker_class = "sync"
timeout = 120
keepalive = 5
reload = True

# Worker processes
workers = 4
worker_class = "sync"
worker_connections = 1000
timeout = 120
keepalive = 5

# Process naming
proc_name = "minecraft_panel"

# Logging
errorlog = "-"
accesslog = "-"
loglevel = "info"

# Process management
daemon = False
pidfile = "/tmp/minecraft_panel.pid"
umask = 0
user = None
group = None
tmp_upload_dir = None
