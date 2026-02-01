const express = require('express');
const router = express.Router();
const dockerService = require('../services/dockerService');

// Execute command (non-interactive fallback)
router.post('/:panelId/exec', async (req, res) => {
  try {
    const { panelId } = req.params;
    const { command } = req.body;
    
    if (!command) {
      return res.status(400).json({ error: 'Command required' });
    }

    // Blocked commands for security
    const blockedPatterns = [
      /^sudo\s/i,
      /^su\s/i,
      /^apt\s/i,
      /^apt-get\s/i,
      /^yum\s/i,
      /^dnf\s/i,
      /^chmod\s+[0-7]*7[0-7]*\s/i, // chmod with world-writable
      /rm\s+-rf\s+\/(?!app)/i, // rm -rf outside /app
      /^mount\s/i,
      /^umount\s/i,
      /^kill\s+-9\s+1$/i, // kill init
      /^reboot/i,
      /^shutdown/i,
      /^init\s/i,
      /\/etc\//i,
      /\/var\/log/i,
      /\/root/i,
    ];

    for (const pattern of blockedPatterns) {
      if (pattern.test(command)) {
        return res.status(403).json({ 
          error: 'Command not allowed',
          message: 'This command is restricted for security reasons'
        });
      }
    }

    const result = await dockerService.execInContainer(panelId, command);
    res.json(result);
  } catch (error) {
    console.error('Exec error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get terminal WebSocket info
router.get('/:panelId/info', async (req, res) => {
  try {
    const { panelId } = req.params;
    
    // Return WebSocket connection info
    res.json({
      panelId,
      wsUrl: `/terminal/${panelId}`,
      port: process.env.WS_PORT || 3002,
      protocol: 'ws'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
