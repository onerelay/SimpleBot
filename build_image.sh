#!/bin/bash
# Helper script to build Docker image with optional features
# Usage: ./build_image.sh [--with-ngrok]

INSTALL_NGROK=false

if [ "$1" = "--with-ngrok" ]; then
    INSTALL_NGROK=true
fi

docker build \
    --build-arg INSTALL_NGROK=$INSTALL_NGROK \
    -t discord-bot:latest \
    .
