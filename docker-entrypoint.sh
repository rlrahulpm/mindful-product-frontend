#!/bin/sh
set -e

# Function to handle shutdown gracefully
shutdown() {
    echo "Shutting down gracefully..."
    nginx -s quit
    exit 0
}

# Trap SIGTERM and SIGINT
trap shutdown TERM INT

# Start nginx in the background
nginx -g "daemon off;" &
NGINX_PID=$!

# Wait for nginx process
wait $NGINX_PID