import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { RoomManager } from './RoomManager';
import { GameManager } from './GameManager';
import cors from 'cors';
import helmet from 'helmet';
import { LRUCache } from 'lru-cache';
import dgram from 'dgram';
import path from 'path';

const app = express();
const server = http.createServer(app);
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
];

const io = new Server(server, {
  cors: {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow no origin (Postman, mobile apps, server-to-server)
      if (!origin) { callback(null, true); return; }
      // Allow localhost/127.0.0.1 (dev) + any LAN IP (192.168.x.x, 10.x.x.x)
      const isDev = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
      const isLan = /^https?:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/.test(origin);
      const isExplicit = ALLOWED_ORIGINS.includes(origin);
      callback(null, isDev || isLan || isExplicit);
    },
    methods: ['GET', 'POST'],
  },
});

const roomManager = new RoomManager();
const gameManager = new GameManager(roomManager, io);

const RATE_LIMIT_WINDOW = 1000;
const RATE_LIMIT_MAX = 10;

// Use LRUCache instead of Map to prevent memory leaks from DDoS
const rateLimits = new LRUCache<string, number>({
  max: 5000,
  ttl: RATE_LIMIT_WINDOW,
});

function checkRateLimit(socketId: string): boolean {
  const currentCount = rateLimits.get(socketId) || 0;
  if (currentCount >= RATE_LIMIT_MAX) {
    return false;
  }
  rateLimits.set(socketId, currentCount + 1);
  return true;
}

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(helmet({
  contentSecurityPolicy: false,
}));
app.use(cors());
const clientDistPath = path.join(__dirname, '..', '..', 'client', 'dist');
app.use(express.static(clientDistPath));
app.use(express.static('public'));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', rooms: roomManager.getRoomCount() });
});

const discoveredServers = new Map<string, { ip: string, port: number, name: string, lastSeen: number }>();

app.get('/lan-servers', (_req, res) => {
  const now = Date.now();
  const activeServers = Array.from(discoveredServers.values())
    .filter(s => now - s.lastSeen < 10000)
    .map(s => ({ ip: s.ip, port: s.port, name: s.name }));
  res.json({ servers: activeServers });
});

// Fallback all other routes to React client index.html
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

setInterval(() => {
  roomManager.cleanupStaleRooms();
}, 60000);

// Clean up old discovered servers (not seen in 30 seconds)
setInterval(() => {
  const now = Date.now();
  for (const [key, server] of discoveredServers.entries()) {
    if (now - server.lastSeen > 30000) {
      discoveredServers.delete(key);
    }
  }
}, 30000);

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  // Rate limiter middleware - blocks events when limit exceeded
  socket.use(([event, ...args], next) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('error', { code: 'RATE_LIMIT_EXCEEDED', message: 'Rate limit exceeded. Please slow down.' });
      return; // Don't call next() - blocks the event
    }
    next();
  });

  socket.on('room:create', (data: { playerName: string, isPublic?: boolean }) => {
    const { playerName, isPublic = true } = data;
    const room = roomManager.createRoom(socket.id, playerName, isPublic);
    socket.join(room.id);
    socket.emit('room:created', { roomId: room.id, players: room.players, playerId: socket.id });
    console.log(`Room created: ${room.id} (Public: ${isPublic})`);
  });

  socket.on('room:list', () => {
    socket.emit('room:list_result', { rooms: roomManager.getAvailableRooms() });
  });

  socket.on('room:join', (data: { roomId: string; playerName: string }) => {
    const { roomId, playerName } = data;
    console.log(`[JOIN] Player ${playerName} (${socket.id}) joining room ${roomId}`);
    const result = roomManager.joinRoom(roomId, socket.id, playerName);
    console.log('[JOIN] Result:', result);

    if (result.success) {
      socket.join(roomId);
      console.log(`[JOIN] Socket ${socket.id} joined room ${roomId}`);
      const room = roomManager.getRoom(roomId);
      socket.emit('room:joined', { roomId, players: room?.players, playerId: socket.id });
      
      console.log(`[JOIN] Room has ${room?.players.length} players:`, room?.players.map(p => p.name));
      
      io.to(roomId).emit('room:players', { players: room?.players });
    } else {
      socket.emit('error', { code: 'JOIN_ROOM_FAILED', message: result.error });
    }
  });

  socket.on('room:ready', (data: { roomId: string }) => {
    const { roomId } = data;
    console.log(`[READY] Player ${socket.id} toggling ready in room ${roomId}`);
    const result = roomManager.toggleReady(roomId, socket.id);
    console.log('[READY] Result:', result);

    if (result.success) {
      const room = roomManager.getRoom(roomId);
      console.log(`[READY] Room has ${room?.players.length} players`);
      
      io.to(roomId).emit('room:players', { players: result.players });
      console.log('[READY] Emitted room:players');

      if (result.allReady && result.players && result.players.length >= 2) {
        console.log('[READY] All players ready! Starting game...');
        gameManager.startGame(roomId);
      }
    }
  });

  socket.on('room:leave', (data: { roomId: string }) => {
    const { roomId } = data;
    roomManager.leaveRoom(roomId, socket.id);
    socket.leave(roomId);
    socket.emit('room:left');
    const updatedRoom = roomManager.getRoom(roomId);
    if (updatedRoom) {
      io.to(roomId).emit('room:players', { players: updatedRoom.players });
    }
  });

  socket.on('game:choose', (data: { roomId: string; cardId: string }) => {
    const { roomId, cardId } = data;
    gameManager.handleCardChoice(roomId, socket.id, cardId);
  });

  socket.on('game:answer', (data: { roomId: string; answer: string }) => {
    const { roomId, answer } = data;
    gameManager.handleAnswer(roomId, socket.id, answer);
  });

  socket.on('game:leaveAfterDeath', (data: { roomId: string }) => {
    const { roomId } = data;
    gameManager.handleLeaveAfterDeath(roomId, socket.id);
    socket.leave(roomId);
    socket.emit('room:left');
  });

  // Chat: send message to room
  socket.on('chat:send', (data: { roomId: string; message: string }) => {
    const { roomId, message } = data;
    if (!message || typeof message !== 'string') return;
    
    // Sanitize: strip HTML, max 200 chars
    const clean = message.replace(/<[^>]*>/g, '').trim().slice(0, 200);
    if (!clean) return;
    
    const room = roomManager.getRoom(roomId);
    if (!room) return;
    
    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;
    
    io.to(roomId).emit('chat:message', {
      senderId: socket.id,
      sender: player.name,
      message: clean,
      timestamp: Date.now(),
    });
  });

  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    roomManager.handleDisconnect(socket.id);
    gameManager.handleDisconnect(socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`LAN: http://localhost:${PORT}`);
  
  // UDP Broadcast for LAN discovery
  const UDP_PORT = 41234;
  const broadcaster = dgram.createSocket('udp4');
  
  broadcaster.on('listening', () => {
    broadcaster.setBroadcast(true);
    console.log(`UDP Broadcaster running on port ${UDP_PORT}`);
  });
  
  // Start binding the UDP socket to any available ephemeral port for sending
  broadcaster.bind();

  const listener = dgram.createSocket({ type: 'udp4', reuseAddr: true });
  listener.on('message', (msg, rinfo) => {
    try {
      const data = JSON.parse(msg.toString());
      if (data.type === 'ROULETTE_QUIZ_SERVER') {
        discoveredServers.set(`${rinfo.address}:${data.port}`, {
          ip: rinfo.address,
          port: data.port,
          name: `SERVER-${rinfo.address.split('.').pop()}`,
          lastSeen: Date.now()
        });
      }
    } catch(e) {}
  });
  listener.bind(UDP_PORT);
  
  setInterval(() => {
    try {
      const message = Buffer.from(JSON.stringify({ 
        type: 'ROULETTE_QUIZ_SERVER', 
        port: PORT, 
        rooms: roomManager.getRoomCount() 
      }));
      broadcaster.send(message, 0, message.length, UDP_PORT, '255.255.255.255');
    } catch (err) {
      // Ignore broadcast errors
    }
  }, 2000);
});

// Production resilience error boundaries
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION AT:', promise, 'REASON:', reason);
});

// Graceful Shutdown
const gracefulShutdown = () => {
  console.log('Shutting down server gracefully...');
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
};
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
