import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { socketClient } from '../network/SocketClient';
import { Revolver } from './Revolver';
import { Check, X, ShieldWarning, ArrowLeft } from '@phosphor-icons/react';
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

const getOpponentPosition = (index: number, total: number): OpponentPos => {
  if (total === 1) {
    return {
      className: "absolute top-20 left-1/2 -translate-x-1/2 flex flex-col items-center space-y-2 z-20",
      angle: -90
    };
  }
  if (total === 2) {
    if (index === 0) return {
      className: "absolute left-8 top-[48%] -translate-y-1/2 flex flex-col items-center space-y-2 z-20",
      angle: 180
    };
    return {
      className: "absolute right-8 top-[48%] -translate-y-1/2 flex flex-col items-center space-y-2 z-20",
      angle: 0
    };
  }
  if (index === 0) return {
    className: "absolute left-8 top-[48%] -translate-y-1/2 flex flex-col items-center space-y-2 z-20",
    angle: 180
  };
  if (index === 1) return {
    className: "absolute top-20 left-1/2 -translate-x-1/2 flex flex-col items-center space-y-2 z-20",
    angle: -90
  };
  return {
    className: "absolute right-8 top-[48%] -translate-y-1/2 flex flex-col items-center space-y-2 z-20",
    angle: 0
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
  
  const [bulletsFired, setBulletsFired] = useState<number>(0);
  const [currentPosition, setCurrentPosition] = useState<number>(0);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [isFiring, setIsFiring] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(10);
  const [maxTime, setMaxTime] = useState<number>(10);
  const [hudMessage, setHudMessage] = useState<HudMessage | null>(null);
  const [rotationAngle, setRotationAngle] = useState<number>(-90);
  const [isGunInCenter, setIsGunInCenter] = useState<boolean>(false);

  const [isDealing, setIsDealing] = useState<boolean>(false);
  const [revealedCards, setRevealedCards] = useState<Set<string>>(new Set());
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [hoveredCardIndex, setHoveredCardIndex] = useState<number | null>(null);
  const [tilt, setTilt] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [answerIndicator, setAnswerIndicator] = useState<{ playerId: string; correct: boolean } | null>(null);
  const prevHandCardsLength = useRef<number>(0);
  const lastProcessedTriggerRef = useRef<string | null>(null);
  const lastMouseMoveRef = useRef<number>(0);

  const prevPhase = useRef<GamePhase>(phase);
  
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
    setBulletsFired(0);
    setCurrentPosition(0);
    setIsSpinning(false);
    setIsFiring(false);
    setRotationAngle(-90);
    setIsGunInCenter(false);
    setIsDealing(false);
    setRevealedCards(new Set());
    prevHandCardsLength.current = 0;
    lastProcessedTriggerRef.current = null;
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

      setIsGunInCenter(true);
      setIsSpinning(true);
      Sounds.gunClick();
      
      const playerId = triggerResult.playerId;
      let targetAngle = -90;
      
      if (playerId) {
        if (playerId === localId) {
          targetAngle = 90;
        } else {
          const opponentPlayersList = players.filter(p => p.id !== localId);
          const oppIndex = opponentPlayersList.findIndex(p => p.id === playerId);
          if (oppIndex !== -1) {
            const oppPos = getOpponentPosition(oppIndex, opponentPlayersList.length);
            targetAngle = oppPos.angle;
          }
        }
      }
      setRotationAngle(targetAngle);
      
      const spinTimer = setTimeout(() => {
        setIsSpinning(false);
        setIsFiring(true);
        
        const fired = 6 - triggerResult.bulletCount;
        setBulletsFired(fired);
        setCurrentPosition(prev => (prev + 1) % 6);

        if (triggerResult.alive) {
          Sounds.gunSurvive();
          showHUDAlert('CLICK // COCK SURVIVED', 'text-amber-theme', 2000);
        } else {
          Sounds.gunFire();
          showHUDAlert('BANG // PROTOCOL FAULT', 'text-red-theme', 3000);
        }

        const resetFireTimer = setTimeout(() => {
          setIsFiring(false);
          setRotationAngle(-90);
          setIsGunInCenter(false);
        }, 2000);

        return () => clearTimeout(resetFireTimer);
      }, 1200);

      return () => clearTimeout(spinTimer);
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
          if (prev <= 3) {
            Sounds.tick();
          }
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

  const handleCardClick = (card: CardData) => {
    if (phase !== 'choosing' || currentTurnId !== localId) return;
    Sounds.cardPlay();
    if (onCardChoice) {
      onCardChoice(card.id);
    } else {
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
      socketClient.submitAnswer(roomId, letter);
    }
  };

  const handleCardMouseMove = (e: React.MouseEvent<HTMLDivElement>, index: number) => {
    const now = performance.now();
    if (now - lastMouseMoveRef.current < 16) return; // ~60fps throttle
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
  const opponentPlayers = players.filter(p => p.id !== localId);
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

  return (
    <div className="w-full h-full flex flex-col items-center justify-between py-6 px-12 z-10 select-none relative">
      <div className="w-full flex items-center justify-between pb-4 border-b border-border-theme z-30">
        <span className="text-xs font-bold text-text-theme tracking-widest uppercase">
          PROTOCOL // 0{round}
        </span>
        <span className="text-xs font-bold text-emerald-theme tracking-wider">
          ● LINK SECURED
        </span>
        <span className={`text-xs font-bold tracking-widest uppercase ${getHUDPhaseColor()}`}>
          {getHUDPhaseLabel()}
        </span>
      </div>

      {/* Turn Indicator Banner - Removed, using arrow indicator instead */}

      {/* 1. Opponents positioned absolute around the table */}
      {opponentPlayers.map((opponent, index) => {
        const cardCount = opponent.cardsCount || 0;
        const isCurrentTurn = currentTurnId === opponent.id;
        const pos = getOpponentPosition(index, opponentPlayers.length);
        
        return (
          <div key={opponent.id} className={pos.className}>
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
                    ? '// DECRYPTING' 
                    : `CARDS // [0${cardCount}]`
              }
            </span>
            {opponent.isAlive && (
              <span className={`text-[8px] font-mono tracking-wider ${(opponent.shotsFired || 0) >= 4 ? 'text-red-theme' : (opponent.shotsFired || 0) >= 2 ? 'text-amber-theme' : 'text-text-theme-muted'}`}>
                SHOTS // {opponent.shotsFired || 0}/6
              </span>
            )}
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
        {/* Source Deck - Left side */}
        <div className="absolute -left-40 top-1/2 -translate-y-1/2 flex flex-col items-center space-y-2 z-20">
          <div className="w-32 h-44 bg-surface-2 border border-cyan-theme-light rounded-none flex items-center justify-center relative overflow-hidden group hover:border-cyan-theme transition-all duration-300">
            <span className="absolute top-1 left-1.5 text-[8px] font-mono text-cyan-theme-light select-none font-normal">+</span>
            <span className="absolute top-1 right-1.5 text-[8px] font-mono text-cyan-theme-light select-none font-normal">+</span>
            <span className="absolute bottom-1 left-1.5 text-[8px] font-mono text-cyan-theme-light select-none font-normal">+</span>
            <span className="absolute bottom-1 right-1.5 text-[8px] font-mono text-cyan-theme-light select-none font-normal">+</span>
            <span className="text-[10px] font-bold text-cyan-theme-light tracking-widest uppercase text-center leading-relaxed font-mono">
              SOURCE //
              <br />
              DECK
            </span>
          </div>
        </div>

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

            <AnimatePresence mode="wait">
              {playedCard ? (
                <motion.div 
                  key={playedCard.id}
                  initial={{ scale: 0.7, opacity: 0, rotate: -10 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  exit={{ scale: 0.7, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 220, damping: 18 }}
                  className={`w-32 h-44 border rounded-none p-3 flex flex-col justify-between relative shadow-none overflow-hidden bg-card-theme ${
                    playedCard.difficulty === 'easy' 
                      ? 'border-emerald-theme-border text-emerald-theme' 
                      : playedCard.difficulty === 'medium' 
                        ? 'border-amber-theme-border text-amber-theme' 
                        : 'border-red-theme-border text-red-theme'
                  }`}
                >
                  <div className="flex justify-between items-center w-full border-b border-border-theme pb-1 text-[8px] font-mono tracking-wider opacity-60">
                    <span>#{playedCard.id.substring(0, 4).toUpperCase()}</span>
                    <span className={
                      playedCard.difficulty === 'easy' ? 'text-emerald-theme font-extrabold' : playedCard.difficulty === 'medium' ? 'text-amber-theme font-extrabold' : 'text-red-theme font-extrabold'
                    }>{playedCard.difficulty.toUpperCase()}</span>
                  </div>
                  <div className="flex-1 flex items-center justify-center py-1 overflow-y-auto pr-0.5">
                    <p className="text-[10px] font-extrabold leading-normal text-left tracking-wide uppercase font-mono">
                      {playedCard.question.substring(0, 36) + (playedCard.question.length > 36 ? '...' : '')}
                    </p>
                  </div>
                  <div className="flex justify-between items-center w-full border-t border-border-theme pt-1 text-[8px] font-mono tracking-widest opacity-50">
                    <span className="uppercase truncate max-w-[50px]">{playedCard.topic.substring(0, 8)}</span>
                    <span>FP // 0{playedCard.difficulty === 'easy' ? '1' : playedCard.difficulty === 'medium' ? '2' : '3'}</span>
                  </div>
                </motion.div>
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
        className="absolute -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none"
      >
        <Revolver 
          bulletsFired={bulletsFired}
          currentPosition={currentPosition}
          isSpinning={isSpinning}
          isFiring={isFiring}
          alive={triggerResult ? triggerResult.alive : true}
          rotationAngle={rotationAngle}
        />
      </motion.div>

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
              const baseX = dist * 45 + neighborOffset;
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
                  onMouseMove={(e) => isPlayable && handleCardMouseMove(e, index)}
                  onMouseLeave={handleCardMouseLeave}
                  onClick={() => handleCardClick(card)}
                  className={`absolute w-56 h-80 border rounded-none p-5 flex flex-col justify-between select-none overflow-hidden bg-card-theme ${
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
                        <p className={`text-xs font-bold leading-normal text-left tracking-wide font-mono uppercase transition-colors duration-300 ${
                          isHovered ? 'text-text-theme' : 'text-text-theme-secondary'
                        }`}>
                          {card.question.substring(0, isHovered ? 70 : 56) + (card.question.length > (isHovered ? 70 : 56) ? '...' : '')}
                        </p>
                      </div>
                      <div className="flex justify-between items-center w-full border-t border-border-theme pt-1.5 text-[9px] font-mono tracking-widest opacity-50">
                        <span className="uppercase truncate max-w-[80px]">{card.topic.substring(0, 10)}</span>
                        <span>FP // 0{card.difficulty === 'easy' ? '1' : card.difficulty === 'medium' ? '2' : '3'}</span>
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

        <div className="flex items-center gap-4 bg-surface-2 border border-cyan-theme-muted rounded-none p-3 shadow-none">
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
                    ? '// DECRYPTING CHALLENGE' 
                    : 'LINK STATE // SECURED'
              }
            </span>
            {localPlayer.isAlive && (
              <span className={`text-[8px] font-mono tracking-wider mt-1 ${(localPlayer.shotsFired || 0) >= 4 ? 'text-red-theme' : (localPlayer.shotsFired || 0) >= 2 ? 'text-amber-theme' : 'text-text-theme-muted'}`}>
                SHOTS // {localPlayer.shotsFired || 0}/6
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
        {isAnswering && activeQuestion && (
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
                  {isBotSpectating ? 'SPECTATING // DECRYPTING PROTOCOL' : 'DECRYPTING PROTOCOL'} // {activeQuestion.card.topic.toUpperCase()}
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

              <h2 className="text-xl md:text-2xl font-bold text-text-theme text-center mb-8 leading-relaxed max-w-3xl mx-auto uppercase tracking-wider font-mono">
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
                      <div className="w-8 h-8 rounded-none border border-cyan-theme-muted group-hover:border-text-theme bg-transparent flex items-center justify-center font-mono font-black text-xs text-cyan-theme group-hover:text-text-theme transition-colors duration-200">
                        {letter}
                      </div>
                      <span className="text-left leading-normal font-bold font-mono">{answer}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
