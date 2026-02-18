#!/bin/bash
set -e

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

log "Starting services..."

# Start SSH daemon (for native SSH access, optional)
if [ -f /usr/sbin/sshd ]; then
    log "Starting SSH daemon..."
    /usr/sbin/sshd -D &
    SSHD_PID=$!
    log "SSH daemon started with PID $SSHD_PID"
fi

# Start cloudflared tunnel (if token is provided)
if [ -n "$CLOUDFLARED_TOKEN" ]; then
    log "Starting cloudflared tunnel..."
    cloudflared tunnel --no-autoupdate run --token "$CLOUDFLARED_TOKEN" &
    CLOUDFLARED_PID=$!
    log "cloudflared started with PID $CLOUDFLARED_PID"
else
    log "CLOUDFLARED_TOKEN not set – skipping tunnel"
fi

# Start the web server (with SSH terminal)
log "Starting web server..."
cd /app
node web.js &
WEB_PID=$!
log "Web server started with PID $WEB_PID"

log "All services started. Bot is not running. Use SSH to start it manually."

# Wait for any process to exit (so the container stays alive)
wait -n
exit $?
