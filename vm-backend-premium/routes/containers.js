const express = require('express');
const router = express.Router();
const dockerService = require('../services/dockerService');

// Get container status
router.get('/:panelId/status', async (req, res) => {
  try {
    const { panelId } = req.params;
    const status = await dockerService.getContainerStatus(panelId);
    
    // Also get PM2 status if container is running
    if (status.status === 'running') {
      const pm2Processes = await dockerService.getPm2Status(panelId);
      const appProcess = pm2Processes.find(p => p.name === 'app');
      
      status.appStatus = appProcess ? appProcess.pm2_env.status : 'stopped';
      status.appUptime = appProcess ? appProcess.pm2_env.pm_uptime : 0;
      status.appRestarts = appProcess ? appProcess.pm2_env.restart_time : 0;
    }
    
    res.json(status);
  } catch (error) {
    console.error('Status error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create/deploy container
router.post('/:panelId/deploy', async (req, res) => {
  try {
    const { panelId } = req.params;
    const { language } = req.body;
    
    console.log(`Deploying container for panel ${panelId} with ${language}`);
    
    const container = await dockerService.createContainer(panelId, language);
    const info = await container.inspect();
    
    res.json({
      success: true,
      panelId,
      containerId: info.Id.substring(0, 12),
      status: info.State.Running ? 'running' : 'created',
      message: 'Container deployed successfully'
    });
  } catch (error) {
    console.error('Deploy error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start app inside container
router.post('/:panelId/start', async (req, res) => {
  try {
    const { panelId } = req.params;
    const { language, entryPoint } = req.body;
    
    console.log(`Starting app in panel ${panelId}: ${language} ${entryPoint}`);
    
    // Ensure container is running
    await dockerService.startContainer(panelId);
    
    // Start app with PM2
    const entry = entryPoint || (language === 'python' ? 'main.py' : 'index.js');
    const result = await dockerService.startAppWithPm2(panelId, language, entry);
    
    res.json({
      success: true,
      panelId,
      message: `App started with entry point: ${entry}`,
      output: result.stdout
    });
  } catch (error) {
    console.error('Start error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Stop app inside container
router.post('/:panelId/stop', async (req, res) => {
  try {
    const { panelId } = req.params;
    
    await dockerService.stopPm2App(panelId);
    
    res.json({
      success: true,
      panelId,
      message: 'App stopped'
    });
  } catch (error) {
    console.error('Stop error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Restart app inside container
router.post('/:panelId/restart', async (req, res) => {
  try {
    const { panelId } = req.params;
    
    const result = await dockerService.restartPm2App(panelId);
    
    res.json({
      success: true,
      panelId,
      message: 'App restarted',
      output: result.stdout
    });
  } catch (error) {
    console.error('Restart error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete container
router.delete('/:panelId', async (req, res) => {
  try {
    const { panelId } = req.params;
    
    await dockerService.removeContainer(panelId);
    
    res.json({
      success: true,
      panelId,
      message: 'Container removed'
    });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
