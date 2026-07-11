import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useBotGame } from './useBotGame';
import { Card, GamePhase, Player, TriggerResult, WinnerInfo } from '../types';

type MockWithCalls = {
  mock: {
    calls: unknown[][];
  };
};

function latestArg<T>(mock: MockWithCalls): T {
  const calls = mock.mock.calls;
  return calls[calls.length - 1][0] as T;
}

function createCallbacks() {
  return {
    setScreen: vi.fn(),
    setRound: vi.fn(),
    setPhase: vi.fn(),
    setCurrentTurnId: vi.fn(),
    setHandCards: vi.fn(),
    setPlayedCard: vi.fn(),
    setCurrentNumber: vi.fn(),
    setDirection: vi.fn(),
    setTriggerResult: vi.fn(),
    setPlayers: vi.fn(),
    setWinnerInfo: vi.fn(),
    setLocalPlayerId: vi.fn(),
  };
}

describe('useBotGame', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('starts an offline bot match with the current card-rule state', () => {
    const callbacks = createCallbacks();
    const { result } = renderHook(() => useBotGame('GUEST', callbacks));

    act(() => {
      result.current.startBotGame(5, 'ACE');
    });

    expect(result.current.botMode).toBe(true);
    expect(result.current.botCount).toBe(3);
    expect(result.current.bots).toHaveLength(3);
    expect(callbacks.setScreen).toHaveBeenCalledWith('game');
    expect(callbacks.setLocalPlayerId).toHaveBeenCalledWith('local-player');
    expect(callbacks.setPhase).toHaveBeenCalledWith('choosing' satisfies GamePhase);
    expect(callbacks.setCurrentTurnId).toHaveBeenCalledWith('local-player');
    expect(callbacks.setCurrentNumber).toHaveBeenCalledWith(0);
    expect(callbacks.setDirection).toHaveBeenCalledWith(1);

    const players = latestArg<Player[]>(callbacks.setPlayers);
    expect(players).toHaveLength(4);
    expect(players[0]).toMatchObject({
      id: 'local-player',
      name: 'ACE',
      cardsCount: 10,
      isAlive: true,
      shotsFired: 0,
    });
    expect(players.slice(1).map(player => player.id)).toEqual(['bot-1', 'bot-2', 'bot-3']);

    const hand = latestArg<Card[]>(callbacks.setHandCards);
    expect(hand).toHaveLength(10);
  });

  it('lets the local player redraw only once per bot match turn', () => {
    const callbacks = createCallbacks();
    const { result } = renderHook(() => useBotGame('GUEST', callbacks));

    act(() => {
      result.current.startBotGame(1, 'ACE');
    });

    const initialHand = latestArg<Card[]>(callbacks.setHandCards);

    act(() => {
      result.current.handleBotMulligan();
    });

    const redrawnHand = latestArg<Card[]>(callbacks.setHandCards);
    const callsAfterFirstMulligan = callbacks.setHandCards.mock.calls.length;

    expect(redrawnHand).toHaveLength(10);
    expect(redrawnHand).not.toEqual(initialHand);

    act(() => {
      result.current.handleBotMulligan();
    });

    expect(callbacks.setHandCards.mock.calls).toHaveLength(callsAfterFirstMulligan);
  });

  it('resolves a safe local trigger pull without using socket state', () => {
    const callbacks = createCallbacks();
    const { result } = renderHook(() => useBotGame('GUEST', callbacks));

    act(() => {
      result.current.startBotGame(1, 'ACE');
    });

    act(() => {
      result.current.handleBotPullTrigger();
    });

    expect(callbacks.setPhase).toHaveBeenLastCalledWith('trigger');
    expect(latestArg<TriggerResult>(callbacks.setTriggerResult)).toMatchObject({
      alive: true,
      playerId: 'local-player',
      playerName: 'ACE',
      bulletsFired: 1,
      shotsFired: 1,
    });

    act(() => {
      vi.advanceTimersByTime(1800);
    });

    expect(latestArg<string>(callbacks.setCurrentTurnId)).toBe('local-player');
    expect(latestArg<Player[]>(callbacks.setPlayers)[0]).toMatchObject({
      id: 'local-player',
      shotsFired: 1,
      isAlive: true,
    });
    expect(latestArg<WinnerInfo | null>(callbacks.setWinnerInfo)).toBeNull();
  });
});
