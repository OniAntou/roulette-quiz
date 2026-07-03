export interface Question {
  id: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  question: string;
  answers: Record<string, string>;
  correct: string;
}

export interface Player {
  id: string;
  name: string;
  isReady: boolean;
  hand: Question[];
  isAlive: boolean;
  left?: boolean;
  shotsFired: number;
  easterEggChance?: number;
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
  correctAnswers: number;
  wrongAnswers: number;
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
  round: number;
  gun: Gun;
  usedCards: string[];
  stats: GameStats;
  currentCard?: Question;
  currentPlayer?: number;
  targetPlayer?: number;
  answerTimeout?: NodeJS.Timeout;
  triggerTimeout?: NodeJS.Timeout;
  postTriggerTimeout?: NodeJS.Timeout;
}

export interface CardData {
  id: string;
  topic: string;
  difficulty: string;
  question: string;
  answers: Record<string, string>;
  correct: string;
}
