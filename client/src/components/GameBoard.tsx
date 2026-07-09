import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { socketClient } from '../network/SocketClient';
import { Revolver } from './Revolver';
import { ThemeToggle } from './ThemeToggle';
import { VolumeSlider } from './VolumeSlider';
import { Check, X, ShieldWarning, ArrowLeft } from '@phosphor-icons/react';
import { GamePhase, Player, Card, TriggerResult } from '../types';
import { Sounds } from '../audio/Sounds';
import { TypewriterText } from './TypewriterText';

interface GameBoardProps {
  round: number;
  phase: GamePhase;
  players: Player[];
  localId: string;
  currentTurnId: string;
  handCards: Card[];
  playedCard: Card | null;
  currentNumber: number;
  direction: number;
  triggerResult: TriggerResult | null;
  roomId: string;
  onLeaveAfterDeath: () => void;
  onCardChoice?: (cardId: string) => void;
  onPullTrigger?: () => void;
  onMulligan?: () => void;
  botHudMessage?: { text: string; color: string } | null;
  isBotSpectating?: boolean;
  turnEndTime?: number | null;
  disconnect?: () => void;
}

interface HudMessage {
  text: string;
  color: string;
}

interface OpponentPos {
  className: string;
  angle: number;
}

const getOpponentPosition = (playerId: string, opponentPlayers: Player[]): OpponentPos => {
  const index = opponentPlayers.findIndex(p => p.id === playerId);
  const total = opponentPlayers.length;
  
  if (total === 1) {
    return {
      className: "absolute top-16 left-1/2 -translate-x-1/2 flex flex-col items-center space-y-1 z-20",
      angle: -90
    };
  }

  if (total === 2) {
    if (index === 0) return { className: "absolute left-4 sm:left-8 top-[48%] -translate-y-1/2 flex flex-col items-center space-y-1 z-20", angle: 180 };
    return { className: "absolute right-4 sm:right-8 top-[48%] -translate-y-1/2 flex flex-col items-center space-y-1 z-20", angle: 0 };
  }

  // total === 3
  if (index === 0) return { className: "absolute left-4 sm:left-8 top-[48%] -translate-y-1/2 flex flex-col items-center space-y-1 z-20", angle: 180 };
  if (index === 1) return { className: "absolute top-16 left-1/2 -translate-x-1/2 flex flex-col items-center space-y-1 z-20", angle: -90 };
  return { className: "absolute right-4 sm:right-8 top-[48%] -translate-y-1/2 flex flex-col items-center space-y-1 z-20", angle: 0 };
};

export function GameBoard({ 
  round, 
  phase, 
  players, 
  localId, 
  currentTurnId, 
  handCards, 
  playedCard, 
  currentNumber,
  direction,
  triggerResult,
  roomId,
  onLeaveAfterDeath,
  onCardChoice,
  onPullTrigger,
  onMulligan,
  botHudMessage,
  isBotSpectating = false,
  turnEndTime,
  disconnect
}: GameBoardProps) {
  
    const activeQuestion: any = null;
  const questionResult: any = null;
  const onAnswerSubmit: any = () => {};

  const sortedHandCards = useMemo(() => {
    return [...handCards].sort((a, b) => {
      if (a.type === 'NUMBER' && b.type === 'NUMBER') {
        return (a.value || 0) - (b.value || 0);
      }
      if (a.type === 'NUMBER') return -1;
      if (b.type === 'NUMBER') return 1;
      return a.type.localeCompare(b.type);
    });
  }, [handCards]);

  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [isFiring, setIsFiring] = useState<boolean>(false);
  const [showShotEffect, setShowShotEffect] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(10);
  const [maxTime, setMaxTime] = useState<number>(10);
  const [hudMessage, setHudMessage] = useState<HudMessage | null>(null);
  const [rotationAngle, setRotationAngle] = useState<number>(-90);
  const [isGunInCenter, setIsGunInCenter] = useState<boolean>(false);
  
  const playersRef = useRef(players);
  useEffect(() => {
    playersRef.current = players;
  }, [players]);

  // Initialize audio settings
  useEffect(() => {
    Sounds.initMuted();
  }, []);

  // Tính tổng số phát đã bắn trong round
  const currentShotsFired = players.reduce((sum, p) => sum + (p.shotsFired || 0), 0);

  // Hiệu ứng đếm số (rolling number)
  const [displayedShots, setDisplayedShots] = useState<number>(0);
  const [currentPositionState, setCurrentPositionState] = useState<number>(0);

  const [isDealing, setIsDealing] = useState<boolean>(false);
  const [revealedCards, setRevealedCards] = useState<Set<string>>(new Set());
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [hoveredCardIndex, setHoveredCardIndex] = useState<number | null>(null);
  const [answerIndicator, setAnswerIndicator] = useState<{ playerId: string; correct: boolean } | null>(null);
  const [isScreenShaking, setIsScreenShaking] = useState<boolean>(false);
  const [showRedFlash, setShowRedFlash] = useState<boolean>(false);
  const [showDeathOverlay, setShowDeathOverlay] = useState<boolean>(false);
  const [isCrtShuttingDown, setIsCrtShuttingDown] = useState<boolean>(false);
  const [isCrtTurningOn, setIsCrtTurningOn] = useState<boolean>(false);
  const [isSpectatorModeVisual, setIsSpectatorModeVisual] = useState<boolean>(false);
  const [deathMessage, setDeathMessage] = useState<string>('');
  const [pendingActionText, setPendingActionText] = useState<string | null>(null);
  const [mulliganAnimating, setMulliganAnimating] = useState<boolean>(false);
  const [mulliganSacrificeIndex, setMulliganSacrificeIndex] = useState<number | null>(null);
  const mulliganTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const opponentPlayers = players.filter(p => p.id !== localId);
  
  interface PileCard {
    id: string;
    card: Card;
    rotate: number;
    offsetX: number;
    offsetY: number;
    fromId: string;
  }
  const [cardPile, setCardPile] = useState<PileCard[]>([]);

  const prevHandCardsLength = useRef<number>(0);
  const lastProcessedTriggerRef = useRef<string | null>(null);
  const lastPlayedCardRef = useRef<string | null>(null);
  const triggerTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const bgmDeathStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerBgmResumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearDeathStopTimer = () => {
    if (bgmDeathStopTimerRef.current) {
      clearTimeout(bgmDeathStopTimerRef.current);
      bgmDeathStopTimerRef.current = null;
    }
  };

  const clearTriggerResumeTimer = () => {
    if (triggerBgmResumeTimerRef.current) {
      clearTimeout(triggerBgmResumeTimerRef.current);
      triggerBgmResumeTimerRef.current = null;
    }
  };

  const prevPhase = useRef<GamePhase>(phase);
  // BGM Effect
  const isDead = players.length > 0 && players.find(p => p.id === localId)?.isAlive === false;
  // BGM chỉ nên tắt khi người chơi thực sự CHẾT, hoặc đang trong bóng đen tắt TV
  const isDeadSpectating = isSpectatorModeVisual || isDead || isCrtShuttingDown;
  
  useEffect(() => {
    const isLethalShot = triggerResult !== null && !triggerResult.alive;

    if (isDeadSpectating) {
      clearDeathStopTimer();
      clearTriggerResumeTimer();
      Sounds.stopBGM();
      return;
    }

    if (!triggerResult) {
      clearDeathStopTimer();
      clearTriggerResumeTimer();
      Sounds.startBGM();
    }

    return () => {
      clearDeathStopTimer();
      clearTriggerResumeTimer();
    };
  }, [isDeadSpectating, triggerResult]);

  useEffect(() => {
    return () => {
      if (bgmDeathStopTimerRef.current) {
        clearTimeout(bgmDeathStopTimerRef.current);
        bgmDeathStopTimerRef.current = null;
      }
      if (triggerBgmResumeTimerRef.current) {
        clearTimeout(triggerBgmResumeTimerRef.current);
        triggerBgmResumeTimerRef.current = null;
      }
      Sounds.stopBGM();
    };
  }, []);

  // Heartbeat Effect (căng thẳng tăng dần theo số đạn đã bắn)
  useEffect(() => {
    if (displayedShots < 2 || false || false || isCrtShuttingDown || isDeadSpectating) return;

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
  }, [displayedShots, false, phase, isCrtShuttingDown, isDeadSpectating]);

  useEffect(() => {
    const prev = prevPhase.current;
    prevPhase.current = phase;
    
    // Show indicator when opponent answers (answering -> result/trigger)
    if (false && (false || phase === 'trigger')) {
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
    // Chỉ trigger deal animation khi số bài TĂNG (được chia bài mới), không phải khi đánh bài
      if (handCards.length > 0 && handCards.length > prevHandCardsLength.current && phase === 'choosing') {
        prevHandCardsLength.current = handCards.length;
        setIsDealing(false);
      }
      // Reset mulligan animation when hand changes (mulligan succeeded)
      if (mulliganAnimating) {
        if (mulliganTimerRef.current) {
          clearTimeout(mulliganTimerRef.current);
          mulliganTimerRef.current = null;
        }
        setMulliganAnimating(false);
        setMulliganSacrificeIndex(null);
      }
  }, [handCards, phase, sortedHandCards]);

  useEffect(() => {
    if (triggerResult) {
      const triggerKey = `${triggerResult.playerId}-${triggerResult.bulletCount}-${triggerResult.bulletsFired}-${triggerResult.alive}`;
      if (lastProcessedTriggerRef.current === triggerKey) return;
      lastProcessedTriggerRef.current = triggerKey;

      // Clear cards from table
      setCardPile([]);

      // Clear any existing trigger timers before starting new ones
      triggerTimersRef.current.forEach(t => clearTimeout(t));
      triggerTimersRef.current = [];

      if (triggerResult.playerId === 'STANDOFF') {
        setIsGunInCenter(true);
        setIsSpinning(true);
        Sounds.gunClick();
        
        const triggerAnimationDelay = 800;
        const fireEffectDelay = 120;
        
        const spinTimer = setTimeout(() => {
          setIsSpinning(false);
          setIsFiring(true);

          const fireDelayTimer = setTimeout(() => {
            setShowShotEffect(true);
            const shotEffectTimer = setTimeout(() => setShowShotEffect(false), 280);
            triggerTimersRef.current.push(shotEffectTimer);

            if (!triggerResult.alive) {
              if (!false) {
                setIsScreenShaking(true);
                setTimeout(() => setIsScreenShaking(false), 450);
              }

              Sounds.gunFire();
              setShowRedFlash(true);
              setTimeout(() => setShowRedFlash(false), 600);

              let isLocalDeath = false;
              const localRes = triggerResult.results?.find(r => r.playerId === localId);
              if (localRes && !localRes.alive) {
                isLocalDeath = true;
              }
              
              const deadCount = triggerResult.results?.filter(r => !r.alive).length || 0;
              let targetName = 'TARGET';
              if (deadCount === 1) {
                const deadPlayerId = triggerResult.results?.find(r => !r.alive)?.playerId;
                const deadPlayer = playersRef.current.find(p => p.id === deadPlayerId);
                if (deadPlayer) targetName = deadPlayer.name;
              } else if (deadCount > 1) {
                targetName = `MULTIPLE TARGETS (${deadCount})`;
              }

              setDeathMessage(isLocalDeath 
                ? "CRITICAL ERROR // LIFE SIGNALS LOST" 
                : `TARGET ELIMINATED // ${targetName.toUpperCase()} TERMINATED`
              );
              setShowDeathOverlay(true);

              if (isLocalDeath) {
                setIsCrtShuttingDown(true);
                setShowDeathOverlay(false); // Hide overlay to let CRT animation take over
                setTimeout(() => {
                  const opponentsAlive = playersRef.current.filter(p => p.id !== localId && p.isAlive).length;
                  if (opponentsAlive <= 1) {
                    return; // Game over, do not wake up CRT
                  }
                  
                  setIsCrtShuttingDown(false);
                  setIsCrtTurningOn(true);
                  setIsSpectatorModeVisual(true);
                  setTimeout(() => {
                    setIsCrtTurningOn(false);
                  }, 400);
                }, 2500);
              }
            } else {
              Sounds.gunSurvive();
            }

            const retractTimer = setTimeout(() => {
              setIsGunInCenter(false);
              setRotationAngle(-90);
            }, 800);
            triggerTimersRef.current.push(retractTimer);
          }, fireEffectDelay);
          triggerTimersRef.current.push(fireDelayTimer);

          const resetFireTimer = setTimeout(() => {
            setIsFiring(false);
            setShowShotEffect(false);
          }, 2000);
          triggerTimersRef.current.push(resetFireTimer);
        }, triggerAnimationDelay);
        triggerTimersRef.current.push(spinTimer);
        return;
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
          const oppPos = getOpponentPosition(playerId, opponentPlayers);
          targetAngle = oppPos.angle;
        }
      }
      setRotationAngle(targetAngle);
      
      const triggerAnimationDelay = 800;
      const fireEffectDelay = 120;
      const spinTimer = setTimeout(() => {
        setIsSpinning(false);
        setIsFiring(true);

        const fireDelayTimer = setTimeout(() => {
          setShowShotEffect(true);
          const shotEffectTimer = setTimeout(() => setShowShotEffect(false), 280);
          triggerTimersRef.current.push(shotEffectTimer);
          
          if (!triggerResult.alive) {
            setDisplayedShots(0);
          } else {
            setDisplayedShots(triggerResult.bulletsFired || 0);
          }

          // Screen Shake & Red flash effect
          if (!false) {
            setIsScreenShaking(true);
            setTimeout(() => setIsScreenShaking(false), 450);
          }

          if (triggerResult.alive) {
            Sounds.gunSurvive();
          } else {
            clearDeathStopTimer();
            if (triggerBgmResumeTimerRef.current) {
              clearTimeout(triggerBgmResumeTimerRef.current);
              triggerBgmResumeTimerRef.current = null;
            }
            Sounds.stopBGM();
            triggerBgmResumeTimerRef.current = setTimeout(() => {
              triggerBgmResumeTimerRef.current = null;
              if (!isDeadSpectating) {
                Sounds.startBGM();
              }
            }, 2000);
            Sounds.gunFire();
            setShowRedFlash(true);
            setTimeout(() => setShowRedFlash(false), 600);

            let isLocalDeath = triggerResult.playerId === localId;
            let targetName = triggerResult.playerName;
            if (!targetName) {
              const targetPlayer = playersRef.current.find(p => p.id === triggerResult.playerId);
              targetName = targetPlayer ? targetPlayer.name : 'TARGET';
            }
            
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
                const opponentsAlive = playersRef.current.filter(p => p.id !== localId && p.isAlive).length;
                if (opponentsAlive <= 1) {
                  return; // Game over, do not wake up CRT
                }

                setIsCrtShuttingDown(false);
                setIsCrtTurningOn(true);
                setIsSpectatorModeVisual(true); // Bật mode theo dõi
                
                // Tắt nhiễu hạt bật màn hình sau 0.4s
                setTimeout(() => {
                  setIsCrtTurningOn(false);
                }, 400);
              }, 2500); // Kéo dài thời gian đen xì
            } else {
              // Nếu người khác chết thì báo lỗi đỏ 3 giây rồi tắt
              setTimeout(() => {
                setShowDeathOverlay(false);
              }, 3000);
            }
          }
          // Wait for shot effect to finish before retracting the gun
          const retractTimer = setTimeout(() => {
            setRotationAngle(-90);
            setIsGunInCenter(false);
          }, 800);
          triggerTimersRef.current.push(retractTimer);
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
    if (turnEndTime) {
      const updateTime = () => {
        const remaining = Math.max(0, (turnEndTime - Date.now()) / 1000);
        setTimeLeft(remaining);
      };
      updateTime();
      setMaxTime(20);

      const interval = setInterval(updateTime, 100);
      return () => clearInterval(interval);
    } else {
      setTimeLeft(0);
      setMaxTime(20);
    }
  }, [turnEndTime]);

  const showHUDAlert = (text: string, textColor: string, duration: number) => {
    setHudMessage({ text, color: textColor });
    setTimeout(() => setHudMessage(null), duration);
  };

  const handleMulliganClick = useCallback(() => {
    if (mulliganAnimating || !onMulligan) return;
    setMulliganAnimating(true);
    setMulliganSacrificeIndex(Math.floor(Math.random() * sortedHandCards.length));
    Sounds.cardPlay();
    mulliganTimerRef.current = setTimeout(() => {
      onMulligan();
      setMulliganAnimating(false);
      setMulliganSacrificeIndex(null);
      mulliganTimerRef.current = null;
    }, 800);
  }, [mulliganAnimating, onMulligan, sortedHandCards.length]);

  // Cleanup mulligan animation on unmount
  useEffect(() => {
    return () => {
      if (mulliganTimerRef.current) {
        clearTimeout(mulliganTimerRef.current);
        mulliganTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (playedCard) {
      setPendingActionText(null);
      if (lastPlayedCardRef.current !== playedCard.id) {
        Sounds.cardPlay();
        lastPlayedCardRef.current = playedCard.id;
      }
      
      setCardPile(prev => {
        if (prev.find(c => c.id === playedCard.id)) return prev;

        const fromId = (playedCard as any)._fromId || activeQuestion?.from || currentTurnId;
        const oppPos = getOpponentPosition(fromId, opponentPlayers);
        
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

  const handleCardClick = (card: Card) => {
    if (phase !== 'choosing' || currentTurnId !== localId) return;
    if (onCardChoice) {
      onCardChoice?.(card.id);
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
      onAnswerSubmit(roomId, letter);
    }
  };

  useEffect(() => {
    if (questionResult || phase === 'trigger' || false) {
      setPendingActionText(null);
    }
  }, [undefined as any, phase]);

  const handleCardMouseLeave = () => {
    setHoveredCardIndex(null);
  };

  const getDifficultyColor = (difficulty: string) => {
    if (difficulty === 'easy') return { border: 'var(--emerald-theme-border)', glow: 'var(--emerald-theme)', glowLight: 'var(--emerald-theme-bg)' };
    if (difficulty === 'medium') return { border: 'var(--amber-theme-border)', glow: 'var(--amber-theme)', glowLight: 'var(--amber-theme-bg)' };
    return { border: 'var(--red-theme-border)', glow: 'var(--red-theme)', glowLight: 'var(--red-theme-bg)' };
  };

  const localPlayer = players.find(p => p.id === localId) || { name: 'YOU', isAlive: true, shotsFired: 0, hasUsedMulligan: false };
  const isSpectating = !localPlayer.isAlive;

  const isMyTurn = currentTurnId === localId;
  const isAnswering = activeQuestion !== null;

  const getHUDPhaseLabel = () => {
    if (phase === 'waiting') return 'SYSTEM // TRANSMITTING_CARDS';
    if (phase === 'choosing') return 'PROTOCOL // CHOOSE_TARGET_CARD';
    if (false) return 'ATTACK // ANSWER_OR_DIE';
    if (false) return 'DEFEND // VERIFYING_DECRYPT';
    if (false) return 'DECRYPT // RESULT';
    if (phase === 'trigger') return 'HAZARD // PULL_TRIGGER';
    if (phase === 'game_over') return 'SYSTEM // CONFLICT_TERMINATED';
    return 'SYSTEM // INITIALIZED';
  };

  const getHUDPhaseColor = () => {
    if (phase === 'trigger') return 'text-red-theme';
    if (phase === 'choosing' || false) return 'text-amber-theme';
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
    if (false || false) {
      const target = getTargetPlayer();
      if (target && target?.id === playerId) {
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1 border border-amber-theme-border bg-surface text-amber-theme font-mono text-[10px] font-black tracking-wider uppercase rounded shadow-none whitespace-nowrap z-30  flex items-center gap-1.5"
          >
            <span className="w-2 h-2 rounded-full bg-amber-theme" />
            ĐANG TRẢ LỜI...
          </motion.div>
        );
      }
    }

    // 2. Result phase
    if (false && questionResult) {
      const target = getTargetPlayer();
      if (target && target?.id === playerId) {
        if (questionResult.correct) {
          return (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1 border border-emerald-theme-border bg-surface text-emerald-theme font-mono text-[10px] font-black tracking-wider uppercase rounded shadow-none whitespace-nowrap z-30 flex items-center gap-1.5"
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
              className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1 border border-red-theme-border bg-surface text-red-theme font-mono text-[10px] font-black tracking-wider uppercase rounded shadow-none whitespace-nowrap z-30 flex items-center gap-1.5"
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
            className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1 border border-red-theme-border bg-surface text-red-theme font-mono text-[10px] font-black tracking-wider uppercase rounded shadow-none whitespace-nowrap z-30  flex items-center gap-1.5"
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
    
    const oppPos = getOpponentPosition(fromId, opponentPlayers);
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
      animate={isScreenShaking && !false ? (
        triggerResult?.alive 
          ? { x: [0, -3, 3, -3, 3, 0], y: [0, 2, -2, 2, -2, 0] }
          : { x: [0, -12, 12, -10, 10, -6, 6, 0], y: [0, 10, -10, 8, -8, 4, -4, 0] }
      ) : {
        x: 0,
        y: 0,
      }}
      transition={{ duration: 0.4 }}
      className={`w-full h-full flex flex-col items-center justify-between py-2 sm:py-4 px-3 sm:px-6 md:px-12 z-10 select-none relative ${isCrtShuttingDown && !false ? 'animate-crt-shutdown' : ''} ${isCrtTurningOn && !false ? 'animate-crt-turn-on' : ''} ${false ? 'presentation-mode' : ''}`}
    >
        {/* Global Timer Bar */}
        {timeLeft > 0 && turnEndTime && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[130] font-mono font-bold text-lg pointer-events-none flex flex-col items-center">
            <span className={timeLeft <= 3 ? 'text-red-theme animate-pulse' : 'text-emerald-theme'}>
              {Math.ceil(timeLeft)}s
            </span>
          </div>
        )}
        {timeLeft > 0 && turnEndTime && (
        <div className="absolute top-0 left-0 w-full h-1.5 bg-surface-2 z-[130]">
          <motion.div 
            initial={{ width: '100%' }}
            animate={{ width: `${(timeLeft / maxTime) * 100}%` }}
            transition={{ duration: 0.1, ease: "linear" }}
            className={`h-full shadow-none ${timeLeft <= 3 ? 'bg-red-theme' : 'bg-emerald-theme'}`}
          />
        </div>
      )}

      {/* Top action bar: Leave & Theme */}
      <div className="absolute top-3 sm:top-6 left-3 sm:left-6 z-[120] flex items-center gap-2 sm:gap-4">
        <button 
          onClick={disconnect || onLeaveAfterDeath}
          className="px-3 sm:px-4 py-1.5 sm:py-2 bg-red-theme/10 hover:bg-red-theme/20 border border-red-theme/50 text-red-theme font-mono text-[10px] sm:text-xs font-bold tracking-[0.1em] transition-colors shadow-none"
          title="Bỏ cuộc / Rời phòng"
        >
          [ RỜI TRẬN ]
        </button>
        <div className="border border-cyan-theme/30 p-1.5 shadow-none bg-bg-surface/50 rounded-sm">
          <ThemeToggle />
        </div>
        <VolumeSlider
          buttonClassName="w-10 h-10 flex items-center justify-center border border-cyan-theme/30 shadow-none bg-bg-surface/50 rounded-sm transition-colors hover:bg-cyan-theme/10"
        />
        
        
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
          <div className="absolute inset-0 border-[1px] border-[#ffb703]/20 shadow-none"></div>

          {/* SPECTATOR MODE LABEL - Moved to top right */}
          <div className="absolute top-4 right-4 px-3 py-1.5 border border-[#ffb703]/40 bg-black/80 backdrop-blur-md shadow-none flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-[#ffb703]  shadow-none"></div>
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
        const pos = getOpponentPosition(opponent.id, opponentPlayers);
        
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
                  {(phase === 'choosing' || false) && isCurrentTurn && opponent.isAlive && (
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

              <div className={`w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-none bg-surface-2 border flex items-center justify-center font-mono font-black text-sm md:text-base relative z-10 transition-all duration-300 ${
                !opponent.isAlive 
                  ? 'border-red-theme-border text-red-theme/30 opacity-90 grayscale contrast-125 animate-pulse' 
                  : isCurrentTurn 
                    ? 'border-red-theme text-text-theme' 
                    : 'border-cyan-theme-muted text-text-theme-muted'
              }`}>
                <span className="absolute top-0.5 left-0.5 text-[6px] font-mono text-cyan-theme-muted select-none z-10">+</span>
                <span className="absolute bottom-0.5 right-0.5 text-[6px] font-mono text-cyan-theme-muted select-none z-10">+</span>
                
                <span className="relative z-10">{opponent.name.substring(0, 2).toUpperCase()}</span>

                {!opponent.isAlive ? (
                  <>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                      <div className="w-[220%] text-[14px] sm:text-[18px] md:text-[24px] font-black text-red-600 border-y-4 border-red-600 py-1.5 text-center tracking-tighter opacity-95 bg-black/70 backdrop-blur-sm shadow-none whitespace-nowrap" style={{ transform: 'rotate(-25deg)' }}>
                        ELIMINATED
                      </div>
                    </div>
                  </>
                ) : (
                  <span className={`absolute -top-1 -right-1 w-2 h-2 rotate-45 border border-bg-body z-20 ${
                    isCurrentTurn ? 'bg-red-theme ' : 'bg-emerald-theme'
                  }`} />
                )}
              </div>
            </div>
            </div>
            
            {opponent.isAlive && cardCount > 0 && (
              <div className="flex justify-center items-center h-12 sm:h-14 md:h-16 w-20 sm:w-24 md:w-32 relative mt-0.5">
                {Array.from({ length: cardCount }).map((_, idx) => {
                  const total = cardCount;
                  const mid = (total - 1) / 2;
                  const dist = idx - mid;
                  const xOffset = dist * 20;
                  const arcY = Math.abs(dist) * 0.5;
                  const arcAngle = dist * 1;

                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: -10, scale: 0.8 }}
                      animate={{ opacity: 1, y: arcY, x: xOffset, rotate: arcAngle, scale: 1 }}
                      transition={{ type: "spring", stiffness: 200, damping: 20, delay: idx * 0.04 }}
                      className="absolute w-7 h-10 sm:w-8 sm:h-12 md:w-9 md:h-14 rounded-none border border-cyan-theme-muted bg-surface-3 shadow-none overflow-hidden"
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
                  : false && isCurrentTurn 
                    ? '// ĐANG TRẢ LỜI' 
                    : `CARDS // [0${cardCount}]`
              }
            </span>
          </div>
        );
      })}

      {opponentPlayers.length === 0 && (
        <div className="absolute top-12 sm:top-16 left-1/2 -translate-x-1/2 flex flex-col items-center space-y-2 sm:space-y-3 p-3 sm:p-6 border border-dashed border-cyan-theme-muted rounded-full bg-surface-2/40 backdrop-blur-md z-20">
          <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-full border border-cyan-theme/30 bg-surface-3 flex items-center justify-center shadow-none overflow-hidden">
            <div className="absolute inset-0 radar-sweep opacity-50"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-theme animate-ping absolute"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-theme absolute"></div>
          </div>
          <TypewriterText text="WAITING FOR OPPONENTS" speed={50} className="text-[9px] font-extrabold text-cyan-theme tracking-widest uppercase font-mono drop-shadow-none" />
        </div>
      )}

      {/* 2. Center Table */}
      <div className="absolute top-[48%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] sm:w-[80vw] md:w-[720px] h-[160px] sm:h-[200px] md:h-[260px] flex items-center justify-center gap-8 md:gap-16 px-4 sm:px-8 md:px-12 z-10 overflow-visible">
        
        {/* Discard Pile / Played Card */}
        <div className="flex flex-col items-center space-y-2 z-20 relative">
          
          {/* Turn Direction Indicator */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0 flex items-center justify-center">
            <motion.div 
              animate={{ rotate: direction === 1 ? 360 : -360 }}
              transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
              className="w-80 h-80 sm:w-[400px] sm:h-[400px] border-[1.5px] border-dashed border-cyan-theme/20 rounded-full flex items-center justify-center relative"
            >
              <div className="absolute top-0 w-20 h-10 bg-surface-1 flex items-center justify-center -translate-y-1/2 backdrop-blur-sm rounded-full">
                <span className="text-cyan-theme/70 text-lg sm:text-xl md:text-2xl font-bold tracking-widest">{direction === 1 ? '>>>' : '<<<'}</span>
              </div>
              <div className="absolute bottom-0 w-20 h-10 bg-surface-1 flex items-center justify-center translate-y-1/2 rotate-180 backdrop-blur-sm rounded-full">
                <span className="text-cyan-theme/70 text-lg sm:text-xl md:text-2xl font-bold tracking-widest">{direction === 1 ? '>>>' : '<<<'}</span>
              </div>
              <div className="absolute left-0 w-10 h-20 bg-surface-1 flex items-center justify-center -translate-x-1/2 -rotate-90 backdrop-blur-sm rounded-full">
                <span className="text-cyan-theme/70 text-lg sm:text-xl md:text-2xl font-bold tracking-widest">{direction === 1 ? '>>>' : '<<<'}</span>
              </div>
              <div className="absolute right-0 w-10 h-20 bg-surface-1 flex items-center justify-center translate-x-1/2 rotate-90 backdrop-blur-sm rounded-full">
                <span className="text-cyan-theme/70 text-lg sm:text-xl md:text-2xl font-bold tracking-widest">{direction === 1 ? '>>>' : '<<<'}</span>
              </div>
            </motion.div>
          </div>

          <div className="w-32 h-44 bg-transparent border border-transparent rounded-none flex items-center justify-center relative z-10">
            {/* Minimal Wrapper */}

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
                    className={`absolute w-32 h-44 border rounded-none p-3 flex flex-col justify-between shadow-none overflow-hidden bg-card-theme ${
                      card.id === 'EASTER_EGG_STANDOFF'
                        ? 'border-amber-400 text-amber-400 shadow-none'
                        : ('NORMAL' as any) === 'easy' 
                          ? 'border-emerald-theme-border text-emerald-theme' 
                          : ('NORMAL' as any) === 'medium' 
                            ? 'border-amber-theme-border text-amber-theme' 
                            : 'border-red-theme-border text-red-theme'
                    }`}
                    style={{ zIndex: index }}
                  >
                    {card.id === 'EASTER_EGG_STANDOFF' && (
                      <motion.div
                        className="absolute top-0 bottom-0 w-[150%] bg-gradient-to-r from-transparent via-amber-200 to-transparent pointer-events-none mix-blend-overlay"
                        initial={{ left: '-150%' }}
                        animate={{ left: '150%' }}
                        transition={{
                          repeat: Infinity,
                          duration: 2.5,
                          ease: "linear",
                          repeatDelay: 1
                        }}
                        style={{ transform: 'skewX(-20deg)', opacity: 0.7 }}
                      />
                    )}
                    
                    <div className="flex flex-col items-start w-full">
                      <span className="text-xl font-black font-mono text-text-theme leading-none">
                        {card.type === 'NUMBER' ? card.value : card.type.substring(0, 3)}
                      </span>
                    </div>
                    <div className="flex-1 flex items-center justify-center text-center font-black font-mono text-4xl text-text-theme opacity-80">
                      {card.type === 'NUMBER' ? card.value : card.type.substring(0, 3)}
                    </div>
                    <div className="flex flex-col items-end w-full">
                      <span className="text-xl font-black font-mono text-text-theme leading-none rotate-180">
                        {card.type === 'NUMBER' ? card.value : card.type.substring(0, 3)}
                      </span>
                    </div>
                  </motion.div>
                );
              })
            ) : (
                <span className="text-[9px] font-extrabold text-transparent tracking-widest uppercase text-center font-mono opacity-0 select-none pointer-events-none">
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
      {triggerResult?.playerId === 'STANDOFF' ? (() => {
        const getCoord = (playerId: string) => {
          if (playerId === localId) return { x: 50, y: 85 };
          const oppPos = getOpponentPosition(playerId, opponentPlayers);
          if (oppPos.angle === 180) return { x: 10, y: 48 }; // Left
          if (oppPos.angle === -90) return { x: 50, y: 15 }; // Top
          if (oppPos.angle === 0) return { x: 90, y: 48 }; // Right
          return { x: 50, y: 50 };
        };

        const standoffPlayers = players.filter(p => !p.left && p.isAlive || triggerResult.results?.some(r => r.playerId === p.id));
        
        return standoffPlayers.map((p, i) => {
          const nextPlayer = standoffPlayers[(i + 1) % standoffPlayers.length];
          const coord1 = getCoord(p.id);
          const coord2 = getCoord(nextPlayer.id);
          
          let midX = (coord1.x + coord2.x) / 2;
          let midY = (coord1.y + coord2.y) / 2;
          
          if (standoffPlayers.length === 2) {
            // Space the 2 guns apart along the line between the players
            midX = coord1.x + (coord2.x - coord1.x) * 0.35;
            midY = coord1.y + (coord2.y - coord1.y) * 0.35;
          }

          const angleDeg = Math.atan2(coord2.y - coord1.y, coord2.x - coord1.x) * (180 / Math.PI);

          return (
            <motion.div
              key={`standoff-gun-${p.id}`}
              className="absolute -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none flex flex-col items-center"
              initial={{ left: "50%", top: "48%", scale: 0 }}
              animate={{ left: `${midX}%`, top: `${midY}%`, scale: 1.25 }}
              transition={{ duration: 1.0, type: "spring", bounce: 0.15, ease: "easeOut" }}
            >
              <Revolver 
                bulletsFired={0}
                currentPosition={0}
                isSpinning={isSpinning}
                isFiring={isFiring}
                showShotEffect={showShotEffect}
                alive={true}
                rotationAngle={angleDeg}
              />
            </motion.div>
          );
        });
      })() : (
        <motion.div 
          animate={{
            left: isGunInCenter ? "50%" : "calc(50% + 480px)",
            top: "48%",
            scale: isGunInCenter ? (window.innerWidth < 640 ? 1 : 1.5) : (window.innerWidth < 640 ? 0.8 : 1.25)
          }}
          transition={{ duration: 1.0, type: "spring", bounce: 0.15, ease: "easeOut" }}
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
      )}

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
      <div className="absolute bottom-1 sm:bottom-2 left-1/2 -translate-x-1/2 flex flex-col items-center space-y-0.5 sm:space-y-1 z-20 w-full max-w-2xl px-2">
        <div className="flex justify-center items-center h-24 sm:h-32 md:h-36 relative w-full" style={{ perspective: '1200px' }}>
          <AnimatePresence>
            {sortedHandCards.map((card, index) => {
              const total = sortedHandCards.length;
              const mid = (total - 1) / 2;
              const dist = index - mid;
              const isPlayable = phase === 'choosing' && isMyTurn;
              const isRevealed = !isDealing || revealedCards.has(card.id);
              const isHovered = hoveredCardIndex === index;
              const isNeighbor = hoveredCardIndex !== null && Math.abs(hoveredCardIndex - index) === 1;
              let colors = isRevealed ? getDifficultyColor(('NORMAL' as any)) : null;
              if (isRevealed && card.id === 'EASTER_EGG_STANDOFF') {
                colors = { border: '#fbbf24', glow: '#f59e0b' } as any; // Override with amber/gold
              }

              // Calculate positions
              const neighborOffset = hoveredCardIndex !== null
                ? (index < hoveredCardIndex ? -25 : index > hoveredCardIndex ? 25 : 0)
                : 0;
              const baseX = dist * 65 + neighborOffset;
              const baseY = Math.pow(Math.abs(dist), 1.5) * 1.5;
              const baseAngle = dist * 1;

              // Hover offsets
              const hoverY = isHovered ? -35 : baseY;
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
                    rotate: hoverAngle,
                    scale: hoverScale,
                  }}
                  exit={{ opacity: 0, y: -40 }}
                  transition={{ type: "spring", stiffness: 200, damping: 20 }}
                  onMouseEnter={() => {
                    if (isPlayable) {
                      setHoveredCardIndex(index);
                      Sounds.cardSelect();
                    }
                  }}
                  onMouseLeave={handleCardMouseLeave}
                  onClick={() => handleCardClick(card)}
                  className={`absolute w-32 h-44 sm:w-40 sm:h-56 md:w-48 md:h-64 border rounded-none p-2 sm:p-3 md:p-4 flex flex-col justify-between select-none overflow-hidden bg-card-theme ${
                    !isPlayable ? 'cursor-default' : 'cursor-pointer group'
                  } pointer-events-auto`}
                  style={{
                    transformOrigin: 'center 110%',
                    zIndex: hoverZ,
                    transformStyle: 'preserve-3d',
                    pointerEvents: 'auto',
                    borderColor: isHovered && colors ? colors.glow : colors ? colors.border : 'var(--border-cyan-theme-muted)',
                    boxShadow: (isRevealed && card.id === 'EASTER_EGG_STANDOFF') ? '0 0 15px rgba(251, 191, 36, 0.4) inset' : 'none',
                  }}
                >
                  {isRevealed && card.id === 'EASTER_EGG_STANDOFF' && (
                    <motion.div
                      className="absolute top-0 bottom-0 w-[150%] bg-gradient-to-r from-transparent via-amber-200 to-transparent pointer-events-none mix-blend-overlay"
                      initial={{ left: '-150%' }}
                      animate={{ left: '150%' }}
                      transition={{
                        repeat: Infinity,
                        duration: 2.5,
                        ease: "linear",
                        repeatDelay: 1
                      }}
                      style={{ transform: 'skewX(-20deg)', opacity: 0.7 }}
                    />
                  )}

                  {/* Minimal Card Border */}

                  {isRevealed ? (
                      <>
                        <div className="flex flex-col items-start w-full">
                          <span className={`text-2xl font-black font-mono text-cyan-theme leading-none`}>
                            {card.type === 'NUMBER' ? card.value : card.type.substring(0, 3)}
                          </span>
                        </div>
                        <div className={`flex-1 flex items-center justify-center text-center font-black font-mono tracking-wider leading-relaxed text-4xl sm:text-5xl md:text-6xl text-cyan-theme`}>
                          {card.type === 'NUMBER' ? card.value : card.type.substring(0, 3)}
                        </div>
                        <div className="flex flex-col items-end w-full">
                          <span className={`text-2xl font-black font-mono text-cyan-theme leading-none rotate-180`}>
                            {card.type === 'NUMBER' ? card.value : card.type.substring(0, 3)}
                          </span>
                        </div>
                      </>
                    ) : (
                    <div className="absolute inset-0 flex flex-col justify-between p-2">
                      <div className="w-full h-1 bg-border-subtle mb-auto"></div>
                      <div className="w-full h-full my-2 opacity-30" style={{ background: 'repeating-linear-gradient(45deg, var(--color-border-subtle), var(--color-border-subtle) 2px, transparent 2px, transparent 6px)' }}></div>
                      <div className="w-full flex justify-between font-mono text-[7px] text-text-theme-muted opacity-50 font-bold uppercase tracking-widest">
                        <span>RESTRICTED</span>
                        <span>// SECURE</span>
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* 4. Local Player Avatar - Bottom Left */}
      <div className="absolute bottom-2 sm:bottom-6 left-2 sm:left-6 z-20">
        {/* Turn arrow indicator for local player */}
        <AnimatePresence>
          {(phase === 'choosing' || false) && isMyTurn && (
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

        <div className="flex items-center gap-2 sm:gap-4 bg-surface-2 border border-cyan-theme-muted rounded-none p-2 sm:p-3 shadow-none relative">
          <AnimatePresence>
            {renderProfileIndicator(localId)}
          </AnimatePresence>
          <div className={`w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-none bg-surface-3 border flex items-center justify-center font-mono font-black text-sm md:text-base relative transition-all duration-300 ${
            !localPlayer.isAlive 
              ? 'border-red-theme-border opacity-90 text-red-theme/30 grayscale contrast-125 animate-pulse' 
              : 'border-cyan-theme-light text-text-theme'
          }`}>
 
            <span className="relative z-10">{localPlayer.name.substring(0, 2).toUpperCase()}</span>

            {!localPlayer.isAlive ? (
              <>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                  <div className="w-[250%] text-[14px] sm:text-[16px] md:text-[20px] font-black text-red-600 border-y-[3px] border-red-600 py-1 text-center tracking-tighter opacity-95 bg-black/70 backdrop-blur-sm shadow-none whitespace-nowrap" style={{ transform: 'rotate(-25deg)' }}>
                    ELIMINATED
                  </div>
                </div>
              </>
            ) : (
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rotate-45 bg-emerald-theme" />
            )}
          </div>
          <div className="flex flex-col items-start leading-none">
            <span className="text-xs sm:text-sm font-bold text-text-theme tracking-wide uppercase flex items-center gap-1 sm:gap-1.5 font-mono">
              {localPlayer.name} 
              <span className="text-[8px] text-text-theme-muted font-extrabold tracking-wider bg-input-theme px-1.5 py-0.5 rounded">// YOU</span>
            </span>
            <span className="text-[9px] font-mono font-extrabold text-text-theme-muted tracking-wider mt-1">
              {!localPlayer.isAlive 
                ? '// TERMINATED' 
                : phase === 'choosing' && isMyTurn 
                  ? '// YOUR TURN // SELECT CARD' 
                  : false && isAnswering 
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
              onClick={disconnect || onLeaveAfterDeath}
              className="ml-4 px-4 py-2 bg-surface-3 border border-red-theme-border hover:border-red-theme hover:bg-red-theme-bg rounded-none text-[9px] font-mono font-bold text-red-theme tracking-widest uppercase flex items-center gap-1 transition-all duration-300 cursor-pointer"
            >
              <ArrowLeft size={14} />
              RỜI PHÒNG
            </button>
          )}
        </div>
      </div>

      {/* 5. Draw Deck - Left Side (for Mulligan) */}
      {isMyTurn && localPlayer.isAlive && onMulligan && !localPlayer.hasUsedMulligan && handCards.length > 0 && (
        <div className="absolute bottom-24 sm:bottom-32 left-2 sm:left-6 z-20">
          <motion.button
            whileHover={{ scale: 1.05, x: 5 }}
            whileTap={{ scale: 0.95 }}
            animate={mulliganAnimating ? { 
              scale: [1, 1.15, 1],
              filter: ['brightness(1)', 'brightness(1.6)', 'brightness(1)'],
            } : {}}
            transition={mulliganAnimating ? { duration: 0.8, ease: 'easeInOut' } : {}}
            onClick={handleMulliganClick}
            disabled={mulliganAnimating}
            className={`relative flex flex-col items-center gap-2 cursor-pointer group ${mulliganAnimating ? 'pointer-events-none' : ''}`}
            title="Đổi bài (hy sinh 1 lá + rút 1 lá mới)"
          >
            {/* Deck stack visual */}
            <div className="relative w-16 h-24 sm:w-20 sm:h-28">
              {/* Bottom cards (stack effect) */}
              <div className="absolute bottom-0 left-1 w-full h-full bg-surface-3 border border-cyan-theme-muted rounded-sm transform rotate-2" />
              <div className="absolute bottom-0.5 left-0.5 w-full h-full bg-surface-2 border border-cyan-theme-muted rounded-sm transform -rotate-1" />
              <div className="absolute bottom-1 left-0 w-full h-full bg-surface border border-cyan-theme-muted rounded-sm transform rotate-1" />
              {/* Top card */}
              <div className="absolute bottom-1.5 left-0 w-full h-full bg-card-theme border-2 border-cyan-theme rounded-sm flex flex-col items-center justify-center gap-1 group-hover:border-cyan-theme-light group-hover:bg-cyan-theme-light/10 transition-all duration-200">
                <span className="text-[8px] sm:text-[9px] font-mono font-bold text-cyan-theme tracking-wider">DECK</span>
                <div className="w-6 h-6 sm:w-8 sm:h-8 border border-cyan-theme/50 rounded-sm flex items-center justify-center">
                  <span className="text-cyan-theme text-lg sm:text-xl">?</span>
                </div>
                <span className="text-[7px] sm:text-[8px] font-mono text-cyan-theme-muted">DRAW</span>
              </div>
              {/* Mulligan glow ring */}
              {mulliganAnimating && (
                <motion.div
                  className="absolute -inset-2 border-2 border-cyan-theme rounded-lg"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: [0, 0.8, 0], scale: [0.8, 1.3, 1.5] }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              )}
            </div>
            {/* Label */}
            <div className="flex flex-col items-center">
              <span className="text-[8px] sm:text-[9px] font-mono font-bold text-cyan-theme tracking-wider group-hover:text-cyan-theme-light transition-colors">
                ĐỔI BÀI
              </span>
              <span className="text-[7px] sm:text-[8px] font-mono text-cyan-theme-muted">
                // SACRIFICE 1
              </span>
            </div>
          </motion.button>
        </div>
      )}

      {/* Mulligan sacrifice card fly animation */}
      <AnimatePresence>
        {mulliganAnimating && mulliganSacrificeIndex !== null && sortedHandCards[mulliganSacrificeIndex] && (
          <motion.div
            key="sacrifice-fly"
            className="absolute z-50 pointer-events-none"
            initial={{ 
              bottom: '6rem',
              left: '50%',
              x: `${(mulliganSacrificeIndex - (sortedHandCards.length - 1) / 2) * 65}px`,
              opacity: 1,
              scale: 1,
              rotate: 0,
            }}
            animate={{ 
              bottom: ['6rem', '10rem', '18rem'],
              left: ['50%', '35%', '8%'],
              x: '0px',
              opacity: [1, 1, 0],
              scale: [1, 0.8, 0.3],
              rotate: [0, -15, -30],
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
          >
            <div className="w-20 h-28 sm:w-24 sm:h-32 bg-card-theme border-2 border-red-theme rounded-sm flex flex-col items-center justify-center gap-1 shadow-lg shadow-red-theme/30">
              <span className="text-[8px] font-mono font-bold text-red-theme tracking-wider">SACRIFICE</span>
              <div className="w-5 h-5 border border-red-theme/50 rounded-sm flex items-center justify-center">
                <span className="text-red-theme text-sm">X</span>
              </div>
              <span className="text-[7px] font-mono text-red-theme-muted">
                {sortedHandCards[mulliganSacrificeIndex].type === 'NUMBER' 
                  ? sortedHandCards[mulliganSacrificeIndex].value 
                  : sortedHandCards[mulliganSacrificeIndex].type}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mulligan deck draw animation */}
      <AnimatePresence>
        {mulliganAnimating && (
          <motion.div
            key="draw-fly"
            className="absolute z-50 pointer-events-none"
            initial={{ 
              bottom: '18rem',
              left: '8%',
              opacity: 0,
              scale: 0.3,
              rotate: -30,
            }}
            animate={{ 
              bottom: ['18rem', '10rem', '6rem'],
              left: ['8%', '35%', '50%'],
              opacity: [0, 1, 1, 0],
              scale: [0.3, 0.8, 1, 1],
              rotate: [-30, 15, 0],
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1], delay: 0.3 }}
          >
            <div className="w-20 h-28 sm:w-24 sm:h-32 bg-card-theme border-2 border-cyan-theme rounded-sm flex flex-col items-center justify-center gap-1 shadow-lg shadow-cyan-theme/30">
              <span className="text-[8px] font-mono font-bold text-cyan-theme tracking-wider">NEW CARD</span>
              <div className="w-5 h-5 border border-cyan-theme/50 rounded-sm flex items-center justify-center">
                <span className="text-cyan-theme text-sm">?</span>
              </div>
              <span className="text-[7px] font-mono text-cyan-theme-muted">DRAWN</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {false && (hudMessage || botHudMessage) && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="fixed inset-0 flex items-center justify-center pointer-events-none z-40"
          >
            <div className="bg-panel-solid/95 border border-border-theme px-5 sm:px-8 py-3 sm:py-5 rounded-xl shadow-2xl flex items-center gap-3">
              <ShieldWarning size={20} className="text-red-theme " />
              <span className={`text-xs sm:text-md font-extrabold tracking-widest uppercase ${hudMessage?.color || botHudMessage?.color || 'text-text-theme'}`}>
                {hudMessage?.text || botHudMessage?.text}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAnswering && false && !isBotTarget && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed inset-0 ${false ? 'bg-overlay-solid/98 backdrop-blur-xl' : 'bg-overlay-solid/90 backdrop-blur-sm'} flex items-center justify-center z-50 p-4`}
          >
            <motion.div 
              initial={{ scale: 0.98, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.98, y: 15, opacity: 0 }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              className={`bg-surface-3 border-2 ${false ? 'border-cyan-theme shadow-none' : 'border-cyan-theme-light'} rounded-none p-5 sm:p-8 md:p-10 max-w-4xl w-full flex flex-col relative overflow-hidden`}
            >
              <span className="absolute top-2 left-2 text-[10px] font-mono text-cyan-theme-muted select-none font-normal">+</span>
              <span className="absolute top-2 right-2 text-[10px] font-mono text-cyan-theme-muted select-none font-normal">+</span>
              <span className="absolute bottom-2 left-2 text-[10px] font-mono text-cyan-theme-muted select-none font-normal">+</span>
              <span className="absolute bottom-2 right-2 text-[10px] font-mono text-cyan-theme-muted select-none font-normal">+</span>

              <div className="flex justify-between items-center mb-6">
                <span className="text-[10px] text-cyan-theme-light font-bold tracking-widest uppercase flex items-center gap-2 font-mono">
                  <span className="w-1.5 h-1.5 rotate-45 bg-red-theme "></span>
                  {isBotSpectating ? 'SPECTATING // ĐANG TRẢ LỜI' : 'ĐANG TRẢ LỜI'} // {activeQuestion.card.topic.toUpperCase()}
                </span>
                <span className={`text-lg font-mono font-bold tracking-widest ${
                  timeLeft <= 3 ? 'text-red-theme  font-black' : 'text-text-theme-muted'
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

              <h2 className={`${false ? 'text-3xl' : 'text-xl md:text-2xl'} font-bold text-text-theme text-center mb-8 leading-relaxed max-w-3xl mx-auto uppercase tracking-wider font-mono`}>
                {activeQuestion.card.type}
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
                      className={`w-full py-4 sm:py-5 px-4 sm:px-8 border text-sm sm:text-base font-bold tracking-widest uppercase rounded-none flex items-center gap-3 sm:gap-4 transition-all duration-200 relative overflow-hidden group ${isSpectating || isBotSpectating ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} ${buttonStyle}`}
                    >
                      <div className={`w-8 h-8 rounded-none border border-cyan-theme-muted group-hover:border-text-theme bg-transparent flex items-center justify-center font-mono font-black ${false ? 'text-lg' : 'text-xs'} text-cyan-theme group-hover:text-text-theme transition-colors duration-200`}>
                        {letter}
                      </div>
                      <span className={`text-left leading-normal font-bold font-mono ${false ? 'text-xl' : ''}`}>{String(answer)}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dynamic Atmosphere based on displayedShots */}
      {!false && !isDeadSpectating && displayedShots > 0 && (
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
