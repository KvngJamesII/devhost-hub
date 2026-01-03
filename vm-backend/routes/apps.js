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
    
    const proc = await pm2Manager.getProcess(processName);
    const port = portManager.getPort(panelId);
    const exists = fs.existsSync(appDir);

    // Calculate uptime as duration (ms since started)
    // pm_uptime is the timestamp when the process started
    const pmUptime = proc?.pm2_env?.pm_uptime;
    let uptime = 0;
    if (pmUptime && typeof pmUptime === 'number' && pmUptime > 0) {
      const now = Date.now();
      // Validate pm_uptime is a reasonable timestamp (after year 2020)
      if (pmUptime > 1577836800000 && pmUptime < now) {
        uptime = now - pmUptime;
      }
    }

    res.json({
      panelId,
      exists,
      port,
      status: proc ? proc.pm2_env?.status : 'stopped',
      pid: proc?.pid,
      memory: proc?.monit?.memory,
      cpu: proc?.monit?.cpu,
      uptime: uptime,
      restarts: proc?.pm2_env?.restart_time || 0
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
      
      // Install npm dependencies if package.json exists
      const packageJsonPath = path.join(appDir, 'package.json');
      const nodeModulesPath = path.join(appDir, 'node_modules');
      if (fs.existsSync(packageJsonPath)) {
        // Always run npm install to ensure deps are up to date
        console.log(`Installing/updating npm dependencies for ${panelId}`);
        try {
          await execAsync(`cd "${appDir}" && npm install`, { timeout: 120000 });
        } catch (npmErr) {
          console.error(`npm install failed for ${panelId}:`, npmErr.message);
          return res.status(500).json({ error: `Failed to install dependencies: ${npmErr.message}` });
        }
      }
    } else if (language === 'python') {
      const entryFile = entryPoint || 'main.py';
      const venvPath = path.join(appDir, 'venv');
      const venvPython = path.join(venvPath, 'bin', 'python');
      const venvPip = path.join(venvPath, 'bin', 'pip');
      const requirementsPath = path.join(appDir, 'requirements.txt');

      if (!fs.existsSync(path.join(appDir, entryFile))) {
        return res.status(400).json({ error: `Entry point ${entryFile} not found` });
      }

      // Create or recreate venv if missing or corrupted
      if (!fs.existsSync(venvPython)) {
        console.log(`Creating venv for ${panelId} (missing or corrupted)`);
        // Remove any existing corrupted venv
        if (fs.existsSync(venvPath)) {
          await execAsync(`rm -rf "${venvPath}"`);
        }
        try {
          await execAsync(`cd "${appDir}" && python3 -m venv venv`, { timeout: 60000 });
        } catch (venvErr) {
          console.error(`venv creation failed for ${panelId}:`, venvErr.message);
          return res.status(500).json({ error: `Failed to create virtual environment: ${venvErr.message}` });
        }
      }

      // Install requirements if exists
      if (fs.existsSync(requirementsPath)) {
        console.log(`Installing pip dependencies for ${panelId}`);
        try {
          // Upgrade pip first, then install requirements
          await execAsync(`cd "${appDir}" && "${venvPip}" install --upgrade pip`, { timeout: 60000 });
          await execAsync(`cd "${appDir}" && "${venvPip}" install -r requirements.txt`, { timeout: 300000 });
        } catch (pipErr) {
          console.error(`pip install failed for ${panelId}:`, pipErr.message);
          return res.status(500).json({ error: `Failed to install Python dependencies: ${pipErr.message}` });
        }
      }

      script = `./venv/bin/python ${entryFile}`;
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
