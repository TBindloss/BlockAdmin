#!/bin/bash

# Start the Minecraft server
cd /minecraft

# Start Gunicorn with explicit host and port
gunicorn --config gunicorn_config.py --bind 0.0.0.0:8000 minecraft_panel:app
