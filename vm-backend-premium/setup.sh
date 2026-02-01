#!/bin/bash

# iDev Premium Backend Setup Script
# Run this on your AWS EC2 instance

echo "=== iDev Premium Backend Setup ==="

# Create directories
mkdir -p ~/idev-backend
mkdir -p ~/apps

# Navigate to backend directory
cd ~/idev-backend

# Copy files (if running locally, you'd scp them first)
echo "Make sure you've copied the backend files to ~/idev-backend/"

# Install dependencies
echo "Installing npm dependencies..."
npm install

# Create .env file
if [ ! -f .env ]; then
  echo "Creating .env file..."
  cat > .env << 'EOF'
PORT=3001
WS_PORT=3002
API_KEY=your-super-secret-api-key-change-this-immediately
APPS_DIR=/home/ubuntu/apps
EOF
  echo "⚠️  IMPORTANT: Edit .env and change API_KEY to a secure value!"
fi

# Build Docker image (if not already built)
if ! docker images | grep -q "idev-user-env"; then
  echo "Building Docker image..."
  cd ~/idev-backend/docker
  docker build -t idev-user-env:latest .
  cd ~/idev-backend
fi

# Setup PM2 to run backend
echo "Setting up PM2..."
pm2 delete idev-premium 2>/dev/null || true
pm2 start index.js --name idev-premium
pm2 save
pm2 startup

echo ""
echo "=== Setup Complete ==="
echo "Backend running on port 3001"
echo "WebSocket running on port 3002"
echo ""
echo "Test with: curl http://localhost:3001/health"
echo ""
echo "⚠️  Remember to:"
echo "1. Edit .env and set a secure API_KEY"
echo "2. Update your Supabase vm-proxy with the new API_KEY"
echo "3. Update your Supabase vm-proxy with AWS IP: http://56.228.75.32:3001"
