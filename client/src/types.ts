export interface Player {
  id: string;
  name: string;
  isReady?: boolean;
  cardsCount?: number;
  isAlive?: boolean;
  shotsFired?: number;
}

export interface Question {
  id: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  question: string;
  answers: Record<string, string>;
  correct: string;
}

export interface CardData {
  id: string;
  topic: string;
  difficulty: string;
  question: string;
  answers: Record<string, string>;
  correct: string;
}

export interface ActiveQuestion {
  card: Question;
  timer: number;
  from: string;
}

export interface QuestionResult {
  correct: boolean;
  correctAnswer: string;
}

export interface TriggerResult {
  alive: boolean;
  playerId?: string;
  playerName?: string;
  bulletCount: number;
  currentPosition?: number;
  bulletsFired?: number;
  shotsFired?: number;
}

export interface WinnerInfo {
  winner: string;
  isLocalWinner: boolean;
}

export type GamePhase = 'waiting' | 'choosing' | 'questioning' | 'answering' | 'result' | 'trigger' | 'game_over';
export type Screen = 'menu' | 'lobby' | 'game' | 'gameover';
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';
