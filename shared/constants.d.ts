export declare const GAME_CONSTANTS: {
    MIN_PLAYERS: number;
    MAX_PLAYERS: number;
    CARDS_PER_HAND: number;
    TOTAL_CHAMBERS: number;
    INITIAL_BULLETS: number;
    TIMER: Record<string, number>;
    TIMEOUTS: {
        dealing: number;
        result: number;
        trigger: number;
        roundEnd: number;
        choosing: number;
    };
    DIFFICULTY: {
        easy: {
            color: number;
            label: string;
            weight: number;
        };
        medium: {
            color: number;
            label: string;
            weight: number;
        };
        hard: {
            color: number;
            label: string;
            weight: number;
        };
    };
    TOPICS: {
        id: string;
        name: string;
        icon: string;
    }[];
    STATES: {
        WAITING: string;
        DEALING: string;
        CHOOSING: string;
        QUESTIONING: string;
        ANSWERING: string;
        RESULT: string;
        TRIGGER: string;
        ROUND_END: string;
        GAME_OVER: string;
    };
    EVENTS: {
        ROOM_CREATE: string;
        ROOM_JOIN: string;
        ROOM_START: string;
        ROOM_READY: string;
        ROOM_LEAVE: string;
        GAME_DEAL: string;
        GAME_CHOOSE: string;
        GAME_QUESTION: string;
        GAME_ANSWER: string;
        GAME_RESULT: string;
        GAME_TRIGGER: string;
        GAME_ROUND_END: string;
        GAME_OVER: string;
        GAME_STATE: string;
        ERROR: string;
    };
    SCREEN: {
        WIDTH: number;
        HEIGHT: number;
    };
};
//# sourceMappingURL=constants.d.ts.map