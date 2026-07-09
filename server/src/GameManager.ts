import { v4 as uuidv4 } from 'uuid';
import { Server } from 'socket.io';
import { RoomManager } from './RoomManager';
import { GameState, Card, Player } from './types';
import { GAME_CONSTANTS } from '../../shared/constants';
import { GunEngine } from './GunEngine';
import { TimeoutManager } from './TimeoutManager';
import { DeckManager } from './DeckManager';

export class GameManager {
  private roomManager: RoomManager;
  private io: Server;
  private games: Map<string, GameState> = new Map();
  private readonly startDelayMs = 400;
  private readonly postTriggerDelayMs = 3000;
  private gunEngine: GunEngine;

  private ensurePlayerStats(game: GameState, playerId: string): void {
    if (!game.stats.players[playerId]) {
      game.stats.players[playerId] = { cardsPlayed: 0, triggerSurvived: 0, triggerDied: 0 };
    }
  }

  constructor(roomManager: RoomManager, io: Server) {
    this.roomManager = roomManager;
    this.io = io;
    this.gunEngine = new GunEngine(io, this.postTriggerDelayMs, {
      dealCards: async (roomId) => this.dealCards(roomId),
      getNextAlivePlayer: (game, fromIndex) => this.getNextAlivePlayer(game, fromIndex),
      deleteGame: (roomId) => { this.games.delete(roomId); },
      ensurePlayerStats: (game, playerId) => this.ensurePlayerStats(game, playerId),
      advanceToNextTurn: (roomId, game) => this.advanceToNextTurn(roomId, game),
      startChoosingTurn: (roomId, game) => this.advanceTurnAndDeal(roomId, game),
    });
  }

  startGame(roomId: string): void {
    const room = this.roomManager.getRoom(roomId);
    if (!room) return;

    const gameState: GameState = {
      id: uuidv4(),
      roomId,
      phase: GAME_CONSTANTS.STATES.DEALING,
      players: room.players.map(p => ({
        ...p,
        hand: [],
        isAlive: true,
        shotsFired: 0,
        hasUsedMulligan: false,
      })),
      currentTurn: 0,
      direction: 1,
      currentNumber: 0,
      turnStack: [],
      deck: DeckManager.getShuffledDeck(),
      round: 1,
      gun: this.gunEngine.createGun(),
      stats: { players: {}, totalRounds: 0 },
    };

    this.games.set(roomId, gameState);
    room.state = 'playing';

    this.io.to(roomId).emit(GAME_CONSTANTS.EVENTS.GAME_START, {
      players: gameState.players.map(p => ({
        id: p.id,
        name: p.name,
        cardsCount: GAME_CONSTANTS.CARDS_PER_HAND,
        isAlive: true,
        shotsFired: 0,
        hasUsedMulligan: false,
      })),
      round: gameState.round,
    });

    setTimeout(async () => {
      try {
        await this.dealCards(roomId, undefined, true);
        const game = this.games.get(roomId);
        if (!game) return;
        game.phase = GAME_CONSTANTS.STATES.CHOOSING;
        const currentPlayer = game.players[game.currentTurn];
        this.io.to(roomId).emit(GAME_CONSTANTS.EVENTS.GAME_TURN, { playerId: currentPlayer.id });
        this.startTurnTimeout(roomId, game);
      } catch (err) {
        console.error('Error starting game:', err);
        this.io.to(roomId).emit(GAME_CONSTANTS.EVENTS.ERROR, { 
          code: 'DEAL_CARDS_FAILED', 
          message: 'Failed to deal cards. Please try again.' 
        });
        this.games.delete(roomId);
      }
    }, this.startDelayMs);
  }

  private async dealCards(roomId: string, forcePlayerId?: string, newRound?: boolean): Promise<void> {
    const game = this.games.get(roomId);
    if (!game) return;

    for (const player of game.players) {
      if (player.isAlive && (newRound || player.id === forcePlayerId)) {
        player.hand = [];
        for (let i = 0; i < GAME_CONSTANTS.CARDS_PER_HAND; i++) {
          if (game.deck.length === 0) {
            game.deck = DeckManager.getShuffledDeck();
          }
          player.hand.push(game.deck.pop()!);
        }
      }
    }

    game.players.forEach(player => {
      if (player.isAlive && (player.hand.length === GAME_CONSTANTS.CARDS_PER_HAND)) {
        const socket = this.io.sockets.sockets.get(player.id);
        if (socket) {
          socket.emit(GAME_CONSTANTS.EVENTS.GAME_DEAL, { cards: player.hand });
        }
      }
    });

    this.emitCardsUpdate(roomId, game);
  }

  private emitCardsUpdate(roomId: string, game: GameState) {
    this.io.to(roomId).emit('game:cardsUpdate', {
      players: game.players.map(p => ({
        id: p.id,
        cardsCount: p.isAlive ? p.hand.length : 0,
        isAlive: p.isAlive,
        shotsFired: p.shotsFired,
        hasUsedMulligan: p.hasUsedMulligan,
      })),
    });
  }

  handlePlayCard(roomId: string, socketId: string, cardId: string): void {
    const game = this.games.get(roomId);
    if (!game || game.phase !== GAME_CONSTANTS.STATES.CHOOSING) return;

    const playerIndex = game.players.findIndex(p => p.id === socketId);
    if (playerIndex === -1 || playerIndex !== game.currentTurn || !game.players[playerIndex].isAlive) return;

    const player = game.players[playerIndex];
    const cardIndex = player.hand.findIndex(c => c.id === cardId);
    if (cardIndex === -1) return;
    const card = player.hand[cardIndex];

    // Validate play
    if (card.type === 'NUMBER') {
      if (card.value! < game.currentNumber) return; // Must be >= current number
    }

    // Process card
    player.hand.splice(cardIndex, 1);
    this.ensurePlayerStats(game, player.id);
    game.stats.players[player.id].cardsPlayed++;

    this.io.to(roomId).emit('game:cardPlayed', {
      playerId: socketId,
      card,
    });

    // Clear timeout since action taken
    TimeoutManager.clearChoosing(game);

    if (card.type === 'STANDOFF') {
      game.phase = GAME_CONSTANTS.STATES.TRIGGER;
      game.triggerTimeout = setTimeout(() => {
        game.triggerTimeout = undefined;
        this.gunEngine.resolveStandoff(roomId, game);
      }, 2000);
      return;
    }

    if (card.type === 'NUMBER') {
      game.currentNumber = card.value!;
      game.turnStack.push(card);
    } else if (card.type === 'JOKER') {
      game.currentNumber = 0; // Reset table
      game.turnStack = [];
    } else if (card.type === 'BLOCK') {
      // Just passes the turn without pulling trigger or changing table
    } else if (card.type === 'REVERSE') {
      game.direction *= -1;
    }

    // Determine next player
    let nextIndex = playerIndex;
    if (card.type === 'SKIP') {
      nextIndex = this.getNextAlivePlayer(game, nextIndex, game.direction);
      nextIndex = this.getNextAlivePlayer(game, nextIndex, game.direction);
    } else {
      nextIndex = this.getNextAlivePlayer(game, nextIndex, game.direction);
    }

    game.currentTurn = nextIndex;
    this.advanceTurnAndDeal(roomId, game);
  }

  handlePullTrigger(roomId: string, socketId: string): void {
    const game = this.games.get(roomId);
    if (!game || game.phase !== GAME_CONSTANTS.STATES.CHOOSING) return;

    const playerIndex = game.players.findIndex(p => p.id === socketId);
    if (playerIndex === -1 || playerIndex !== game.currentTurn || !game.players[playerIndex].isAlive) return;

    TimeoutManager.clearChoosing(game);
    game.phase = GAME_CONSTANTS.STATES.TRIGGER;
    game.targetPlayer = playerIndex; // They target themselves
    // Cannot beat the table number, so the player pulls the trigger and the table resets.
    game.currentNumber = 0;
    game.turnStack = [];

    this.gunEngine.pullTrigger(roomId, game);
  }

  handleMulligan(roomId: string, socketId: string, requestSocket?: any): void {
    const game = this.games.get(roomId);
    if (!game || game.phase !== GAME_CONSTANTS.STATES.CHOOSING) {
      console.warn(`[Mulligan] Rejected: game not found or phase is '${game?.phase}'`);
      requestSocket?.emit('game:mulliganFailed', { reason: 'not_allowed' });
      return;
    }

    const playerIndex = game.players.findIndex(p => p.id === socketId);
    if (playerIndex === -1 || playerIndex !== game.currentTurn || !game.players[playerIndex].isAlive) {
      console.warn(`[Mulligan] Rejected: playerIndex=${playerIndex}, currentTurn=${game.currentTurn}, isAlive=${game.players[playerIndex]?.isAlive}`);
      requestSocket?.emit('game:mulliganFailed', { reason: 'not_your_turn' });
      return;
    }

    const player = game.players[playerIndex];
    if (player.hasUsedMulligan) {
      console.warn(`[Mulligan] Rejected: player already used mulligan`);
      requestSocket?.emit('game:mulliganFailed', { reason: 'already_used' });
      return;
    }
    if (player.hand.length === 0) {
      console.warn(`[Mulligan] Rejected: hand is empty`);
      requestSocket?.emit('game:mulliganFailed', { reason: 'empty_hand' });
      return;
    }

    player.hasUsedMulligan = true;
    
    // Clear timeout, will restart after mulligan
    TimeoutManager.clearChoosing(game);

    // Sacrifice 1 random card from hand
    const sacrificeIndex = Math.floor(Math.random() * player.hand.length);
    player.hand.splice(sacrificeIndex, 1);

    // Draw 1 new card from deck
    if (game.deck.length === 0) {
      game.deck = DeckManager.getShuffledDeck();
    }
    player.hand.push(game.deck.pop()!);

    // Emit updated hand directly to the requesting socket (avoids stale socket ID lookup)
    requestSocket?.emit(GAME_CONSTANTS.EVENTS.GAME_DEAL, { cards: player.hand });
    this.emitCardsUpdate(roomId, game);

    this.io.to(roomId).emit('game:mulliganUsed', { playerId: player.id });
    this.startTurnTimeout(roomId, game);
  }

  private startTurnTimeout(roomId: string, game: GameState): void {
    game.triggerTimeout = setTimeout(() => {
      this.handlePullTrigger(roomId, game.players[game.currentTurn].id);
    }, GAME_CONSTANTS.TIMEOUTS.choosing);
  }

  private hasPlayableCard(player: Player, currentNumber: number): boolean {
    return player.hand.some(card => {
      if (card.type === 'NUMBER') return (card.value ?? 0) >= currentNumber;
      if (card.type === 'BLOCK') return false; // Passive, cannot be played
      return true; // SKIP, REVERSE, JOKER, STANDOFF are always playable
    });
  }

  private canMulligan(player: Player): boolean {
    return !player.hasUsedMulligan && player.hand.length > 0;
  }

  private getNextAlivePlayer(game: GameState, fromIndex: number, direction: number = 1): number {
    let next = (fromIndex + direction + game.players.length) % game.players.length;
    let checked = 0;
    while (!game.players[next].isAlive && checked < game.players.length) {
      next = (next + direction + game.players.length) % game.players.length;
      checked++;
    }
    return next;
  }

  handleLeaveAfterDeath(roomId: string, socketId: string): void {
    const game = this.games.get(roomId);
    if (!game) return;

    const playerIndex = game.players.findIndex(p => p.id === socketId);
    if (playerIndex === -1) return;

    const player = game.players[playerIndex];
    if (player.isAlive) return;

    player.left = true;

    this.io.to(roomId).emit('game:playerLeftAfterDeath', {
      playerId: socketId,
      playerName: player.name,
    });
  }

  private advanceTurnAndDeal(roomId: string, game: GameState): void {
    game.phase = GAME_CONSTANTS.STATES.CHOOSING;
    const newRound = game.newRound;
    game.newRound = false;
    this.dealCards(roomId, undefined, newRound).then(() => {
      this.io.to(roomId).emit('game:turn', { playerId: game.players[game.currentTurn].id });
      this.io.to(roomId).emit('game:stateUpdate', { currentNumber: game.currentNumber, direction: game.direction });
      
      const currentPlayer = game.players[game.currentTurn];
      const hasPlayable = this.hasPlayableCard(currentPlayer, game.currentNumber);
      const canMulligan = this.canMulligan(currentPlayer);
      
      if (!hasPlayable && !canMulligan) {
        // No playable cards and no mulligan - auto-pull trigger after 5s
        this.io.to(roomId).emit('game:autoTriggerCountdown', { 
          playerId: currentPlayer.id, 
          delay: 5 
        });
        game.triggerTimeout = setTimeout(() => {
          this.handlePullTrigger(roomId, currentPlayer.id);
        }, 5000);
      } else {
        // Has playable cards or mulligan available - normal turn with timeout
        this.startTurnTimeout(roomId, game);
      }
    }).catch(err => {
      console.error('Error dealing cards:', err);
    });
  }

  private advanceToNextTurn(roomId: string, game: GameState): void {
    const fromIndex = game.currentTurn;
    game.currentTurn = this.getNextAlivePlayer(game, fromIndex, game.direction);
    this.advanceTurnAndDeal(roomId, game);
  }

  handleDisconnect(socketId: string): void {
    for (const [roomId, game] of this.games.entries()) {
      const playerIndex = game.players.findIndex(p => p.id === socketId);
      if (playerIndex !== -1) {
        const alivePlayersBefore = game.players.filter(p => p.isAlive && p.id !== socketId);
        game.players[playerIndex].isAlive = false;

        this.io.to(roomId).emit('game:playerLeft', { playerId: socketId });

        if (alivePlayersBefore.length <= 1) {
          TimeoutManager.clearAll(game);
          game.phase = GAME_CONSTANTS.STATES.GAME_OVER;
          game.stats.totalRounds = game.round;
          this.io.to(roomId).emit('game:over', {
            winner: alivePlayersBefore[0]?.name || 'No one',
            winnerId: alivePlayersBefore[0]?.id || '',
            stats: game.stats,
            reason: 'disconnect',
          });
          this.games.delete(roomId);
          break;
        }

        const isTarget = game.targetPlayer === playerIndex;
        const isCurrentTurn = game.currentTurn === playerIndex;

        switch (game.phase) {
          case GAME_CONSTANTS.STATES.TRIGGER:
            if (isTarget) {
              TimeoutManager.clearPostTrigger(game);
              this.advanceToNextTurn(roomId, game);
            }
            break;
          case GAME_CONSTANTS.STATES.CHOOSING:
          case GAME_CONSTANTS.STATES.DEALING:
            if (isCurrentTurn) {
              TimeoutManager.clearChoosing(game);
              game.currentTurn = this.getNextAlivePlayer(game, playerIndex, game.direction);
              this.advanceTurnAndDeal(roomId, game);
            }
            break;
        }
        break;
      }
    }
  }
}
