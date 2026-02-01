const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const http = require('http');
const WebSocket = require('ws');

const authMiddleware = require('./middleware/auth');
const containersRouter = require('./routes/containers');
const filesRouter = require('./routes/files');
const logsRouter = require('./routes/logs');
const terminalRouter = require('./routes/terminal');
const { setupTerminalWebSocket } = require('./services/ptyService');

const app = express();
const PORT = process.env.PORT || 3001;
const WS_PORT = process.env.WS_PORT || 3002;

// Middleware
app.use(helmet());
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '50mb' }));

// Health check (public)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    type: 'premium',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Protected API routes
app.use('/api/containers', authMiddleware, containersRouter);
app.use('/api/files', authMiddleware, filesRouter);
app.use('/api/logs', authMiddleware, logsRouter);
app.use('/api/terminal', authMiddleware, terminalRouter);

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Start HTTP server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`iDev Premium API running on port ${PORT}`);
});

// Start WebSocket server for PTY terminal
const wsServer = http.createServer();
const wss = new WebSocket.Server({ server: wsServer });

setupTerminalWebSocket(wss);

wsServer.listen(WS_PORT, '0.0.0.0', () => {
  console.log(`WebSocket Terminal server running on port ${WS_PORT}`);
});
