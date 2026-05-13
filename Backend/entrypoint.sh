#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "Wait for database..."
# You can add a wait-for-it script here if using a local DB container
# For RDS, we assume it's reachable or fails early

echo "Applying database migrations..."
python manage.py migrate --noinput

echo "Collecting static files..."
python manage.py collectstatic --noinput

# Execute the CMD from Dockerfile or docker-compose
exec "$@"
