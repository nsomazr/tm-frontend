#!/usr/bin/env bash
# Terra Meta Frontend - local development startup
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [[ ! -f .env ]]; then
  echo "Copying .env.example → .env"
  cp .env.example .env
fi

if [[ ! -x node_modules/.bin/vite ]]; then
  echo "Installing npm dependencies..."
  rm -rf node_modules
  npm install
fi

echo ""
echo "Starting Vite dev server at http://localhost:3085"
echo "API target: ${VITE_API_URL:-http://localhost:8085/api/v1}"
echo ""
exec npx vite --host 0.0.0.0 --port 3085
