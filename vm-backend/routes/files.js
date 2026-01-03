const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

const APPS_DIR = process.env.APPS_DIR || path.join(process.env.HOME, 'apps');

// Sync files (upload/update)
router.post('/:panelId/sync', async (req, res) => {
  try {
    const { panelId } = req.params;
    const { files } = req.body; // Array of { path, content }
    const appDir = path.join(APPS_DIR, panelId);

    // Create app directory if it doesn't exist
    if (!fs.existsSync(appDir)) {
      fs.mkdirSync(appDir, { recursive: true });
    }

    const results = [];
    for (const file of files) {
      const filePath = path.join(appDir, file.path);
      const fileDir = path.dirname(filePath);

      // Ensure directory exists
      if (!fs.existsSync(fileDir)) {
        fs.mkdirSync(fileDir, { recursive: true });
      }

      // Write file
      fs.writeFileSync(filePath, file.content || '');
      results.push({ path: file.path, success: true });
    }

    res.json({ 
      success: true, 
      synced: results.length,
      files: results 
    });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ error: error.message });
  }
});

// List files
router.get('/:panelId', async (req, res) => {
  try {
    const { panelId } = req.params;
    const { dir = '' } = req.query;
    const appDir = path.join(APPS_DIR, panelId);
    const targetDir = path.join(appDir, dir);

    if (!fs.existsSync(targetDir)) {
      return res.json({ files: [] });
    }

    const entries = fs.readdirSync(targetDir, { withFileTypes: true });
    const files = entries
      .filter(entry => !['node_modules', 'venv', '.git', '__pycache__'].includes(entry.name))
      .map(entry => ({
        name: entry.name,
        path: path.join(dir, entry.name),
        type: entry.isDirectory() ? 'directory' : 'file',
        size: entry.isFile() ? fs.statSync(path.join(targetDir, entry.name)).size : null
      }));

    res.json({ files });
  } catch (error) {
    console.error('List error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get file content
router.get('/:panelId/content', async (req, res) => {
  try {
    const { panelId } = req.params;
    const { path: filePath } = req.query;
    
    if (!filePath) {
      return res.status(400).json({ error: 'Path required' });
    }

    const appDir = path.join(APPS_DIR, panelId);
    const fullPath = path.join(appDir, filePath);

    // Security: ensure path is within app directory
    if (!fullPath.startsWith(appDir)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      return res.status(400).json({ error: 'Cannot read directory' });
    }

    const content = fs.readFileSync(fullPath, 'utf8');
    res.json({ path: filePath, content });
  } catch (error) {
    console.error('Get content error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete file or directory
router.delete('/:panelId', async (req, res) => {
  try {
    const { panelId } = req.params;
    const { path: filePath } = req.query;
    
    if (!filePath) {
      return res.status(400).json({ error: 'Path required' });
    }

    const appDir = path.join(APPS_DIR, panelId);
    const fullPath = path.join(appDir, filePath);

    // Security: ensure path is within app directory
    if (!fullPath.startsWith(appDir)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      fs.rmSync(fullPath, { recursive: true });
    } else {
      fs.unlinkSync(fullPath);
    }

    res.json({ success: true, deleted: filePath });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create directory
router.post('/:panelId/mkdir', async (req, res) => {
  try {
    const { panelId } = req.params;
    const { path: dirPath } = req.body;
    
    if (!dirPath) {
      return res.status(400).json({ error: 'Path required' });
    }

    const appDir = path.join(APPS_DIR, panelId);
    const fullPath = path.join(appDir, dirPath);

    // Security: ensure path is within app directory
    if (!fullPath.startsWith(appDir)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    fs.mkdirSync(fullPath, { recursive: true });
    res.json({ success: true, created: dirPath });
  } catch (error) {
    console.error('Mkdir error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
