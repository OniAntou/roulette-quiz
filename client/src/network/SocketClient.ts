import { io, Socket } from 'socket.io-client';

type EventCallback = (data: any) => void;

class SocketClient {
  private socket: Socket | null = null;
  private _connected: boolean = false;
  private _connectPromise: Promise<Socket> | null = null;
  private callbacks: Record<string, EventCallback[]> = {};
  public playerName: string = 'GUEST';

  isConnected(): boolean {
    return this._connected;
  }

  connect(url: string): Promise<Socket> {
    if (this.socket && this._connected) {
      return Promise.resolve(this.socket);
    }

    // If there's already a pending connection, return its promise
    if (this._connectPromise) {
      return this._connectPromise;
    }

    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
      this._connected = false;
    }

    this._connectPromise = new Promise((resolve, reject) => {
      this.socket = io(url, {
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 10000,
      });

      let settled = false;

      this.socket.on('connect', () => {
        this._connected = true;
        this._connectPromise = null;
        // console.log('Connected to server');
        if (!settled) {
          settled = true;
          resolve(this.socket!);
        }
        this.emit('_reconnect', undefined);
      });

      this.socket.on('disconnect', (reason) => {
        this._connected = false;
        // console.log('Disconnected from server:', reason);
        this.emit('_disconnect', reason);
      });

      this.socket.on('connect_error', (error: Error) => {
        console.error('Connection error:', error.message); // Keep error logs
        if (!settled) {
          settled = true;
          this._connectPromise = null;
          reject(error);
        }
        this.emit('_connect_error', error);
      });

      this.socket.io.on('reconnect_attempt', (attempt: number) => {
        // console.log(`Reconnection attempt ${attempt}`);
        this.emit('_reconnect_attempt', attempt);
      });

      this.socket.io.on('reconnect', (attempt: number) => {
        // console.log(`Reconnected after ${attempt} attempts`);
        this.emit('_reconnect', attempt);
      });

      this.socket.io.on('reconnect_failed', () => {
        console.error('All reconnection attempts failed');
        this.emit('_reconnect_failed', undefined);
      });

      this.setupEventListeners();
    });
    return this._connectPromise;
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('room:created', (data: any) => this.emit('room:created', data));
    this.socket.on('room:joined', (data: any) => this.emit('room:joined', data));
    this.socket.on('room:players', (data: any) => this.emit('room:players', data));
    this.socket.on('room:left', () => this.emit('room:left'));
    this.socket.on('room:list_result', (data: any) => this.emit('room:list_result', data));

    this.socket.on('game:start', (data: any) => this.emit('game:start', data));
    this.socket.on('game:deal', (data: any) => this.emit('game:deal', data));
    this.socket.on('game:cardPlayed', (data: any) => this.emit('game:cardPlayed', data));
    this.socket.on('game:trigger', (data: any) => this.emit('game:trigger', data));
    this.socket.on('game:newRound', (data: any) => this.emit('game:newRound', data));
    this.socket.on('game:over', (data: any) => this.emit('game:over', data));
    this.socket.on('game:playerLeft', (data: any) => this.emit('game:playerLeft', data));
    this.socket.on('game:playerLeftAfterDeath', (data: any) => this.emit('game:playerLeftAfterDeath', data));
    this.socket.on('game:cardsUpdate', (data: any) => this.emit('game:cardsUpdate', data));
    this.socket.on('game:turn', (data: any) => this.emit('game:turn', data));
    this.socket.on('game:standoffResult', (data: any) => this.emit('game:standoffResult', data));
    this.socket.on('game:autoTriggerCountdown', (data: any) => this.emit('game:autoTriggerCountdown', data));
    this.socket.on('game:session', (data: any) => this.emit('game:session', data));
    this.socket.on('game:stateSnapshot', (data: any) => this.emit('game:stateSnapshot', data));
    this.socket.on('game:reconnecting', (data: any) => this.emit('game:reconnecting', data));
    this.socket.on('game:resumed', (data: any) => this.emit('game:resumed', data));

    this.socket.on('chat:message', (data: any) => this.emit('chat:message', data));
    this.socket.on('chat:global_message', (data: any) => this.emit('chat:global_message', data));

    this.socket.on('error', (data: any) => this.emit('error', data));
  }

  on(event: string, callback: EventCallback): void {
    if (!this.callbacks[event]) {
      this.callbacks[event] = [];
    }
    this.callbacks[event].push(callback);
  }

  off(event: string, callback: EventCallback): void {
    if (this.callbacks[event]) {
      this.callbacks[event] = this.callbacks[event].filter(cb => cb !== callback);
    }
  }

  clearListeners(event?: string): void {
    if (event) {
      this.callbacks[event] = [];
    } else {
      this.callbacks = {};
    }
  }

  private emit(event: string, data?: any): void {
    if (this.callbacks[event]) {
      const callbacks = [...this.callbacks[event]];
      callbacks.forEach(cb => cb(data));
    }
  }

  send(event: string, data?: any): void {
    if (this.socket && this._connected) {
      this.socket.emit(event, data);
    }
  }

  createRoom(playerName: string, isPublic: boolean = true): void {
    if (!this.socket) return;
    this.playerName = playerName;
    this.socket.emit('room:create', { playerName, isPublic });
  }

  getRooms(): void {
    if (!this.socket) return;
    this.socket.emit('room:list');
  }

  joinRoom(roomId: string, playerName: string): void {
    this.send('room:join', { roomId, playerName });
  }

  toggleReady(roomId: string): void {
    this.send('room:ready', { roomId });
  }

  leaveRoom(roomId: string): void {
    this.send('room:leave', { roomId });
  }


  leaveAfterDeath(roomId: string): void {
    this.send('game:leaveAfterDeath', { roomId });
  }

  sendMulligan(roomId: string): void {
    this.send('game:mulligan', { roomId });
  }

  reconnectGame(roomId: string, token: string): void {
    this.send('game:reconnect', { roomId, token });
  }

  sendChat(roomId: string, message: string): void {
    this.send('chat:send', { roomId, message });
  }

  sendGlobalChat(message: string): void {
    this.send('chat:global_send', { message });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
      this._connected = false;
      this._connectPromise = null;
    }
  }
}

export const socketClient = new SocketClient();
