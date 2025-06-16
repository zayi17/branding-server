#!/bin/bash

# Create data directory if it doesn't exist
mkdir -p data

# Run the favicon creation script
python create_favicon.py

# Stop existing containers
docker-compose down

# Rebuild the container
docker-compose build

# Start the containers
docker-compose up -d

# Show logs
docker-compose logs -f