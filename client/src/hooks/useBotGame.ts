import { useState } from 'react';
import { GamePhase, Player, Card, TriggerResult, WinnerInfo } from '../types';

export interface BotState {
  id: string;
  name: string;
  hand: Card[];
  isAlive: boolean;
  cardsCount: number;
}

interface BotGameCallbacks {
  setScreen: (screen: 'menu' | 'lobby' | 'game' | 'gameover') => void;
  setRound: (v: number | ((prev: number) => number)) => void;
  setPhase: (v: GamePhase) => void;
  setCurrentTurnId: (v: string) => void;
  setHandCards: (v: Card[] | ((prev: Card[]) => Card[])) => void;
  setPlayedCard: (v: Card | null) => void;
  setCurrentNumber: (v: number) => void;
  setDirection: (v: number) => void;
  setTriggerResult: (v: TriggerResult | null) => void;
  setPlayers: (v: Player[] | ((prev: Player[]) => Player[])) => void;
  setWinnerInfo: (v: WinnerInfo | null) => void;
  setLocalPlayerId: (v: string) => void;
}

export function useBotGame(playerName: string, callbacks: BotGameCallbacks) {
  // Disable Bot Mode for now during the rewrite to "đè số"
  return {
    botMode: false,
    botCount: 0,
    bots: [] as BotState[],
    botHudMessage: null,
    isSpectating: false,
    startBotGame: (...args: any[]) => alert('Bot mode is temporarily disabled during rewrite.'),
    handleBotDisconnect: (...args: any[]) => {},
    handleBotCardChoice: (...args: any[]) => {},
    handleBotModePlayerAnswer: (...args: any[]) => {},
    syncHandCards: (...args: any[]) => {},
    syncPlayers: (...args: any[]) => {},
    syncPhase: (...args: any[]) => {},
    syncCurrentTurn: (...args: any[]) => {},
  };
}
