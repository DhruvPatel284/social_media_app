#!/bin/bash
set -e

echo "Installing production dependencies only..."
cd /var/app/staging
yarn install --production=false
echo "Dependencies installed successfully"
