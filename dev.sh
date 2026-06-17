#!/bin/bash
# Local development server for DiRxctional frontend.
#
# Run this on EC2 (or any host where Flask is reachable at localhost:5000).
# Vite serves the frontend on :8080, proxying /api/* to the local Flask.
#
# Usage:
#   ./dev.sh
#
# Then from your Mac, port-forward 8080 through SSM (or use existing tunnel):
#   aws ssm start-session --target i-0e8596fe46db91799 --region us-east-2 \
#     --document-name AWS-StartPortForwardingSession \
#     --parameters '{"portNumber":["8080"],"localPortNumber":["8080"]}'
#
# Then open http://localhost:8080 in your browser.

set -e

cd "$(dirname "$0")"

# Verify Flask is running locally (the proxy target)
if ! curl -sS --max-time 2 http://localhost:5000/health > /dev/null 2>&1; then
    echo "⚠  Flask not responding at http://localhost:5000"
    echo "   Start it with: sudo systemctl start dirxctional-api"
    echo "   Continuing anyway — API calls will return errors until Flask is up."
    echo
fi

# Clear Vite's caches so env file changes are picked up cleanly
rm -rf node_modules/.vite

# Start Vite bound to 0.0.0.0 so the SSM port-forward can reach it
echo "Starting Vite dev server on port 8080..."
echo "  - Frontend served from: this directory"
echo "  - /api/* proxied to:    http://localhost:5000 (local Flask)"
echo
exec npm run dev -- --host 0.0.0.0 --port 8080
