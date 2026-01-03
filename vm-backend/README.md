# iDev Host - VM Backend API

This is the backend API that runs on your DigitalOcean Droplet to manage user applications.

## Quick Setup

1. **Create a DigitalOcean Droplet:**
   - Image: Ubuntu 24.04 LTS
   - Size: Basic, 4GB RAM / 2 vCPUs ($24/mo) or larger
   - Datacenter: Choose nearest to your users
   - Authentication: SSH keys (recommended)

2. **SSH into your Droplet:**
   ```bash
   ssh root@YOUR_DROPLET_IP
   ```

3. **Clone and setup:**
   ```bash
   # Clone the repo (or copy files)
   git clone YOUR_GITHUB_REPO
   cd YOUR_REPO/vm-backend
   
   # Make setup script executable and run
   chmod +x setup.sh
   ./setup.sh
   ```

4. **Configure firewall:**
   ```bash
   sudo ufw allow 22/tcp    # SSH
   sudo ufw allow 3001/tcp  # API
   sudo ufw allow 4000:5000/tcp  # User apps
   sudo ufw enable
   ```

5. **Save the generated API key and your Droplet IP**

## Manual Setup (if not using setup.sh)

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install Python 3
sudo apt install -y python3 python3-pip python3-venv

# Install PM2
sudo npm install -g pm2

# Install dependencies
cd ~/vm-backend
npm install

# Generate API key
export VM_API_KEY=$(openssl rand -hex 32)
echo "Your API Key: $VM_API_KEY"

# Start the API
pm2 start index.js --name "idev-api"
pm2 save
pm2 startup
```

## API Endpoints

All endpoints except `/health` require `X-API-Key` header.

### Health
- `GET /health` - Health check (public)

### Apps
- `GET /api/apps` - List all apps
- `GET /api/apps/:panelId/status` - Get app status
- `POST /api/apps/:panelId/deploy` - Deploy app
- `POST /api/apps/:panelId/start` - Start app
- `POST /api/apps/:panelId/stop` - Stop app
- `POST /api/apps/:panelId/restart` - Restart app
- `DELETE /api/apps/:panelId` - Delete app

### Files
- `GET /api/files/:panelId` - List files
- `GET /api/files/:panelId/content?path=...` - Get file content
- `POST /api/files/:panelId/sync` - Upload/sync files
- `POST /api/files/:panelId/mkdir` - Create directory
- `DELETE /api/files/:panelId?path=...` - Delete file/directory

### Logs
- `GET /api/logs/:panelId` - Get logs
- `DELETE /api/logs/:panelId` - Clear logs

### Terminal
- `POST /api/terminal/:panelId/exec` - Execute command

## Environment Variables

- `PORT` - API port (default: 3001)
- `VM_API_KEY` - API authentication key (required)
- `APPS_DIR` - Directory for user apps (default: ~/apps)

## Security Notes

- API key authentication on all protected routes
- Command execution restricted to allowed commands
- File access restricted to app directories
- Dangerous command patterns blocked
