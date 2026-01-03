const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

const APPS_DIR = process.env.APPS_DIR || path.join(process.env.HOME, 'apps');

// Allowed commands for security (cd is NOT allowed - users stay in their panel dir)
const ALLOWED_COMMANDS = [
  'ls', 'cat', 'head', 'tail', 'pwd', 'echo', 'whoami', 'date',
  'npm', 'node', 'python3', 'python', 'pip', 'pip3',
  'git', 'curl', 'wget', 'mkdir', 'touch', 'rm', 'cp', 'mv',
  'grep', 'find', 'wc', 'sort', 'uniq', 'env', 'which', 'clear'
];

// Block dangerous path patterns - prevents escaping panel directory
const isPathEscape = (command) => {
  const patterns = [
    /\.\.\//,           // ../
    /\.\.\\/,           // ..\
    /^cd\s/i,           // cd command
    /;\s*cd\s/i,        // ; cd
    /\|\s*cd\s/i,       // | cd
    /&&\s*cd\s/i,       // && cd
    /\|\|\s*cd\s/i,     // || cd
    /^~(?![\/])/,       // ~ without / (home directory)
    /\s~(?![\/])/,      // space then ~ 
    /^\/(?!tmp)/,       // absolute paths (except /tmp)
    /\s\/(?!tmp)/,      // space then absolute path
  ];
  
  return patterns.some(p => p.test(command));
};

// Execute command
router.post('/:panelId/exec', async (req, res) => {
  try {
    const { panelId } = req.params;
    const { command } = req.body;

    if (!command) {
      return res.status(400).json({ error: 'Command required' });
    }

    const appDir = path.join(APPS_DIR, panelId);

    // Create app directory if it doesn't exist
    if (!fs.existsSync(appDir)) {
      fs.mkdirSync(appDir, { recursive: true });
    }

    // Check for path escape attempts FIRST
    if (isPathEscape(command)) {
      return res.status(403).json({ 
        error: 'Directory navigation outside panel is not allowed',
        hint: 'You can only work within your panel directory'
      });
    }

    // Extract base command for validation
    const baseCommand = command.trim().split(/\s+/)[0];

    // Security check (validate the *user command*, not any internal rewrites)
    if (!ALLOWED_COMMANDS.includes(baseCommand)) {
      return res.status(403).json({
        error: `Command '${baseCommand}' not allowed`,
        allowed: ALLOWED_COMMANDS
      });
    }

    // Block dangerous patterns (check the raw command the user typed)
    const dangerousPatterns = [
      /;\s*(rm\s+-rf\s+\/|dd|mkfs|:|>|>>)/i,
      /\|\s*(rm|dd|bash|sh|zsh)/i,
      /`.*`/,
      /\$\(.*\)/,
      />\s*\/dev/,
      /\/etc\/(passwd|shadow|hosts)/,
      /\/proc\//,
      /\/sys\//,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(command)) {
        return res.status(403).json({ error: 'Potentially dangerous command pattern detected' });
      }
    }

    // If a panel venv exists, route python/pip through it to avoid PEP 668
    // (so "pip install ..." installs into ./venv, not system Python)
    let execCommand = command;
    try {
      const venvPath = path.join(appDir, 'venv');
      const venvPython = path.join(venvPath, 'bin', 'python');
      const venvPip = path.join(venvPath, 'bin', 'pip');

      if (fs.existsSync(venvPython)) {
        if (baseCommand === 'python' || baseCommand === 'python3') {
          execCommand = command.replace(/^python3?\b/, `"${venvPython}"`);
        } else if (baseCommand === 'pip' || baseCommand === 'pip3') {
          execCommand = command.replace(/^pip3?\b/, `"${venvPip}"`);
        }
      }
    } catch (e) {
      // If rewrite fails, fall back to the raw command
    }

    // Execute command
    const { stdout, stderr } = await execAsync(execCommand, {
      cwd: appDir,
      timeout: 30000, // 30 second timeout
      maxBuffer: 1024 * 1024 // 1MB buffer
    });

    res.json({
      success: true,
      stdout,
      stderr,
      cwd: appDir
    });
  } catch (error) {
    console.error('Exec error:', error);
    res.json({
      success: false,
      stdout: '',
      stderr: error.message,
      code: error.code
    });
  }
});

module.exports = router;
