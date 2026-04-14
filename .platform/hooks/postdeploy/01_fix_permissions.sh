#!/bin/bash
set -e

echo "Fixing permissions for NestJS runtime..."

# Give webapp ownership
chown -R webapp:webapp /var/app/current

# Ensure write access
chmod -R u+rwX /var/app/current

echo "Permission fix completed."
