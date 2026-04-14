#!/bin/bash
set -e

echo "Checking if Yarn is installed..."

if ! command -v yarn &> /dev/null
then
    echo "Yarn not found. Installing Yarn..."
    npm install -g yarn
    echo "Yarn installed successfully"
else
    echo "Yarn is already installed: $(yarn --version)"
fi
