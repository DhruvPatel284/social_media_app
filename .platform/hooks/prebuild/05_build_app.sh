#!/bin/bash
set -e

echo "Building application on server..."

cd /var/app/staging

# Run npm build command
echo "Running npm run build..."
npm run build

echo "Build completed successfully"
ls -la dist/
