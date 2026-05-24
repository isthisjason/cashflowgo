#!/usr/bin/env bash
set -euo pipefail

RENDER_API_BASE_URL="${RENDER_API_BASE_URL:-https://cashflowgo-backend.onrender.com/api}"
CLOUDFLARE_PAGES_PROJECT="${CLOUDFLARE_PAGES_PROJECT:-cashflowgo}"

echo "Building React app for ${RENDER_API_BASE_URL}"
REACT_APP_API_BASE_URL="${RENDER_API_BASE_URL}" \
REACT_APP_ENABLE_OFFLINE_FALLBACK=0 \
npm run build

echo "Deploying build/ to Cloudflare Pages project ${CLOUDFLARE_PAGES_PROJECT}"
npx --yes wrangler pages deploy build --project-name "${CLOUDFLARE_PAGES_PROJECT}"

echo "Frontend deployed to Cloudflare Pages."
