import React, { useState, useEffect, useRef, useCallback } from 'react';
import { socketClient } from './network/SocketClient';
import { MainMenu } from './components/MainMenu';
import { Lobby } from './components/Lobby';
import { GameBoard } from './components/GameBoard';
import { GameOver } from './components/GameOver';
import { Screen, ConnectionStatus, GamePhase, Player, CardData, ActiveQuestion, QuestionResult, TriggerResult, WinnerInfo } from './types';
import { Sounds } from './audio/Sounds';

const BOT_NAMES = ['CIPHER', 'PHANTOM', 'ROGUE', 'GHOST', 'SHADOW', 'NEXUS', 'VIPER', 'STORM'];

interface BotState {
  id: string;
  name: string;
  hand: CardData[];
  isAlive: boolean;
  cardsCount: number;
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('menu');
  const [playerName, setPlayerName] = useState<string>('GUEST');
  const [roomId, setRoomId] = useState<string>('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [localPlayerId, setLocalPlayerId] = useState<string>('');
  const [gameMode, setGameMode] = useState<string>('online');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const [round, setRound] = useState<number>(1);
  const [phase, setPhase] = useState<GamePhase>('waiting');
  const [currentTurnId, setCurrentTurnId] = useState<string>('');
  const [handCards, setHandCards] = useState<CardData[]>([]);
  const [playedCard, setPlayedCard] = useState<CardData | null>(null);
  const [activeQuestion, setActiveQuestion] = useState<ActiveQuestion | null>(null);
  const [questionResult, setQuestionResult] = useState<QuestionResult | null>(null);
  const [triggerResult, setTriggerResult] = useState<TriggerResult | null>(null);
  const [winnerInfo, setWinnerInfo] = useState<WinnerInfo | null>(null);
  const [botHudMessage, setBotHudMessage] = useState<{ text: string; color: string } | null>(null);

  const [botMode, setBotMode] = useState<boolean>(false);
  const [botCount, setBotCount] = useState<number>(1);
  const [bots, setBots] = useState<BotState[]>([]);
  const botTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gamePhaseRef = useRef<GamePhase>(phase);
  const currentTurnRef = useRef<string>(currentTurnId);
  const botsRef = useRef<BotState[]>(bots);
  const handCardsRef = useRef<CardData[]>(handCards);
  useEffect(() => {
    handCardsRef.current = handCards;
  }, [handCards]);

  useEffect(() => {
    gamePhaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    currentTurnRef.current = currentTurnId;
  }, [currentTurnId]);

  useEffect(() => {
    botsRef.current = bots;
  }, [bots]);

  const connectToServer = (mode: string, name: string, ip?: string) => {
    setPlayerName(name);
    setGameMode(mode);
    setConnectionStatus('connecting');
    setErrorMsg('');

    const baseHost = window.location.hostname || 'localhost';
    const serverUrl = (mode === 'lan' && ip) ? `http://${ip}` : `http://${baseHost}:3000`;

    socketClient.connect(serverUrl)
      .then(() => {
        setConnectionStatus('connected');
        setScreen('lobby');
      })
      .catch((err: Error) => {
        setConnectionStatus('disconnected');
        setErrorMsg('SERVER LINK TIMEOUT. RETRY CONNECTION.');
        console.error(err);
      });
  };

  const handleDisconnect = () => {
    socketClient.disconnect();
    setConnectionStatus('disconnected');
    setScreen('menu');
    setRoomId('');
    setPlayers([]);
    setLocalPlayerId('');
    setHandCards([]);
    setPlayedCard(null);
    setActiveQuestion(null);
    setQuestionResult(null);
    setTriggerResult(null);
  };

  const handleLeaveAfterDeath = () => {
    if (botMode) {
      handleBotDisconnect();
    } else {
      socketClient.leaveAfterDeath(roomId);
      handleDisconnect();
    }
  };

  const handleBotDisconnect = () => {
    if (botTimerRef.current) {
      clearTimeout(botTimerRef.current);
    }
    setBotMode(false);
    setBots([]);
    setScreen('menu');
    setPhase('waiting');
    setHandCards([]);
    setPlayedCard(null);
    setActiveQuestion(null);
    setQuestionResult(null);
    setTriggerResult(null);
    setRound(1);
  };

  const generateBotQuestion = useCallback((): CardData => {
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
  }, []);

  const startBotGame = useCallback((count: number) => {
    setBotMode(true);
    setBotCount(count);
    setLocalPlayerId('local-player');
    setGameMode('bot');

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
    setPlayers(allPlayers);
    setScreen('game');
    setRound(1);
    setPhase('waiting');

    setTimeout(() => {
      dealBotCards(count);
    }, 1000);
  }, [playerName]);

  const dealBotCards = useCallback((count: number) => {
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

    const localHand: CardData[] = [];
    for (let j = 0; j < 4; j++) {
      localHand.push(generateBotQuestion());
    }
    setHandCards(localHand);
    setPhase('choosing');
    setCurrentTurnId('local-player');
    Sounds.newRound();
  }, [generateBotQuestion]);

  function checkBotGameOver() {
    let aliveBots = botsRef.current.filter(b => b.isAlive);
    const playerAlive = players.find(p => p.id === 'local-player')?.isAlive;
    if (aliveBots.length === 0 || (!playerAlive && aliveBots.length <= 1)) {
      const winnerName = aliveBots.length > 0 ? aliveBots[0].name : playerName;
      setWinnerInfo({ winner: winnerName, isLocalWinner: aliveBots.length === 0 });
      setPhase('game_over');
      if (aliveBots.length === 0) Sounds.victory();
      setTimeout(() => setScreen('gameover'), 3000);
      return true;
    }
    return false;
  }

  const showHUDAlert = (text: string, color: string, duration: number) => {
    setBotHudMessage({ text, color });
    setTimeout(() => setBotHudMessage(null), duration);
  };

  const scheduleNextTurn = useCallback((nextTurnId: string, delay = 1000) => {
    setTimeout(() => {
      if (checkBotGameOver()) return;

      const aliveBots = botsRef.current.filter(b => b.isAlive);
      const isPlayerAlive = players.find(p => p.id === 'local-player')?.isAlive;
      
      const allAliveIds = [];
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

      setCurrentTurnId(actualNext);
      setPhase('choosing');

      const isBotEmpty = actualNext !== 'local-player' && botsRef.current.find(b => b.id === actualNext)?.hand.length === 0;
      const isPlayerEmpty = actualNext === 'local-player' && handCardsRef.current.length === 0;

      if (isBotEmpty || isPlayerEmpty) {
        setRound(prev => prev + 1);
        setBots(prev => {
          const updated = prev.map(b => b.isAlive ? { ...b, hand: [generateBotQuestion(), generateBotQuestion(), generateBotQuestion(), generateBotQuestion()], cardsCount: 4 } : b);
          botsRef.current = updated;
          return updated;
        });
        setPlayers(prev => prev.map(p => p.isAlive ? { ...p, cardsCount: 4 } : p));
        if (isPlayerAlive) {
          setHandCards([generateBotQuestion(), generateBotQuestion(), generateBotQuestion(), generateBotQuestion()]);
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
  }, [players, generateBotQuestion]);

  const executeTrigger = useCallback((targetId: string) => {
    const bulletInChamber = Math.random() < 0.167;
    const alive = !bulletInChamber;
    
    let targetName = playerName;
    if (targetId !== 'local-player') {
      targetName = botsRef.current.find(b => b.id === targetId)?.name || 'BOT';
    }

    Sounds.gunClick();

    setTimeout(() => {
      if (alive) {
        Sounds.gunSurvive();
        showHUDAlert(`${targetName} // COCK SURVIVED`, 'text-amber-400', 2000);
      } else {
        Sounds.gunFire();
        showHUDAlert(`${targetName} // TERMINATED`, 'text-red-500', 3000);
      }

      setTriggerResult({
        alive,
        playerId: targetId,
        playerName: targetName,
        bulletCount: bulletInChamber ? 0 : 1,
      });
      setPhase('trigger');

      setTimeout(() => {
        setTriggerResult(null);

        if (!alive) {
          if (targetId === 'local-player') {
            setPlayers(prev => prev.map(p => p.id === 'local-player' ? { ...p, isAlive: false } : p));
            setHandCards([]);
          } else {
            setBots(prev => {
              const updated = prev.map(b => b.id === targetId ? { ...b, isAlive: false } : b);
              botsRef.current = updated;
              return updated;
            });
            setPlayers(prev => prev.map(p => p.id === targetId ? { ...p, isAlive: false } : p));
          }
        }
        
        if (checkBotGameOver()) return;

        if (alive) {
          scheduleNextTurn(targetId, 500);
        } else {
          // Find next player
          const allAlive = players.filter(p => p.isAlive && p.id !== targetId);
          if (allAlive.length > 0) {
            scheduleNextTurn(allAlive[0].id, 500);
          }
        }
      }, 3000);
    }, 1200);
  }, [players, scheduleNextTurn, playerName]);

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
    
    setQuestionResult({ correct: isCorrect, correctAnswer });
    setPhase('result');

    setTimeout(() => {
      setActiveQuestion(null);
      setQuestionResult(null);

      if (isCorrect) {
        scheduleNextTurn(targetId, 500);
      } else {
        executeTrigger(targetId);
      }
    }, 2500);
  }, [scheduleNextTurn, executeTrigger]);

  const botPlayCard = useCallback((botId: string) => {
    setBots(prev => {
      const bot = prev.find(b => b.id === botId);
      if (!bot || bot.hand.length === 0) return prev;

      const cardIndex = Math.floor(Math.random() * bot.hand.length);
      const card = bot.hand[cardIndex];
      const newHand = bot.hand.filter((_, i) => i !== cardIndex);

      setPlayedCard(card);
      setPhase('questioning');

      const isPlayerDead = !players.find(p => p.id === 'local-player')?.isAlive;
      const aliveTargets = prev.filter(b => b.isAlive && b.id !== botId);
      
      let targetId = 'local-player';
      if (isPlayerDead || (aliveTargets.length > 0 && Math.random() > 0.5)) {
        targetId = aliveTargets[Math.floor(Math.random() * aliveTargets.length)]?.id || 'local-player';
      }

      setTimeout(() => {
        if (targetId === 'local-player') {
          setActiveQuestion({
            card: { ...card, answers: card.answers || { A: 'Option A', B: 'Option B', C: 'Option C', D: 'Option D' }, correct: card.correct || 'A' } as any,
            timer: 10,
            from: botId,
          });
          setPhase('answering');

          // Wait for local player to answer via handleBotModePlayerAnswer
          // Auto answer if timer runs out (10s)
          const answerTimer = setTimeout(() => {
            if (gamePhaseRef.current === 'answering') {
              processAnswer('local-player', '', card.correct || 'A'); // Empty answer = wrong
            }
          }, 10000);
          botTimerRef.current = answerTimer;
        } else {
          // Bot answers Bot
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
  }, [players, processAnswer]);

  const handleBotCardChoice = useCallback((cardId: string) => {
    if (phase !== 'choosing' || currentTurnId !== 'local-player') return;

    const card = handCards.find(c => c.id === cardId);
    if (!card) return;

    Sounds.cardPlay();
    setHandCards(prev => prev.filter(c => c.id !== cardId));
    setPlayedCard(card);
    setPhase('questioning');

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
  }, [phase, currentTurnId, handCards, processAnswer]);

  const handleBotModePlayerAnswer = useCallback((letter: string) => {
    if (phase !== 'answering' || !activeQuestion) return;
    processAnswer('local-player', letter, activeQuestion.card.correct || 'A');
  }, [phase, activeQuestion, processAnswer]);

  useEffect(() => {
    socketClient.on('room:created', (data: { roomId: string; playerId: string }) => {
      setRoomId(data.roomId);
      setLocalPlayerId(data.playerId);
      setErrorMsg('');
    });

    socketClient.on('room:joined', (data: { roomId: string; playerId: string }) => {
      setRoomId(data.roomId);
      setLocalPlayerId(data.playerId);
      setErrorMsg('');
    });

    socketClient.on('room:players', (data: { players: Player[] }) => {
      setPlayers(data.players);
    });

    socketClient.on('room:left', () => {
      setRoomId('');
      setLocalPlayerId('');
      setPlayers([]);
    });

    socketClient.on('game:start', (data: { players: Player[]; round: number }) => {
      setPlayers(data.players);
      setRound(data.round || 1);
      setPhase('waiting');
      setPlayedCard(null);
      setActiveQuestion(null);
      setQuestionResult(null);
      setTriggerResult(null);
      setScreen('game');
    });

    socketClient.on('game:deal', (data: { cards: CardData[] }) => {
      setHandCards(data.cards);
      setPhase('choosing');
    });

    socketClient.on('game:turn', (data: { playerId: string }) => {
      setCurrentTurnId(data.playerId);
      setPhase('choosing');
      setPlayedCard(null);
    });

    socketClient.on('game:cardPlayed', (data: { playerId: string; card: CardData }) => {
      setPlayedCard(data.card);
      setPhase('questioning');
      
      setPlayers(prev => prev.map(p => {
        if (p.id === data.playerId) {
          return { ...p, cardsCount: (p.cardsCount || 4) - 1 };
        }
        return p;
      }));
    });

    socketClient.on('game:question', (data: { card: any; timer: number; from: string }) => {
      setActiveQuestion({
        card: data.card,
        timer: data.timer,
        from: data.from
      });
      setPhase('answering');
    });

    socketClient.on('game:result', (data: { correct: boolean; correctAnswer: string }) => {
      if (data.correct) {
        Sounds.correct();
      } else {
        Sounds.wrong();
      }
      setQuestionResult({
        correct: data.correct,
        correctAnswer: data.correctAnswer
      });
      setPhase('result');
      
      setTimeout(() => {
        setActiveQuestion(null);
        setQuestionResult(null);
      }, 2500);
    });

    socketClient.on('game:trigger', (data: TriggerResult) => {
      setPhase('trigger');
      setTriggerResult({
        alive: data.alive,
        playerId: data.playerId,
        playerName: data.playerName,
        bulletCount: data.bulletCount
      });

      if (!data.alive && data.playerId) {
        setPlayers(prev => prev.map(p => {
          if (p.id === data.playerId) {
            return { ...p, isAlive: false };
          }
          return p;
        }));
      }

      setTimeout(() => {
        setTriggerResult(null);
      }, 5000);
    });

    socketClient.on('game:newRound', (data: { round: number }) => {
      Sounds.newRound();
      setRound(data.round);
    });

    socketClient.on('game:over', (data: { winner: string }) => {
      const isLocal = data.winner === playerName;
      if (isLocal) {
        Sounds.victory();
      }
      setWinnerInfo({
        winner: data.winner,
        isLocalWinner: isLocal
      });
      setPhase('game_over');
      
      setTimeout(() => {
        setScreen('gameover');
      }, 3000);
    });

    socketClient.on('game:playerLeft', () => {
      setErrorMsg('OPPONENT DISCONNECTED FROM SYSTEM.');
      setTimeout(() => {
        handleDisconnect();
      }, 3000);
    });

    socketClient.on('game:playerLeftAfterDeath', (data: { playerId: string }) => {
      setPlayers(prev => prev.filter(p => p.id !== data.playerId));
    });

    socketClient.on('game:cardsUpdate', (data: { players: { id: string; cardsCount: number; isAlive: boolean }[] }) => {
      setPlayers(prev => prev.map(p => {
        const update = data.players.find((u: any) => u.id === p.id);
        if (update) {
          return { ...p, cardsCount: update.cardsCount, isAlive: update.isAlive };
        }
        return p;
      }));
    });

    socketClient.on('error', (data: { message: string }) => {
      setErrorMsg('EXCEPTION // ' + data.message.toUpperCase());
    });

    return () => {
      ['room:created', 'room:joined', 'room:players', 'room:left', 'game:start', 'game:deal', 'game:turn', 'game:cardPlayed', 'game:question', 'game:result', 'game:trigger', 'game:newRound', 'game:over', 'game:playerLeft', 'game:playerLeftAfterDeath', 'game:cardsUpdate', 'error'].forEach(event => {
        socketClient.clearListeners(event);
      });
    };
  }, [playerName, localPlayerId]);

  return (
    <main className="w-screen h-screen tech-grid overflow-hidden relative flex items-center justify-center">
      {screen === 'menu' && (
        <MainMenu 
          connect={connectToServer} 
          startBot={startBotGame}
          error={errorMsg} 
          status={connectionStatus} 
        />
      )}
      {screen === 'lobby' && (
        <Lobby 
          roomId={roomId}
          players={players}
          localId={localPlayerId}
          error={errorMsg}
          disconnect={handleDisconnect}
        />
      )}
      {screen === 'game' && (
        <GameBoard 
          round={round}
          phase={phase}
          players={players}
          localId={localPlayerId}
          currentTurnId={currentTurnId}
          handCards={handCards}
          playedCard={playedCard}
          activeQuestion={activeQuestion}
          questionResult={questionResult}
          triggerResult={triggerResult}
          roomId={roomId}
          onLeaveAfterDeath={handleLeaveAfterDeath}
          onCardChoice={botMode ? handleBotCardChoice : undefined}
          botHudMessage={botMode ? botHudMessage : null}
        />
      )}
      {screen === 'gameover' && (
        <GameOver 
          winnerInfo={winnerInfo}
          disconnect={handleDisconnect}
        />
      )}
    </main>
  );
}
