export type CardType = 'NUMBER' | 'JOKER' | 'SKIP' | 'BLOCK' | 'REVERSE' | 'STANDOFF';

export interface Card {
  id: string;
  type: CardType;
  value?: number; // Only for NUMBER cards
}

export interface Player {
  id: string;
  name: string;
  isReady: boolean;
  hand: Card[];
  isAlive: boolean;
  left?: boolean;
  shotsFired: number;
  hasUsedMulligan: boolean;
}

export interface Room {
  id: string;
  players: Player[];
  state: 'waiting' | 'playing';
  createdAt: number;
  isPublic?: boolean;
}

export interface Gun {
  chambers: boolean[];
  currentPosition: number;
  bulletsFired: number;
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

export interface GameState {
  id: string;
  roomId: string;
  phase: string;
  players: Player[];
  currentTurn: number;
  direction: number; // 1 for clockwise, -1 for counter-clockwise
  currentNumber: number; // The number on the table to beat
  turnStack: Card[]; // Played cards
  deck: Card[];
  round: number;
  gun: Gun;
  stats: GameStats;
  currentPlayer?: number;
  targetPlayer?: number;
  triggerTimeout?: NodeJS.Timeout;
  postTriggerTimeout?: NodeJS.Timeout;
}
