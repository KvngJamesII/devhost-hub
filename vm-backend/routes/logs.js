const express = require('express');
const router = express.Router();
const pm2Manager = require('../utils/pm2');

// Get logs
router.get('/:panelId', async (req, res) => {
  try {
    const { panelId } = req.params;
    const { lines = 100 } = req.query;
    const processName = `panel-${panelId}`;

    const logs = await pm2Manager.logs(processName, parseInt(lines));

    res.json({
      panelId,
      logs: {
        out: logs.out,
        err: logs.err
      }
    });
  } catch (error) {
    console.error('Logs error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Clear logs
router.delete('/:panelId', async (req, res) => {
  try {
    const { panelId } = req.params;
    const processName = `panel-${panelId}`;

    await pm2Manager.flush(processName);

    res.json({ 
      success: true, 
      panelId,
      message: 'Logs cleared' 
    });
  } catch (error) {
    console.error('Clear logs error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
