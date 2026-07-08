export interface Player {
  id: string;
  name: string;
  isReady?: boolean;
  cardsCount?: number;
  isAlive?: boolean;
  shotsFired?: number;
  left?: boolean;
}

export type CardType = 'NUMBER' | 'JOKER' | 'SKIP' | 'REVERSE' | 'STANDOFF' | 'BLOCK';

export interface Card {
  id: string;
  type: CardType;
  value?: number; // Only for NUMBER cards (1-9)
}

export interface TriggerResult {
  alive: boolean;
  playerId?: string;
  playerName?: string;
  bulletCount: number;
  currentPosition?: number;
  bulletsFired?: number;
  shotsFired?: number;
  results?: { playerId: string; alive: boolean }[];
}

export interface PlayerGameStats {
  cardsPlayed: number;
  triggerSurvived: number;
  triggerDied: number;
}

export interface GameStats {
  players: Record<string, PlayerGameStats>;
  totalRounds: number;
}

export interface WinnerInfo {
  winner: string;
  isLocalWinner: boolean;
  stats?: GameStats;
}

export type GamePhase = 'waiting' | 'dealing' | 'choosing' | 'trigger' | 'round_end' | 'game_over';
export type Screen = 'menu' | 'lobby' | 'game' | 'gameover';
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';
