import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GameManager } from './GameManager';
import { RoomManager } from './RoomManager';
import { GameState } from './types';

type EmittedEvent = {
  room: string;
  event: string;
  payload: any;
};

function createMockIo(playerIds: string[]) {
  const roomEvents: EmittedEvent[] = [];
  const directEvents: EmittedEvent[] = [];
  const sockets = new Map(
    playerIds.map(id => [
      id,
      {
        emit: vi.fn((event: string, payload: any) => {
          directEvents.push({ room: id, event, payload });
        }),
      },
    ]),
  );

  const io = {
    to: vi.fn((room: string) => ({
      emit: vi.fn((event: string, payload: any) => {
        roomEvents.push({ room, event, payload });
      }),
    })),
    sockets: { sockets },
  };

  return { io, roomEvents, directEvents };
}

async function startGame(playerIds: string[]) {
  const roomManager = new RoomManager();
  const room = roomManager.createRoom(playerIds[0], 'P1');
  playerIds.slice(1).forEach((id, index) => {
    roomManager.joinRoom(room.id, id, `P${index + 2}`);
  });

  const { io, roomEvents, directEvents } = createMockIo(playerIds);
  const gameManager = new GameManager(roomManager, io as any);
  gameManager.startGame(room.id);
  await vi.advanceTimersByTimeAsync(400);

  const game = (gameManager as any).games.get(room.id) as GameState;
  expect(game).toBeDefined();

  return { gameManager, game, room, roomEvents, directEvents };
}

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
}

describe('GameManager current card rules', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts a new choosing timeout after a survived trigger pull', async () => {
    const { gameManager, game, room, roomEvents } = await startGame(['p1', 'p2']);
    game.gun = {
      chambers: [false, true, false, false, false, false],
      currentPosition: 0,
      bulletsFired: 0,
    };
    game.players[0].hand = game.players[0].hand.filter(card => card.type !== 'BLOCK');

    gameManager.handlePullTrigger(room.id, 'p1');
    expect(game.phase).toBe('trigger');

    await vi.advanceTimersByTimeAsync(3000);
    await flushPromises();

    expect(game.phase).toBe('choosing');
    expect(game.currentTurn).toBe(0);
    expect(game.triggerTimeout).toBeDefined();
    expect(roomEvents).toContainEqual(expect.objectContaining({
      event: 'game:turn',
      payload: { playerId: 'p1' },
    }));
  });

  it('starts a new round with a choosing timeout after a fatal trigger when players remain', async () => {
    const { gameManager, game, room, roomEvents } = await startGame(['p1', 'p2', 'p3']);
    game.gun = {
      chambers: [true, false, false, false, false, false],
      currentPosition: 0,
      bulletsFired: 0,
    };

    gameManager.handlePullTrigger(room.id, 'p1');

    await vi.advanceTimersByTimeAsync(3000);
    await flushPromises();

    expect(game.players[0].isAlive).toBe(false);
    expect(game.round).toBe(2);
    expect(game.phase).toBe('choosing');
    expect(game.currentTurn).toBe(1);
    expect(game.triggerTimeout).toBeDefined();
    expect(roomEvents).toContainEqual(expect.objectContaining({
      event: 'game:newRound',
      payload: { round: 2 },
    }));
    expect(roomEvents).toContainEqual(expect.objectContaining({
      event: 'game:turn',
      payload: { playerId: 'p2' },
    }));
  });

  it('rejects a NUMBER card that does not beat the current table number', async () => {
    const { gameManager, game, room, roomEvents } = await startGame(['p1', 'p2']);
    game.currentNumber = 5;
    game.players[0].hand = [{ id: 'low-card', type: 'NUMBER', value: 4 }];

    gameManager.handlePlayCard(room.id, 'p1', 'low-card');

    expect(game.players[0].hand).toHaveLength(1);
    expect(game.currentTurn).toBe(0);
    expect(roomEvents.some(e => e.event === 'game:cardPlayed')).toBe(false);
  });
});
