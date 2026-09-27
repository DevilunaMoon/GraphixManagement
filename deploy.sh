#!/usr/bin/env bash
# ==============================================================================
# GraphixManagement Zero-Downtime Deployment Script (Contabo VPS)
# ==============================================================================
set -e

COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.production"

echo "🚀 Starting deployment of GraphixManagement..."

# 1. Check if .env.production exists
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Error: $ENV_FILE not found! Create it from .env.production.example first."
    exit 1
fi

# 2. Pull latest code from repository
echo "📥 Pulling latest code..."
git pull origin main

# 3. Build & start containers
echo "🏗️ Building and starting Docker containers..."
docker compose -f $COMPOSE_FILE --env-file $ENV_FILE up -d --build --remove-orphans

# 4. Clean up old unused Docker images to save VPS disk space
echo "🧹 Pruning unused Docker images..."
docker image prune -f

# 5. Output status
echo "🔍 Checking container status..."
docker compose -f $COMPOSE_FILE ps

echo "🎉 Deployment successfully completed!"
