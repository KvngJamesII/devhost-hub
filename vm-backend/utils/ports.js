const fs = require('fs');
const path = require('path');

const PORTS_FILE = path.join(process.env.HOME, '.idev-ports.json');
const PORT_RANGE_START = 4000;
const PORT_RANGE_END = 5000;

class PortManager {
  constructor() {
    this.loadPorts();
  }

  loadPorts() {
    try {
      if (fs.existsSync(PORTS_FILE)) {
        this.ports = JSON.parse(fs.readFileSync(PORTS_FILE, 'utf8'));
      } else {
        this.ports = {};
      }
    } catch (error) {
      console.error('Error loading ports:', error);
      this.ports = {};
    }
  }

  savePorts() {
    try {
      fs.writeFileSync(PORTS_FILE, JSON.stringify(this.ports, null, 2));
    } catch (error) {
      console.error('Error saving ports:', error);
    }
  }

  allocate(panelId) {
    // Return existing port if already allocated
    if (this.ports[panelId]) {
      return this.ports[panelId];
    }

    // Find next available port
    const usedPorts = new Set(Object.values(this.ports));
    for (let port = PORT_RANGE_START; port <= PORT_RANGE_END; port++) {
      if (!usedPorts.has(port)) {
        this.ports[panelId] = port;
        this.savePorts();
        console.log(`Allocated port ${port} for panel ${panelId}`);
        return port;
      }
    }

    throw new Error('No available ports');
  }

  release(panelId) {
    if (this.ports[panelId]) {
      const port = this.ports[panelId];
      delete this.ports[panelId];
      this.savePorts();
      console.log(`Released port ${port} from panel ${panelId}`);
      return port;
    }
    return null;
  }

  getPort(panelId) {
    return this.ports[panelId] || null;
  }

  getAllocations() {
    return { ...this.ports };
  }
}

module.exports = new PortManager();
