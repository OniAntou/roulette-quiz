import { MutableRefObject, useCallback, useEffect, useRef, useState } from 'react';
import { GamePhase, Player, Card, TriggerResult, WinnerInfo, GameStats } from '../types';

const LOCAL_PLAYER_ID = 'local-player';
const CARDS_PER_HAND = 10;
const TOTAL_CHAMBERS = 6;
const BOT_TURN_DELAY_MS = 800;
const TRIGGER_RESULT_DELAY_MS = 1800;
const GAME_OVER_DELAY_MS = 1200;

export interface BotState {
  id: string;
  name: string;
  hand: Card[];
  isAlive: boolean;
  cardsCount: number;
  shotsFired: number;
  hasUsedMulligan: boolean;
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

interface GunState {
  chambers: boolean[];
  currentPosition: number;
  bulletsFired: number;
}

function createStats(players: BotState[]): GameStats {
  return {
    players: Object.fromEntries(
      players.map(player => [
        player.id,
        { cardsPlayed: 0, triggerSurvived: 0, triggerDied: 0 },
      ]),
    ),
    totalRounds: 1,
  };
}

function createGun(): GunState {
  const chambers = Array(TOTAL_CHAMBERS).fill(false);
  chambers[Math.floor(Math.random() * TOTAL_CHAMBERS)] = true;
  return { chambers, currentPosition: 0, bulletsFired: 0 };
}

function createDeck(): Card[] {
  const deck: Card[] = [];
  let id = 0;

  for (let value = 1; value <= 9; value++) {
    for (let copy = 0; copy < 4; copy++) {
      deck.push({ id: `number-${value}-${copy}-${id++}`, type: 'NUMBER', value });
    }
  }

  for (let i = 0; i < 4; i++) deck.push({ id: `skip-${i}-${id++}`, type: 'SKIP' });
  for (let i = 0; i < 4; i++) deck.push({ id: `block-${i}-${id++}`, type: 'BLOCK' });
  for (let i = 0; i < 4; i++) deck.push({ id: `reverse-${i}-${id++}`, type: 'REVERSE' });
  for (let i = 0; i < 2; i++) deck.push({ id: `joker-${i}-${id++}`, type: 'JOKER' });
  deck.push({ id: `standoff-${id++}`, type: 'STANDOFF' });

  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
}

function drawCards(deckRef: MutableRefObject<Card[]>, count: number): Card[] {
  const cards: Card[] = [];
  for (let i = 0; i < count; i++) {
    if (deckRef.current.length === 0) {
      deckRef.current = createDeck();
    }
    const card = deckRef.current.pop();
    if (card) cards.push(card);
  }
  return cards;
}

function toPlayerView(player: BotState): Player {
  return {
    id: player.id,
    name: player.name,
    cardsCount: player.isAlive ? player.hand.length : 0,
    isAlive: player.isAlive,
    shotsFired: player.shotsFired,
    left: false,
  };
}

function isPlayableCard(card: Card, currentNumber: number): boolean {
  return card.type !== 'NUMBER' || (card.value ?? 0) > currentNumber;
}

function chooseBotCard(hand: Card[], currentNumber: number): Card | undefined {
  const playableNumbers = hand
    .filter(card => card.type === 'NUMBER' && (card.value ?? 0) > currentNumber)
    .sort((a, b) => (a.value ?? 0) - (b.value ?? 0));
  if (playableNumbers[0]) return playableNumbers[0];

  return hand.find(card => card.type === 'JOKER')
    ?? hand.find(card => card.type === 'BLOCK')
    ?? hand.find(card => card.type === 'REVERSE')
    ?? hand.find(card => card.type === 'SKIP')
    ?? hand.find(card => card.type === 'STANDOFF');
}

export function useBotGame(playerName: string, callbacks: BotGameCallbacks) {
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  const [botMode, setBotMode] = useState(false);
  const [botCount, setBotCount] = useState(0);
  const [bots, setBots] = useState<BotState[]>([]);
  const [botHudMessage, setBotHudMessage] = useState<{ text: string; color: string } | null>(null);
  const [isSpectating, setIsSpectating] = useState(false);

  const playersRef = useRef<BotState[]>([]);
  const deckRef = useRef<Card[]>([]);
  const gunRef = useRef<GunState>(createGun());
  const currentTurnIndexRef = useRef(0);
  const currentNumberRef = useRef(0);
  const directionRef = useRef(1);
  const roundRef = useRef(1);
  const phaseRef = useRef<GamePhase>('waiting');
  const statsRef = useRef<GameStats>({ players: {}, totalRounds: 0 });
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  const schedule = useCallback((fn: () => void, delay: number) => {
    const timer = setTimeout(() => {
      timersRef.current = timersRef.current.filter(item => item !== timer);
      fn();
    }, delay);
    timersRef.current.push(timer);
  }, []);

  const updatePlayerViews = useCallback(() => {
    callbacksRef.current.setPlayers(playersRef.current.map(toPlayerView));
    const localPlayer = playersRef.current.find(player => player.id === LOCAL_PLAYER_ID);
    callbacksRef.current.setHandCards(localPlayer?.hand ?? []);
    setBots(playersRef.current.filter(player => player.id !== LOCAL_PLAYER_ID));
    setIsSpectating(Boolean(localPlayer && !localPlayer.isAlive));
  }, []);

  const dealIfNeeded = useCallback((player: BotState, force = false) => {
    if (!player.isAlive) return;
    if (!force && player.hand.length > 0) return;
    player.hand = drawCards(deckRef, CARDS_PER_HAND);
    player.cardsCount = player.hand.length;
  }, []);

  const getNextAliveIndex = useCallback((fromIndex: number, direction = directionRef.current) => {
    const players = playersRef.current;
    let next = (fromIndex + direction + players.length) % players.length;
    let checked = 0;

    while (!players[next]?.isAlive && checked < players.length) {
      next = (next + direction + players.length) % players.length;
      checked++;
    }

    return next;
  }, []);

  const finishGame = useCallback((winner: BotState | undefined) => {
    clearTimers();
    phaseRef.current = 'game_over';
    statsRef.current.totalRounds = roundRef.current;
    callbacksRef.current.setPhase('game_over');
    callbacksRef.current.setWinnerInfo({
      winner: winner?.name || 'No one',
      isLocalWinner: winner?.id === LOCAL_PLAYER_ID,
      stats: statsRef.current,
    });
    schedule(() => callbacksRef.current.setScreen('gameover'), GAME_OVER_DELAY_MS);
  }, [clearTimers, schedule]);

  const startChoosingTurn = useCallback((message?: string) => {
    const currentPlayer = playersRef.current[currentTurnIndexRef.current];
    if (!currentPlayer?.isAlive) return;

    dealIfNeeded(currentPlayer);
    phaseRef.current = 'choosing';
    callbacksRef.current.setPhase('choosing');
    callbacksRef.current.setTriggerResult(null);
    
    // Delay setPlayedCard(null) slightly so React can render the playedCard and trigger GameBoard's useEffect
    setTimeout(() => {
      callbacksRef.current.setPlayedCard(null);
    }, 50);
    
    callbacksRef.current.setCurrentTurnId(currentPlayer.id);
    callbacksRef.current.setCurrentNumber(currentNumberRef.current);
    callbacksRef.current.setDirection(directionRef.current);
    updatePlayerViews();

    if (message) {
      setBotHudMessage({ text: message, color: currentPlayer.id === LOCAL_PLAYER_ID ? 'cyan' : 'amber' });
    }

    if (currentPlayer.id !== LOCAL_PLAYER_ID) {
      schedule(() => runBotTurn(), BOT_TURN_DELAY_MS);
    }
  }, [dealIfNeeded, schedule, updatePlayerViews]);

  const resolveTrigger = useCallback((targetIndex: number) => {
    const target = playersRef.current[targetIndex];
    if (!target?.isAlive) return;

    phaseRef.current = 'trigger';
    callbacksRef.current.setPhase('trigger');
    currentNumberRef.current = 0;
    callbacksRef.current.setCurrentNumber(0);

    const gun = gunRef.current;
    const bullet = gun.chambers[gun.currentPosition];
    gun.bulletsFired++;
    gun.currentPosition = (gun.currentPosition + 1) % TOTAL_CHAMBERS;
    target.shotsFired++;

    const result: TriggerResult = {
      alive: !bullet,
      playerId: target.id,
      playerName: target.name,
      bulletCount: TOTAL_CHAMBERS - gun.bulletsFired,
      currentPosition: gun.currentPosition,
      bulletsFired: gun.bulletsFired,
      shotsFired: target.shotsFired,
    };

    if (bullet) {
      target.isAlive = false;
      statsRef.current.players[target.id].triggerDied++;
    } else {
      statsRef.current.players[target.id].triggerSurvived++;
    }

    callbacksRef.current.setTriggerResult(result);
    updatePlayerViews();

    schedule(() => {
      const alivePlayers = playersRef.current.filter(player => player.isAlive);
      if (alivePlayers.length <= 1) {
        finishGame(alivePlayers[0]);
        return;
      }

      if (bullet) {
        roundRef.current++;
        gunRef.current = createGun();
        currentTurnIndexRef.current = getNextAliveIndex(targetIndex);
        callbacksRef.current.setRound(roundRef.current);
        startChoosingTurn(`ROUND ${roundRef.current}`);
      } else {
        currentTurnIndexRef.current = targetIndex;
        startChoosingTurn(`${target.name} survived`);
      }
    }, TRIGGER_RESULT_DELAY_MS);
  }, [finishGame, getNextAliveIndex, schedule, startChoosingTurn, updatePlayerViews]);

  const resolveStandoff = useCallback((fromIndex: number) => {
    phaseRef.current = 'trigger';
    callbacksRef.current.setPhase('trigger');

    const results = playersRef.current
      .filter(player => player.isAlive)
      .map(player => {
        const isDead = Math.random() < 1 / TOTAL_CHAMBERS;
        player.shotsFired++;

        if (isDead) {
          player.isAlive = false;
          statsRef.current.players[player.id].triggerDied++;
        } else {
          statsRef.current.players[player.id].triggerSurvived++;
        }

        return { playerId: player.id, alive: !isDead };
      });

    callbacksRef.current.setTriggerResult({
      alive: results.every(result => result.alive),
      playerId: 'STANDOFF',
      playerName: 'STANDOFF',
      bulletCount: 0,
      currentPosition: 0,
      bulletsFired: 0,
      shotsFired: 0,
      results,
    });
    updatePlayerViews();

    schedule(() => {
      const alivePlayers = playersRef.current.filter(player => player.isAlive);
      if (alivePlayers.length <= 1) {
        finishGame(alivePlayers[0]);
        return;
      }

      currentTurnIndexRef.current = getNextAliveIndex(fromIndex);
      startChoosingTurn('STANDOFF resolved');
    }, TRIGGER_RESULT_DELAY_MS);
  }, [finishGame, getNextAliveIndex, schedule, startChoosingTurn, updatePlayerViews]);

  const playCardForCurrentPlayer = useCallback((cardId: string) => {
    if (phaseRef.current !== 'choosing') return;

    const player = playersRef.current[currentTurnIndexRef.current];
    if (!player?.isAlive) return;

    const cardIndex = player.hand.findIndex(card => card.id === cardId);
    if (cardIndex === -1) return;

    const card = player.hand[cardIndex];
    if (!isPlayableCard(card, currentNumberRef.current)) return;

    player.hand.splice(cardIndex, 1);
    player.cardsCount = player.hand.length;
    statsRef.current.players[player.id].cardsPlayed++;

    callbacksRef.current.setPlayedCard(card);

    if (card.type === 'NUMBER') {
      currentNumberRef.current = card.value ?? 0;
    } else if (card.type === 'JOKER') {
      currentNumberRef.current = 0;
    } else if (card.type === 'REVERSE') {
      directionRef.current *= -1;
    }

    updatePlayerViews();

    if (card.type === 'STANDOFF') {
      resolveStandoff(currentTurnIndexRef.current);
      return;
    }

    let nextIndex = currentTurnIndexRef.current;
    if (card.type === 'SKIP') {
      nextIndex = getNextAliveIndex(nextIndex);
      nextIndex = getNextAliveIndex(nextIndex);
    } else {
      nextIndex = getNextAliveIndex(nextIndex);
    }

    currentTurnIndexRef.current = nextIndex;
    startChoosingTurn(`${player.name} played ${card.type === 'NUMBER' ? card.value : card.type}`);
  }, [getNextAliveIndex, resolveStandoff, startChoosingTurn, updatePlayerViews]);

  const useMulliganForCurrentPlayer = useCallback(() => {
    if (phaseRef.current !== 'choosing') return false;

    const player = playersRef.current[currentTurnIndexRef.current];
    if (!player?.isAlive || player.hasUsedMulligan) return false;

    player.hasUsedMulligan = true;
    dealIfNeeded(player, true);
    updatePlayerViews();
    setBotHudMessage({ text: `${player.name} redrew their hand`, color: 'cyan' });
    return true;
  }, [dealIfNeeded, updatePlayerViews]);

  function runBotTurn() {
    if (phaseRef.current !== 'choosing') return;

    const player = playersRef.current[currentTurnIndexRef.current];
    if (!player?.isAlive || player.id === LOCAL_PLAYER_ID) return;

    const chosenCard = chooseBotCard(player.hand, currentNumberRef.current);
    if (chosenCard) {
      playCardForCurrentPlayer(chosenCard.id);
      return;
    }

    if (!player.hasUsedMulligan && useMulliganForCurrentPlayer()) {
      schedule(() => runBotTurn(), BOT_TURN_DELAY_MS);
      return;
    }

    resolveTrigger(currentTurnIndexRef.current);
  }

  const startBotGame = useCallback((count: number, name: string) => {
    clearTimers();

    const safeBotCount = Math.max(1, Math.min(3, count));
    deckRef.current = createDeck();
    gunRef.current = createGun();
    currentNumberRef.current = 0;
    directionRef.current = 1;
    currentTurnIndexRef.current = 0;
    roundRef.current = 1;
    phaseRef.current = 'choosing';

    const players: BotState[] = [
      {
        id: LOCAL_PLAYER_ID,
        name: name || playerName || 'GUEST',
        hand: [],
        isAlive: true,
        cardsCount: 0,
        shotsFired: 0,
        hasUsedMulligan: false,
      },
      ...Array.from({ length: safeBotCount }, (_, index) => ({
        id: `bot-${index + 1}`,
        name: `BOT_${index + 1}`,
        hand: [],
        isAlive: true,
        cardsCount: 0,
        shotsFired: 0,
        hasUsedMulligan: false,
      })),
    ];

    players.forEach(player => dealIfNeeded(player, true));
    playersRef.current = players;
    statsRef.current = createStats(players);

    setBotMode(true);
    setBotCount(safeBotCount);
    setBots(players.filter(player => player.id !== LOCAL_PLAYER_ID));
    setIsSpectating(false);
    setBotHudMessage({ text: 'OFFLINE BOT MATCH', color: 'emerald' });

    callbacksRef.current.setLocalPlayerId(LOCAL_PLAYER_ID);
    callbacksRef.current.setRound(1);
    callbacksRef.current.setPhase('choosing');
    callbacksRef.current.setCurrentTurnId(LOCAL_PLAYER_ID);
    callbacksRef.current.setCurrentNumber(0);
    callbacksRef.current.setDirection(1);
    callbacksRef.current.setTriggerResult(null);
    callbacksRef.current.setPlayedCard(null);
    callbacksRef.current.setWinnerInfo(null);
    callbacksRef.current.setPlayers(players.map(toPlayerView));
    callbacksRef.current.setHandCards(players[0].hand);
    callbacksRef.current.setScreen('game');
  }, [clearTimers, dealIfNeeded, playerName]);

  const handleBotDisconnect = useCallback(() => {
    clearTimers();
    setBotMode(false);
    setBotCount(0);
    setBots([]);
    setBotHudMessage(null);
    setIsSpectating(false);
    playersRef.current = [];
    statsRef.current = { players: {}, totalRounds: 0 };
    callbacksRef.current.setScreen('menu');
    callbacksRef.current.setPlayers([]);
    callbacksRef.current.setHandCards([]);
    callbacksRef.current.setCurrentTurnId('');
    callbacksRef.current.setPlayedCard(null);
    callbacksRef.current.setTriggerResult(null);
    callbacksRef.current.setCurrentNumber(0);
    callbacksRef.current.setDirection(1);
  }, [clearTimers]);

  const handleBotCardChoice = useCallback((cardId: string) => {
    const currentPlayer = playersRef.current[currentTurnIndexRef.current];
    if (currentPlayer?.id !== LOCAL_PLAYER_ID) return;
    playCardForCurrentPlayer(cardId);
  }, [playCardForCurrentPlayer]);

  const handleBotPullTrigger = useCallback(() => {
    const currentPlayer = playersRef.current[currentTurnIndexRef.current];
    if (currentPlayer?.id !== LOCAL_PLAYER_ID) return;
    resolveTrigger(currentTurnIndexRef.current);
  }, [resolveTrigger]);

  const handleBotMulligan = useCallback(() => {
    const currentPlayer = playersRef.current[currentTurnIndexRef.current];
    if (currentPlayer?.id !== LOCAL_PLAYER_ID) return;
    useMulliganForCurrentPlayer();
  }, [useMulliganForCurrentPlayer]);

  const noopSync = useCallback((..._args: unknown[]) => {}, []);

  useEffect(() => clearTimers, [clearTimers]);

  return {
    botMode,
    botCount,
    bots,
    botHudMessage,
    isSpectating,
    startBotGame,
    handleBotDisconnect,
    handleBotCardChoice,
    handleBotPullTrigger,
    handleBotMulligan,
    handleBotModePlayerAnswer: noopSync,
    syncHandCards: noopSync,
    syncPlayers: noopSync,
    syncPhase: noopSync,
    syncCurrentTurn: noopSync,
  };
}
