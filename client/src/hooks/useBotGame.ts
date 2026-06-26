import { useState, useEffect, useRef, useCallback } from 'react';
import { GamePhase, Player, CardData, ActiveQuestion, QuestionResult, TriggerResult, WinnerInfo } from '../types';
import { Sounds } from '../audio/Sounds';

const BOT_NAMES = ['CIPHER', 'PHANTOM', 'ROGUE', 'GHOST', 'SHADOW', 'NEXUS', 'VIPER', 'STORM'];

export interface BotState {
  id: string;
  name: string;
  hand: CardData[];
  isAlive: boolean;
  cardsCount: number;
}

interface BotGameCallbacks {
  setScreen: (screen: 'menu' | 'lobby' | 'game' | 'gameover') => void;
  setRound: (v: number | ((prev: number) => number)) => void;
  setPhase: (v: GamePhase) => void;
  setCurrentTurnId: (v: string) => void;
  setHandCards: (v: CardData[] | ((prev: CardData[]) => CardData[])) => void;
  setPlayedCard: (v: CardData | null) => void;
  setActiveQuestion: (v: ActiveQuestion | null) => void;
  setQuestionResult: (v: QuestionResult | null) => void;
  setTriggerResult: (v: TriggerResult | null) => void;
  setPlayers: (v: Player[] | ((prev: Player[]) => Player[])) => void;
  setWinnerInfo: (v: WinnerInfo | null) => void;
}

function generateBotQuestion(): CardData {
  const topics = ['Science', 'History', 'Geography', 'Pop Culture', 'Technology', 'Sports'];
  const difficulties: Array<'easy' | 'medium' | 'hard'> = ['easy', 'medium', 'hard'];
  const questions = [
    { q: 'What is the chemical symbol for gold?', a: { A: 'Au', B: 'Ag', C: 'Fe', D: 'Cu' }, c: 'A' },
    { q: 'In which year did World War II end?', a: { A: '1943', B: '1944', C: '1945', D: '1946' }, c: 'C' },
    { q: 'What is the capital of Japan?', a: { A: 'Seoul', B: 'Tokyo', C: 'Beijing', D: 'Bangkok' }, c: 'B' },
    { q: 'Who painted the Mona Lisa?', a: { A: 'Picasso', B: 'Van Gogh', C: 'Da Vinci', D: 'Monet' }, c: 'C' },
    { q: 'What planet is known as the Red Planet?', a: { A: 'Venus', B: 'Jupiter', C: 'Mars', D: 'Saturn' }, c: 'C' },
    { q: 'What is the largest ocean on Earth?', a: { A: 'Atlantic', B: 'Indian', C: 'Arctic', D: 'Pacific' }, c: 'D' },
    { q: 'Which element has atomic number 1?', a: { A: 'Helium', B: 'Oxygen', C: 'Hydrogen', D: 'Carbon' }, c: 'C' },
    { q: 'What year was the first iPhone released?', a: { A: '2005', B: '2006', C: '2007', D: '2008' }, c: 'C' },
    { q: 'What is the speed of light?', a: { A: '300,000 km/s', B: '150,000 km/s', C: '450,000 km/s', D: '600,000 km/s' }, c: 'A' },
    { q: 'Who wrote Romeo and Juliet?', a: { A: 'Dickens', B: 'Shakespeare', C: 'Austen', D: 'Twain' }, c: 'B' },
  ];
  const q = questions[Math.floor(Math.random() * questions.length)];
  return {
    id: `bot-q-${Date.now()}-${Math.random()}`,
    topic: topics[Math.floor(Math.random() * topics.length)],
    difficulty: difficulties[Math.floor(Math.random() * difficulties.length)],
    question: q.q,
    answers: q.a,
    correct: q.c,
  };
}

function createBotGun() {
  const chambers = Array(6).fill(false);
  chambers[Math.floor(Math.random() * 6)] = true;
  return { chambers, currentPosition: 0, bulletsFired: 0 };
}

export function useBotGame(playerName: string, callbacks: BotGameCallbacks) {
  const [botMode, setBotMode] = useState(false);
  const [botCount, setBotCount] = useState(1);
  const [bots, setBots] = useState<BotState[]>([]);
  const [botHudMessage, setBotHudMessage] = useState<{ text: string; color: string } | null>(null);
  const [botGun, setBotGun] = useState(createBotGun);
  const [isSpectating, setIsSpectating] = useState(false);

  const botTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bulletsFiredCountRef = useRef<number>(0);
  const botGunRef = useRef(botGun);
  const gamePhaseRef = useRef<GamePhase>('waiting');
  const currentTurnRef = useRef('');
  const botsRef = useRef<BotState[]>(bots);
  const handCardsRef = useRef<CardData[]>([]);
  const playersRef = useRef<Player[]>([]);
  const callbacksRef = useRef(callbacks);

  // Sync refs
  useEffect(() => { botGunRef.current = botGun; }, [botGun]);
  useEffect(() => { botsRef.current = bots; }, [bots]);
  useEffect(() => { callbacksRef.current = callbacks; }, [callbacks]);

  const clearAllTimers = useCallback(() => {
    if (botTimerRef.current) {
      clearTimeout(botTimerRef.current);
      botTimerRef.current = null;
    }
    if (safetyTimerRef.current) {
      clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = null;
    }
  }, []);

  const showHUDAlert = useCallback((text: string, color: string, duration: number) => {
    setBotHudMessage({ text, color });
    setTimeout(() => setBotHudMessage(null), duration);
  }, []);

  // Fixed order: local-player → bot-0 → bot-1 → bot-2 → (loop)
  const getAliveOrder = useCallback((): string[] => {
    const allIds = ['local-player', ...botsRef.current.map(b => b.id)];
    return allIds.filter(id => {
      if (id === 'local-player') {
        return playersRef.current.find(p => p.id === 'local-player')?.isAlive;
      }
      return botsRef.current.find(b => b.id === id)?.isAlive;
    });
  }, []);

  const getNextAliveTarget = useCallback((afterId: string): string => {
    const alive = getAliveOrder();
    if (alive.length === 0) return 'local-player';
    const idx = alive.indexOf(afterId);
    if (idx === -1) return alive[0];
    return alive[(idx + 1) % alive.length];
  }, [getAliveOrder]);

  const checkBotGameOver = useCallback(() => {
    const cb = callbacksRef.current;
    const aliveBots = botsRef.current.filter(b => b.isAlive);
    const playerAlive = playersRef.current.find(p => p.id === 'local-player')?.isAlive;
    if (aliveBots.length === 0 || (!playerAlive && aliveBots.length <= 1)) {
      const winnerName = aliveBots.length > 0 ? aliveBots[0].name : playerName;
      cb.setWinnerInfo({ winner: winnerName, isLocalWinner: aliveBots.length === 0 });
      cb.setPhase('game_over');
      if (aliveBots.length === 0) Sounds.victory();
      setTimeout(() => cb.setScreen('gameover'), 3000);
      return true;
    }
    return false;
  }, [playerName]);

  const scheduleNextTurnRef = useRef<(nextTurnId: string, delay?: number) => void>(() => {});
  const processAnswerRef = useRef<(targetId: string, answer: string, correctAnswer: string) => void>(() => {});
  const executeTriggerRef = useRef<(targetId: string) => void>(() => {});
  const botPlayCardRef = useRef<(botId: string) => void>(() => {});

  useEffect(() => {
    const scheduleNextTurnFn = (nextTurnId: string, delay = 1000) => {
      setTimeout(() => {
        setIsSpectating(false);
        if (checkBotGameOver()) return;

        const cb = callbacksRef.current;
        const aliveBots = botsRef.current.filter(b => b.isAlive);
        const isPlayerAlive = playersRef.current.find(p => p.id === 'local-player')?.isAlive;

        const allAliveIds: string[] = [];
        if (isPlayerAlive) allAliveIds.push('local-player');
        aliveBots.forEach(b => allAliveIds.push(b.id));

        if (allAliveIds.length <= 1) {
          checkBotGameOver();
          return;
        }

        let actualNext = nextTurnId;
        if (!allAliveIds.includes(actualNext)) {
          actualNext = allAliveIds[0];
        }

        cb.setCurrentTurnId(actualNext);
        cb.setPhase('choosing');

        const isBotEmpty = actualNext !== 'local-player' && botsRef.current.find(b => b.id === actualNext)?.hand.length === 0;
        const isPlayerEmpty = actualNext === 'local-player' && handCardsRef.current.length === 0;

        if (isBotEmpty || isPlayerEmpty) {
          cb.setRound(prev => prev + 1);
          bulletsFiredCountRef.current = 0;
          setBotGun(createBotGun());
          setBots(prev => {
            const updated = prev.map(b => b.isAlive ? { ...b, hand: [generateBotQuestion(), generateBotQuestion(), generateBotQuestion(), generateBotQuestion()], cardsCount: 4 } : b);
            botsRef.current = updated;
            return updated;
          });
          cb.setPlayers(prev => prev.map(p => p.isAlive ? { ...p, cardsCount: 4 } : p));
          if (isPlayerAlive) {
            const newHand = [generateBotQuestion(), generateBotQuestion(), generateBotQuestion(), generateBotQuestion()];
            handCardsRef.current = newHand;
            cb.setHandCards(newHand);
          }
          Sounds.newRound();
          scheduleNextTurnRef.current(actualNext, 500);
          return;
        }

        if (actualNext !== 'local-player') {
          setTimeout(() => {
            botPlayCardRef.current(actualNext);
          }, 1500);
        }
      }, delay);
    };

    const processAnswerFn = (targetId: string, answer: string, correctAnswer: string) => {
      clearAllTimers();

      const cb = callbacksRef.current;
      const isCorrect = answer === correctAnswer;
      if (isCorrect) {
        Sounds.correct();
      } else {
        Sounds.wrong();
      }

      cb.setQuestionResult({ correct: isCorrect, correctAnswer });
      cb.setPhase('result');

      setTimeout(() => {
        cb.setActiveQuestion(null);
        cb.setQuestionResult(null);

        if (isCorrect) {
          scheduleNextTurnRef.current(targetId, 500);
        } else {
          executeTriggerRef.current(targetId);
        }
      }, 2500);
    };

    const executeTriggerFn = (targetId: string) => {
      clearAllTimers();

      const cb = callbacksRef.current;
      const gun = botGunRef.current;
      const bulletInChamber = gun.chambers[gun.currentPosition];
      const alive = !bulletInChamber;

      let targetName = playerName;
      if (targetId !== 'local-player') {
        targetName = botsRef.current.find(b => b.id === targetId)?.name || 'BOT';
      }

      bulletsFiredCountRef.current++;
      const bulletCount = 6 - bulletsFiredCountRef.current;

      Sounds.gunClick();

      setTimeout(() => {
        if (alive) {
          Sounds.gunSurvive();
          showHUDAlert(`${targetName} // COCK SURVIVED`, 'text-amber-400', 2000);
        } else {
          Sounds.gunFire();
          showHUDAlert(`${targetName} // TERMINATED`, 'text-red-500', 3000);
        }

        cb.setPlayers(prev => prev.map(p => {
          if (p.id === targetId) {
            return { ...p, shotsFired: (p.shotsFired || 0) + 1 };
          }
          return p;
        }));

        const targetShots = (playersRef.current.find(p => p.id === targetId)?.shotsFired || 0) + 1;

        cb.setTriggerResult({
          alive,
          playerId: targetId,
          playerName: targetName,
          bulletCount,
          shotsFired: targetShots,
        });
        cb.setPhase('trigger');

        setTimeout(() => {
          cb.setTriggerResult(null);

          if (!alive) {
            if (targetId === 'local-player') {
              cb.setPlayers(prev => prev.map(p => p.id === 'local-player' ? { ...p, isAlive: false } : p));
              cb.setHandCards([]);
            } else {
              setBots(prev => {
                const updated = prev.map(b => b.id === targetId ? { ...b, isAlive: false } : b);
                botsRef.current = updated;
                return updated;
              });
              cb.setPlayers(prev => prev.map(p => p.id === targetId ? { ...p, isAlive: false } : p));
            }
          }

          if (checkBotGameOver()) return;

          if (alive) {
            scheduleNextTurnRef.current(targetId, 500);
          } else {
            bulletsFiredCountRef.current = 0;
            setBotGun(createBotGun());
            const isLocalAlive = playersRef.current.find(p => p.id === 'local-player')?.isAlive;
            const aliveBots = botsRef.current.filter(b => b.isAlive);
            const nextId = isLocalAlive ? 'local-player' : (aliveBots[0]?.id || 'local-player');
            scheduleNextTurnRef.current(nextId, 500);
          }
        }, 3000);
      }, 1200);
    };

    const botPlayCardFn = (botId: string) => {
      clearAllTimers();

      const bot = botsRef.current.find(b => b.id === botId);
      if (!bot || bot.hand.length === 0) return;

      const cardIndex = Math.floor(Math.random() * bot.hand.length);
      const card = bot.hand[cardIndex];
      const newHand = bot.hand.filter((_, i) => i !== cardIndex);

      setBots(prev => {
        const updated = prev.map(b =>
          b.id === botId
            ? { ...b, hand: newHand, cardsCount: newHand.length }
            : b
        );
        botsRef.current = updated;
        return updated;
      });

      const cb = callbacksRef.current;
      cb.setPlayedCard(card);

      const targetId = getNextAliveTarget(botId);
      const isTargetBot = targetId !== 'local-player';
      const targetName = isTargetBot
        ? botsRef.current.find(b => b.id === targetId)?.name || 'BOT'
        : playerName;

      setTimeout(() => {
        cb.setActiveQuestion({
          card: { ...card, difficulty: card.difficulty as 'easy' | 'medium' | 'hard', answers: card.answers, correct: card.correct },
          timer: 10,
          from: botId,
        });
        cb.setPhase('answering');

        if (!isTargetBot) {
          const answerTimer = setTimeout(() => {
            if (gamePhaseRef.current === 'answering') {
              processAnswerRef.current('local-player', '', card.correct || 'A');
            }
          }, 10000);
          botTimerRef.current = answerTimer;
        } else {
          setIsSpectating(true);
          showHUDAlert(`${targetName} // DECRYPTING CHALLENGE`, 'text-cyan-theme', 2000);
          const botAnswerDelay = 2500 + Math.random() * 1500;
          const answerTimer = setTimeout(() => {
            const isCorrect = Math.random() < 0.65;
            const answered = isCorrect ? (card.correct || 'A') : 'X';
            processAnswerRef.current(targetId, answered, card.correct || 'A');
          }, botAnswerDelay);
          botTimerRef.current = answerTimer;

          const safetyTimeout = setTimeout(() => {
            if (gamePhaseRef.current === 'answering') {
              processAnswerRef.current(targetId, 'X', card.correct || 'A');
            }
          }, 8000);
          safetyTimerRef.current = safetyTimeout;
        }
      }, 1500);
    };

    scheduleNextTurnRef.current = scheduleNextTurnFn;
    processAnswerRef.current = processAnswerFn;
    executeTriggerRef.current = executeTriggerFn;
    botPlayCardRef.current = botPlayCardFn;
  }, [checkBotGameOver, clearAllTimers, showHUDAlert, playerName, getNextAliveTarget]);

  const handleBotCardChoice = useCallback((cardId: string, phase: GamePhase, currentTurnId: string, handCards: CardData[]) => {
    if (phase !== 'choosing' || currentTurnId !== 'local-player') return;

    const card = handCards.find(c => c.id === cardId);
    if (!card) return;

    clearAllTimers();

    Sounds.cardPlay();
    callbacks.setHandCards(prev => prev.filter(c => c.id !== cardId));
    callbacks.setPlayedCard(card);

    const targetId = getNextAliveTarget('local-player');
    const targetName = targetId === 'local-player'
      ? playerName
      : botsRef.current.find(b => b.id === targetId)?.name || 'BOT';

    callbacks.setActiveQuestion({
      card: { ...card, difficulty: card.difficulty as 'easy' | 'medium' | 'hard', answers: card.answers, correct: card.correct },
      timer: 10,
      from: 'local-player',
    });
    callbacks.setPhase('answering');
    setIsSpectating(true);
    showHUDAlert(`${targetName} // DECRYPTING CHALLENGE`, 'text-cyan-theme', 2000);

    const isTargetBot = targetId !== 'local-player';

    if (isTargetBot) {
      const botAnswerDelay = 2500 + Math.random() * 1500;
      const answerTimer = setTimeout(() => {
        const isCorrect = Math.random() < 0.65;
        const answered = isCorrect ? (card.correct || 'A') : 'X';
        processAnswerRef.current(targetId, answered, card.correct || 'A');
      }, botAnswerDelay);
      botTimerRef.current = answerTimer;

      const safetyTimeout = setTimeout(() => {
        if (gamePhaseRef.current === 'answering') {
          processAnswerRef.current(targetId, 'X', card.correct || 'A');
        }
      }, 8000);
      safetyTimerRef.current = safetyTimeout;
    } else {
      const answerTimer = setTimeout(() => {
        if (gamePhaseRef.current === 'answering') {
          processAnswerRef.current('local-player', '', card.correct || 'A');
        }
      }, 10000);
      botTimerRef.current = answerTimer;
    }
  }, [callbacks, showHUDAlert, clearAllTimers, getNextAliveTarget, playerName]);

  const handleBotModePlayerAnswer = useCallback((letter: string, phase: GamePhase, activeQuestion: ActiveQuestion | null) => {
    if (phase !== 'answering' || !activeQuestion) return;
    processAnswerRef.current('local-player', letter, activeQuestion.card.correct || 'A');
  }, []);

  const startBotGame = useCallback((count: number) => {
    setBotMode(true);
    setBotCount(count);

    const botPlayers: BotState[] = [];
    for (let i = 0; i < count; i++) {
      botPlayers.push({
        id: `bot-${i}`,
        name: BOT_NAMES[i % BOT_NAMES.length],
        hand: [],
        isAlive: true,
        cardsCount: 4,
      });
    }
    setBots(botPlayers);

    const allPlayers: Player[] = [
      { id: 'local-player', name: playerName, cardsCount: 4, isAlive: true },
      ...botPlayers.map(b => ({ id: b.id, name: b.name, cardsCount: 4, isAlive: true })),
    ];
    callbacks.setPlayers(allPlayers);
    callbacks.setScreen('game');
    callbacks.setRound(1);
    bulletsFiredCountRef.current = 0;
    setBotGun(createBotGun());
    callbacks.setPhase('waiting');

    setTimeout(() => {
      const newBots: BotState[] = [];
      for (let i = 0; i < count; i++) {
        const hand: CardData[] = [];
        for (let j = 0; j < 4; j++) {
          hand.push(generateBotQuestion());
        }
        newBots.push({
          id: `bot-${i}`,
          name: BOT_NAMES[i % BOT_NAMES.length],
          hand,
          isAlive: true,
          cardsCount: 4,
        });
      }
      setBots(newBots);
      botsRef.current = newBots;

      const localHand: CardData[] = [];
      for (let j = 0; j < 4; j++) {
        localHand.push(generateBotQuestion());
      }
      handCardsRef.current = localHand;
      callbacks.setHandCards(localHand);
      callbacks.setPhase('choosing');
      callbacks.setCurrentTurnId('local-player');
      Sounds.newRound();
    }, 1000);
  }, [playerName, callbacks]);

  const handleBotDisconnect = useCallback(() => {
    clearAllTimers();
    setBotMode(false);
    setBots([]);
    callbacks.setScreen('menu');
    callbacks.setPhase('waiting');
    callbacks.setHandCards([]);
    callbacks.setPlayedCard(null);
    callbacks.setActiveQuestion(null);
    callbacks.setQuestionResult(null);
    callbacks.setTriggerResult(null);
    callbacks.setRound(1);
  }, [callbacks, clearAllTimers]);

  const syncHandCards = useCallback((cards: CardData[]) => {
    handCardsRef.current = cards;
  }, []);

  const syncPlayers = useCallback((players: Player[]) => {
    playersRef.current = players;
  }, []);

  const syncPhase = useCallback((phase: GamePhase) => {
    gamePhaseRef.current = phase;
  }, []);

  const syncCurrentTurn = useCallback((turnId: string) => {
    currentTurnRef.current = turnId;
  }, []);

  return {
    botMode,
    botCount,
    bots,
    botHudMessage,
    isSpectating,
    startBotGame,
    handleBotDisconnect,
    handleBotCardChoice,
    handleBotModePlayerAnswer,
    syncHandCards,
    syncPlayers,
    syncPhase,
    syncCurrentTurn,
  };
}
