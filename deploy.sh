#!/bin/bash
# Exit immediately if a command exits with a non-zero status
set -e

echo "🚀 Starting Sadar Properties deployment..."

# 1. Pull the latest code
echo "📥 Pulling latest code..."
git pull origin main

# 2. Rebuild and restart containers
echo "🏗️ Rebuilding containers..."
docker compose build --pull --no-cache app

echo "🔄 Restarting containers..."
docker compose up -d

# 3. Clean up unused images to free up space
echo "🧹 Cleaning up old Docker images..."
docker image prune -f

echo "✅ Deployment completed successfully!"
