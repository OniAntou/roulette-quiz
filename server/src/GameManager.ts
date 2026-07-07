import { v4 as uuidv4 } from 'uuid';
import { Server } from 'socket.io';
import { QuestionManager } from './QuestionManager';
import { RoomManager } from './RoomManager';
import { GameState, Gun, Question } from './types';
import { GAME_CONSTANTS } from '../../shared/constants';
import { GunEngine } from './GunEngine';
import { TimeoutManager } from './TimeoutManager';

export class GameManager {
  private roomManager: RoomManager;
  private io: Server;
  private questionManager: QuestionManager;
  private games: Map<string, GameState> = new Map();
  private readonly startDelayMs = 400;
  private readonly resultDelayMs = 3000;
  private readonly postTriggerDelayMs = 3000;
  private gunEngine: GunEngine;

  private ensurePlayerStats(game: GameState, playerId: string): void {
    if (!game.stats.players[playerId]) {
      game.stats.players[playerId] = { correctAnswers: 0, wrongAnswers: 0, triggerSurvived: 0, triggerDied: 0 };
    }
  }

  constructor(roomManager: RoomManager, io: Server) {
    this.roomManager = roomManager;
    this.io = io;
    this.questionManager = new QuestionManager();
    this.gunEngine = new GunEngine(io, this.postTriggerDelayMs, {
      dealCards: (roomId) => this.dealCards(roomId),
      getNextAlivePlayer: (game, fromIndex) => this.getNextAlivePlayer(game, fromIndex),
      deleteGame: (roomId) => { this.games.delete(roomId); },
      ensurePlayerStats: (game, playerId) => this.ensurePlayerStats(game, playerId),
      advanceToNextTurn: (roomId, game) => this.advanceToNextTurn(roomId, game)
    });
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
      gun: this.gunEngine.createGun(),
      usedCards: [],
      stats: { players: {}, totalRounds: 0 },
    };

    this.games.set(roomId, gameState);
    room.state = 'playing';

    this.io.to(roomId).emit('game:start', {
      players: gameState.players.map(p => ({
        id: p.id,
        name: p.name,
        cardsCount: 4,
        isAlive: true,
        shotsFired: 0,
      })),
      round: gameState.round,
    });

    setTimeout(async () => {
      try {
        await this.dealCards(roomId);
        const game = this.games.get(roomId);
        if (!game) return;
        game.phase = 'choosing';
        const currentPlayer = game.players[game.currentTurn];
        this.io.to(roomId).emit('game:turn', { playerId: currentPlayer.id });
      } catch (err) {
        console.error('Error starting game:', err);
        this.io.to(roomId).emit('error', { 
          code: 'DEAL_CARDS_FAILED', 
          message: 'Failed to deal cards. Please try again.' 
        });
        this.games.delete(roomId);
      }
    }, this.startDelayMs);
  }

  private async dealCards(roomId: string): Promise<void> {
    const game = this.games.get(roomId);
    if (!game) return;

    const totalQuestions = this.questionManager.getTotalQuestions();
    // Prevent SQLite "too many SQL variables" error (limit is 999)
    if (game.usedCards.length > Math.min(totalQuestions - 16, 500)) {
      // Keep only the last 200 cards to maintain some randomness without crashing DB
      game.usedCards = game.usedCards.slice(-200);
    }

    for (const player of game.players) {
      if (player.isAlive && player.hand.length === 0) {
        try {
          if (player.easterEggChance === undefined) {
            player.easterEggChance = 0.05;
          } else {
            player.easterEggChance += 0.01;
          }

          player.hand = await this.questionManager.getCards(4, game.usedCards);
          
          if (player.hand.length < 4) {
            // DB ran out of available cards based on exclusions, reset exclusions
            game.usedCards = [];
            const remainingNeeded = 4 - player.hand.length;
            const additionalCards = await this.questionManager.getCards(remainingNeeded, game.usedCards);
            player.hand.push(...additionalCards);
          }
          
          let hasEasterEgg = false;
          for (let i = 0; i < player.hand.length; i++) {
            if (!hasEasterEgg && Math.random() < player.easterEggChance) {
              player.hand[i] = {
                id: 'EASTER_EGG_STANDOFF',
                topic: 'MEXICAN STANDOFF',
                difficulty: 'hard',
                question: 'Tất cả người chơi sẽ bị bắn',
                answers: {
                  A: 'PULL TRIGGER',
                  B: 'PULL TRIGGER',
                  C: 'PULL TRIGGER',
                  D: 'PULL TRIGGER',
                },
                correct: 'A'
              };
              hasEasterEgg = true;
            }
          }

          game.usedCards.push(...player.hand.filter(c => c.id !== 'EASTER_EGG_STANDOFF').map(c => c.id));
        } catch (error) {
          console.error("Failed to fetch cards:", error);
          throw new Error("DEAL_CARDS_FAILED");
        }
      }
    }

    game.players.forEach(player => {
      if (player.isAlive && player.hand.length === 4) {
        const socket = this.io.sockets.sockets.get(player.id);
        if (socket) {
          // Strip correct field from cards before sending to client
          const safeCards = player.hand.map(({ correct, ...rest }) => rest);
          socket.emit('game:deal', { cards: safeCards });
        }
      }
    });

    this.io.to(roomId).emit('game:cardsUpdate', {
      players: game.players.map(p => ({
        id: p.id,
        cardsCount: p.isAlive ? p.hand.length : 0,
        isAlive: p.isAlive,
        shotsFired: p.shotsFired,
      })),
    });
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

    if (card.id === 'EASTER_EGG_STANDOFF') {
      game.phase = 'trigger'; // Prevent other actions
      this.io.to(roomId).emit('game:cardPlayed', {
        playerId: socketId,
        card: {
          id: card.id,
          topic: card.topic,
          difficulty: card.difficulty,
          question: card.question,
        },
      });

      // Delay to let them see the card, then trigger standoff
      game.triggerTimeout = setTimeout(() => {
        game.triggerTimeout = undefined;
        this.gunEngine.resolveStandoff(roomId, game);
      }, 3000);
      return;
    }

    game.targetPlayer = this.getNextAlivePlayer(game, playerIndex);
    game.phase = 'questioning';

    this.io.to(roomId).emit('game:cardPlayed', {
      playerId: socketId,
      card: {
        id: card.id,
        topic: card.topic,
        difficulty: card.difficulty,
        question: card.question,
      },
    });

    const targetPlayer = game.players[game.targetPlayer];
    const targetSocket = this.io.sockets.sockets.get(targetPlayer.id);
    if (targetSocket) {
      targetSocket.emit('game:question', {
        card: { id: card.id, topic: card.topic, difficulty: card.difficulty, question: card.question, answers: card.answers },
        timer: this.getTimerDuration(card.difficulty),
        from: player.name,
      });
    }

    const timerDuration = this.getTimerDuration(card.difficulty);
    game.answerTimeout = setTimeout(() => {
      this.handleTimeout(roomId);
    }, timerDuration * 1000);
  }

  private handleTimeout(roomId: string): void {
    const game = this.games.get(roomId);
    if (!game || game.phase !== 'questioning') return;

    // Immediately lock phase to prevent any concurrent answer processing
    game.phase = 'result';

    // Clear the answer timeout (it might be called from disconnect handler)
    TimeoutManager.clearAnswer(game);

    // Track timeout as wrong answer for the target player
    const targetId = game.players[game.targetPlayer!]?.id;
    if (targetId) {
      this.ensurePlayerStats(game, targetId);
      (game.stats.players[targetId] as any).wrongAnswers++;
    }

    const card = game.currentCard!;

    this.io.to(roomId).emit('game:result', {
      correct: false,
      correctAnswer: card.correct,
      answer: 'TIMEOUT',
    });

    // Schedule trigger after showing result
    game.triggerTimeout = setTimeout(() => {
      game.triggerTimeout = undefined;
      this.gunEngine.pullTrigger(roomId, game);
    }, this.resultDelayMs);
  }

  handleAnswer(roomId: string, socketId: string, answer: string): void {
    const game = this.games.get(roomId);
    if (!game || game.phase !== 'questioning') return;

    const targetPlayer = game.players[game.targetPlayer!];
    if (!targetPlayer || targetPlayer.id !== socketId) return;

    // Immediately lock phase to prevent timeout from also processing
    game.phase = 'result';

    // Clear answer timeout - we got an answer, no need for timeout
    TimeoutManager.clearAnswer(game);

    const card = game.currentCard!;
    const isCorrect = answer === card.correct;

    this.io.to(roomId).emit('game:result', {
      correct: isCorrect,
      correctAnswer: card.correct,
      answer,
    });

    if (isCorrect) {
      this.ensurePlayerStats(game, socketId);
      (game.stats.players[socketId] as any).correctAnswers++;

      // Correct answer: move to choosing phase after delay
      game.triggerTimeout = setTimeout(() => {
        game.triggerTimeout = undefined;
        const current = this.games.get(roomId);
        if (!current) return;

        current.currentTurn = current.targetPlayer!;
        current.phase = 'choosing';
        this.dealCards(roomId).then(() => {
          this.io.to(roomId).emit('game:turn', { playerId: current.players[current.currentTurn].id });
        }).catch(err => {
          this.io.to(roomId).emit('error', { code: 'DEAL_CARDS_FAILED', message: 'Failed to deal cards' });
        });
      }, this.resultDelayMs);
    } else {
      this.ensurePlayerStats(game, socketId);
      (game.stats.players[socketId] as any).wrongAnswers++;

      // Wrong answer: pull trigger after delay
      game.triggerTimeout = setTimeout(() => {
        game.triggerTimeout = undefined;
        this.gunEngine.pullTrigger(roomId, game);
      }, this.resultDelayMs);
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
    return GAME_CONSTANTS.TIMER[difficulty] ?? GAME_CONSTANTS.TIMER.easy;
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

  /** Skip current action and advance to the next alive player's turn */
  private advanceToNextTurn(roomId: string, game: GameState): void {
    const fromIndex = game.currentPlayer ?? game.currentTurn;
    game.currentTurn = this.getNextAlivePlayer(game, fromIndex);
    game.phase = 'choosing';

    this.dealCards(roomId).then(() => {
      this.io.to(roomId).emit('game:turn', { playerId: game.players[game.currentTurn].id });
    }).catch(err => {
      console.error('Error dealing cards after disconnect:', err);
    });
  }

  handleDisconnect(socketId: string): void {
    for (const [roomId, game] of this.games.entries()) {
      const playerIndex = game.players.findIndex(p => p.id === socketId);
      if (playerIndex !== -1) {
        // Count alive players excluding the disconnecting player
        const alivePlayersBefore = game.players.filter(p => p.isAlive && p.id !== socketId);

        // Mark player as dead
        game.players[playerIndex].isAlive = false;

        this.io.to(roomId).emit('game:playerLeft', {
          playerId: socketId,
        });

        // Check if game should end
        if (alivePlayersBefore.length <= 1) {
          // Game over - clear everything
          TimeoutManager.clearAll(game);
          game.phase = 'game_over';
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

        // Game continues with 2+ alive players.
        // Only intervene if the disconnecting player is involved in the current action.
        // Do NOT clear timeouts for uninvolved players - that would break the game flow.
        const isTarget = game.targetPlayer === playerIndex;
        const isQuestioner = game.currentPlayer === playerIndex;
        const isCurrentTurn = game.currentTurn === playerIndex;

        switch (game.phase) {
          case 'questioning':
            if (isTarget || isQuestioner) {
              // Target or questioner left mid-question - cancel and advance
              TimeoutManager.clearAnswer(game);
              this.advanceToNextTurn(roomId, game);
            }
            // If uninvolved player disconnects, answerTimeout stays intact
            break;

          case 'result':
            if (isTarget) {
              // Target left while waiting for trigger/choosing transition - cancel and advance
              TimeoutManager.clearTrigger(game);
              this.advanceToNextTurn(roomId, game);
            }
            // If uninvolved player disconnects, triggerTimeout stays intact
            break;

          case 'trigger':
            if (isTarget) {
              // Target left during trigger resolution - cancel post-trigger and advance
              TimeoutManager.clearPostTrigger(game);
              this.advanceToNextTurn(roomId, game);
            }
            // If uninvolved player disconnects, postTriggerTimeout stays intact
            break;

          case 'choosing':
            if (isCurrentTurn) {
              // Current player left during card selection - skip to next
              game.currentTurn = this.getNextAlivePlayer(game, playerIndex);
              this.io.to(roomId).emit('game:turn', { playerId: game.players[game.currentTurn].id });
            }
            break;

          case 'dealing':
            if (isCurrentTurn) {
              // Current player left during dealing - advance turn so game doesn't hang
              game.currentTurn = this.getNextAlivePlayer(game, playerIndex);
            }
            break;

          default:
            // game_over, etc. - no action needed
            break;
        }

        break;
      }
    }
  }
}
