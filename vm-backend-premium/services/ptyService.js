const { docker, getContainerName, containerExists, createContainer } = require('./dockerService');

// Store active PTY sessions
const activeSessions = new Map();

/**
 * Validate API key from WebSocket query
 */
function validateApiKey(url) {
  const apiKey = new URL(url, 'http://localhost').searchParams.get('apiKey');
  const expectedKey = process.env.API_KEY || 'your-secret-api-key-change-this';
  return apiKey === expectedKey;
}

/**
 * Extract panel ID from WebSocket URL
 */
function getPanelIdFromUrl(url) {
  const match = url.match(/\/terminal\/([a-zA-Z0-9-]+)/);
  return match ? match[1] : null;
}

/**
 * Set up WebSocket server for PTY terminal
 */
function setupTerminalWebSocket(wss) {
  wss.on('connection', async (ws, req) => {
    const url = req.url;
    console.log('WebSocket connection attempt:', url);

    // Validate API key
    if (!validateApiKey(url)) {
      console.log('WebSocket auth failed');
      ws.close(4001, 'Unauthorized');
      return;
    }

    // Extract panel ID
    const panelId = getPanelIdFromUrl(url);
    if (!panelId) {
      console.log('No panel ID in URL');
      ws.close(4002, 'Invalid panel ID');
      return;
    }

    console.log(`Terminal session starting for panel: ${panelId}`);

    try {
      // Ensure container exists and is running
      if (!await containerExists(panelId)) {
        await createContainer(panelId);
      }

      const containerName = getContainerName(panelId);
      const container = docker.getContainer(containerName);

      // Make sure container is running
      const info = await container.inspect();
      if (!info.State.Running) {
        await container.start();
      }

      // Create exec instance for interactive shell
      const exec = await container.exec({
        Cmd: ['/bin/bash'],
        AttachStdin: true,
        AttachStdout: true,
        AttachStderr: true,
        Tty: true,
        Env: [
          'TERM=xterm-256color',
          'PS1=\\u@idev:\\w\\$ ',
        ]
      });

      // Start the exec with TTY
      const stream = await exec.start({
        hijack: true,
        stdin: true,
        Tty: true,
      });

      // Store session
      const sessionId = `${panelId}-${Date.now()}`;
      activeSessions.set(sessionId, { ws, stream, panelId });

      // Send welcome message
      ws.send(JSON.stringify({
        type: 'connected',
        message: `Connected to panel ${panelId}`
      }));

      // Forward container output to WebSocket
      stream.on('data', (chunk) => {
        if (ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify({
            type: 'output',
            data: chunk.toString('utf8')
          }));
        }
      });

      stream.on('end', () => {
        console.log(`Stream ended for panel ${panelId}`);
        ws.close(1000, 'Stream ended');
      });

      stream.on('error', (err) => {
        console.error(`Stream error for panel ${panelId}:`, err);
        ws.send(JSON.stringify({
          type: 'error',
          message: err.message
        }));
      });

      // Handle input from WebSocket
      ws.on('message', (message) => {
        try {
          const msg = JSON.parse(message);
          
          if (msg.type === 'input' && msg.data) {
            stream.write(msg.data);
          } else if (msg.type === 'resize' && msg.cols && msg.rows) {
            // Resize TTY
            exec.resize({ h: msg.rows, w: msg.cols }).catch(err => {
              console.error('Resize error:', err);
            });
          }
        } catch (e) {
          // If not JSON, treat as raw input
          stream.write(message);
        }
      });

      // Handle WebSocket close
      ws.on('close', () => {
        console.log(`WebSocket closed for panel ${panelId}`);
        activeSessions.delete(sessionId);
        stream.end();
      });

      ws.on('error', (err) => {
        console.error(`WebSocket error for panel ${panelId}:`, err);
        activeSessions.delete(sessionId);
        stream.end();
      });

    } catch (error) {
      console.error('Terminal setup error:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: error.message
      }));
      ws.close(4003, error.message);
    }
  });

  console.log('Terminal WebSocket server initialized');
}

/**
 * Get active session count
 */
function getActiveSessionCount() {
  return activeSessions.size;
}

module.exports = {
  setupTerminalWebSocket,
  getActiveSessionCount
};
