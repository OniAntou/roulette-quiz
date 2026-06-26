import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { RoomManager } from './RoomManager';
import { GameManager } from './GameManager';
import cors from 'cors';

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
      if (!origin) return callback(null, true);
      if (origin.startsWith('file://')) return callback(null, true);
      if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
      callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST'],
  },
});

const roomManager = new RoomManager();
const gameManager = new GameManager(roomManager, io);

const rateLimits = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 1000;
const RATE_LIMIT_MAX = 10;

function checkRateLimit(socketId: string): boolean {
  const now = Date.now();
  const limit = rateLimits.get(socketId);
  if (!limit || now > limit.resetTime) {
    rateLimits.set(socketId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  if (limit.count >= RATE_LIMIT_MAX) {
    return false;
  }
  limit.count++;
  return true;
}

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(cors());
app.use(express.static('public'));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', rooms: roomManager.getRoomCount() });
});

app.get('/lan-servers', (_req, res) => {
  res.json({ servers: [] });
});

setInterval(() => {
  roomManager.cleanupStaleRooms();
}, 60000);

setInterval(() => {
  const now = Date.now();
  for (const [socketId, limit] of rateLimits.entries()) {
    if (now > limit.resetTime) {
      rateLimits.delete(socketId);
    }
  }
}, 30000);

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  socket.onAny((event: string, ...args: unknown[]) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('error', { message: 'Rate limit exceeded. Please slow down.' });
      return;
    }
  });

  socket.on('room:create', (data: { playerName: string }) => {
    const { playerName } = data;
    const room = roomManager.createRoom(socket.id, playerName);
    socket.join(room.id);
    socket.emit('room:created', { roomId: room.id, playerId: socket.id });
    console.log(`Room created: ${room.id}`);
  });

  socket.on('room:join', (data: { roomId: string; playerName: string }) => {
    const { roomId, playerName } = data;
    console.log(`[JOIN] Player ${playerName} (${socket.id}) joining room ${roomId}`);
    const result = roomManager.joinRoom(roomId, socket.id, playerName);
    console.log('[JOIN] Result:', result);

    if (result.success) {
      socket.join(roomId);
      console.log(`[JOIN] Socket ${socket.id} joined room ${roomId}`);
      socket.emit('room:joined', { roomId, playerId: socket.id });
      
      const room = roomManager.getRoom(roomId);
      console.log(`[JOIN] Room has ${room?.players.length} players:`, room?.players.map(p => p.name));
      io.to(roomId).emit('room:players', { players: result.players });
      console.log('[JOIN] Emitted room:players to room');
    } else {
      socket.emit('error', { message: result.error });
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

  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    roomManager.handleDisconnect(socket.id);
    gameManager.handleDisconnect(socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`LAN: http://localhost:${PORT}`);
});
