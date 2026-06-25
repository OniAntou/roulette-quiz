import dgram from 'dgram';
import os from 'os';

export interface DiscoveredServer {
  ip: string;
  port: number;
  lastSeen: number;
  name: string;
}

export class LANDiscovery {
  private socket: dgram.Socket;
  private servers: Map<string, DiscoveredServer> = new Map();
  private broadcastInterval: NodeJS.Timeout | null = null;
  private readonly BROADCAST_PORT = 41234;
  private readonly SERVER_PORT: number;
  private readonly serverName: string;

  constructor(serverPort: number) {
    this.SERVER_PORT = serverPort;
    this.serverName = os.hostname() + ' - Roulette';
    this.socket = dgram.createSocket('udp4');

    this.socket.on('message', (msg, rinfo) => {
      try {
        const data = JSON.parse(msg.toString());
        if (data.type === 'ROULETTE_ANNOUNCE') {
          // Ignore our own broadcasts
          if (!this.isLocalIP(rinfo.address) || data.port !== this.SERVER_PORT) {
            this.servers.set(rinfo.address + ':' + data.port, {
              ip: rinfo.address,
              port: data.port,
              lastSeen: Date.now(),
              name: data.name || rinfo.address
            });
          }
        }
      } catch (e) {
        // Ignore invalid JSON
      }
    });

    this.socket.on('error', (err) => {
      console.error(`LAN Discovery error:\n${err.stack}`);
      this.socket.close();
    });
  }

  public start() {
    this.socket.bind(this.BROADCAST_PORT, () => {
      this.socket.setBroadcast(true);
      console.log(`LAN Discovery listening and broadcasting on UDP ${this.BROADCAST_PORT}`);
      
      this.broadcastInterval = setInterval(() => {
        this.broadcastPresence();
        this.cleanStaleServers();
      }, 2000);
    });
  }

  public stop() {
    if (this.broadcastInterval) {
      clearInterval(this.broadcastInterval);
    }
    this.socket.close();
  }

  public getServers(): DiscoveredServer[] {
    return Array.from(this.servers.values());
  }

  private broadcastPresence() {
    const msg = Buffer.from(JSON.stringify({
      type: 'ROULETTE_ANNOUNCE',
      port: this.SERVER_PORT,
      name: this.serverName
    }));

    // Broadcast to 255.255.255.255
    this.socket.send(msg, 0, msg.length, this.BROADCAST_PORT, '255.255.255.255', (err) => {
      if (err) {
        console.error('Broadcast error:', err);
      }
    });
  }

  private cleanStaleServers() {
    const now = Date.now();
    for (const [key, server] of this.servers.entries()) {
      if (now - server.lastSeen > 6000) { // Remove after 6 seconds of no announcements
        this.servers.delete(key);
      }
    }
  }

  private isLocalIP(ip: string): boolean {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      const ifaces = interfaces[name];
      if (!ifaces) continue;
      for (const iface of ifaces) {
        if (iface.address === ip) return true;
      }
    }
    return ip === '127.0.0.1' || ip === '::1';
  }
}
