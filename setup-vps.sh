#!/usr/bin/env bash
# ==============================================================================
# Contabo VPS Initial Setup Script (Ubuntu/Debian)
# ==============================================================================
set -e

echo "🚀 Starting Contabo VPS setup for GraphixManagement..."

# 1. Update and Upgrade system packages
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git ufw ca-certificates gnupg lsb-release htop

# 2. Configure UFW Firewall
echo "🛡️ Configuring Firewall (UFW)..."
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3000/tcp
sudo ufw --force enable

# 3. Install Docker & Docker Compose
echo "🐳 Installing Docker Engine and Docker Compose..."
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 4. Enable Docker for non-root user
sudo usermod -aG docker $USER

echo "✅ Contabo VPS Setup Complete!"
echo "👉 Note: Log out and log back in (or run 'newgrp docker') for docker group permissions to take effect."
