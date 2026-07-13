#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

if [ ! -f .env ]; then
  echo "Missing .env file. Create one from .env.example first."
  exit 1
fi

# Build frontend assets
npm install
npm run build

# Build Docker images
docker compose build --no-cache

docker compose up -d

echo "Deployment completed."
echo "Use: docker compose ps"
