const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

const pm2Manager = require('../utils/pm2');
const portManager = require('../utils/ports');

const APPS_DIR = process.env.APPS_DIR || path.join(process.env.HOME, 'apps');

// Get app status
router.get('/:panelId/status', async (req, res) => {
  try {
    const { panelId } = req.params;
    const processName = `panel-${panelId}`;
    const appDir = path.join(APPS_DIR, panelId);
    
    const process = await pm2Manager.getProcess(processName);
    const port = portManager.getPort(panelId);
    const exists = fs.existsSync(appDir);

    res.json({
      panelId,
      exists,
      port,
      status: process ? process.pm2_env?.status : 'stopped',
      pid: process?.pid,
      memory: process?.monit?.memory,
      cpu: process?.monit?.cpu,
      uptime: process?.pm2_env?.pm_uptime
    });
  } catch (error) {
    console.error('Status error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Deploy/setup app
router.post('/:panelId/deploy', async (req, res) => {
  try {
    const { panelId } = req.params;
    const { language } = req.body; // 'nodejs' or 'python'
    const appDir = path.join(APPS_DIR, panelId);

    // Create app directory
    if (!fs.existsSync(appDir)) {
      fs.mkdirSync(appDir, { recursive: true });
    }

    // Allocate port
    const port = portManager.allocate(panelId);

    // Install dependencies based on language
    if (language === 'nodejs') {
      if (fs.existsSync(path.join(appDir, 'package.json'))) {
        console.log(`Installing npm dependencies for ${panelId}`);
        await execAsync(`cd "${appDir}" && npm install`);
      }
    } else if (language === 'python') {
      // Create virtual environment if it doesn't exist
      const venvPath = path.join(appDir, 'venv');
      if (!fs.existsSync(venvPath)) {
        console.log(`Creating venv for ${panelId}`);
        await execAsync(`cd "${appDir}" && python3 -m venv venv`);
      }
      
      // Install requirements if exists
      if (fs.existsSync(path.join(appDir, 'requirements.txt'))) {
        console.log(`Installing pip dependencies for ${panelId}`);
        await execAsync(`cd "${appDir}" && ./venv/bin/pip install -r requirements.txt`);
      }
    }

    res.json({ 
      success: true, 
      panelId, 
      port, 
      appDir,
      message: 'App deployed successfully' 
    });
  } catch (error) {
    console.error('Deploy error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start app
router.post('/:panelId/start', async (req, res) => {
  try {
    const { panelId } = req.params;
    const { language, entryPoint } = req.body;
    const processName = `panel-${panelId}`;
    const appDir = path.join(APPS_DIR, panelId);

    if (!fs.existsSync(appDir)) {
      return res.status(404).json({ error: 'App directory not found' });
    }

    const port = portManager.allocate(panelId);
    const env = { PORT: port.toString() };

    let script;
    if (language === 'nodejs') {
      script = entryPoint || 'index.js';
      // Check if entry point exists
      if (!fs.existsSync(path.join(appDir, script))) {
        return res.status(400).json({ error: `Entry point ${script} not found` });
      }
    } else if (language === 'python') {
      script = `./venv/bin/python ${entryPoint || 'main.py'}`;
      if (!fs.existsSync(path.join(appDir, entryPoint || 'main.py'))) {
        return res.status(400).json({ error: `Entry point ${entryPoint || 'main.py'} not found` });
      }
    } else {
      return res.status(400).json({ error: 'Invalid language' });
    }

    await pm2Manager.start(processName, script, appDir, env);

    res.json({ 
      success: true, 
      panelId, 
      port,
      processName,
      message: 'App started successfully'
    });
  } catch (error) {
    console.error('Start error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Stop app
router.post('/:panelId/stop', async (req, res) => {
  try {
    const { panelId } = req.params;
    const processName = `panel-${panelId}`;

    await pm2Manager.stop(processName);

    res.json({ 
      success: true, 
      panelId,
      message: 'App stopped successfully'
    });
  } catch (error) {
    console.error('Stop error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Restart app
router.post('/:panelId/restart', async (req, res) => {
  try {
    const { panelId } = req.params;
    const processName = `panel-${panelId}`;

    await pm2Manager.restart(processName);
    const port = portManager.getPort(panelId);

    res.json({ 
      success: true, 
      panelId,
      port,
      message: 'App restarted successfully'
    });
  } catch (error) {
    console.error('Restart error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete app
router.delete('/:panelId', async (req, res) => {
  try {
    const { panelId } = req.params;
    const processName = `panel-${panelId}`;
    const appDir = path.join(APPS_DIR, panelId);

    // Stop and delete from PM2
    try {
      await pm2Manager.delete(processName);
    } catch (e) {
      console.log('Process may not exist:', e.message);
    }

    // Release port
    portManager.release(panelId);

    // Delete app directory
    if (fs.existsSync(appDir)) {
      await execAsync(`rm -rf "${appDir}"`);
    }

    res.json({ 
      success: true, 
      panelId,
      message: 'App deleted successfully'
    });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: error.message });
  }
});

// List all apps
router.get('/', async (req, res) => {
  try {
    const processes = await pm2Manager.list();
    const allocations = portManager.getAllocations();
    
    // Get panels from PM2 processes
    const apps = processes
      .filter(p => p.name.startsWith('panel-'))
      .map(p => {
        const panelId = p.name.replace('panel-', '');
        return {
          panelId,
          processName: p.name,
          status: p.pm2_env?.status,
          port: allocations[panelId],
          pid: p.pid,
          memory: p.monit?.memory,
          cpu: p.monit?.cpu
        };
      });

    res.json({ apps });
  } catch (error) {
    console.error('List error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
