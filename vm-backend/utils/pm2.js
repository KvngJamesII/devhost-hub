const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

class PM2Manager {
  async list() {
    try {
      const { stdout } = await execAsync('pm2 jlist');
      return JSON.parse(stdout);
    } catch (error) {
      console.error('PM2 list error:', error);
      return [];
    }
  }

  async getProcess(name) {
    const processes = await this.list();
    return processes.find(p => p.name === name);
  }

  async start(name, script, cwd, env = {}) {
    // Delete any existing process with this name to prevent duplicates
    try {
      const existing = await this.getProcess(name);
      if (existing) {
        console.log(`Deleting existing process "${name}" before starting new one`);
        await execAsync(`pm2 delete "${name}"`).catch(() => {});
      }
    } catch (e) {
      // Ignore - process may not exist
    }

    const envString = Object.entries(env)
      .map(([k, v]) => `${k}="${v}"`)
      .join(' ');
    
    let cmd;
    if (script.includes('/venv/bin/python')) {
      const parts = script.split(' ');
      const interpreter = parts[0];
      const mainScript = parts.slice(1).join(' ');
      cmd = `cd "${cwd}" && ${envString} pm2 start "${mainScript}" --name "${name}" --interpreter "${interpreter}" --update-env`;
    } else {
      cmd = `cd "${cwd}" && ${envString} pm2 start ${script} --name "${name}" --update-env`;
    }
    console.log('Starting process:', cmd);
    
    try {
      await execAsync(cmd);
      await execAsync('pm2 save');
      return { success: true };
    } catch (error) {
      console.error('PM2 start error:', error);
      throw error;
    }
  }

  async stop(name) {
    try {
      await execAsync(`pm2 stop "${name}"`);
      await execAsync('pm2 save');
      return { success: true };
    } catch (error) {
      console.error('PM2 stop error:', error);
      throw error;
    }
  }

  async restart(name) {
    try {
      await execAsync(`pm2 restart "${name}"`);
      await execAsync('pm2 save');
      return { success: true };
    } catch (error) {
      console.error('PM2 restart error:', error);
      throw error;
    }
  }

  async delete(name) {
    try {
      await execAsync(`pm2 delete "${name}"`);
      await execAsync('pm2 save');
      return { success: true };
    } catch (error) {
      console.error('PM2 delete error:', error);
      throw error;
    }
  }

  async logs(name, lines = 100) {
    try {
      const { stdout: outLogs } = await execAsync(
        `pm2 logs "${name}" --lines ${lines} --nostream --out 2>/dev/null || echo ""`
      ).catch(() => ({ stdout: '' }));
      
      const { stdout: errLogs } = await execAsync(
        `pm2 logs "${name}" --lines ${lines} --nostream --err 2>/dev/null || echo ""`
      ).catch(() => ({ stdout: '' }));

      return {
        out: outLogs,
        err: errLogs
      };
    } catch (error) {
      console.error('PM2 logs error:', error);
      return { out: '', err: '' };
    }
  }

  async flush(name) {
    try {
      await execAsync(`pm2 flush "${name}"`);
      return { success: true };
    } catch (error) {
      console.error('PM2 flush error:', error);
      throw error;
    }
  }
}

module.exports = new PM2Manager();
