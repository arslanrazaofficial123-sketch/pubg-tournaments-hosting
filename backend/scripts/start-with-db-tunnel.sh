#!/usr/bin/env bash
# Render start command wrapper.
#
# If Cloudflare Access TCP credentials are configured, starts a cloudflared
# Access TCP tunnel so the backend can reach MongoDB hosted on the local PC
# (mongo.epixesports.com -> cloudflared tunnel -> 127.0.0.1:27017 on the PC)
# through a local listener on 127.0.0.1:27018.
#
# When the credentials are not set (e.g. first deploy before cutover), the
# tunnel is skipped and the backend uses MONGODB_URI directly (Atlas).
set -euo pipefail

CLOUDFLARED_PID=""

if [[ -n "${CF_ACCESS_CLIENT_ID:-}" && -n "${CF_ACCESS_CLIENT_SECRET:-}" ]]; then
  echo "[start] Starting cloudflared Access TCP tunnel -> mongo.epixesports.com:27017"
  ./cloudflared access tcp \
    --hostname mongo.epixesports.com \
    --url tcp://127.0.0.1:27018 \
    --service-token-id "$CF_ACCESS_CLIENT_ID" \
    --service-token-secret "$CF_ACCESS_CLIENT_SECRET" \
    --logfile /tmp/cloudflared-access.log \
    --loglevel info &
  CLOUDFLARED_PID=$!
  echo "[start] cloudflared pid $CLOUDFLARED_PID (log: /tmp/cloudflared-access.log)"
  # Give the tunnel a moment to establish the local listener.
  sleep 3
else
  echo "[start] CF Access credentials not set - skipping DB tunnel (using MONGODB_URI directly)"
fi

echo "[start] Launching backend: node dist/server.js"
node dist/server.js &
NODE_PID=$!

cleanup() {
  if [[ -n "$CLOUDFLARED_PID" ]]; then
    kill "$CLOUDFLARED_PID" 2>/dev/null || true
  fi
  kill "$NODE_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

wait "$NODE_PID"
