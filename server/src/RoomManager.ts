import { v4 as uuidv4 } from 'uuid';
import { Room, Player } from './types';

export class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private playerRooms: Map<string, string> = new Map();

  createRoom(socketId: string, playerName: string): Room {
    const roomId = uuidv4().substring(0, 6).toUpperCase();
    const room: Room = {
      id: roomId,
      players: [{
        id: socketId,
        name: playerName,
        isReady: false,
        hand: [],
        isAlive: true,
      }],
      state: 'waiting',
      createdAt: Date.now(),
    };

    this.rooms.set(roomId, room);
    this.playerRooms.set(socketId, roomId);

    return room;
  }

  joinRoom(roomId: string, socketId: string, playerName: string): { success: boolean; error?: string; players?: Player[] } {
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

    room.players.push({
      id: socketId,
      name: playerName,
      isReady: false,
      hand: [],
      isAlive: true,
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
}
