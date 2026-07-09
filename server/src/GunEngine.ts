import { Server } from 'socket.io';
import crypto from 'crypto';
import { GameState, Gun } from './types';

export interface GunEngineCallbacks {
  dealCards: (roomId: string) => Promise<void>;
  getNextAlivePlayer: (game: GameState, fromIndex: number) => number;
  deleteGame: (roomId: string) => void;
  ensurePlayerStats: (game: GameState, playerId: string) => void;
  advanceToNextTurn: (roomId: string, game: GameState) => void;
  startChoosingTurn: (roomId: string, game: GameState) => void;
}

export class GunEngine {
  private io: Server;
  private postTriggerDelayMs: number;
  private callbacks: GunEngineCallbacks;

  constructor(io: Server, postTriggerDelayMs: number, callbacks: GunEngineCallbacks) {
    this.io = io;
    this.postTriggerDelayMs = postTriggerDelayMs;
    this.callbacks = callbacks;
  }

  createGun(): Gun {
    const chambers = Array(6).fill(false);
    chambers[crypto.randomInt(0, 6)] = true;
    return { chambers, currentPosition: 0, bulletsFired: 0 };
  }

  resolveStandoff(roomId: string, game: GameState): void {
    game.phase = 'trigger';
    
    // Each player has an independent 1/6 chance of dying
    const results: { playerId: string; alive: boolean }[] = [];

    const alivePlayers = game.players.filter(p => p.isAlive && !p.left);
    for (const p of alivePlayers) {
      const isDead = Math.random() < (1/6);
      p.shotsFired = (p.shotsFired || 0) + 1;
      if (isDead) {
        p.isAlive = false;
        this.callbacks.ensurePlayerStats(game, p.id);
        game.stats.players[p.id].triggerDied++;
      } else {
        this.callbacks.ensurePlayerStats(game, p.id);
        game.stats.players[p.id].triggerSurvived++;
      }
      results.push({ playerId: p.id, alive: !isDead });
    }

    // Emit result
    this.io.to(roomId).emit('game:standoffResult', { results });

    const someoneDied = results.some(r => !r.alive);
    const delay = someoneDied ? this.postTriggerDelayMs + 2000 : 2500;

    // After a delay, go to next turn or end game
    game.postTriggerTimeout = setTimeout(() => {
      game.postTriggerTimeout = undefined;
      
      const remainingAlive = game.players.filter(p => p.isAlive && !p.left);
      if (remainingAlive.length <= 1) {
        // Game over
        game.stats.totalRounds = game.round;
        this.io.to(roomId).emit('game:over', {
          winner: remainingAlive.length === 1 ? remainingAlive[0].name : 'No one',
          winnerId: remainingAlive.length === 1 ? remainingAlive[0].id : '',
          stats: game.stats,
        });
        this.callbacks.deleteGame(roomId);
      } else {
        // Next round
        game.newRound = true;
        this.callbacks.advanceToNextTurn(roomId, game);
      }
    }, delay);
  }

  pullTrigger(roomId: string, game: GameState): void {
    if (game.phase !== 'trigger') {
      console.warn(`[pullTrigger] Blocked: phase is '${game.phase}', expected 'trigger'. Room: ${roomId}`);
      return;
    }


    game.phase = 'trigger';

    const gun = game.gun;
    const bullet = gun.chambers[gun.currentPosition];
    gun.bulletsFired++;
    gun.currentPosition = (gun.currentPosition + 1) % 6;

    const targetPlayer = game.players[game.targetPlayer!];
    targetPlayer.shotsFired++;

    if (bullet) {
      // BULLET HIT - player dies
      targetPlayer.isAlive = false;
      this.callbacks.ensurePlayerStats(game, targetPlayer.id);
      game.stats.players[targetPlayer.id].triggerDied++;

      this.io.to(roomId).emit('game:trigger', {
        alive: false,
        playerId: targetPlayer.id,
        playerName: targetPlayer.name,
        bulletCount: 6 - gun.bulletsFired,
        currentPosition: gun.currentPosition,
        bulletsFired: gun.bulletsFired,
        shotsFired: targetPlayer.shotsFired,
      });

      const alivePlayers = game.players.filter(p => p.isAlive);
      if (alivePlayers.length <= 1) {
        // Game over
        game.postTriggerTimeout = setTimeout(() => {
          game.postTriggerTimeout = undefined;
          game.phase = 'game_over';
          game.stats.totalRounds = game.round;
          this.io.to(roomId).emit('game:over', {
            winner: alivePlayers[0]?.name || 'No one',
            winnerId: alivePlayers[0]?.id || '',
            stats: game.stats,
          });
          this.callbacks.deleteGame(roomId);
        }, this.postTriggerDelayMs);
      } else {
        // Someone died but game continues - NEW ROUND with new gun
        game.postTriggerTimeout = setTimeout(() => {
          game.postTriggerTimeout = undefined;
          game.round++;
          game.gun = this.createGun();
          game.currentTurn = this.callbacks.getNextAlivePlayer(game, game.targetPlayer!);
          this.io.to(roomId).emit('game:newRound', { round: game.round });
          game.newRound = true;
          this.callbacks.startChoosingTurn(roomId, game);
        }, this.postTriggerDelayMs);
      }
    } else {
      // SURVIVED - gun clicked but no bullet
      this.callbacks.ensurePlayerStats(game, targetPlayer.id);
      game.stats.players[targetPlayer.id].triggerSurvived++;

      this.io.to(roomId).emit('game:trigger', {
        alive: true,
        playerId: targetPlayer.id,
        playerName: targetPlayer.name,
        bulletCount: 6 - gun.bulletsFired,
        currentPosition: gun.currentPosition,
        bulletsFired: gun.bulletsFired,
        shotsFired: targetPlayer.shotsFired,
      });

      // Survived: just continue the game, same round, same gun
      // The target player (who survived) gets to choose next
      game.postTriggerTimeout = setTimeout(() => {
        game.postTriggerTimeout = undefined;
        game.currentTurn = game.targetPlayer!;
        this.callbacks.startChoosingTurn(roomId, game);
      }, this.postTriggerDelayMs);
    }
  }
}
