import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import { RoomManager } from './RoomManager';
import { GameManager } from './GameManager';
import cors from 'cors';
import helmet from 'helmet';
import { LRUCache } from 'lru-cache';
import dgram from 'dgram';
import path from 'path';
import fs from 'fs';

const app = express();
const server = http.createServer(app);
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
];

function allowOrigin(
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void,
): void {
  if (!origin) {
    callback(null, true);
    return;
  }

  const isDev = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  const isLan = /^https?:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/.test(origin);
  const isExplicit = ALLOWED_ORIGINS.includes(origin);
  callback(null, isDev || isLan || isExplicit);
}

const io = new Server(server, {
  cors: {
    origin: allowOrigin,
    methods: ['GET', 'POST'],
  },
});

const roomManager = new RoomManager();
const gameManager = new GameManager(roomManager, io);

function getCanonicalRoomId(socket: Socket, requestedRoomId?: string): string | undefined {
  const roomId = roomManager.getRoomIdForPlayer(socket.id);
  if (!roomId || (requestedRoomId && roomId !== requestedRoomId)) {
    socket.emit('error', { code: 'ROOM_MEMBERSHIP_REQUIRED', message: 'Socket is not a member of that room.' });
    return undefined;
  }
  return roomId;
}

const globalPlayerNames = new Map<string, string>();

const RATE_LIMIT_WINDOW = 1000;
const RATE_LIMIT_MAX = 10;

const rateLimits = new LRUCache<string, number>({
  max: 5000,
  ttl: RATE_LIMIT_WINDOW,
});

type Payload = Record<string, unknown>;

function isPayload(data: unknown): data is Payload {
  return typeof data === 'object' && data !== null && !Array.isArray(data);
}

function getString(data: unknown, key: string): string | undefined {
  if (!isPayload(data)) return undefined;
  const value = data[key];
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function getOptionalBoolean(data: unknown, key: string): boolean | undefined {
  if (!isPayload(data)) return undefined;
  const value = data[key];
  return typeof value === 'boolean' ? value : undefined;
}

function rejectInvalidPayload(socket: Socket, event: string): void {
  socket.emit('error', {
    code: 'INVALID_PAYLOAD',
    message: `Invalid payload for ${event}.`,
  });
}

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
app.use(cors({ origin: allowOrigin }));

const clientDistPath = fs.existsSync(path.join(__dirname, '..', '..', '..', '..', 'client', 'dist'))
  ? path.join(__dirname, '..', '..', '..', '..', 'client', 'dist')
  : path.join(__dirname, '..', '..', 'client', 'dist');
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

app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

setInterval(() => {
  roomManager.cleanupStaleRooms();
}, 60000);

setInterval(() => {
  const now = Date.now();
  for (const [key, discoveredServer] of discoveredServers.entries()) {
    if (now - discoveredServer.lastSeen > 30000) {
      discoveredServers.delete(key);
    }
  }
}, 30000);

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);
  globalPlayerNames.set(socket.id, 'GUEST');

  socket.use(([_event, ..._args], next) => {
    if (!checkRateLimit(socket.id)) {
      console.warn(`Rate limit exceeded for ${socket.id}`);
      socket.emit('error', { code: 'RATE_LIMIT_EXCEEDED', message: 'Rate limit exceeded. Please slow down.' });
      return;
    }
    next();
  });

  socket.on('room:create', (data: unknown) => {
    const playerName = getString(data, 'playerName');
    if (!playerName) {
      rejectInvalidPayload(socket, 'room:create');
      return;
    }

    const previousRoomId = roomManager.getRoomIdForPlayer(socket.id);
    if (previousRoomId) {
      if (roomManager.getRoom(previousRoomId)?.state === 'playing') gameManager.handleDisconnect(socket.id);
      socket.leave(previousRoomId);
      roomManager.handleDisconnect(socket.id);
    }
    const isPublic = getOptionalBoolean(data, 'isPublic') ?? true;
    const room = roomManager.createRoom(socket.id, playerName, isPublic);
    socket.join(room.id);
    globalPlayerNames.set(socket.id, room.players[0].name);
    socket.emit('room:created', { roomId: room.id, players: room.players, playerId: socket.id });
    console.log(`Room created: ${room.id} (Public: ${isPublic})`);
  });

  socket.on('room:list', () => {
    socket.emit('room:list_result', { rooms: roomManager.getAvailableRooms() });
  });

  socket.on('room:join', (data: unknown) => {
    const roomId = getString(data, 'roomId')?.toUpperCase();
    const playerName = getString(data, 'playerName');
    if (!roomId || !playerName) {
      rejectInvalidPayload(socket, 'room:join');
      return;
    }

    const previousRoomId = roomManager.getRoomIdForPlayer(socket.id);
    if (previousRoomId && previousRoomId !== roomId) {
      if (roomManager.getRoom(previousRoomId)?.state === 'playing') gameManager.handleDisconnect(socket.id);
      socket.leave(previousRoomId);
      roomManager.handleDisconnect(socket.id);
    }
    console.log(`[JOIN] Player ${playerName} (${socket.id}) joining room ${roomId}`);
    const result = roomManager.joinRoom(roomId, socket.id, playerName);
    console.log('[JOIN] Result:', result);

    if (result.success) {
      socket.join(roomId);
      const room = roomManager.getRoom(roomId);
      const player = room?.players.find(p => p.id === socket.id);
      globalPlayerNames.set(socket.id, player?.name || 'GUEST');
      console.log(`[JOIN] Socket ${socket.id} joined room ${roomId}`);
      socket.emit('room:joined', { roomId, players: room?.players, playerId: socket.id });
      console.log(`[JOIN] Room has ${room?.players.length} players:`, room?.players.map(p => p.name));
      io.to(roomId).emit('room:players', { players: room?.players });
    } else {
      socket.emit('error', { code: 'JOIN_ROOM_FAILED', message: result.error });
    }
  });

  socket.on('room:ready', (data: unknown) => {
    const roomId = getString(data, 'roomId')?.toUpperCase();
    if (!roomId) {
      rejectInvalidPayload(socket, 'room:ready');
      return;
    }

    if (!getCanonicalRoomId(socket, roomId)) return;
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

  socket.on('room:leave', (data: unknown) => {
    const roomId = getString(data, 'roomId')?.toUpperCase();
    if (!roomId) {
      rejectInvalidPayload(socket, 'room:leave');
      return;
    }

    const canonicalRoomId = getCanonicalRoomId(socket, roomId);
    if (!canonicalRoomId) return;
    if (roomManager.getRoom(canonicalRoomId)?.state === 'playing') gameManager.handleDisconnect(socket.id);
    roomManager.leaveRoom(canonicalRoomId, socket.id);
    socket.leave(canonicalRoomId);
    socket.emit('room:left');
    const updatedRoom = roomManager.getRoom(canonicalRoomId);
    if (updatedRoom) {
      io.to(canonicalRoomId).emit('room:players', { players: updatedRoom.players });
    }
  });

  socket.on('game:play_card', (data: unknown) => {
    const roomId = getString(data, 'roomId')?.toUpperCase();
    const cardId = getString(data, 'cardId');
    if (!roomId || !cardId) {
      rejectInvalidPayload(socket, 'game:play_card');
      return;
    }
    const canonicalRoomId = getCanonicalRoomId(socket, roomId);
    if (canonicalRoomId) gameManager.handlePlayCard(canonicalRoomId, socket.id, cardId);
  });

  socket.on('game:pull_trigger', (data: unknown) => {
    const roomId = getString(data, 'roomId')?.toUpperCase();
    if (!roomId) {
      rejectInvalidPayload(socket, 'game:pull_trigger');
      return;
    }
    const canonicalRoomId = getCanonicalRoomId(socket, roomId);
    if (canonicalRoomId) gameManager.handlePullTrigger(canonicalRoomId, socket.id);
  });

  socket.on('game:mulligan', (data: unknown) => {
    const roomId = getString(data, 'roomId')?.toUpperCase();
    if (!roomId) {
      rejectInvalidPayload(socket, 'game:mulligan');
      return;
    }
    const canonicalRoomId = getCanonicalRoomId(socket, roomId);
    if (canonicalRoomId) gameManager.handleMulligan(canonicalRoomId, socket.id, socket);
  });

  socket.on('game:leaveAfterDeath', (data: unknown) => {
    const roomId = getString(data, 'roomId')?.toUpperCase();
    if (!roomId) {
      rejectInvalidPayload(socket, 'game:leaveAfterDeath');
      return;
    }
    const canonicalRoomId = getCanonicalRoomId(socket, roomId);
    if (!canonicalRoomId) return;
    gameManager.handleLeaveAfterDeath(canonicalRoomId, socket.id);
    socket.leave(canonicalRoomId);
    socket.emit('room:left');
  });

  socket.on('chat:send', (data: unknown) => {
    const roomId = getString(data, 'roomId')?.toUpperCase();
    const message = getString(data, 'message');
    if (!roomId || !message) return;

    const clean = message.replace(/<[^>]*>/g, '').trim().slice(0, 200);
    if (!clean) return;

    const canonicalRoomId = getCanonicalRoomId(socket, roomId);
    if (!canonicalRoomId) return;
    const room = roomManager.getRoom(canonicalRoomId);
    if (!room) return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;

    io.to(canonicalRoomId).emit('chat:message', {
      senderId: socket.id,
      sender: player.name,
      message: clean,
      timestamp: Date.now(),
    });
  });

  socket.on('chat:global_send', (data: unknown) => {
    const message = getString(data, 'message');
    if (!message) return;

    const clean = message.replace(/<[^>]*>/g, '').trim().slice(0, 200);
    if (!clean) return;

    const playerName = globalPlayerNames.get(socket.id) || 'GUEST';

    io.emit('chat:global_message', {
      senderId: socket.id,
      sender: playerName,
      message: clean,
      timestamp: Date.now(),
    });
  });

  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    globalPlayerNames.delete(socket.id);

    const previousRoom = roomManager.getPlayerRoom(socket.id);
    const previousRoomId = previousRoom?.id;
    const isPlaying = previousRoom?.state === 'playing';
    if (isPlaying) {
      gameManager.handleTransportDisconnect(socket.id);
    } else {
      roomManager.handleDisconnect(socket.id);
    }

    if (previousRoomId && !isPlaying) {
      const updatedRoom = roomManager.getRoom(previousRoomId);
      if (updatedRoom && updatedRoom.state === 'waiting') {
        io.to(previousRoomId).emit('room:players', { players: updatedRoom.players });
      }
    }

    if (!isPlaying) gameManager.handleDisconnect(socket.id);
  });

  socket.on('game:reconnect', (data: unknown) => {
    const roomId = getString(data, 'roomId')?.toUpperCase();
    const token = getString(data, 'token');
    if (!roomId || !token || !gameManager.handleReconnect(roomId, token, socket)) {
      socket.emit('error', { code: 'RECONNECT_FAILED', message: 'Unable to restore game session.' });
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`LAN: http://localhost:${PORT}`);

  const UDP_PORT = 41234;
  const broadcaster = dgram.createSocket('udp4');

  broadcaster.on('listening', () => {
    broadcaster.setBroadcast(true);
    console.log(`UDP Broadcaster running on port ${UDP_PORT}`);
  });

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
          lastSeen: Date.now(),
        });
      }
    } catch (_err) {
      // Ignore malformed discovery packets.
    }
  });
  listener.bind(UDP_PORT);

  setInterval(() => {
    try {
      const message = Buffer.from(JSON.stringify({
        type: 'ROULETTE_QUIZ_SERVER',
        port: PORT,
        rooms: roomManager.getRoomCount(),
      }));
      broadcaster.send(message, 0, message.length, UDP_PORT, '255.255.255.255');
    } catch (_err) {
      // Ignore broadcast errors.
    }
  }, 2000);
});

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION AT:', promise, 'REASON:', reason);
});

const gracefulShutdown = () => {
  console.log('Shutting down server gracefully...');
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
};
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
