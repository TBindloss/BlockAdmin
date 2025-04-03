# Use an official OpenJDK runtime with Java 21 as the base image
FROM openjdk:21-jdk-slim

# Set working directory inside the container
WORKDIR /minecraft

# Install required tools
RUN apt-get update && apt-get install -y \
    wget \
    python3 \
    python3-pip \
    python3-venv \
    awscli \
    curl \
    systemd \
    && rm -rf /var/lib/apt/lists/*

COPY ../ .


# Create minecraft service file
RUN mkdir -p /etc/systemd/system
COPY ./minecraft.service /etc/systemd/system/
RUN systemctl enable minecraft.service

# Set appropriate permissions
RUN chmod 755 /minecraft \
    && chmod 755 /etc/systemd/system/minecraft.service

# Copy requirements.txt and install Python dependencies
RUN python3 -m venv /minecraft/venv \
    && /minecraft/venv/bin/pip install --no-cache-dir -U pip \
    && /minecraft/venv/bin/pip install --no-cache-dir -r requirements.txt

# Expose ports (Minecraft, RCON, and Gunicorn)
EXPOSE 8000

# Copy start script and set execution permissions
RUN chmod +x start.sh

# Use the virtual environment when running the start script
CMD ["/bin/sh", "-c", ". /minecraft/venv/bin/activate && ./start.sh"]
