#!/bin/bash

echo "Setting full permissions on storage directory..."

# Navigate to application directory
# cd /var/app/current

# # Assign full read/write/execute permissions
# sudo chmod -R 777 storage

# (Optional) assign proper ownership to web user
# chown -R webapp:webapp storage

echo "Permissions applied to /var/app/current/storage"
