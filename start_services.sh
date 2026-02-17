#!/bin/sh

# Start nginx in background
nginx -g 'daemon off;' &
NGINX_PID=$!

# Start your bot (which also starts the express server)
node index.js &
BOT_PID=$!

# Wait for either process to exit
wait $NGINX_PID
wait $BOT_PID
