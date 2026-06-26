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

  const botTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bulletsFiredCountRef = useRef<number>(0);
  const botGunRef = useRef(botGun);
  const gamePhaseRef = useRef<GamePhase>('waiting');
  const currentTurnRef = useRef('');
  const botsRef = useRef<BotState[]>(bots);
  const handCardsRef = useRef<CardData[]>([]);
  const playersRef = useRef<Player[]>([]);

  // Sync refs
  useEffect(() => { botGunRef.current = botGun; }, [botGun]);
  useEffect(() => { botsRef.current = bots; }, [bots]);

  const showHUDAlert = useCallback((text: string, color: string, duration: number) => {
    setBotHudMessage({ text, color });
    setTimeout(() => setBotHudMessage(null), duration);
  }, []);

  const checkBotGameOver = useCallback(() => {
    const aliveBots = botsRef.current.filter(b => b.isAlive);
    const playerAlive = playersRef.current.find(p => p.id === 'local-player')?.isAlive;
    if (aliveBots.length === 0 || (!playerAlive && aliveBots.length <= 1)) {
      const winnerName = aliveBots.length > 0 ? aliveBots[0].name : playerName;
      callbacks.setWinnerInfo({ winner: winnerName, isLocalWinner: aliveBots.length === 0 });
      callbacks.setPhase('game_over');
      if (aliveBots.length === 0) Sounds.victory();
      setTimeout(() => callbacks.setScreen('gameover'), 3000);
      return true;
    }
    return false;
  }, [playerName, callbacks]);

  const scheduleNextTurn = useCallback((nextTurnId: string, delay = 1000) => {
    setTimeout(() => {
      if (checkBotGameOver()) return;

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

      callbacks.setCurrentTurnId(actualNext);
      callbacks.setPhase('choosing');

      const isBotEmpty = actualNext !== 'local-player' && botsRef.current.find(b => b.id === actualNext)?.hand.length === 0;
      const isPlayerEmpty = actualNext === 'local-player' && handCardsRef.current.length === 0;

      if (isBotEmpty || isPlayerEmpty) {
        callbacks.setRound(prev => prev + 1);
        const newGun = createBotGun();
        setBotGun(newGun);
        setBots(prev => {
          const updated = prev.map(b => b.isAlive ? { ...b, hand: [generateBotQuestion(), generateBotQuestion(), generateBotQuestion(), generateBotQuestion()], cardsCount: 4 } : b);
          botsRef.current = updated;
          return updated;
        });
        callbacks.setPlayers(prev => prev.map(p => p.isAlive ? { ...p, cardsCount: 4 } : p));
        if (isPlayerAlive) {
          callbacks.setHandCards([generateBotQuestion(), generateBotQuestion(), generateBotQuestion(), generateBotQuestion()]);
        }
        Sounds.newRound();
        scheduleNextTurn(actualNext, 500);
        return;
      }

      if (actualNext !== 'local-player') {
        setTimeout(() => {
          botPlayCard(actualNext);
        }, 1500);
      }
    }, delay);
  }, [checkBotGameOver, callbacks]);

  const processAnswer = useCallback((targetId: string, answer: string, correctAnswer: string) => {
    if (botTimerRef.current) {
      clearTimeout(botTimerRef.current);
      botTimerRef.current = null;
    }

    const isCorrect = answer === correctAnswer;
    if (isCorrect) {
      Sounds.correct();
    } else {
      Sounds.wrong();
    }

    callbacks.setQuestionResult({ correct: isCorrect, correctAnswer });
    callbacks.setPhase('result');

    setTimeout(() => {
      callbacks.setActiveQuestion(null);
      callbacks.setQuestionResult(null);

      if (isCorrect) {
        scheduleNextTurn(targetId, 500);
      } else {
        executeTrigger(targetId);
      }
    }, 2500);
  }, [scheduleNextTurn, callbacks]);

  const executeTrigger = useCallback((targetId: string) => {
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

      // Update shotsFired on target player
      callbacks.setPlayers(prev => prev.map(p => {
        if (p.id === targetId) {
          return { ...p, shotsFired: (p.shotsFired || 0) + 1 };
        }
        return p;
      }));

      const targetShots = (playersRef.current.find(p => p.id === targetId)?.shotsFired || 0) + 1;

      callbacks.setTriggerResult({
        alive,
        playerId: targetId,
        playerName: targetName,
        bulletCount,
        shotsFired: targetShots,
      });
      callbacks.setPhase('trigger');

      setTimeout(() => {
        callbacks.setTriggerResult(null);

        if (!alive) {
          if (targetId === 'local-player') {
            callbacks.setPlayers(prev => prev.map(p => p.id === 'local-player' ? { ...p, isAlive: false } : p));
            callbacks.setHandCards([]);
          } else {
            setBots(prev => {
              const updated = prev.map(b => b.id === targetId ? { ...b, isAlive: false } : b);
              botsRef.current = updated;
              return updated;
            });
            callbacks.setPlayers(prev => prev.map(p => p.id === targetId ? { ...p, isAlive: false } : p));
          }
        }

        if (checkBotGameOver()) return;

        if (alive) {
          scheduleNextTurn(targetId, 500);
        } else {
          setBotGun(createBotGun());
          const allAlive = playersRef.current.filter(p => p.isAlive && p.id !== targetId);
          if (allAlive.length > 0) {
            scheduleNextTurn(allAlive[0].id, 500);
          }
        }
      }, 3000);
    }, 1200);
  }, [playerName, scheduleNextTurn, checkBotGameOver, showHUDAlert, callbacks]);

  const botPlayCard = useCallback((botId: string) => {
    setBots(prev => {
      const bot = prev.find(b => b.id === botId);
      if (!bot || bot.hand.length === 0) return prev;

      const cardIndex = Math.floor(Math.random() * bot.hand.length);
      const card = bot.hand[cardIndex];
      const newHand = bot.hand.filter((_, i) => i !== cardIndex);

      callbacks.setPlayedCard(card);
      callbacks.setPhase('questioning');

      const isPlayerDead = !playersRef.current.find(p => p.id === 'local-player')?.isAlive;
      const aliveTargets = prev.filter(b => b.isAlive && b.id !== botId);

      let targetId = 'local-player';
      if (isPlayerDead || (aliveTargets.length > 0 && Math.random() > 0.5)) {
        targetId = aliveTargets[Math.floor(Math.random() * aliveTargets.length)]?.id || 'local-player';
      }

      setTimeout(() => {
        if (targetId === 'local-player') {
          callbacks.setActiveQuestion({
            card: { ...card, difficulty: card.difficulty as 'easy' | 'medium' | 'hard', answers: card.answers, correct: card.correct },
            timer: 10,
            from: botId,
          });
          callbacks.setPhase('answering');

          const answerTimer = setTimeout(() => {
            if (gamePhaseRef.current === 'answering') {
              processAnswer('local-player', '', card.correct || 'A');
            }
          }, 10000);
          botTimerRef.current = answerTimer;
        } else {
          const botAnswerDelay = 2000 + Math.random() * 1000;
          const answerTimer = setTimeout(() => {
            if (gamePhaseRef.current === 'questioning') {
              const isCorrect = Math.random() < 0.65;
              const answered = isCorrect ? (card.correct || 'A') : 'X';
              processAnswer(targetId, answered, card.correct || 'A');
            }
          }, botAnswerDelay);
          botTimerRef.current = answerTimer;
        }
      }, 1500);

      return prev.map(b =>
        b.id === botId
          ? { ...b, hand: newHand, cardsCount: newHand.length }
          : b
      );
    });
  }, [processAnswer, callbacks]);

  const handleBotCardChoice = useCallback((cardId: string, phase: GamePhase, currentTurnId: string, handCards: CardData[]) => {
    if (phase !== 'choosing' || currentTurnId !== 'local-player') return;

    const card = handCards.find(c => c.id === cardId);
    if (!card) return;

    Sounds.cardPlay();
    callbacks.setHandCards(prev => prev.filter(c => c.id !== cardId));
    callbacks.setPlayedCard(card);
    callbacks.setPhase('questioning');

    const aliveBots = botsRef.current.filter(b => b.isAlive);
    if (aliveBots.length > 0) {
      const targetBot = aliveBots[Math.floor(Math.random() * aliveBots.length)];

      setTimeout(() => {
        const botAnswerDelay = 2000 + Math.random() * 1000;
        const answerTimer = setTimeout(() => {
          if (gamePhaseRef.current === 'questioning') {
            const isCorrect = Math.random() < 0.65;
            const answered = isCorrect ? (card.correct || 'A') : 'X';
            processAnswer(targetBot.id, answered, card.correct || 'A');
          }
        }, botAnswerDelay);
        botTimerRef.current = answerTimer;
      }, 1500);
    }
  }, [processAnswer, callbacks]);

  const handleBotModePlayerAnswer = useCallback((letter: string, phase: GamePhase, activeQuestion: ActiveQuestion | null) => {
    if (phase !== 'answering' || !activeQuestion) return;
    processAnswer('local-player', letter, activeQuestion.card.correct || 'A');
  }, [processAnswer]);

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
    if (botTimerRef.current) {
      clearTimeout(botTimerRef.current);
    }
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
  }, [callbacks]);

  // Sync handCards and players to refs for bot logic
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
