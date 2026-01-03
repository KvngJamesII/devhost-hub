#!/bin/bash

# iDev Host VM Setup Script
# Run this on a fresh Ubuntu 24.04 DigitalOcean Droplet

set -e

echo "🚀 iDev Host VM Setup Starting..."

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
echo "📦 Installing Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install Python 3 and pip
echo "🐍 Installing Python 3..."
sudo apt install -y python3 python3-pip python3-venv

# Install PM2 globally
echo "📦 Installing PM2..."
sudo npm install -g pm2

# Install build tools
echo "🔧 Installing build tools..."
sudo apt install -y build-essential git

# Create apps directory
echo "📁 Creating apps directory..."
mkdir -p ~/apps

# Generate API key
API_KEY=$(openssl rand -hex 32)
echo "🔑 Generated API Key: $API_KEY"
echo ""
echo "⚠️  SAVE THIS API KEY! You'll need it for the frontend."
echo ""

# Add API key to environment
echo "export VM_API_KEY=$API_KEY" >> ~/.bashrc

# Install npm dependencies
echo "📦 Installing API dependencies..."
cd ~/vm-backend
npm install

# Setup PM2 startup
echo "🔄 Configuring PM2 startup..."
pm2 startup systemd -u $USER --hp $HOME
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $HOME

# Start the API
echo "🚀 Starting iDev API..."
VM_API_KEY=$API_KEY pm2 start index.js --name "idev-api"
pm2 save

echo ""
echo "✅ Setup Complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Save your API Key: $API_KEY"
echo "2. Configure firewall: sudo ufw allow 3001/tcp"
echo "3. Note your Droplet IP address"
echo "4. Add VM_API_URL and VM_API_KEY secrets to Lovable"
echo ""
echo "🔗 API Health Check: http://YOUR_IP:3001/health"
