# iDev Premium Backend

Docker-based VM backend for Pro and Enterprise users with full PTY terminal support.

## Features

- **Docker Container Isolation**: Each panel runs in its own container
- **Real PTY Terminal**: Full interactive terminal via WebSocket (xterm.js compatible)
- **Resource Limits**: CPU, memory, and process limits per container
- **Security**: Restricted commands, no root access, capability drops

## Setup on AWS EC2

### 1. Copy files to server

```bash
# From your local machine
scp -i your-key.pem -r vm-backend-premium/* ubuntu@YOUR_AWS_IP:~/idev-backend/
```

### 2. SSH into server and install

```bash
ssh -i your-key.pem ubuntu@YOUR_AWS_IP

cd ~/idev-backend
npm install
```

### 3. Configure environment

```bash
# Edit .env file
nano .env
```

Set these values:
```
PORT=3001
WS_PORT=3002
API_KEY=your-super-secret-key-here
APPS_DIR=/home/ubuntu/apps
```

### 4. Start the backend

```bash
pm2 start index.js --name idev-premium
pm2 save
pm2 startup
```

### 5. Test

```bash
curl http://localhost:3001/health
```

## API Endpoints

### Containers
- `GET /api/containers/:panelId/status` - Get container status
- `POST /api/containers/:panelId/deploy` - Create container
- `POST /api/containers/:panelId/start` - Start app
- `POST /api/containers/:panelId/stop` - Stop app
- `POST /api/containers/:panelId/restart` - Restart app
- `DELETE /api/containers/:panelId` - Remove container

### Files
- `GET /api/files/:panelId` - List files
- `GET /api/files/:panelId/content?path=` - Get file content
- `POST /api/files/:panelId/sync` - Upload/update files
- `DELETE /api/files/:panelId?path=` - Delete file
- `POST /api/files/:panelId/mkdir` - Create directory

### Logs
- `GET /api/logs/:panelId` - Get PM2 logs

### Terminal
- `POST /api/terminal/:panelId/exec` - Execute command (non-interactive)
- WebSocket `ws://host:3002/terminal/:panelId?apiKey=xxx` - Interactive PTY

## WebSocket Terminal Protocol

Connect to: `ws://56.228.75.32:3002/terminal/{panelId}?apiKey={API_KEY}`

### Messages from client:
```json
{"type": "input", "data": "ls -la\n"}
{"type": "resize", "cols": 80, "rows": 24}
```

### Messages from server:
```json
{"type": "connected", "message": "Connected to panel xxx"}
{"type": "output", "data": "...terminal output..."}
{"type": "error", "message": "...error message..."}
```

## Security

- Containers run as non-root user `appuser`
- Capabilities dropped (only CHOWN, SETUID, SETGID allowed)
- Resource limits enforced (512MB RAM, 0.5 CPU, 100 PIDs)
- Dangerous commands blocked in exec endpoint
- Files sandboxed to /app directory
