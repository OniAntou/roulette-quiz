import { v4 as uuidv4 } from 'uuid';
import { Room, Player } from './types';

export class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private playerRooms: Map<string, string> = new Map();

  private validatePlayerName(name: string): string {
    let sanitized = (name || '').trim();
    // Escape HTML characters
    const escapeMap: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    sanitized = sanitized.replace(/[&<>"']/g, match => escapeMap[match]);
    // Allow alphanumeric, space, and basic Vietnamese chars, but remove other weird symbols
    sanitized = sanitized.replace(/[^\w\sÀ-ỹ]/g, '');
    sanitized = sanitized.substring(0, 12);
    if (!sanitized) {
      return 'GUEST' + Math.floor(1000 + Math.random() * 9000);
    }
    return sanitized;
  }

  hasRoom(roomId: string): boolean {
    return this.rooms.has(roomId);
  }

  cleanupStaleRooms(): void {
    const now = Date.now();
    const WAITING_THRESHOLD = 5 * 60 * 1000;
    const PLAYING_THRESHOLD = 30 * 60 * 1000;
    for (const [roomId, room] of this.rooms.entries()) {
      const age = now - room.createdAt;
      const isStale = (room.state === 'waiting' && age > WAITING_THRESHOLD) ||
                      (room.state === 'playing' && age > PLAYING_THRESHOLD);
      if (isStale) {
        this.rooms.delete(roomId);
        for (const player of room.players) {
          this.playerRooms.delete(player.id);
        }
      }
    }
  }

  createRoom(socketId: string, playerName: string, isPublic: boolean = true): Room {
    // If player is already in a room, leave it first to avoid ghost players
    if (this.playerRooms.has(socketId)) {
      this.handleDisconnect(socketId);
    }

    const sanitized = this.validatePlayerName(playerName);
    let roomId: string;
    let attempts = 0;
    do {
      roomId = uuidv4().substring(0, 6).toUpperCase();
      attempts++;
    } while (this.hasRoom(roomId) && attempts < 10);
    const room: Room = {
      id: roomId,
      players: [{
        id: socketId,
        name: sanitized,
        isReady: false,
        hand: [],
        isAlive: true,
        shotsFired: 0,
        hasUsedMulligan: false,
      }],

      state: 'waiting',
      createdAt: Date.now(),
      isPublic,
    };

    this.rooms.set(roomId, room);
    this.playerRooms.set(socketId, roomId);

    return room;
  }

  joinRoom(roomId: string, socketId: string, playerName: string): { success: boolean; error?: string; players?: Player[] } {
    // If player is already in a room, leave it first to avoid ghost players
    if (this.playerRooms.has(socketId)) {
      const oldRoomId = this.playerRooms.get(socketId);
      if (oldRoomId === roomId) {
        return { success: false, error: 'Already in room' };
      }
      this.handleDisconnect(socketId);
    }

    let sanitized = this.validatePlayerName(playerName);
    const room = this.rooms.get(roomId);

    if (!room) {
      return { success: false, error: 'Room not found' };
    }


    if (room.players.length >= 4) {
      return { success: false, error: 'Room is full' };
    }

    if (room.state !== 'waiting') {
      return { success: false, error: 'Game already started' };
    }

    if (room.players.some(p => p.id === socketId)) {
      return { success: false, error: 'Already in room' };
    }

    if (room.players.some(p => p.name === sanitized)) {
      let counter = 2;
      while (room.players.some(p => p.name === `${sanitized}${counter}`)) {
        counter++;
      }
      sanitized = `${sanitized}${counter}`;
    }

    room.players.push({
      id: socketId,
      name: sanitized,
      isReady: false,
      hand: [],
      isAlive: true,
      shotsFired: 0,
      hasUsedMulligan: false,
    });

    this.playerRooms.set(socketId, roomId);

    return {
      success: true,
      players: room.players,
    };
  }

  toggleReady(roomId: string, socketId: string): { success: boolean; error?: string; players?: Player[]; allReady?: boolean } {
    const room = this.rooms.get(roomId);

    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    if (room.state !== 'waiting') {
      return { success: false, error: 'Game already started' };
    }

    const player = room.players.find(p => p.id === socketId);
    if (!player) {
      return { success: false, error: 'Player not in room' };
    }

    player.isReady = !player.isReady;

    const allReady = room.players.length >= 2 && room.players.every(p => p.isReady);

    return {
      success: true,
      players: room.players,
      allReady,
    };
  }

  leaveRoom(roomId: string, socketId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.players = room.players.filter(p => p.id !== socketId);
    this.playerRooms.delete(socketId);

    if (room.players.length === 0) {
      this.rooms.delete(roomId);
    }
  }

  handleDisconnect(socketId: string): void {
    const roomId = this.playerRooms.get(socketId);
    if (roomId) {
      this.leaveRoom(roomId, socketId);
    }
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  getRoomCount(): number {
    return this.rooms.size;
  }

  getPlayerRoom(socketId: string): Room | undefined {
    const roomId = this.playerRooms.get(socketId);
    return roomId ? this.rooms.get(roomId) : undefined;
  }

  getAvailableRooms(): { id: string; players: number; max: number }[] {
    const available: { id: string; players: number; max: number }[] = [];
    for (const room of this.rooms.values()) {
      if (room.state === 'waiting' && room.players.length < 4 && room.isPublic !== false) {
        available.push({
          id: room.id,
          players: room.players.length,
          max: 4
        });
      }
    }
    return available;
  }
}

