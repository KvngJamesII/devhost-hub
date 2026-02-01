const express = require('express');
const router = express.Router();
const dockerService = require('../services/dockerService');

// Get PM2 logs
router.get('/:panelId', async (req, res) => {
  try {
    const { panelId } = req.params;
    const { lines = 100 } = req.query;
    
    const logs = await dockerService.getPm2Logs(panelId, parseInt(lines));
    res.json(logs);
  } catch (error) {
    console.error('Logs error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
