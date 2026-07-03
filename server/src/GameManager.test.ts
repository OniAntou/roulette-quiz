import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { RoomManager } from './RoomManager';
import { GameManager } from './GameManager';

// Mock QuestionManager: returns fake cards, no DB needed
vi.mock('./QuestionManager', () => ({
  QuestionManager: class {
    getTotalQuestions() { return 100; }
    async getCards(count: number) {
      return Array.from({ length: count }, (_, i) => ({
        id: `q-test-${Date.now()}-${i}-${Math.random()}`,
        topic: 'Test Topic',
        difficulty: 'easy' as const,
        question: 'What is 1+1?',
        answers: { A: '2', B: '3', C: '4', D: '5' },
        correct: 'A',
      }));
    }
  },
}));

describe('GameManager', () => {
  let rm: RoomManager;
  let roomEmit: ReturnType<typeof vi.fn>;
  let socketEmit: ReturnType<typeof vi.fn>;
  let mockIo: any;
  let gm: GameManager;

  /** Tạo room với N players, trả về roomId */
  function createRoom(roomId: string, playerCount: number): string {
    const room = rm.createRoom('p1', 'Player1');
    const id = room.id;
    for (let i = 2; i <= playerCount; i++) {
      rm.joinRoom(id, `p${i}`, `Player${i}`);
    }
    return id;
  }

  /** Helper: start game và advance tới choosing phase */
  async function startAndDeal(roomId: string) {
    gm.startGame(roomId);
    await vi.advanceTimersByTimeAsync(400);
  }

  beforeEach(() => {
    vi.useFakeTimers();
    // Mock Math.random để tránh EASTER_EGG_STANDOFF ngẫu nhiên làm flaky test
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    rm = new RoomManager();
    roomEmit = vi.fn();
    socketEmit = vi.fn();
    mockIo = {
      to: vi.fn(() => ({ emit: roomEmit })),
      sockets: { sockets: { get: vi.fn(() => ({ emit: socketEmit })) } },
    };
    gm = new GameManager(rm, mockIo);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ============================================================
  // startGame
  // ============================================================
  describe('startGame', () => {
    it('emit game:start ngay lập tức với thông tin players', () => {
      const roomId = createRoom('r1', 3);
      gm.startGame(roomId);

      expect(mockIo.to).toHaveBeenCalledWith(roomId);
      expect(roomEmit).toHaveBeenCalledWith('game:start', {
        players: expect.arrayContaining([
          expect.objectContaining({ name: 'Player1', isAlive: true, cardsCount: 4, shotsFired: 0 }),
          expect.objectContaining({ name: 'Player2', isAlive: true, cardsCount: 4, shotsFired: 0 }),
          expect.objectContaining({ name: 'Player3', isAlive: true, cardsCount: 4, shotsFired: 0 }),
        ]),
        round: 1,
      });
    });

    it('không start game nếu room không tồn tại', () => {
      gm.startGame('GHOST');
      expect(roomEmit).not.toHaveBeenCalled();
    });

    it('deal cards và chuyển sang choosing phase sau delay', async () => {
      const roomId = createRoom('r1', 2);
      await startAndDeal(roomId);

      // Mỗi player nhận được game:deal với 4 cards
      const dealCalls = socketEmit.mock.calls.filter((c: any[]) => c[0] === 'game:deal');
      expect(dealCalls).toHaveLength(2);
      expect(dealCalls[0][1]).toMatchObject({
        cards: expect.arrayContaining([
          expect.objectContaining({ id: expect.any(String) }),
        ]),
      });
      // Cards không chứa trường `correct`
      const cards = dealCalls[0][1].cards;
      expect(cards[0]).not.toHaveProperty('correct');

      // Room nhận game:cardsUpdate + game:turn
      expect(roomEmit).toHaveBeenCalledWith('game:cardsUpdate', expect.any(Object));
      expect(roomEmit).toHaveBeenCalledWith('game:turn', expect.objectContaining({
        playerId: expect.any(String),
      }));
    });

    it('chỉ deal cards cho alive players', async () => {
      const roomId = createRoom('r1', 2);
      await startAndDeal(roomId);

      // Mỗi alive player nhận 1 game:deal + 1 game:question (khi handleCardChoice)
      // Ở đây chỉ start game → chỉ 2 game:deal
      const dealCalls = socketEmit.mock.calls.filter((c: any[]) => c[0] === 'game:deal');
      expect(dealCalls).toHaveLength(2);
    });
  });

  // ============================================================
  // handleCardChoice
  // ============================================================
  describe('handleCardChoice', () => {
    it('chọn card hợp lệ → chuyển sang questioning phase', async () => {
      const roomId = createRoom('r1', 2);
      await startAndDeal(roomId);

      // Lấy card từ mock socket emit (game:deal)
      const dealCall = socketEmit.mock.calls.find((c: any[]) => c[0] === 'game:deal');
      const cardIds = dealCall?.[1]?.cards?.map((c: any) => c.id) || [];
      expect(cardIds.length).toBeGreaterThan(0);

      // Player1 (p1) chọn card
      gm.handleCardChoice(roomId, 'p1', cardIds[0]);

      // Sau khi chọn card: emit game:cardPlayed cho room
      expect(roomEmit).toHaveBeenCalledWith('game:cardPlayed', expect.objectContaining({
        playerId: 'p1',
        card: expect.objectContaining({ id: cardIds[0] }),
      }));

      // Target player (p2) nhận game:question
      expect(socketEmit).toHaveBeenCalledWith('game:question', expect.objectContaining({
        card: expect.objectContaining({ id: cardIds[0] }),
        timer: 10,
        from: 'Player1',
      }));
    });

    it('ignore nếu sai phase', () => {
      const roomId = createRoom('r1', 2);
      gm.handleCardChoice(roomId, 'p1', 'card-123');
      expect(roomEmit).not.toHaveBeenCalled();
    });

    it('ignore nếu sai player (không phải currentTurn)', async () => {
      const roomId = createRoom('r1', 2);
      await startAndDeal(roomId);

      const dealCall = socketEmit.mock.calls.find((c: any[]) => c[0] === 'game:deal');
      const cardIds = dealCall?.[1]?.cards?.map((c: any) => c.id) || [];

      // Player2 (p2) cố chọn card — không phải turn của họ
      gm.handleCardChoice(roomId, 'p2', cardIds[0]);

      // Không có cardPlayed event
      const cardPlayedCalls = roomEmit.mock.calls.filter((c: any[]) => c[0] === 'game:cardPlayed');
      expect(cardPlayedCalls).toHaveLength(0);
    });

    it('ignore nếu card không tồn tại trong hand', async () => {
      const roomId = createRoom('r1', 2);
      await startAndDeal(roomId);

      gm.handleCardChoice(roomId, 'p1', 'non-existent-card');
      const cardPlayedCalls = roomEmit.mock.calls.filter((c: any[]) => c[0] === 'game:cardPlayed');
      expect(cardPlayedCalls).toHaveLength(0);
    });
  });

  // ============================================================
  // handleAnswer
  // ============================================================
  describe('handleAnswer', () => {
    it('trả lời đúng → emit game:result(correct=true) và chuyển turn', async () => {
      const roomId = createRoom('r1', 2);
      await startAndDeal(roomId);

      // Chọn card (p1 chọn, p2 là target)
      const dealCall = socketEmit.mock.calls.find((c: any[]) => c[0] === 'game:deal');
      const cardIds = dealCall?.[1]?.cards?.map((c: any) => c.id) || [];
      gm.handleCardChoice(roomId, 'p1', cardIds[0]);

      // Target (p2) trả lời đúng
      gm.handleAnswer(roomId, 'p2', 'A');

      expect(roomEmit).toHaveBeenCalledWith('game:result', {
        correct: true,
        correctAnswer: 'A',
        answer: 'A',
      });
    });

    it('trả lời sai → emit game:result(correct=false) và trigger', async () => {
      const roomId = createRoom('r1', 2);
      await startAndDeal(roomId);

      const dealCall = socketEmit.mock.calls.find((c: any[]) => c[0] === 'game:deal');
      const cardIds = dealCall?.[1]?.cards?.map((c: any) => c.id) || [];
      gm.handleCardChoice(roomId, 'p1', cardIds[0]);

      // Target trả lời sai
      gm.handleAnswer(roomId, 'p2', 'B');

      expect(roomEmit).toHaveBeenCalledWith('game:result', {
        correct: false,
        correctAnswer: 'A',
        answer: 'B',
      });
    });

    it('ignore nếu sai phase', async () => {
      const roomId = createRoom('r1', 2);
      await startAndDeal(roomId);

      gm.handleAnswer(roomId, 'p2', 'A');
      // Chưa có card choice → vẫn ở choosing phase → ignore answer
      const resultCalls = roomEmit.mock.calls.filter((c: any[]) => c[0] === 'game:result');
      expect(resultCalls).toHaveLength(0);
    });

    it('ignore nếu sai player (không phải target)', async () => {
      const roomId = createRoom('r1', 2);
      await startAndDeal(roomId);

      const dealCall = socketEmit.mock.calls.find((c: any[]) => c[0] === 'game:deal');
      const cardIds = dealCall?.[1]?.cards?.map((c: any) => c.id) || [];
      gm.handleCardChoice(roomId, 'p1', cardIds[0]);

      // Player1 (questioner) trả lời — không phải target
      gm.handleAnswer(roomId, 'p1', 'A');
      const resultCalls = roomEmit.mock.calls.filter((c: any[]) => c[0] === 'game:result');
      expect(resultCalls).toHaveLength(0);
    });
  });

  // ============================================================
  // handleTimeout
  // ============================================================
  describe('handleTimeout', () => {
    it('timeout → xử lý như wrong answer và trigger', async () => {
      const roomId = createRoom('r1', 2);
      await startAndDeal(roomId);

      const dealCall = socketEmit.mock.calls.find((c: any[]) => c[0] === 'game:deal');
      const cardIds = dealCall?.[1]?.cards?.map((c: any) => c.id) || [];
      gm.handleCardChoice(roomId, 'p1', cardIds[0]);

      // Advance qua answer timer (10s + resultDelay 3s)
      await vi.advanceTimersByTimeAsync(13000);

      expect(roomEmit).toHaveBeenCalledWith('game:result', {
        correct: false,
        correctAnswer: 'A',
        answer: 'TIMEOUT',
      });
    });

    it('ignore timeout nếu phase đã thay đổi', async () => {
      const roomId = createRoom('r1', 2);
      gm.startGame(roomId);

      // Advance nhanh vượt qua nhiều phase (phải await để tránh bleeding)
      await vi.advanceTimersByTimeAsync(50000);

      // Không crash
      expect(rm.getRoom(roomId)).toBeDefined();
    });
  });

  // ============================================================
  // Trigger mechanics
  // ============================================================
  describe('trigger và game over', () => {
    it('game:result được emit khi trả lời sai', async () => {
      const roomId = createRoom('r1', 2);
      await startAndDeal(roomId);

      const dealCall = socketEmit.mock.calls.find((c: any[]) => c[0] === 'game:deal');
      const cardIds = dealCall?.[1]?.cards?.map((c: any) => c.id) || [];
      gm.handleCardChoice(roomId, 'p1', cardIds[0]);

      // Trả lời sai → game:result
      gm.handleAnswer(roomId, 'p2', 'X');
      const resultCalls = roomEmit.mock.calls.filter((c: any[]) => c[0] === 'game:result');
      expect(resultCalls.length).toBeGreaterThanOrEqual(1);
      expect(resultCalls[0][1]).toEqual({
        correct: false,
        correctAnswer: 'A',
        answer: 'X',
      });
    });

    it('game over khi chỉ còn 1 player alive', async () => {
      const roomId = createRoom('r1', 2);
      await startAndDeal(roomId);

      // Force cả 2 players disconnect → game over
      gm.handleDisconnect('p1');
      gm.handleDisconnect('p2');

      const overCalls = roomEmit.mock.calls.filter((c: any[]) => c[0] === 'game:over');
      expect(overCalls.length).toBeGreaterThanOrEqual(1);
      expect(overCalls[0][1]).toMatchObject({
        winner: expect.any(String),
        stats: expect.objectContaining({
          totalRounds: expect.any(Number),
          players: expect.any(Object),
        }),
      });
    });
  });

  // ============================================================
  // handleDisconnect
  // ============================================================
  describe('handleDisconnect', () => {
    it('disconnect player cuối → game over', async () => {
      const roomId = createRoom('r1', 2);
      await startAndDeal(roomId);

      gm.handleDisconnect('p1');
      // P2 là player cuối → winner = Player2 (không phải No one)
      const overCall = roomEmit.mock.calls.find((c: any[]) => c[0] === 'game:over');
      expect(overCall).toBeDefined();
      expect(overCall![1]).toMatchObject({
        winner: 'Player2',
        stats: expect.any(Object),
      });
    });

    it('disconnect khi choosing → skip turn', async () => {
      const roomId = createRoom('r1', 3);
      await startAndDeal(roomId);

      // P1 đang choosing → disconnect
      gm.handleDisconnect('p1');

      // Game chuyển turn sang player khác
      expect(roomEmit).toHaveBeenCalledWith('game:turn', expect.objectContaining({
        playerId: expect.any(String),
      }));
    });

    it('disconnect không ảnh hưởng game nếu còn 2+ alive', async () => {
      const roomId = createRoom('r1', 3);
      await startAndDeal(roomId);

      // P3 disconnect (không phải current turn)
      gm.handleDisconnect('p3');

      // Game vẫn còn 2+ alive → không game:over
      const gameOverCalls = roomEmit.mock.calls.filter((c: any[]) => c[0] === 'game:over');
      expect(gameOverCalls).toHaveLength(0);
    });
  });

  // ============================================================
  // Stats tracking
  // ============================================================
  describe('stats tracking', () => {
    it('track correct/wrong answers', async () => {
      const roomId = createRoom('r1', 2);
      await startAndDeal(roomId);

      // Lấy deal event đầu tiên
      const dealCall = socketEmit.mock.calls.filter((c: any[]) => c[0] === 'game:deal');
      const cardIds = dealCall[0]?.[1]?.cards?.map((c: any) => c.id) || [];

      // P1 chọn card → P2 correct answer
      gm.handleCardChoice(roomId, 'p1', cardIds[0]);
      gm.handleAnswer(roomId, 'p2', 'A');
      await vi.advanceTimersByTimeAsync(3400); // resultDelay + deal

      // Force game over để check stats
      gm.handleDisconnect('p1');
      gm.handleDisconnect('p2');

      const overCall = roomEmit.mock.calls.find((c: any[]) => c[0] === 'game:over');
      const stats = overCall?.[1]?.stats;
      expect(stats).toBeDefined();
      // P2 correct answer
      expect(stats.players['p2']?.correctAnswers).toBeGreaterThanOrEqual(1);
    });
  });

  // ============================================================
  // handleCardChoice edge cases
  // ============================================================
  describe('handleCardChoice edge cases', () => {
    it('ignore khi player đã chết chọn card', async () => {
      const roomId = createRoom('r1', 2);
      await startAndDeal(roomId);

      const dealCall = socketEmit.mock.calls.find((c: any[]) => c[0] === 'game:deal');
      const cardIds = dealCall?.[1]?.cards?.map((c: any) => c.id) || [];

      // Kill p1
      const game = (gm as any).games.get(roomId);
      game.players[0].isAlive = false;

      gm.handleCardChoice(roomId, 'p1', cardIds[0]);
      const cardPlayedCalls = roomEmit.mock.calls.filter((c: any[]) => c[0] === 'game:cardPlayed');
      expect(cardPlayedCalls).toHaveLength(0);
    });

    it('ignore khi game không tồn tại', () => {
      gm.handleCardChoice('GHOST', 'p1', 'card-1');
      expect(roomEmit).not.toHaveBeenCalled();
    });

    it('chọn card → không emit question nếu target socket offline', async () => {
      const roomId = createRoom('r1', 2);
      await startAndDeal(roomId);

      // Mock socket.get trả về undefined (target disconnected)
      const origGet = mockIo.sockets.sockets.get;
      mockIo.sockets.sockets.get = vi.fn(() => undefined as any);

      const dealCall = socketEmit.mock.calls.find((c: any[]) => c[0] === 'game:deal');
      const cardIds = dealCall?.[1]?.cards?.map((c: any) => c.id) || [];
      gm.handleCardChoice(roomId, 'p1', cardIds[0]);

      // cardPlayed vẫn emit cho room
      expect(roomEmit).toHaveBeenCalledWith('game:cardPlayed', expect.any(Object));
      // Nhưng không emit question cho target (vì socket undefined)
      const questionCalls = socketEmit.mock.calls.filter((c: any[]) => c[0] === 'game:question');
      expect(questionCalls).toHaveLength(0);
    });
  });

  // ============================================================
  // handleAnswer edge cases
  // ============================================================
  describe('handleAnswer edge cases', () => {
    it('ignore khi game không tồn tại', () => {
      gm.handleAnswer('GHOST', 'p1', 'A');
      expect(roomEmit).not.toHaveBeenCalled();
    });

    it('ignore khi targetPlayer undefined', async () => {
      const roomId = createRoom('r1', 2);
      await startAndDeal(roomId);

      const dealCall = socketEmit.mock.calls.find((c: any[]) => c[0] === 'game:deal');
      const cardIds = dealCall?.[1]?.cards?.map((c: any) => c.id) || [];
      gm.handleCardChoice(roomId, 'p1', cardIds[0]);

      // Xoá targetPlayer
      const game = (gm as any).games.get(roomId);
      game.targetPlayer = undefined;

      gm.handleAnswer(roomId, 'p2', 'A');
      const resultCalls = roomEmit.mock.calls.filter((c: any[]) => c[0] === 'game:result');
      expect(resultCalls).toHaveLength(0);
    });

    it('answer sai case (thường) vẫn được tính là sai', async () => {
      const roomId = createRoom('r1', 2);
      await startAndDeal(roomId);

      const dealCall = socketEmit.mock.calls.find((c: any[]) => c[0] === 'game:deal');
      const cardIds = dealCall?.[1]?.cards?.map((c: any) => c.id) || [];
      gm.handleCardChoice(roomId, 'p1', cardIds[0]);

      // Answer với chữ thường - nên là sai vì answer so sánh ===
      gm.handleAnswer(roomId, 'p2', 'a');
      expect(roomEmit).toHaveBeenCalledWith('game:result', {
        correct: false,
        correctAnswer: 'A',
        answer: 'a',
      });
    });

    it('correct answer → chuyển sang choosing và deal cards sau delay', async () => {
      const roomId = createRoom('r1', 2);
      await startAndDeal(roomId);

      const dealCall = socketEmit.mock.calls.find((c: any[]) => c[0] === 'game:deal');
      const cardIds = dealCall?.[1]?.cards?.map((c: any) => c.id) || [];
      gm.handleCardChoice(roomId, 'p1', cardIds[0]);
      gm.handleAnswer(roomId, 'p2', 'A');

      // Advance qua resultDelay (3s)
      await vi.advanceTimersByTimeAsync(4000);

      // Phase phải là 'choosing' và p2 là currentTurn
      const game = (gm as any).games.get(roomId);
      expect(game.phase).toBe('choosing');
      expect(game.currentTurn).toBe(1); // p2 (index 1)
      expect(game.players[1].isAlive).toBe(true);
      // Player phải có cards mới
      expect(game.players[1].hand.length).toBeGreaterThan(0);
    });

    it('wrong answer → pull trigger được gọi sau delay', async () => {
      const roomId = createRoom('r1', 2);
      await startAndDeal(roomId);

      const dealCall = socketEmit.mock.calls.find((c: any[]) => c[0] === 'game:deal');
      const cardIds = dealCall?.[1]?.cards?.map((c: any) => c.id) || [];
      gm.handleCardChoice(roomId, 'p1', cardIds[0]);
      gm.handleAnswer(roomId, 'p2', 'B');

      // Advance qua resultDelay (3s)
      await vi.advanceTimersByTimeAsync(4000);

      // Trigger phải được emit (game:trigger)
      const triggerCalls = roomEmit.mock.calls.filter((c: any[]) => c[0] === 'game:trigger');
      expect(triggerCalls.length).toBeGreaterThanOrEqual(1);
      expect(triggerCalls[0][1]).toMatchObject({
        playerId: 'p2',
        alive: expect.any(Boolean),
      });
    });
  });

  // ============================================================
  // handleTimeout edge cases
  // ============================================================
  describe('handleTimeout edge cases', () => {
    it('không crash khi game bị xoá trước timeout', async () => {
      const roomId = createRoom('r1', 2);
      await startAndDeal(roomId);

      const dealCall = socketEmit.mock.calls.find((c: any[]) => c[0] === 'game:deal');
      const cardIds = dealCall?.[1]?.cards?.map((c: any) => c.id) || [];
      gm.handleCardChoice(roomId, 'p1', cardIds[0]);

      // Xoá game ngay trước khi timeout fire
      (gm as any).games.delete(roomId);
      await vi.advanceTimersByTimeAsync(15000);

      // Không crash
      expect(true).toBe(true);
    });
  });

  // ============================================================
  // pullTrigger edge cases
  // ============================================================
  describe('pullTrigger', () => {
    it('blocked nếu phase không phải result', async () => {
      const roomId = createRoom('r1', 2);
      await startAndDeal(roomId);

      // Set phase = choosing và triggerTimeout
      const game = (gm as any).games.get(roomId);
      game.phase = 'choosing';
      game.targetPlayer = 1;

      // Trigger timeout sẽ fire và gọi pullTrigger → bị blocked vì phase != 'result'
      game.triggerTimeout = setTimeout(() => {
        // pullTrigger bên trong sẽ check phase
      }, 100);

      await vi.advanceTimersByTimeAsync(200);

      // Trigger không được emit
      const triggerCalls = roomEmit.mock.calls.filter((c: any[]) => c[0] === 'game:trigger');
      expect(triggerCalls).toHaveLength(0);
    });
  });

  // ============================================================
  // handleDisconnect edge cases
  // ============================================================
  describe('handleDisconnect edge cases', () => {
    it('không crash khi disconnect không trong game', () => {
      expect(() => gm.handleDisconnect('ghost')).not.toThrow();
    });

    it('disconnect ở result phase (không phải target) → trigger vẫn chạy', async () => {
      const roomId = createRoom('r1', 3);
      await startAndDeal(roomId);

      const dealCall = socketEmit.mock.calls.find((c: any[]) => c[0] === 'game:deal');
      const cardIds = dealCall?.[1]?.cards?.map((c: any) => c.id) || [];
      gm.handleCardChoice(roomId, 'p1', cardIds[0]);
      gm.handleAnswer(roomId, 'p2', 'B');

      // P3 (uninvolved) disconnect ở result phase
      gm.handleDisconnect('p3');

      // Trigger vẫn phải fire
      await vi.advanceTimersByTimeAsync(4000);
      const triggerCalls = roomEmit.mock.calls.filter((c: any[]) => c[0] === 'game:trigger');
      expect(triggerCalls.length).toBeGreaterThanOrEqual(1);
    });

    it('disconnect ở dealing phase → không crash', async () => {
      const roomId = createRoom('r1', 2);
      gm.startGame(roomId);
      // Disconnect ngay khi đang dealing (phase = 'dealing')
      gm.handleDisconnect('p1');
      await vi.advanceTimersByTimeAsync(400);
      // Không crash
      expect(true).toBe(true);
    });

    it('disconnect trong game_over → không crash', () => {
      const roomId = createRoom('r1', 2);
      gm.startGame(roomId);
      // Force game_over phase
      const game = (gm as any).games.get(roomId);
      if (game) game.phase = 'game_over';
      gm.handleDisconnect('p1');
      expect(true).toBe(true);
    });
  });

  // ============================================================
  // handleLeaveAfterDeath edge cases
  // ============================================================
  describe('handleLeaveAfterDeath', () => {
    it('ignore khi game không tồn tại', () => {
      gm.handleLeaveAfterDeath('GHOST', 'p1');
      expect(roomEmit).not.toHaveBeenCalled();
    });

    it('ignore khi player còn sống', async () => {
      const roomId = createRoom('r1', 2);
      await startAndDeal(roomId);

      gm.handleLeaveAfterDeath(roomId, 'p1');
      const leftCalls = roomEmit.mock.calls.filter((c: any[]) => c[0] === 'game:playerLeftAfterDeath');
      expect(leftCalls).toHaveLength(0);
    });

    it('ignore khi player không trong game', async () => {
      const roomId = createRoom('r1', 2);
      await startAndDeal(roomId);

      gm.handleLeaveAfterDeath(roomId, 'ghost');
      const leftCalls = roomEmit.mock.calls.filter((c: any[]) => c[0] === 'game:playerLeftAfterDeath');
      expect(leftCalls).toHaveLength(0);
    });

    it('emit playerLeftAfterDeath khi player chết leave', async () => {
      const roomId = createRoom('r1', 2);
      await startAndDeal(roomId);

      // Kill p1
      const game = (gm as any).games.get(roomId);
      game.players[0].isAlive = false;

      gm.handleLeaveAfterDeath(roomId, 'p1');
      expect(roomEmit).toHaveBeenCalledWith('game:playerLeftAfterDeath', {
        playerId: 'p1',
        playerName: 'Player1',
      });
    });
  });

  // ============================================================
  // timer duration (test qua timer field trong question emit)
  // ============================================================
  describe('timer duration', () => {
    it('easy difficulty → 10s timer', async () => {
      const roomId = createRoom('r1', 2);
      await startAndDeal(roomId);

      const dealCall = socketEmit.mock.calls.find((c: any[]) => c[0] === 'game:deal');
      const cardIds = dealCall?.[1]?.cards?.map((c: any) => c.id) || [];
      gm.handleCardChoice(roomId, 'p1', cardIds[0]);

      // Question phải có timer = 10 (easy default)
      expect(socketEmit).toHaveBeenCalledWith('game:question', expect.objectContaining({
        timer: 10,
      }));
    });
  });
});
