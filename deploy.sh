#!/usr/bin/env bash
# Terra Meta Frontend - production deploy with PM2
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

export VITE_API_URL="${VITE_API_URL:-https://api.terrameta.5ggeology.com/api/v1}"
FRONTEND_PORT="${FRONTEND_PORT:-3085}"

echo "==> Terra Meta Frontend Deploy"
echo "    Site URL: https://terrameta.5ggeology.com"
echo "    API URL:  ${VITE_API_URL}"

echo "==> Installing dependencies..."
if [[ -f package-lock.json ]]; then
  npm ci
else
  npm install
fi

echo "==> Building production bundle..."
VITE_API_URL="$VITE_API_URL" npm run build

if ! command -v pm2 &>/dev/null; then
  echo "ERROR: pm2 is not installed. Run: npm install -g pm2"
  exit 1
fi

echo "==> Starting / restarting PM2 static server..."
pm2 startOrRestart ecosystem.config.cjs --update-env

pm2 save

echo ""
echo "Deploy complete."
echo "  Site: https://terrameta.5ggeology.com (proxy port ${FRONTEND_PORT} → nginx/caddy)"
echo "  PM2:  pm2 status"
echo "  Logs: pm2 logs terra-meta-frontend"
