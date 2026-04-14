#!/bin/bash
set -e

echo "Checking if NestJS CLI is installed..."

if ! command -v nest &> /dev/null
then
    echo "NestJS CLI not found. Installing @nestjs/cli..."
    npm install -g @nestjs/cli
    echo "NestJS CLI installed successfully"
else
    echo "NestJS CLI is already installed: $(nest --version)"
fi
