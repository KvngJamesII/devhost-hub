const Docker = require('dockerode');
const path = require('path');
const fs = require('fs');

const docker = new Docker({ socketPath: '/var/run/docker.sock' });
const APPS_DIR = process.env.APPS_DIR || '/home/ubuntu/apps';
const IMAGE_NAME = 'idev-user-env:latest';

// Container resource limits
const CONTAINER_LIMITS = {
  Memory: 512 * 1024 * 1024, // 512MB
  NanoCpus: 500000000, // 0.5 CPU
  PidsLimit: 100,
};

/**
 * Get container name from panel ID
 */
function getContainerName(panelId) {
  return `panel-${panelId}`;
}

/**
 * Get or create app directory
 */
function getAppDir(panelId) {
  const appDir = path.join(APPS_DIR, panelId);
  if (!fs.existsSync(appDir)) {
    fs.mkdirSync(appDir, { recursive: true });
  }
  return appDir;
}

/**
 * Check if container exists
 */
async function containerExists(panelId) {
  const containerName = getContainerName(panelId);
  try {
    const containers = await docker.listContainers({ all: true });
    return containers.some(c => c.Names.includes(`/${containerName}`));
  } catch (error) {
    console.error('Error checking container:', error);
    return false;
  }
}

/**
 * Get container instance
 */
async function getContainer(panelId) {
  const containerName = getContainerName(panelId);
  return docker.getContainer(containerName);
}

/**
 * Get container status
 */
async function getContainerStatus(panelId) {
  const containerName = getContainerName(panelId);
  
  try {
    const containers = await docker.listContainers({ all: true });
    const containerInfo = containers.find(c => c.Names.includes(`/${containerName}`));
    
    if (!containerInfo) {
      return {
        panelId,
        exists: false,
        status: 'not_created',
        containerId: null
      };
    }

    const container = docker.getContainer(containerInfo.Id);
    const stats = await container.stats({ stream: false });
    
    // Calculate CPU and memory usage
    const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
    const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
    const cpuPercent = systemDelta > 0 ? (cpuDelta / systemDelta) * 100 : 0;
    
    const memoryUsage = stats.memory_stats.usage || 0;
    const memoryLimit = stats.memory_stats.limit || 1;
    
    return {
      panelId,
      exists: true,
      status: containerInfo.State === 'running' ? 'running' : 'stopped',
      containerId: containerInfo.Id.substring(0, 12),
      cpu: cpuPercent.toFixed(2),
      memory: memoryUsage,
      memoryLimit: memoryLimit,
      uptime: containerInfo.State === 'running' ? Date.now() - (containerInfo.Created * 1000) : 0
    };
  } catch (error) {
    console.error('Error getting container status:', error);
    return {
      panelId,
      exists: false,
      status: 'error',
      error: error.message
    };
  }
}

/**
 * Create container for a panel
 */
async function createContainer(panelId, language = 'nodejs') {
  const containerName = getContainerName(panelId);
  const appDir = getAppDir(panelId);
  
  // Check if already exists
  if (await containerExists(panelId)) {
    console.log(`Container ${containerName} already exists`);
    return getContainer(panelId);
  }

  console.log(`Creating container ${containerName} for ${language}`);

  const container = await docker.createContainer({
    Image: IMAGE_NAME,
    name: containerName,
    Hostname: panelId.substring(0, 12),
    WorkingDir: '/app',
    Env: [
      `PANEL_ID=${panelId}`,
      `LANGUAGE=${language}`,
      'NODE_ENV=production'
    ],
    HostConfig: {
      Binds: [`${appDir}:/app`],
      Memory: CONTAINER_LIMITS.Memory,
      NanoCpus: CONTAINER_LIMITS.NanoCpus,
      PidsLimit: CONTAINER_LIMITS.PidsLimit,
      RestartPolicy: { Name: 'unless-stopped' },
      // Security options
      SecurityOpt: ['no-new-privileges'],
      CapDrop: ['ALL'],
      CapAdd: ['CHOWN', 'SETUID', 'SETGID'],
    },
    // Keep container running
    Cmd: ['tail', '-f', '/dev/null'],
    Tty: true,
    OpenStdin: true,
  });

  await container.start();
  console.log(`Container ${containerName} started`);
  
  return container;
}

/**
 * Start a stopped container
 */
async function startContainer(panelId) {
  const container = await getContainer(panelId);
  const info = await container.inspect();
  
  if (!info.State.Running) {
    await container.start();
  }
  
  return container;
}

/**
 * Stop a running container
 */
async function stopContainer(panelId) {
  const container = await getContainer(panelId);
  const info = await container.inspect();
  
  if (info.State.Running) {
    await container.stop();
  }
  
  return { success: true };
}

/**
 * Remove a container
 */
async function removeContainer(panelId) {
  try {
    const container = await getContainer(panelId);
    await container.stop().catch(() => {}); // Ignore if not running
    await container.remove();
    return { success: true };
  } catch (error) {
    if (error.statusCode === 404) {
      return { success: true, message: 'Container did not exist' };
    }
    throw error;
  }
}

/**
 * Execute command inside container
 */
async function execInContainer(panelId, command, workdir = '/app') {
  const container = await getContainer(panelId);
  
  const exec = await container.exec({
    Cmd: ['bash', '-c', command],
    AttachStdout: true,
    AttachStderr: true,
    WorkingDir: workdir,
  });

  return new Promise((resolve, reject) => {
    exec.start({ hijack: true, stdin: false }, (err, stream) => {
      if (err) return reject(err);

      let stdout = '';
      let stderr = '';

      stream.on('data', (chunk) => {
        // Docker multiplexes stdout/stderr - first 8 bytes are header
        const data = chunk.slice(8).toString();
        const streamType = chunk[0];
        
        if (streamType === 1) {
          stdout += data;
        } else {
          stderr += data;
        }
      });

      stream.on('end', () => {
        resolve({
          success: true,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          cwd: workdir
        });
      });

      stream.on('error', reject);
    });
  });
}

/**
 * Get PM2 status inside container
 */
async function getPm2Status(panelId) {
  try {
    const result = await execInContainer(panelId, 'pm2 jlist 2>/dev/null || echo "[]"');
    const processes = JSON.parse(result.stdout || '[]');
    return processes;
  } catch (error) {
    return [];
  }
}

/**
 * Start app with PM2 inside container
 */
async function startAppWithPm2(panelId, language, entryPoint) {
  const container = await getContainer(panelId);
  
  // Install dependencies first
  if (language === 'nodejs') {
    await execInContainer(panelId, 'npm install 2>&1 || true');
  } else if (language === 'python') {
    await execInContainer(panelId, 'python3 -m venv venv 2>&1 || true');
    await execInContainer(panelId, 'venv/bin/pip install -r requirements.txt 2>&1 || true');
  }

  // Build PM2 start command
  let startCmd;
  if (language === 'nodejs') {
    startCmd = `pm2 start ${entryPoint} --name app --update-env`;
  } else {
    startCmd = `pm2 start venv/bin/python --name app --interpreter none -- ${entryPoint}`;
  }

  const result = await execInContainer(panelId, startCmd);
  return result;
}

/**
 * Stop PM2 app inside container
 */
async function stopPm2App(panelId) {
  return execInContainer(panelId, 'pm2 stop all 2>&1 || true');
}

/**
 * Restart PM2 app inside container
 */
async function restartPm2App(panelId) {
  return execInContainer(panelId, 'pm2 restart all 2>&1 || true');
}

/**
 * Get PM2 logs from container
 */
async function getPm2Logs(panelId, lines = 100) {
  const result = await execInContainer(panelId, `pm2 logs --nostream --lines ${lines} 2>&1 || echo "No logs"`);
  return {
    panelId,
    logs: {
      out: result.stdout,
      err: result.stderr
    }
  };
}

module.exports = {
  docker,
  getContainerName,
  getAppDir,
  containerExists,
  getContainer,
  getContainerStatus,
  createContainer,
  startContainer,
  stopContainer,
  removeContainer,
  execInContainer,
  getPm2Status,
  startAppWithPm2,
  stopPm2App,
  restartPm2App,
  getPm2Logs,
  APPS_DIR
};
