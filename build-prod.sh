#!/bin/bash
# Production build script for EC2
# Writes the bundle directly to /var/www/dirxctional (nginx root)
# Uses constrained Node heap to fit within t3.small RAM
set -e
export NODE_OPTIONS="--max-old-space-size=1024"
export VITE_OUT_DIR="/var/www/dirxctional"
echo "Building → $VITE_OUT_DIR  (heap: $NODE_OPTIONS)"
npm run build
echo "✓ Build complete"
