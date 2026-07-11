export const GAME_CONSTANTS = {
  MIN_PLAYERS: 2,
  MAX_PLAYERS: 4,
  CARDS_PER_HAND: 10,

  TOTAL_CHAMBERS: 6,
  INITIAL_BULLETS: 1,

  TIMEOUTS: {
    dealing: 2000,
    result: 2000,
    trigger: 3000,
    roundEnd: 3000,
    choosing: 30000,
  },

  STATES: {
    WAITING: 'waiting',
    DEALING: 'dealing',
    CHOOSING: 'choosing',
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
    GAME_START: 'game:start',
    GAME_TURN: 'game:turn',
    GAME_PLAY_CARD: 'game:play_card',
    GAME_PULL_TRIGGER: 'game:pull_trigger',
    GAME_MULLIGAN: 'game:mulligan',
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
