const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');

const authMiddleware = require('./middleware/auth');
const appsRouter = require('./routes/apps');
const filesRouter = require('./routes/files');
const logsRouter = require('./routes/logs');
const terminalRouter = require('./routes/terminal');

const app = express();
const PORT = process.env.PORT || 3001;
const APPS_DIR = process.env.APPS_DIR || path.join(process.env.HOME, 'apps');

// Ensure apps directory exists
if (!fs.existsSync(APPS_DIR)) {
  fs.mkdirSync(APPS_DIR, { recursive: true });
  console.log(`Created apps directory: ${APPS_DIR}`);
}

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
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Protected API routes
app.use('/api/apps', authMiddleware, appsRouter);
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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`iDev API running on port ${PORT}`);
  console.log(`Apps directory: ${APPS_DIR}`);
});
