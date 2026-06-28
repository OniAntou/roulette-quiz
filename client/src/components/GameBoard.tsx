import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { socketClient } from '../network/SocketClient';
import { Revolver } from './Revolver';
import { ThemeToggle } from './ThemeToggle';
import { Check, X, ShieldWarning, ArrowLeft, SpeakerSimpleX, SpeakerHigh } from '@phosphor-icons/react';
import { GamePhase, Player, CardData, ActiveQuestion, QuestionResult, TriggerResult } from '../types';
import { Sounds } from '../audio/Sounds';

interface GameBoardProps {
  round: number;
  phase: GamePhase;
  players: Player[];
  localId: string;
  currentTurnId: string;
  handCards: CardData[];
  playedCard: CardData | null;
  activeQuestion: ActiveQuestion | null;
  questionResult: QuestionResult | null;
  triggerResult: TriggerResult | null;
  roomId: string;
  onLeaveAfterDeath: () => void;
  onCardChoice?: (cardId: string) => void;
  onAnswerSubmit?: (letter: string) => void;
  botHudMessage?: { text: string; color: string } | null;
  isBotSpectating?: boolean;
}

interface HudMessage {
  text: string;
  color: string;
}

interface OpponentPos {
  className: string;
  angle: number;
}

const getOpponentPosition = (playerId: string, total: number): OpponentPos => {
  const posMap: Record<string, OpponentPos> = {
    'bot-0': {
      className: "absolute left-8 top-[48%] -translate-y-1/2 flex flex-col items-center space-y-2 z-20",
      angle: 180
    },
    'bot-1': {
      className: "absolute top-20 left-1/2 -translate-x-1/2 flex flex-col items-center space-y-2 z-20",
      angle: -90
    },
    'bot-2': {
      className: "absolute right-8 top-[48%] -translate-y-1/2 flex flex-col items-center space-y-2 z-20",
      angle: 0
    },
  };

  if (posMap[playerId]) return posMap[playerId];

  if (total === 1) {
    return {
      className: "absolute top-20 left-1/2 -translate-x-1/2 flex flex-col items-center space-y-2 z-20",
      angle: -90
    };
  }

  return {
    className: "absolute top-20 left-1/2 -translate-x-1/2 flex flex-col items-center space-y-2 z-20",
    angle: -90
  };
};

export function GameBoard({ 
  round, 
  phase, 
  players, 
  localId, 
  currentTurnId, 
  handCards, 
  playedCard, 
  activeQuestion, 
  questionResult, 
  triggerResult,
  roomId,
  onLeaveAfterDeath,
  onCardChoice,
  onAnswerSubmit,
  botHudMessage,
  isBotSpectating
}: GameBoardProps) {
  
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [isFiring, setIsFiring] = useState<boolean>(false);
  const [showShotEffect, setShowShotEffect] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(10);
  const [maxTime, setMaxTime] = useState<number>(10);
  const [hudMessage, setHudMessage] = useState<HudMessage | null>(null);
  const [rotationAngle, setRotationAngle] = useState<number>(-90);
  const [isGunInCenter, setIsGunInCenter] = useState<boolean>(false);
  
  // Tính tổng số phát đã bắn trong round
  const currentShotsFired = players.reduce((sum, p) => sum + (p.shotsFired || 0), 0);

  // Hiệu ứng đếm số (rolling number)
  const [displayedShots, setDisplayedShots] = useState<number>(0);
  const [currentPositionState, setCurrentPositionState] = useState<number>(0);

  const [isDealing, setIsDealing] = useState<boolean>(false);
  const [revealedCards, setRevealedCards] = useState<Set<string>>(new Set());
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [hoveredCardIndex, setHoveredCardIndex] = useState<number | null>(null);
  const [tilt, setTilt] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [answerIndicator, setAnswerIndicator] = useState<{ playerId: string; correct: boolean } | null>(null);
  const [isScreenShaking, setIsScreenShaking] = useState<boolean>(false);
  const [showRedFlash, setShowRedFlash] = useState<boolean>(false);
  const [showDeathOverlay, setShowDeathOverlay] = useState<boolean>(false);
  const [isCrtShuttingDown, setIsCrtShuttingDown] = useState<boolean>(false);
  const [isCrtTurningOn, setIsCrtTurningOn] = useState<boolean>(false);
  const [isSpectatorModeVisual, setIsSpectatorModeVisual] = useState<boolean>(false);
  const [deathMessage, setDeathMessage] = useState<string>('');
  const [isPresentationMode, setIsPresentationMode] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    return localStorage.getItem('roulette-quiz-muted') === 'true';
  });
  const [pendingActionText, setPendingActionText] = useState<string | null>(null);
  const opponentPlayers = players.filter(p => p.id !== localId);
  
  interface PileCard {
    id: string;
    card: CardData;
    rotate: number;
    offsetX: number;
    offsetY: number;
    fromId: string;
  }
  const [cardPile, setCardPile] = useState<PileCard[]>([]);

  const prevHandCardsLength = useRef<number>(0);
  const lastProcessedTriggerRef = useRef<string | null>(null);
  const lastMouseMoveRef = useRef<number>(0);
  const lastPlayedCardRef = useRef<string | null>(null);
  const triggerTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const bgmDeathStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync mute state with Sounds
  useEffect(() => {
    Sounds.setMuted(isMuted);
  }, [isMuted]);

  const prevPhase = useRef<GamePhase>(phase);
  // BGM Effect
  const isDead = players.find(p => p.id === localId)?.isAlive === false;
  // BGM chỉ nên tắt khi người chơi thực sự CHẾT, hoặc đang trong bóng đen tắt TV
  const isDeadSpectating = isSpectatorModeVisual || isDead || isCrtShuttingDown;
  
  useEffect(() => {
    const isLethalShot = triggerResult !== null && !triggerResult.alive;
    const stopDelay = 1800;

    const clearDeathStopTimer = () => {
      if (bgmDeathStopTimerRef.current) {
        clearTimeout(bgmDeathStopTimerRef.current);
        bgmDeathStopTimerRef.current = null;
      }
    };

    if (isDeadSpectating) {
      clearDeathStopTimer();
      Sounds.stopBGM();
      return;
    }

    if (isLethalShot) {
      clearDeathStopTimer();
      Sounds.startBGM();
      bgmDeathStopTimerRef.current = setTimeout(() => {
        Sounds.stopBGM();
        bgmDeathStopTimerRef.current = null;
      }, stopDelay);
    } else {
      clearDeathStopTimer();
      Sounds.startBGM();
    }

    return () => {
      clearDeathStopTimer();
    };
  }, [isDeadSpectating, triggerResult]);

  useEffect(() => {
    return () => {
      if (bgmDeathStopTimerRef.current) {
        clearTimeout(bgmDeathStopTimerRef.current);
        bgmDeathStopTimerRef.current = null;
      }
      Sounds.stopBGM();
    };
  }, []);

  // Heartbeat Effect (căng thẳng tăng dần theo số đạn đã bắn)
  useEffect(() => {
    if (displayedShots < 2 || isPresentationMode || phase === 'result' || isCrtShuttingDown || isDeadSpectating) return;

    let intervalTime = 1200;
    let volume = 0.2; // Nhỏ lại

    if (displayedShots === 3) {
      intervalTime = 900;
      volume = 0.3;
    } else if (displayedShots === 4) {
      intervalTime = 600;
      volume = 0.45;
    } else if (displayedShots >= 5) {
      intervalTime = 400;
      volume = 0.7;
    }

    const intervalId = setInterval(() => {
      Sounds.heartbeat(volume);
    }, intervalTime);

    Sounds.heartbeat(volume);

    return () => clearInterval(intervalId);
  }, [displayedShots, isPresentationMode, phase, isCrtShuttingDown, isDeadSpectating]);

  useEffect(() => {
    const prev = prevPhase.current;
    prevPhase.current = phase;
    
    // Show indicator when opponent answers (answering -> result/trigger)
    if (prev === 'answering' && (phase === 'result' || phase === 'trigger')) {
      if (currentTurnId && currentTurnId !== localId && questionResult) {
        setAnswerIndicator({ playerId: currentTurnId, correct: questionResult.correct });
        
        // Play sound
        if (questionResult.correct) {
          Sounds.correct();
        } else {
          Sounds.wrong();
        }
        
        // Auto hide after 2.5 seconds
        const timer = setTimeout(() => {
          setAnswerIndicator(null);
        }, 2500);
        
        return () => clearTimeout(timer);
      }
    }
  }, [phase, currentTurnId, localId, questionResult]);

  useEffect(() => {
    // Clear any pending trigger timers first
    triggerTimersRef.current.forEach(t => clearTimeout(t));
    triggerTimersRef.current = [];
    
    setIsSpinning(false);
    setIsFiring(false);
    setShowShotEffect(false);
    setRotationAngle(-90);
    setIsGunInCenter(false);
    setIsDealing(false);
    setRevealedCards(new Set());
    prevHandCardsLength.current = 0;
    lastProcessedTriggerRef.current = null;
    // Không reset các state liên quan đến animation chết ở đây 
    // vì nó sẽ làm gián đoạn sequence 2.5 giây màn hình đen.
    // Các state đó sẽ tự reset trong setTimeout của triggerResult.
    // Only reset spectator mode if the local player is actually alive
    const isLocalDead = !players.find(p => p.id === localId)?.isAlive;
    if (!isLocalDead) {
      setIsSpectatorModeVisual(false);
    }
    
    setDeathMessage('');
    setCardPile([]);
    lastPlayedCardRef.current = null;
  }, [round]);

  useEffect(() => {
    if (handCards.length > 0 && handCards.length !== prevHandCardsLength.current && phase === 'choosing') {
      prevHandCardsLength.current = handCards.length;
      setIsDealing(true);
      setRevealedCards(new Set());

      let cancelled = false;
      const timers: ReturnType<typeof setTimeout>[] = [];

      const dealSequence = async () => {
        for (let i = 0; i < handCards.length; i++) {
          await new Promise(resolve => {
            const t = setTimeout(resolve, 200);
            timers.push(t);
          });
          if (cancelled) return;
          Sounds.cardDeal();
          setRevealedCards(prev => new Set([...prev, handCards[i].id]));
        }
        await new Promise(resolve => {
          const t = setTimeout(resolve, 300);
          timers.push(t);
        });
        if (!cancelled) setIsDealing(false);
      };

      dealSequence();

      return () => {
        cancelled = true;
        timers.forEach(t => clearTimeout(t));
      };
    }
  }, [handCards, phase]);

  useEffect(() => {
    if (triggerResult) {
      const triggerKey = `${triggerResult.playerId}-${triggerResult.bulletCount}-${triggerResult.alive}`;
      if (lastProcessedTriggerRef.current === triggerKey) return;
      lastProcessedTriggerRef.current = triggerKey;

      // Clear any existing trigger timers before starting new ones
      triggerTimersRef.current.forEach(t => clearTimeout(t));
      triggerTimersRef.current = [];

      setDisplayedShots(triggerResult.bulletsFired || 0);
      
      // If the bullet is lethal, the round will reset. Reset the HUD counter immediately after the shot is fired.
      if (!triggerResult.alive) {
        const t = setTimeout(() => {
          setDisplayedShots(0);
        }, 1400); // 1200ms spin + 150ms fire delay + 50ms buffer
        triggerTimersRef.current.push(t);
      }

      setCurrentPositionState(triggerResult.currentPosition ?? 0);
      setIsGunInCenter(true);
      setIsSpinning(true);
      Sounds.gunClick();
      
      const playerId = triggerResult.playerId;
      let targetAngle = -90;
      
      if (playerId) {
        if (playerId === localId) {
          targetAngle = 90;
        } else {
          const oppPos = getOpponentPosition(playerId, opponentPlayers.length);
          targetAngle = oppPos.angle;
        }
      }
      setRotationAngle(targetAngle);
      
      const triggerAnimationDelay = 800;
      const fireEffectDelay = 400;
      const spinTimer = setTimeout(() => {
        setIsSpinning(false);
        setIsFiring(true);

        const fireDelayTimer = setTimeout(() => {
          setShowShotEffect(true);
          const shotEffectTimer = setTimeout(() => setShowShotEffect(false), 120);
          triggerTimersRef.current.push(shotEffectTimer);

          // Screen Shake & Red flash effect
          if (!isPresentationMode) {
            setIsScreenShaking(true);
            setTimeout(() => setIsScreenShaking(false), 450);
          }

          if (triggerResult.alive) {
            Sounds.gunSurvive();
          } else {
            Sounds.gunFire();
            setShowRedFlash(true);
            setTimeout(() => setShowRedFlash(false), 600);

            const isLocalDeath = triggerResult.playerId === localId;
            const targetName = triggerResult.playerName || 'PLAYER';
            
            setDeathMessage(isLocalDeath 
              ? "CRITICAL ERROR // LIFE SIGNALS LOST" 
              : `TARGET ELIMINATED // ${targetName.toUpperCase()} TERMINATED`
            );
            
            setShowDeathOverlay(true);
            
            if (isLocalDeath) {
              // Lập tức màn hình đen xì
              setIsCrtShuttingDown(true);
              setShowDeathOverlay(false); // Hide the overlay since the screen is turning off

              // Đợi 2.5 giây trong bóng đen
              setTimeout(() => {
                setIsCrtShuttingDown(false);
                
                // Tránh bật CRT nếu game đã kết thúc (1v1 chết)
                if (prevPhase.current !== 'game_over') {
                  if (!isPresentationMode) setIsCrtTurningOn(true);
                  setIsSpectatorModeVisual(true);
                  
                  // Xoá class hiệu ứng bật tivi sau khi hoàn thành
                  setTimeout(() => {
                    setIsCrtTurningOn(false);
                  }, 1000);
                }
              }, 2500); // Kéo dài thời gian đen xì
            } else {
              // Nếu người khác chết thì báo lỗi đỏ 3 giây rồi tắt
              setTimeout(() => {
                setShowDeathOverlay(false);
              }, 3000);
            }
          }
          setRotationAngle(-90);
          setIsGunInCenter(false);
        }, fireEffectDelay);
        triggerTimersRef.current.push(fireDelayTimer);

        const resetFireTimer = setTimeout(() => {
          setIsFiring(false);
          setShowShotEffect(false);
        }, 2000);
        triggerTimersRef.current.push(resetFireTimer);
      }, triggerAnimationDelay);
      triggerTimersRef.current.push(spinTimer);

      return () => {
        triggerTimersRef.current.forEach(t => clearTimeout(t));
        triggerTimersRef.current = [];
      };
    } else {
      lastProcessedTriggerRef.current = null;
    }
  }, [triggerResult, localId, players]);

  useEffect(() => {
    if (activeQuestion && phase === 'answering') {
      setTimeLeft(activeQuestion.timer);
      setMaxTime(activeQuestion.timer);

      const interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            Sounds.timerWarning();
            return 0;
          }
          Sounds.countdown(prev - 1 <= 3);
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [activeQuestion, phase]);

  const showHUDAlert = (text: string, textColor: string, duration: number) => {
    setHudMessage({ text, color: textColor });
    setTimeout(() => setHudMessage(null), duration);
  };

  useEffect(() => {
    if (playedCard) {
      setPendingActionText(null);
      if (lastPlayedCardRef.current !== playedCard.id) {
        Sounds.cardPlay();
        lastPlayedCardRef.current = playedCard.id;
      }
      
      setCardPile(prev => {
        if (prev.find(c => c.id === playedCard.id)) return prev;

        const fromId = activeQuestion?.from || currentTurnId;
        const oppPos = getOpponentPosition(fromId, opponentPlayers.length);
        
        let finalRotate = (Math.random() * 20 - 10);
        let offsetX = (Math.random() * 10 - 5);
        let offsetY = (Math.random() * 10 - 5);

        if (fromId !== localId) {
           if (oppPos.angle === 180) { finalRotate += 15; offsetX -= 15; } // left
           else if (oppPos.angle === 0) { finalRotate -= 15; offsetX += 15; } // right
           else { finalRotate += (Math.random() > 0.5 ? 10 : -10); offsetY -= 15; } // top
        } else {
           offsetY += 15;
        }

        return [...prev, {
          id: playedCard.id,
          card: playedCard,
          rotate: finalRotate,
          offsetX,
          offsetY,
          fromId
        }];
      });
    }
  }, [playedCard, activeQuestion?.from, currentTurnId, localId, opponentPlayers.length]);

  const handleCardClick = (card: CardData) => {
    if (phase !== 'choosing' || currentTurnId !== localId) return;
    if (onCardChoice) {
      onCardChoice(card.id);
    } else {
      setPendingActionText('SEND_CARD_SELECTION');
      socketClient.chooseCard(roomId, card.id);
    }
  };

  useEffect(() => {
    setSelectedAnswer(null);
  }, [activeQuestion]);

  const handleAnswerSubmit = (letter: string) => {
    Sounds.buttonClick();
    setSelectedAnswer(letter);
    if (onAnswerSubmit) {
      onAnswerSubmit(letter);
    } else {
      setPendingActionText('SEND_ANSWER');
      socketClient.submitAnswer(roomId, letter);
    }
  };

  useEffect(() => {
    if (questionResult || phase === 'trigger' || phase === 'questioning') {
      setPendingActionText(null);
    }
  }, [questionResult, phase]);

  const handleCardMouseMove = (e: React.MouseEvent<HTMLDivElement>, index: number) => {
    const now = performance.now();
    if (now - lastMouseMoveRef.current < 50) return; // ~20fps throttle to prevent React re-render flooding
    lastMouseMoveRef.current = now;

    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const x = ((e.clientX - centerX) / (rect.width / 2)) * 12;
    const y = ((e.clientY - centerY) / (rect.height / 2)) * -8;
    setTilt({ x, y });
    setHoveredCardIndex(index);
  };

  const handleCardMouseLeave = () => {
    setHoveredCardIndex(null);
    setTilt({ x: 0, y: 0 });
  };

  const getDifficultyColor = (difficulty: string) => {
    if (difficulty === 'easy') return { border: 'var(--emerald-theme-border)', glow: 'var(--emerald-theme)', glowLight: 'var(--emerald-theme-bg)' };
    if (difficulty === 'medium') return { border: 'var(--amber-theme-border)', glow: 'var(--amber-theme)', glowLight: 'var(--amber-theme-bg)' };
    return { border: 'var(--red-theme-border)', glow: 'var(--red-theme)', glowLight: 'var(--red-theme-bg)' };
  };

  const localPlayer = players.find(p => p.id === localId) || { name: 'YOU', isAlive: true, shotsFired: 0 };
  const isSpectating = !localPlayer.isAlive;

  const isMyTurn = currentTurnId === localId;
  const isAnswering = activeQuestion !== null;

  const getHUDPhaseLabel = () => {
    if (phase === 'waiting') return 'SYSTEM // TRANSMITTING_CARDS';
    if (phase === 'choosing') return 'PROTOCOL // CHOOSE_TARGET_CARD';
    if (phase === 'questioning') return 'ATTACK // ANSWER_OR_DIE';
    if (phase === 'answering') return 'DEFEND // VERIFYING_DECRYPT';
    if (phase === 'result') return 'DECRYPT // RESULT';
    if (phase === 'trigger') return 'HAZARD // PULL_TRIGGER';
    if (phase === 'game_over') return 'SYSTEM // CONFLICT_TERMINATED';
    return 'SYSTEM // INITIALIZED';
  };

  const getHUDPhaseColor = () => {
    if (phase === 'trigger') return 'text-red-theme';
    if (phase === 'choosing' || phase === 'answering') return 'text-amber-theme';
    return 'text-text-theme-secondary';
  };

  const getPendingLabel = () => {
    if (!pendingActionText) return null;
    if (pendingActionText === 'SEND_CARD_SELECTION') return 'SENDING CARD...';
    if (pendingActionText === 'SEND_ANSWER') return 'SENDING ANSWER...';
    return null;
  };

  const getTargetPlayer = () => {
    const currentTurnIndex = players.findIndex(p => p.id === currentTurnId);
    if (currentTurnIndex === -1) return null;
    
    let next = (currentTurnIndex + 1) % players.length;
    let checked = 0;
    while (!players[next].isAlive && checked < players.length) {
      next = (next + 1) % players.length;
      checked++;
    }
    return players[next];
  };

  const targetPlayer = getTargetPlayer();
  const isBotTarget = targetPlayer ? targetPlayer.id.startsWith('bot-') : false;

  const renderProfileIndicator = (playerId: string) => {
    // 1. Answering phase
    if (phase === 'questioning' || phase === 'answering') {
      const target = getTargetPlayer();
      if (target && target.id === playerId) {
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1 border border-amber-theme-border bg-surface text-amber-theme font-mono text-[10px] font-black tracking-wider uppercase rounded shadow-[0_0_10px_rgba(245,158,11,0.15)] whitespace-nowrap z-30 animate-pulse flex items-center gap-1.5"
          >
            <span className="w-2 h-2 rounded-full bg-amber-theme" />
            ĐANG TRẢ LỜI...
          </motion.div>
        );
      }
    }

    // 2. Result phase
    if (phase === 'result' && questionResult) {
      const target = getTargetPlayer();
      if (target && target.id === playerId) {
        if (questionResult.correct) {
          return (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1 border border-emerald-theme-border bg-surface text-emerald-theme font-mono text-[10px] font-black tracking-wider uppercase rounded shadow-[0_0_10px_rgba(16,185,129,0.15)] whitespace-nowrap z-30 flex items-center gap-1.5"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-theme animate-ping" />
              ĐÚNG!
            </motion.div>
          );
        } else {
          return (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1 border border-red-theme-border bg-surface text-red-theme font-mono text-[10px] font-black tracking-wider uppercase rounded shadow-[0_0_10px_rgba(239,68,68,0.15)] whitespace-nowrap z-30 flex items-center gap-1.5"
            >
              <span className="w-2 h-2 rounded-full bg-red-theme animate-ping" />
              SAI!
            </motion.div>
          );
        }
      }
    }

    // 3. Trigger phase
    if (phase === 'trigger' && triggerResult) {
      if (triggerResult.playerId === playerId) {
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1 border border-red-theme-border bg-surface text-red-theme font-mono text-[10px] font-black tracking-wider uppercase rounded shadow-[0_0_15px_rgba(239,68,68,0.25)] whitespace-nowrap z-30 animate-pulse flex items-center gap-1.5"
          >
            <span className="w-2 h-2 rounded-full bg-red-theme animate-ping" />
            PULL TRIGGER!
          </motion.div>
        );
      }
    }

    return null;
  };

  const getPlayedCardInitial = (fromId: string) => {
    const base = { scale: 0.3, opacity: 0, filter: 'blur(2px)' };
    
    if (fromId === localId) return { ...base, opacity: 1, y: 300 };
    
    const oppPos = getOpponentPosition(fromId, opponentPlayers.length);
    if (oppPos.angle === 180) return { ...base, opacity: 1, x: -450, y: 0 }; // left
    if (oppPos.angle === 0) return { ...base, opacity: 1, x: 450, y: 0 }; // right
    return { ...base, opacity: 1, y: -350 }; // top
  };

  return (
    <>
    {/* Nền đen kịt nằm sau GameBoard để khi hiệu ứng CRT bật lên (thu nhỏ GameBoard) thì người chơi vẫn thấy bóng tối bao trùm */}
    {isCrtTurningOn && (
      <div className="fixed inset-0 bg-black z-0 pointer-events-none" />
    )}
    <motion.div 
      animate={isScreenShaking && !isPresentationMode ? (
        triggerResult?.alive 
          ? { x: [0, -3, 3, -3, 3, 0], y: [0, 2, -2, 2, -2, 0] }
          : { x: [0, -12, 12, -10, 10, -6, 6, 0], y: [0, 10, -10, 8, -8, 4, -4, 0] }
      ) : {
        x: 0,
        y: 0,
      }}
      transition={{ duration: 0.4 }}
      className={`w-full h-full flex flex-col items-center justify-between py-6 px-12 z-10 select-none relative ${isCrtShuttingDown && !isPresentationMode ? 'animate-crt-shutdown' : ''} ${isCrtTurningOn && !isPresentationMode ? 'animate-crt-turn-on' : ''} ${isPresentationMode ? 'presentation-mode' : ''}`}
    >
      {/* Top action bar: Leave & Theme */}
      <div className="absolute top-6 left-6 z-[120] flex items-center gap-4">
        <button 
          onClick={onLeaveAfterDeath}
          className="px-4 py-2 bg-red-theme/10 hover:bg-red-theme/20 border border-red-theme/50 text-red-theme font-mono text-xs font-bold tracking-[0.1em] transition-colors shadow-[0_0_15px_rgba(239,68,68,0.15)] backdrop-blur-sm"
          title="Bỏ cuộc / Rời phòng"
        >
          [ RỜI TRẬN ]
        </button>
        <div className="border border-cyan-theme/30 p-1.5 shadow-[0_0_15px_rgba(34,211,238,0.1)] bg-bg-surface/50 backdrop-blur-sm rounded-sm">
          <ThemeToggle />
        </div>
        <button
          onClick={() => setIsMuted(!isMuted)}
          className="w-10 h-10 flex items-center justify-center border border-cyan-theme/30 shadow-[0_0_15px_rgba(34,211,238,0.1)] bg-bg-surface/50 backdrop-blur-sm rounded-sm transition-colors hover:bg-cyan-theme/10"
          title={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
        >
          {isMuted ? (
            <SpeakerSimpleX size={18} weight="bold" className="text-cyan-theme/70" />
          ) : (
            <SpeakerHigh size={18} weight="bold" className="text-cyan-theme/70" />
          )}
        </button>
        <button
          onClick={() => setIsPresentationMode(!isPresentationMode)}
          className={`px-3 py-2 border font-mono text-xs font-bold tracking-widest uppercase transition-colors backdrop-blur-sm ${
            isPresentationMode 
              ? 'border-amber-theme text-amber-theme bg-amber-theme-bg shadow-[0_0_15px_rgba(245,158,11,0.2)]' 
              : 'border-cyan-theme/30 text-cyan-theme/70 bg-surface/50 hover:text-cyan-theme'
          }`}
        >
          {isPresentationMode ? 'PRESENTATION: ON' : 'PRESENTATION: OFF'}
        </button>
      </div>

      {/* Spectator Mode Visual Overlay */}
      {isSpectatorModeVisual && (
        <div className="absolute inset-0 z-[100] pointer-events-none overflow-hidden rounded-sm">
          {/* Subtle dark tint */}
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px]"></div>
          
          {/* Old TV Static Noise */}
          <div 
            className="absolute -inset-[100%] opacity-15 mix-blend-screen"
            style={{ 
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
              animation: 'static-noise 0.15s steps(2) infinite'
            }}
          />
          
          {/* Scanlines */}
          <div 
            className="absolute inset-0 opacity-[0.15]"
            style={{ 
              background: 'repeating-linear-gradient(transparent, transparent 2px, rgba(0,0,0,0.8) 2px, rgba(0,0,0,0.8) 4px)'
            }}
          />

          {/* Glitch border */}
          <div className="absolute inset-0 border-[1px] border-[#ffb703]/20 shadow-[inset_0_0_50px_rgba(255,183,3,0.1)]"></div>

          {/* SPECTATOR MODE LABEL - Moved to top right */}
          <div className="absolute top-4 right-4 px-3 py-1.5 border border-[#ffb703]/40 bg-black/80 backdrop-blur-md shadow-[0_0_15px_rgba(255,183,3,0.15)] flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-[#ffb703] animate-pulse shadow-[0_0_8px_#ffb703]"></div>
            <p className="text-[#ffb703] font-mono font-bold tracking-[0.15em] text-[11px] opacity-90">
              REC // SPECTATOR LINK
            </p>
          </div>
        </div>
      )}

      {/* Turn Indicator Banner - Removed, using arrow indicator instead */}

      {/* 1. Opponents positioned absolute around the table */}
      {opponentPlayers.map((opponent) => {
        const cardCount = opponent.cardsCount || 0;
        const isCurrentTurn = currentTurnId === opponent.id;
        const pos = getOpponentPosition(opponent.id, opponentPlayers.length);
        
        return (
          <div key={opponent.id} className={pos.className}>
            <AnimatePresence>
              {renderProfileIndicator(opponent.id)}
            </AnimatePresence>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold font-mono text-text-theme-secondary tracking-wider relative z-10">
                {opponent.name}
              </span>
              <div className="relative">
                
                {/* Turn arrow indicator for opponent */}
                <AnimatePresence>
                  {(phase === 'choosing' || phase === 'answering') && isCurrentTurn && opponent.isAlive && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute z-30"
                    style={{ right: '-28px', top: '50%', transform: 'translateY(-50%)' }}
                  >
                    <motion.svg 
                      width="20" 
                      height="20" 
                      viewBox="0 0 20 20" 
                      className="text-emerald-theme"
                      animate={{ x: [0, -4, 0] }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <path d="M 18 10 L 4 10 M 10 4 L 2 10 L 10 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </motion.svg>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className={`w-16 h-16 rounded-none bg-surface-2 border flex items-center justify-center font-mono font-black text-base relative z-10 transition-all duration-300 ${
                !opponent.isAlive 
                  ? 'border-red-theme-border text-red-theme/30 opacity-40' 
                  : isCurrentTurn 
                    ? 'border-red-theme text-text-theme' 
                    : 'border-cyan-theme-muted text-text-theme-muted'
              }`}>
                <span className="absolute top-0.5 left-0.5 text-[6px] font-mono text-cyan-theme-muted select-none">+</span>
                <span className="absolute top-0.5 right-0.5 text-[6px] font-mono text-cyan-theme-muted select-none">+</span>
                <span className="absolute bottom-0.5 left-0.5 text-[6px] font-mono text-cyan-theme-muted select-none">+</span>
                <span className="absolute bottom-0.5 right-0.5 text-[6px] font-mono text-cyan-theme-muted select-none">+</span>

                {opponent.name.substring(0, 2).toUpperCase()}
                
                {opponent.isAlive ? (
                  <span className={`absolute -top-1 -right-1 w-2 h-2 rotate-45 border border-bg-body z-20 ${
                    isCurrentTurn ? 'bg-red-theme animate-pulse' : 'bg-emerald-theme'
                  }`} />
                ) : (
                  <div className="absolute inset-0 bg-red-theme-bg rounded-none flex items-center justify-center">
                    <X size={20} className="text-red-theme/60 stroke-[3px]" />
                  </div>
                )}
              </div>
            </div>
            </div>
            
            {opponent.isAlive && cardCount > 0 && (
              <div className="flex justify-center items-center h-16 w-32 relative mt-0.5">
                {Array.from({ length: cardCount }).map((_, idx) => {
                  const total = cardCount;
                  const mid = (total - 1) / 2;
                  const dist = idx - mid;
                  const xOffset = dist * 20;
                  const arcY = Math.abs(dist) * 2;
                  const arcAngle = dist * 4;

                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: -10, scale: 0.8 }}
                      animate={{ opacity: 1, y: arcY, x: xOffset, rotate: arcAngle, scale: 1 }}
                      transition={{ type: "spring", stiffness: 200, damping: 20, delay: idx * 0.04 }}
                      className="absolute w-9 h-14 rounded-none border border-cyan-theme-muted bg-surface-3 shadow-none overflow-hidden"
                      style={{ transformOrigin: 'center 120%', zIndex: idx }}
                    >
                      <div className="absolute inset-0.5 rounded-none bg-surface-2 flex items-center justify-center overflow-hidden">
                        <div className="absolute inset-0 opacity-10">
                          <div className="absolute inset-0.5 border border-dashed border-cyan-theme-light rounded-none"></div>
                        </div>
                        <div className="w-1.5 h-1.5 rounded-none rotate-45 border border-cyan-theme-muted bg-surface-3"></div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            <span className="text-[8px] font-mono text-text-theme-muted tracking-wider">
              {!opponent.isAlive 
                ? '// TERMINATED' 
                : phase === 'choosing' && isCurrentTurn 
                  ? '// CHOSING_CARD' 
                  : phase === 'answering' && isCurrentTurn 
                    ? '// ĐANG TRẢ LỜI' 
                    : `CARDS // [0${cardCount}]`
              }
            </span>
          </div>
        );
      })}

      {opponentPlayers.length === 0 && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 flex flex-col items-center space-y-3 p-6 border border-dashed border-border-theme rounded-2xl bg-input-theme z-20">
          <div className="w-12 h-12 rounded-xl bg-panel-solid/60 border border-border-theme flex items-center justify-center font-bold text-xs text-text-theme-dim animate-pulse">
            ?
          </div>
          <span className="text-[10px] font-extrabold text-text-theme-muted tracking-widest uppercase">
            WAITING FOR OPPONENTS //
          </span>
        </div>
      )}

      {/* 2. Center Table */}
      <div className="absolute top-[48%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[720px] h-[340px] rounded-none bg-surface-3/70 border border-cyan-theme-muted backdrop-blur-md flex items-center justify-center gap-16 px-12 z-10 overflow-visible">

        {/* Discard Pile / Played Card */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
          <svg className="w-full h-full" viewBox="0 0 720 340" xmlns="http://www.w3.org/2000/svg">
            <circle cx="360" cy="170" r="140" fill="none" stroke="var(--cyan-theme)" strokeWidth="0.8" strokeDasharray="4,6" />
            <circle cx="360" cy="170" r="80" fill="none" stroke="var(--cyan-theme)" strokeWidth="0.8" strokeDasharray="2,4" />
            <circle cx="360" cy="170" r="30" fill="none" stroke="var(--cyan-theme)" strokeWidth="0.5" />
            <line x1="360" y1="10" x2="360" y2="330" stroke="var(--cyan-theme)" strokeWidth="0.8" strokeDasharray="3,3" />
            <line x1="180" y1="170" x2="540" y2="170" stroke="var(--cyan-theme)" strokeWidth="0.8" strokeDasharray="3,3" />
            <path d="M 20 20 L 40 20 M 20 20 L 20 40" stroke="var(--cyan-theme)" strokeWidth="1" />
            <path d="M 700 20 L 680 20 M 700 20 L 700 40" stroke="var(--cyan-theme)" strokeWidth="1" />
            <path d="M 20 320 L 40 320 M 20 320 L 20 300" stroke="var(--cyan-theme)" strokeWidth="1" />
            <path d="M 700 320 L 680 320 M 700 320 L 700 300" stroke="var(--cyan-theme)" strokeWidth="1" />
            <text x="360" y="25" fill="var(--cyan-theme)" fontSize="7" fontFamily="monospace" textAnchor="middle">-90° // APEX</text>
            <text x="360" y="325" fill="var(--cyan-theme)" fontSize="7" fontFamily="monospace" textAnchor="middle">90° // BASE</text>
            <text x="195" y="173" fill="var(--cyan-theme)" fontSize="7" fontFamily="monospace" textAnchor="start">180° // PORT</text>
            <text x="525" y="173" fill="var(--cyan-theme)" fontSize="7" fontFamily="monospace" textAnchor="end">0° // STBD</text>
            <text x="370" y="160" fill="var(--cyan-theme)" fontSize="6" fontFamily="monospace" opacity="0.6">SYS.ROT // {rotationAngle}°</text>
          </svg>
        </div>
        
        {/* Discard Pile / Played Card */}
        <div className="flex flex-col items-center space-y-2 z-20">
          <div className="w-32 h-44 bg-card-theme/50 border border-cyan-theme-muted border-dashed rounded-none flex items-center justify-center relative">
            <span className="absolute top-1 left-1.5 text-[8px] font-mono text-cyan-theme-muted select-none font-normal">+</span>
            <span className="absolute top-1 right-1.5 text-[8px] font-mono text-cyan-theme-muted select-none font-normal">+</span>
            <span className="absolute bottom-1 left-1.5 text-[8px] font-mono text-cyan-theme-muted select-none font-normal">+</span>
            <span className="absolute bottom-1 right-1.5 text-[8px] font-mono text-cyan-theme-muted select-none font-normal">+</span>

            <AnimatePresence>
              {cardPile.length > 0 ? (
                cardPile.map((pileItem, index) => {
                  const card = pileItem.card;
                  return (
                    <motion.div 
                      key={pileItem.id}
                      initial={getPlayedCardInitial(pileItem.fromId)}
                      animate={{ x: pileItem.offsetX, y: pileItem.offsetY, scale: 1, opacity: 1, rotate: pileItem.rotate, filter: 'blur(0px)' }}
                      exit={{ scale: 0.5, opacity: 0, filter: 'blur(10px)' }}
                      transition={{ type: "spring", duration: 0.65, bounce: 0.3 }}
                      className={`absolute w-32 h-44 border rounded-none p-3 flex flex-col justify-between shadow-[0_0_30px_rgba(34,211,238,0.15)] overflow-hidden bg-card-theme ${
                        card.difficulty === 'easy' 
                          ? 'border-emerald-theme-border text-emerald-theme' 
                          : card.difficulty === 'medium' 
                            ? 'border-amber-theme-border text-amber-theme' 
                            : 'border-red-theme-border text-red-theme'
                      }`}
                      style={{ zIndex: index }}
                    >
                      <div className="flex justify-between items-center w-full border-b border-border-theme pb-1 text-[8px] font-mono tracking-wider opacity-60">
                        <span>#{card.id.substring(0, 4).toUpperCase()}</span>
                        <span className={
                          card.difficulty === 'easy' ? 'text-emerald-theme font-extrabold' : card.difficulty === 'medium' ? 'text-amber-theme font-extrabold' : 'text-red-theme font-extrabold'
                        }>{card.difficulty.toUpperCase()}</span>
                      </div>
                      <div className="flex-1 flex items-center justify-center py-1 overflow-y-auto pr-0.5">
                        <p className="text-xs font-extrabold leading-normal text-left tracking-wide uppercase font-mono">
                          {card.question.substring(0, 36) + (card.question.length > 36 ? '...' : '')}
                        </p>
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <span className="text-[9px] font-extrabold text-text-theme-dim tracking-widest uppercase text-center font-mono">
                  AWAITING
                  <br />
                  ATTACK //
                </span>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Revolver Widget */}
      <motion.div 
        animate={{
          left: isGunInCenter ? "50%" : "calc(50% + 480px)",
          top: "48%",
          scale: isGunInCenter ? 1.5 : 1.25
        }}
        transition={{ duration: 0.6, type: "spring", bounce: 0.2 }}
        className="absolute -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none flex flex-col items-center"
      >
        <Revolver 
          bulletsFired={displayedShots}
          currentPosition={currentPositionState}
          isSpinning={isSpinning}
          isFiring={isFiring}
          showShotEffect={showShotEffect}
          alive={triggerResult ? triggerResult.alive : true}
          rotationAngle={rotationAngle}
        />
      </motion.div>

      {/* Shots fired indicator - fixed position below gun default location */}
      <div
        className="absolute z-50 pointer-events-none"
        style={{ left: 'calc(50% + 480px)', top: 'calc(48% + 180px)', transform: 'translateX(-50%)' }}
      >
        <div
          className={`px-4 py-2 border rounded-none font-mono text-sm font-bold tracking-widest ${
            displayedShots >= 4
              ? 'border-red-theme-border text-red-theme bg-red-theme-bg'
              : displayedShots >= 2
                ? 'border-amber-theme-border text-amber-theme bg-amber-theme-bg'
                : 'border-cyan-theme-muted text-cyan-theme bg-surface-3'
          }`}
        >
          SHOTS // {displayedShots}/6
        </div>
      </div>

      {/* 3. Bottom Area: Hand Cards */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center space-y-2 z-20 w-full max-w-2xl">
        <div className="flex justify-center items-center h-44 relative w-full" style={{ perspective: '1200px' }}>
          <AnimatePresence>
            {handCards.map((card, index) => {
              const total = handCards.length;
              const mid = (total - 1) / 2;
              const dist = index - mid;
              const isPlayable = phase === 'choosing' && isMyTurn;
              const isRevealed = !isDealing || revealedCards.has(card.id);
              const isHovered = hoveredCardIndex === index;
              const isNeighbor = hoveredCardIndex !== null && Math.abs(hoveredCardIndex - index) === 1;
              const colors = isRevealed ? getDifficultyColor(card.difficulty) : null;

              // Calculate positions
              const neighborOffset = hoveredCardIndex !== null
                ? (index < hoveredCardIndex ? -8 : index > hoveredCardIndex ? 8 : 0)
                : 0;
              const baseX = dist * 55 + neighborOffset;
              const baseY = Math.pow(Math.abs(dist), 1.5) * 6;
              const baseAngle = dist * 3;

              // Hover offsets
              const hoverY = isHovered ? -90 : baseY;
              const hoverScale = isHovered ? 1.15 : isNeighbor ? 0.95 : 1;
              const hoverAngle = isHovered ? 0 : baseAngle;
              const hoverZ = isHovered ? 50 : index;

              const isCardRevealed = revealedCards.has(card.id);

              return (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, y: 40, scale: 0.9 }}
                  animate={{ 
                    opacity: isPlayable ? 1 : 0.3,
                    x: baseX,
                    y: hoverY,
                    rotateY: isHovered ? tilt.x * 0.5 : 0,
                    rotateX: isHovered ? tilt.y * 0.5 : 0,
                    rotate: hoverAngle,
                    scale: hoverScale,
                  }}
                  exit={{ opacity: 0, y: -40 }}
                  transition={{ type: "spring", stiffness: 200, damping: 20 }}
                  onMouseEnter={() => Sounds.cardSelect()}
                  onMouseMove={(e) => isPlayable && handleCardMouseMove(e, index)}
                  onMouseLeave={handleCardMouseLeave}
                  onClick={() => handleCardClick(card)}
                  className={`absolute w-64 h-96 border rounded-none p-6 flex flex-col justify-between select-none overflow-hidden bg-card-theme ${
                    !isPlayable ? 'cursor-default' : 'cursor-pointer group'
                  }`}
                  style={{
                    transformOrigin: 'center 110%',
                    zIndex: hoverZ,
                    transformStyle: 'preserve-3d',
                    borderColor: isHovered && colors ? colors.glow : colors ? colors.border : 'var(--border-cyan-theme-muted)',
                  }}
                >
                  <span className="absolute top-1 left-1.5 text-[8px] font-mono text-cyan-theme-muted select-none font-normal">+</span>
                  <span className="absolute top-1 right-1.5 text-[8px] font-mono text-cyan-theme-muted select-none font-normal">+</span>
                  <span className="absolute bottom-1 left-1.5 text-[8px] font-mono text-cyan-theme-muted select-none font-normal">+</span>
                  <span className="absolute bottom-1 right-1.5 text-[8px] font-mono text-cyan-theme-muted select-none font-normal">+</span>

                  {isRevealed ? (
                    <>
                      <div className="flex justify-between items-center w-full border-b border-border-theme pb-1.5 text-[9px] font-mono tracking-wider opacity-60">
                        <span>#{card.id.substring(0, 4).toUpperCase()}</span>
                        <span className={`font-extrabold ${
                          card.difficulty === 'easy' ? 'text-emerald-theme' : card.difficulty === 'medium' ? 'text-amber-theme' : 'text-red-theme'
                        }`}>{card.difficulty.toUpperCase()}</span>
                      </div>
                      <div className="flex-1 flex items-center justify-center py-2 overflow-y-auto pr-0.5">
                        <p className={`text-sm font-bold leading-normal text-left tracking-wide font-mono uppercase transition-colors duration-300 ${
                          isHovered ? 'text-text-theme' : 'text-text-theme-secondary'
                        }`}>
                          {card.question.substring(0, isHovered ? 100 : 80) + (card.question.length > (isHovered ? 100 : 80) ? '...' : '')}
                        </p>
                      </div>
                      {/* Hover: difficulty icon overlay */}
                      {isHovered && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center"
                        >
                          {card.difficulty === 'easy' && <Check size={16} className="text-emerald-theme" />}
                          {card.difficulty === 'medium' && <ShieldWarning size={16} className="text-amber-theme" />}
                          {card.difficulty === 'hard' && <X size={16} className="text-red-theme" />}
                        </motion.div>
                      )}
                    </>
                  ) : (
                    <div className="absolute inset-1 rounded-none border border-cyan-theme-muted bg-surface-3 flex items-center justify-center overflow-hidden">
                      <div className="absolute inset-0 opacity-10">
                        <div className="absolute inset-1 border border-dashed border-cyan-theme-light rounded-none"></div>
                      </div>
                      <div className="w-3 h-3 rounded-none rotate-45 border border-cyan-theme-muted bg-surface-3"></div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* 4. Local Player Avatar - Bottom Left */}
      <div className="absolute bottom-6 left-6 z-20">
        {/* Turn arrow indicator for local player */}
        <AnimatePresence>
          {(phase === 'choosing' || phase === 'answering') && isMyTurn && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: [0, -6, 0] }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ 
                opacity: { duration: 0.2 },
                x: { duration: 0.8, repeat: Infinity, ease: "easeInOut" }
              }}
              className="absolute -right-10 top-1/2 -translate-y-1/2"
            >
              <svg width="24" height="20" viewBox="0 0 24 20" className="text-emerald-theme">
                <path 
                  d="M 24 10 L 4 10 M 10 3 L 2 10 L 10 17" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
              </svg>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-4 bg-surface-2 border border-cyan-theme-muted rounded-none p-3 shadow-none relative">
          <AnimatePresence>
            {renderProfileIndicator(localId)}
          </AnimatePresence>
          <div className={`w-12 h-12 rounded-none bg-surface-3 border flex items-center justify-center font-mono font-black text-base relative transition-all duration-300 ${
            !localPlayer.isAlive ? 'border-red-theme-border opacity-30 bg-red-theme-bg' : 'border-cyan-theme-light'
          }`}>
 
            {localPlayer.name.substring(0, 2).toUpperCase()}
            {!localPlayer.isAlive ? (
              <div className="absolute inset-0 bg-red-theme-bg rounded-none flex items-center justify-center">
                <X size={20} className="text-red-theme/60 stroke-[3px]" />
              </div>
            ) : (
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rotate-45 bg-emerald-theme" />
            )}
          </div>
          <div className="flex flex-col items-start leading-none">
            <span className="text-sm font-bold text-text-theme tracking-wide uppercase flex items-center gap-1.5 font-mono">
              {localPlayer.name} 
              <span className="text-[8px] text-text-theme-muted font-extrabold tracking-wider bg-input-theme px-1.5 py-0.5 rounded">// YOU</span>
            </span>
            <span className="text-[9px] font-mono font-extrabold text-text-theme-muted tracking-wider mt-1">
              {!localPlayer.isAlive 
                ? '// TERMINATED' 
                : phase === 'choosing' && isMyTurn 
                  ? '// YOUR TURN // SELECT CARD' 
                  : phase === 'answering' && isAnswering 
                    ? '// ĐANG TRẢ LỜI' 
                    : 'LINK STATE // SECURED'
              }
            </span>
            {getPendingLabel() && (
              <span className="text-[9px] font-mono font-black uppercase tracking-[0.3em] text-amber-theme mt-1">
                {getPendingLabel()}
              </span>
            )}
          </div>
          {!localPlayer.isAlive && (
            <button 
              onClick={onLeaveAfterDeath}
              className="ml-4 px-4 py-2 bg-surface-3 border border-red-theme-border hover:border-red-theme hover:bg-red-theme-bg rounded-none text-[9px] font-mono font-bold text-red-theme tracking-widest uppercase flex items-center gap-1 transition-all duration-300 cursor-pointer"
            >
              <ArrowLeft size={14} />
              RỜI PHÒNG
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {(hudMessage || botHudMessage) && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="fixed inset-0 flex items-center justify-center pointer-events-none z-40"
          >
            <div className="bg-panel-solid/95 border border-border-theme px-8 py-5 rounded-xl shadow-2xl flex items-center gap-3">
              <ShieldWarning size={20} className="text-red-theme animate-pulse" />
              <span className={`text-md font-extrabold tracking-widest uppercase ${hudMessage?.color || botHudMessage?.color || 'text-text-theme'}`}>
                {hudMessage?.text || botHudMessage?.text}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAnswering && activeQuestion && !isBotTarget && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-overlay-solid/90 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div 
              initial={{ scale: 0.98, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.98, y: 15, opacity: 0 }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              className="bg-surface-3 border-2 border-cyan-theme-light rounded-none p-10 max-w-4xl w-full flex flex-col relative overflow-hidden"
            >
              <span className="absolute top-2 left-2 text-[10px] font-mono text-cyan-theme-muted select-none font-normal">+</span>
              <span className="absolute top-2 right-2 text-[10px] font-mono text-cyan-theme-muted select-none font-normal">+</span>
              <span className="absolute bottom-2 left-2 text-[10px] font-mono text-cyan-theme-muted select-none font-normal">+</span>
              <span className="absolute bottom-2 right-2 text-[10px] font-mono text-cyan-theme-muted select-none font-normal">+</span>

              <div className="flex justify-between items-center mb-6">
                <span className="text-[10px] text-cyan-theme-light font-bold tracking-widest uppercase flex items-center gap-2 font-mono">
                  <span className="w-1.5 h-1.5 rotate-45 bg-red-theme animate-pulse"></span>
                  {isBotSpectating ? 'SPECTATING // ĐANG TRẢ LỜI' : 'ĐANG TRẢ LỜI'} // {activeQuestion.card.topic.toUpperCase()}
                </span>
                <span className={`text-lg font-mono font-bold tracking-widest ${
                  timeLeft <= 3 ? 'text-red-theme animate-pulse font-black' : 'text-text-theme-muted'
                }`}>
                  0{timeLeft}S
                </span>
              </div>

              <div className="w-full h-1.5 bg-surface-2 border border-cyan-theme-muted rounded-none overflow-hidden mb-6">
                <motion.div 
                  initial={{ width: '100%' }}
                  animate={{ width: `${(timeLeft / maxTime) * 100}%` }}
                  transition={{ duration: 1, ease: "linear" }}
                  className={`h-full rounded-none transition-colors duration-300 ${timeLeft <= 3 ? 'bg-red-theme' : 'bg-cyan-theme'}`}
                />
              </div>

              <h2 className={`${isPresentationMode ? 'text-3xl' : 'text-xl md:text-2xl'} font-bold text-text-theme text-center mb-8 leading-relaxed max-w-3xl mx-auto uppercase tracking-wider font-mono`}>
                {activeQuestion.card.question}
              </h2>

              <div className="flex flex-col space-y-3 w-full">
                {Object.entries(activeQuestion.card.answers).map(([letter, answer]) => {
                  const isCorrectAnswer = questionResult && letter === questionResult.correctAnswer;
                  const isMyWrongAnswer = questionResult && !questionResult.correct && letter === selectedAnswer;
                  
                  let buttonStyle = "bg-card-theme border-cyan-theme-muted text-text-theme-secondary hover:border-cyan-theme hover:text-text-theme hover:bg-cyan-theme-light";
                  if (questionResult) {
                    if (isCorrectAnswer) {
                      buttonStyle = "bg-emerald-theme-bg border-emerald-theme-border text-emerald-theme";
                    } else if (isMyWrongAnswer) {
                      buttonStyle = "bg-red-theme-bg border-red-theme-border text-red-theme";
                    } else {
                      buttonStyle = "opacity-10 border-transparent text-text-theme-dim";
                    }
                  }

                  return (
                    <button 
                      key={letter}
                      disabled={questionResult !== null || isSpectating || isBotSpectating}
                      onClick={() => handleAnswerSubmit(letter)}
                      className={`w-full py-5 px-8 border text-base font-bold tracking-widest uppercase rounded-none flex items-center gap-4 transition-all duration-200 relative overflow-hidden group ${isSpectating || isBotSpectating ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} ${buttonStyle}`}
                    >
                      <div className={`w-8 h-8 rounded-none border border-cyan-theme-muted group-hover:border-text-theme bg-transparent flex items-center justify-center font-mono font-black ${isPresentationMode ? 'text-lg' : 'text-xs'} text-cyan-theme group-hover:text-text-theme transition-colors duration-200`}>
                        {letter}
                      </div>
                      <span className={`text-left leading-normal font-bold font-mono ${isPresentationMode ? 'text-xl' : ''}`}>{answer}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dynamic Atmosphere based on displayedShots */}
      {!isPresentationMode && !isDeadSpectating && displayedShots > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ 
            opacity: Math.min(displayedShots / 5, 1) * 0.9,
          }}
          transition={{ duration: 1.5 }}
          className="absolute inset-0 pointer-events-none z-[50]"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 0%, rgba(0, 0, 0, 0.6) 70%, rgba(0, 0, 0, 0.95) 100%)'
          }}
        >
          {/* Subtle static noise overlay that gets stronger with more shots */}
          <motion.div
            animate={{ opacity: [0.1, 0.3, 0.1] }}
            transition={{ 
              duration: Math.max(1.8 - displayedShots * 0.3, 0.6), 
              repeat: Infinity, 
              ease: "linear" 
            }}
            className="absolute inset-0 static-glitch mix-blend-overlay"
          />
        </motion.div>
      )}

      {/* Red flash alert overlay when player gets shot */}
      <AnimatePresence>
        {showRedFlash && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.75, 0.2, 0.6, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="fixed inset-0 bg-red-600/30 z-[99] pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* Death Static Noise Glitch and Warning Banner */}
      <AnimatePresence>
        {showDeathOverlay && (
          <>
            {/* Tivi noise overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.95 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 static-glitch z-[90] pointer-events-none"
            />
            
            {/* Warning card block - Only show if it's NOT local player's death */}
            {triggerResult && triggerResult.playerId !== localId && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, x: '-50%', y: '-40%' }}
                animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
                exit={{ opacity: 0, scale: 0.9, x: '-50%', y: '-40%' }}
                className="absolute top-1/2 left-1/2 z-[100] bg-surface/90 backdrop-blur-md border-2 border-red-theme-border px-10 py-6 text-center shadow-[0_0_50px_rgba(239,68,68,0.25)] min-w-[340px]"
                style={{ transform: 'translate(-50%, -50%)' }}
              >
                <span className="block font-mono text-[8px] text-red-theme/60 tracking-widest mb-1">// CRITICAL_SYSTEM_ALERT</span>
                <h2 className="font-mono text-xs font-black text-red-theme tracking-wider uppercase animate-pulse">
                  {deathMessage}
                </h2>
                <div className="mt-4 flex justify-center items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-theme animate-ping" />
                  <span className="font-mono text-[8px] text-text-theme-muted tracking-widest">TRANSMISSION SEVERED</span>
                </div>
              </motion.div>
            )}
          </>
        )}
      </AnimatePresence>
    </motion.div>
    {/* Pure Blackout Overlay on local death before CRT turning back on */}
    {isCrtShuttingDown && (
      <div 
        className="fixed inset-0 z-[9999] w-screen h-screen flex flex-col items-center justify-center bg-black"
        style={{ pointerEvents: 'all' }}
      />
    )}
    </>
  );
}
