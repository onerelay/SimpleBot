#!/bin/bash
set -e

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

log "Starting services..."

# ==================== CLONE/UPDATE BOT REPOSITORY ====================
if [ -n "$GITHUB_TOKEN" ]; then
    log "GITHUB_TOKEN detected, checking bot repository..."

    if [ -d "/bot/.git" ]; then
        log "Existing bot repository found, pulling updates..."
        cd /bot
        git pull
        cd /
    else
        log "Cloning bot repository for the first time..."
        git clone https://onerelay:${GITHUB_TOKEN}@github.com/onerelay/Relay.git /bot
    fi

    # Install/update npm dependencies
    if [ -f "/bot/package.json" ]; then
        log "Installing/updating npm dependencies..."
        cd /bot
        npm install
        cd /
    fi

    log "Bot repository is up to date."
else
    log "GITHUB_TOKEN not set – skipping bot repository sync."
fi

# ==================== SSH DAEMON ====================
if [ -f /usr/sbin/sshd ]; then
    log "Starting SSH daemon..."
    /usr/sbin/sshd -D &
    SSHD_PID=$!
    log "SSH daemon started with PID $SSHD_PID"
fi

# ==================== CLOUDFLARED TUNNEL ====================
if [ -n "$CLOUDFLARED_TOKEN" ]; then
    log "Starting cloudflared tunnel..."
    cloudflared tunnel --no-autoupdate run --token "$CLOUDFLARED_TOKEN" &
    CLOUDFLARED_PID=$!
    log "cloudflared started with PID $CLOUDFLARED_PID"
else
    log "CLOUDFLARED_TOKEN not set – skipping tunnel"
fi

# ==================== WEB SERVER (SSH TERMINAL) ====================
log "Starting web server..."
cd /app
node web.js &
WEB_PID=$!
log "Web server started with PID $WEB_PID"

log "All services started. Bot is not running. Use SSH to start it manually."
log "To start the bot: cd /bot && node index.js (or npm start)"

# Wait for any process to exit (so the container stays alive)
wait -n
exit $?
