export const GAME_CONSTANTS = {
  MIN_PLAYERS: 2,
  MAX_PLAYERS: 4,
  CARDS_PER_HAND: 4,

  TOTAL_CHAMBERS: 6,
  INITIAL_BULLETS: 1,

  TIMER: {
    easy: 10,
    medium: 7,
    hard: 5,
  } as Record<string, number>,

  TIMEOUTS: {
    dealing: 2000,
    result: 2000,
    trigger: 3000,
    roundEnd: 3000,
    choosing: 15000,
  },

  DIFFICULTY: {
    easy: { color: 0x00ff00, label: 'Easy', weight: 40 },
    medium: { color: 0xffff00, label: 'Medium', weight: 40 },
    hard: { color: 0xff0000, label: 'Hard', weight: 20 },
  },

  TOPICS: [
    { id: 'science', name: 'Khoa học', icon: '🔬' },
    { id: 'geography', name: 'Địa lý', icon: '🌍' },
    { id: 'history', name: 'Lịch sử', icon: '📜' },
    { id: 'entertainment', name: 'Giải trí', icon: '🎬' },
    { id: 'gaming', name: 'Game', icon: '🎮' },
    { id: 'technology', name: 'Công nghệ', icon: '💻' },
  ],

  STATES: {
    WAITING: 'waiting',
    DEALING: 'dealing',
    CHOOSING: 'choosing',
    QUESTIONING: 'questioning',
    ANSWERING: 'answering',
    RESULT: 'result',
    TRIGGER: 'trigger',
    ROUND_END: 'round_end',
    GAME_OVER: 'game_over',
  },

  EVENTS: {
    ROOM_CREATE: 'room:create',
    ROOM_JOIN: 'room:join',
    ROOM_START: 'room:start',
    ROOM_READY: 'room:ready',
    ROOM_LEAVE: 'room:leave',

    GAME_DEAL: 'game:deal',
    GAME_CHOOSE: 'game:choose',
    GAME_QUESTION: 'game:question',
    GAME_ANSWER: 'game:answer',
    GAME_RESULT: 'game:result',
    GAME_TRIGGER: 'game:trigger',
    GAME_ROUND_END: 'game:round_end',
    GAME_OVER: 'game:over',

    GAME_STATE: 'game:state',
    ERROR: 'error',
  },

  SCREEN: {
    WIDTH: 1280,
    HEIGHT: 720,
  },
};
