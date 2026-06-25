import { v4 as uuidv4 } from 'uuid';
import { Server } from 'socket.io';
import { QuestionManager } from './QuestionManager';
import { RoomManager } from './RoomManager';
import { GameState, Gun, Question } from './types';

export class GameManager {
  private roomManager: RoomManager;
  private io: Server;
  private questionManager: QuestionManager;
  private games: Map<string, GameState> = new Map();

  constructor(roomManager: RoomManager, io: Server) {
    this.roomManager = roomManager;
    this.io = io;
    this.questionManager = new QuestionManager();
  }

  startGame(roomId: string): void {
    const room = this.roomManager.getRoom(roomId);
    if (!room) return;

    const gameState: GameState = {
      id: uuidv4(),
      roomId,
      phase: 'dealing',
      players: room.players.map(p => ({
        ...p,
        hand: [],
        isAlive: true,
      })),
      currentTurn: 0,
      round: 1,
      gun: this.createGun(),
      usedCards: [],
      stats: {},
    };

    this.games.set(roomId, gameState);
    room.state = 'playing';

    this.io.to(roomId).emit('game:start', {
      players: gameState.players.map(p => ({
        id: p.id,
        name: p.name,
        cardsCount: 4,
        isAlive: true,
      })),
      round: gameState.round,
    });

    setTimeout(() => {
      this.dealCards(roomId);
    }, 1000);
  }

  private createGun(): Gun {
    const chambers = Array(6).fill(false);
    chambers[Math.floor(Math.random() * 6)] = true;

    return {
      chambers,
      currentPosition: 0,
      bulletsFired: 0,
    };
  }

  private dealCards(roomId: string): void {
    const game = this.games.get(roomId);
    if (!game) return;

    const totalQuestions = this.questionManager.questions.length;
    if (game.usedCards.length > totalQuestions - 16) {
      game.usedCards = [];
    }

    console.log('Dealing cards for room:', roomId);

    game.players.forEach(player => {
      if (player.isAlive) {
        player.hand = this.questionManager.getCards(4, game.usedCards);
        game.usedCards.push(...player.hand.map(c => c.id));
        console.log(`Dealt 4 cards to ${player.name}`);
      }
    });

    game.players.forEach(player => {
      if (player.isAlive) {
        const socket = this.io.sockets.sockets.get(player.id);
        if (socket) {
          console.log(`Sending cards to ${player.name}`);
          socket.emit('game:deal', { cards: player.hand });
        } else {
          console.log(`Socket not found for ${player.name}`);
        }
      }
    });

    this.io.to(roomId).emit('game:cardsUpdate', {
      players: game.players.map(p => ({
        id: p.id,
        cardsCount: p.isAlive ? p.hand.length : 0,
        isAlive: p.isAlive,
      })),
    });

    game.phase = 'choosing';
    
    const currentPlayer = game.players[game.currentTurn];
    this.io.to(roomId).emit('game:turn', { playerId: currentPlayer.id });
  }

  handleCardChoice(roomId: string, socketId: string, cardId: string): void {
    const game = this.games.get(roomId);
    if (!game || game.phase !== 'choosing') return;

    const playerIndex = game.players.findIndex(p => p.id === socketId);
    if (playerIndex === -1) return;
    if (playerIndex !== game.currentTurn) return;
    if (!game.players[playerIndex].isAlive) return;

    const player = game.players[playerIndex];
    const card = player.hand.find(c => c.id === cardId);

    if (!card) return;

    player.hand = player.hand.filter(c => c.id !== cardId);

    game.currentCard = card;
    game.currentPlayer = playerIndex;
    game.targetPlayer = this.getNextAlivePlayer(game, playerIndex);

    game.phase = 'questioning';

    const targetPlayer = game.players[game.targetPlayer];
    const targetSocket = this.io.sockets.sockets.get(targetPlayer.id);
    if (targetSocket) {
      targetSocket.emit('game:question', {
        card: { id: card.id, topic: card.topic, difficulty: card.difficulty, question: card.question, answers: card.answers },
        timer: this.getTimerDuration(card.difficulty),
        from: player.name,
      });
    }

    this.io.to(roomId).emit('game:cardPlayed', {
      playerId: socketId,
      card: {
        id: card.id,
        topic: card.topic,
        difficulty: card.difficulty,
        question: card.question,
      },
    });

    const timerDuration = this.getTimerDuration(card.difficulty);
    game.answerTimeout = setTimeout(() => {
      this.handleTimeout(roomId);
    }, (timerDuration + 1) * 1000);
  }

  private handleTimeout(roomId: string): void {
    const game = this.games.get(roomId);
    if (!game || game.phase !== 'questioning') return;

    const card = game.currentCard!;

    game.phase = 'result';

    this.io.to(roomId).emit('game:result', {
      correct: false,
      correctAnswer: card.correct,
      answer: 'TIMEOUT',
    });

    game.phase = 'trigger';

    setTimeout(() => {
      if (game.phase === 'trigger') {
        this.pullTrigger(roomId);
      }
    }, 2000);
  }

  handleAnswer(roomId: string, socketId: string, answer: string): void {
    const game = this.games.get(roomId);
    if (!game || game.phase !== 'questioning') return;

    const targetPlayer = game.players[game.targetPlayer!];
    if (!targetPlayer || targetPlayer.id !== socketId) return;

    if (game.answerTimeout) {
      clearTimeout(game.answerTimeout);
      game.answerTimeout = undefined;
    }

    const card = game.currentCard!;
    const isCorrect = answer === card.correct;

    game.phase = 'result';

    this.io.to(roomId).emit('game:result', {
      correct: isCorrect,
      correctAnswer: card.correct,
      answer,
    });

    if (isCorrect) {
      game.currentTurn = game.targetPlayer!;
      game.phase = 'choosing';
    } else {
      game.phase = 'trigger';
    }

    setTimeout(() => {
      if (game.phase === 'trigger') {
        this.pullTrigger(roomId);
      } else if (game.phase === 'choosing') {
        const currentPlayer = game.players[game.currentTurn];
        if (currentPlayer.hand.length === 0) {
          this.dealCards(roomId);
        } else {
          this.io.to(roomId).emit('game:turn', { playerId: currentPlayer.id });
        }
      }
    }, 2000);
  }

  private pullTrigger(roomId: string): void {
    const game = this.games.get(roomId);
    if (!game) return;

    const gun = game.gun;
    const bullet = gun.chambers[gun.currentPosition];
    gun.bulletsFired++;
    gun.currentPosition = (gun.currentPosition + 1) % 6;

    if (bullet) {
      const deadPlayer = game.players[game.targetPlayer!];
      deadPlayer.isAlive = false;

      this.io.to(roomId).emit('game:trigger', {
        alive: false,
        playerId: deadPlayer.id,
        playerName: deadPlayer.name,
        bulletCount: 6 - gun.bulletsFired,
        nextRound: false,
      });

      const alivePlayers = game.players.filter(p => p.isAlive);
      if (alivePlayers.length === 1) {
        setTimeout(() => {
          this.io.to(roomId).emit('game:over', {
            winner: alivePlayers[0].name,
            stats: game.stats,
          });
          this.games.delete(roomId);
        }, 3000);
      } else {
        setTimeout(() => {
          game.round++;
          game.gun = this.createGun();
          game.currentTurn = this.getNextAlivePlayer(game, game.targetPlayer!);
          game.phase = 'choosing';
          this.dealCards(roomId);
          this.io.to(roomId).emit('game:newRound', { round: game.round });
        }, 3000);
      }
    } else {
      this.io.to(roomId).emit('game:trigger', {
        alive: true,
        bulletCount: 6 - gun.bulletsFired,
        nextRound: true,
      });

      setTimeout(() => {
        game.round++;
        game.currentTurn = this.getNextAlivePlayer(game, game.targetPlayer!);
        game.phase = 'choosing';
        this.dealCards(roomId);
        this.io.to(roomId).emit('game:newRound', { round: game.round });
      }, 3000);
    }
  }

  private getNextAlivePlayer(game: GameState, fromIndex: number): number {
    let next = (fromIndex + 1) % game.players.length;
    let checked = 0;
    while (!game.players[next].isAlive && checked < game.players.length) {
      next = (next + 1) % game.players.length;
      checked++;
    }
    return next;
  }

  private getTimerDuration(difficulty: string): number {
    const timers: Record<string, number> = {
      easy: 10,
      medium: 7,
      hard: 5,
    };
    return timers[difficulty] || 10;
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

    console.log(`Player ${player.name} left after death in room ${roomId}`);
  }

  handleDisconnect(socketId: string): void {
    for (const [roomId, game] of this.games.entries()) {
      const playerIndex = game.players.findIndex(p => p.id === socketId);
      if (playerIndex !== -1) {
        if (game.answerTimeout) {
          clearTimeout(game.answerTimeout);
          game.answerTimeout = undefined;
        }

        game.players[playerIndex].isAlive = false;

        this.io.to(roomId).emit('game:playerLeft', {
          playerId: socketId,
        });

        const alivePlayers = game.players.filter(p => p.isAlive);
        if (alivePlayers.length <= 1) {
          this.io.to(roomId).emit('game:over', {
            winner: alivePlayers[0]?.name || 'No one',
            reason: 'disconnect',
          });
          this.games.delete(roomId);
        }
        break;
      }
    }
  }
}
