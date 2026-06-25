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
  botHudMessage
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
  const prevHandCardsLength = useRef<number>(0);
  const lastProcessedTriggerRef = useRef<string | null>(null);

  useEffect(() => {
    setBulletsFired(0);
    setCurrentPosition(0);
    setIsSpinning(false);
    setIsFiring(false);
    setRotationAngle(-90);
    setIsGunInCenter(false);
    prevHandCardsLength.current = 0;
    lastProcessedTriggerRef.current = null;
  }, [round]);

  useEffect(() => {
    if (handCards.length > 0 && handCards.length !== prevHandCardsLength.current && phase === 'choosing') {
      prevHandCardsLength.current = handCards.length;
      setIsDealing(true);
      setRevealedCards(new Set());

      const dealSequence = async () => {
        for (let i = 0; i < handCards.length; i++) {
          await new Promise(resolve => setTimeout(resolve, i === 0 ? 300 : 200));
          Sounds.cardDeal();
          setRevealedCards(prev => new Set([...prev, handCards[i].id]));
          setTimeout(() => Sounds.cardFlip(), 100);
        }
        await new Promise(resolve => setTimeout(resolve, 400));
        setIsDealing(false);
      };

      dealSequence();
    }
  }, [handCards, phase]);

  useEffect(() => {
    if (triggerResult) {
      // Avoid double triggering if dependency array elements change
      const triggerKey = `${triggerResult.playerId}-${triggerResult.bulletCount}-${triggerResult.alive}`;
      if (lastProcessedTriggerRef.current === triggerKey) return;
      lastProcessedTriggerRef.current = triggerKey;

      setIsGunInCenter(true);
      setIsSpinning(true);
      Sounds.gunClick();
      
      // Calculate target angle based on who is pulling the trigger
      const playerId = triggerResult.playerId;
      let targetAngle = -90; // Default vertical pointing up
      
      if (playerId) {
        if (playerId === localId) {
          targetAngle = 90; // Local player is at bottom-center (pointing down)
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
          showHUDAlert('CLICK // COCK SURVIVED', 'text-amber-400', 2000);
        } else {
          Sounds.gunFire();
          showHUDAlert('BANG // PROTOCOL FAULT', 'text-red-500', 3000);
        }

        const resetFireTimer = setTimeout(() => {
          setIsFiring(false);
          setRotationAngle(-90); // Reset gun orientation back to default after animation
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

  const localPlayer = players.find(p => p.id === localId) || { name: 'YOU', isAlive: true };
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
    if (phase === 'trigger') return 'text-red-500';
    if (phase === 'choosing' || phase === 'answering') return 'text-amber-500';
    return 'text-slate-300';
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-between py-6 px-12 z-10 select-none relative">
      <div className="w-full flex items-center justify-between pb-4 border-b border-white/8 z-30">
        <span className="text-xs font-bold text-white tracking-widest uppercase">
          PROTOCOL // 0{round}
        </span>
        <span className="text-xs font-bold text-emerald-400 tracking-wider">
          ● LINK SECURED
        </span>
        <span className={`text-xs font-bold tracking-widest uppercase ${getHUDPhaseColor()}`}>
          {getHUDPhaseLabel()}
        </span>
      </div>

      {/* 1. Opponents positioned absolute around the table */}
      {opponentPlayers.map((opponent, index) => {
        const cardCount = opponent.cardsCount || 0;
        const isCurrentTurn = currentTurnId === opponent.id;
        const pos = getOpponentPosition(index, opponentPlayers.length);
        
        return (
          <div key={opponent.id} className={pos.className}>
            <div className="relative">
              {/* Active turn indicator grid border */}
              {isCurrentTurn && opponent.isAlive && (
                <motion.div 
                  layoutId="activeTurnGlow"
                  className="absolute -inset-1.5 bg-red-500/10 border border-red-500/40 z-0 rounded-none"
                  animate={{ opacity: [0.4, 0.8, 0.4] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              )}
              <div className={`w-16 h-16 rounded-none bg-[#0a0c12] border flex items-center justify-center font-mono font-black text-base relative z-10 transition-all duration-300 ${
                !opponent.isAlive 
                  ? 'border-red-500/20 text-red-500/30 opacity-40' 
                  : isCurrentTurn 
                    ? 'border-red-500 text-white' 
                    : 'border-cyan-500/20 text-slate-400'
              }`}>
                {/* CAD corner marks on opponent avatar */}
                <span className="absolute top-0.5 left-0.5 text-[6px] font-mono text-cyan-500/20 select-none">+</span>
                <span className="absolute top-0.5 right-0.5 text-[6px] font-mono text-cyan-500/20 select-none">+</span>
                <span className="absolute bottom-0.5 left-0.5 text-[6px] font-mono text-cyan-500/20 select-none">+</span>
                <span className="absolute bottom-0.5 right-0.5 text-[6px] font-mono text-cyan-500/20 select-none">+</span>

                {opponent.name.substring(0, 2).toUpperCase()}
                
                {/* Status indicator (Tech Diamond style) */}
                {opponent.isAlive ? (
                  <span className={`absolute -top-1 -right-1 w-2 h-2 rotate-45 border border-[#14161e] z-20 ${
                    isCurrentTurn ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'
                  }`} />
                ) : (
                  <div className="absolute inset-0 bg-red-950/20 rounded-none flex items-center justify-center">
                    <X size={20} className="text-red-500/60 stroke-[3px]" />
                  </div>
                )}
              </div>
            </div>
            
            <span className="text-xs font-bold font-mono text-slate-300 tracking-wider relative z-10 mt-1">
              {opponent.name}
            </span>
            
            {/* Opponent's face-down cards */}
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
                      className="absolute w-9 h-14 rounded-none border border-cyan-500/20 bg-[#07090e] shadow-none overflow-hidden"
                      style={{ transformOrigin: 'center 120%', zIndex: idx }}
                    >
                      {/* Card back pattern */}
                      <div className="absolute inset-0.5 rounded-none bg-[#0a0d14] flex items-center justify-center overflow-hidden">
                        <div className="absolute inset-0 opacity-10">
                          <div className="absolute inset-0.5 border border-dashed border-cyan-500/40 rounded-none"></div>
                        </div>
                        <div className="w-1.5 h-1.5 rounded-none rotate-45 border border-cyan-500/30 bg-[#0e111a]"></div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            <span className="text-[8px] font-mono text-slate-500 tracking-wider">
              {!opponent.isAlive 
                ? '// TERMINATED' 
                : phase === 'choosing' && isCurrentTurn 
                  ? '// CHOSING_CARD' 
                  : phase === 'answering' && isCurrentTurn 
                    ? '// DECRYPTING' 
                    : `CARDS // [0${cardCount}]`
              }
            </span>
          </div>
        );
      })}

      {opponentPlayers.length === 0 && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 flex flex-col items-center space-y-3 p-6 border border-dashed border-white/8 rounded-2xl bg-black/10 z-20">
          <div className="w-12 h-12 rounded-xl bg-[#1c1f2a]/60 border border-white/5 flex items-center justify-center font-bold text-xs text-slate-600 animate-pulse">
            ?
          </div>
          <span className="text-[10px] font-extrabold text-slate-500 tracking-widest uppercase">
            WAITING FOR OPPONENTS //
          </span>
        </div>
      )}

      {/* 2. Center Table (CAD Blueprint Tactical Radar Center) */}
      <div className="absolute top-[48%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[720px] h-[340px] rounded-none bg-[#090b11]/70 border border-cyan-500/20 backdrop-blur-md shadow-[0_0_30px_rgba(6,182,212,0.05)] flex items-center justify-center gap-16 px-12 z-10 overflow-visible">
        {/* Tactical Crosshair / Radar Center Pattern */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
          <svg className="w-full h-full" viewBox="0 0 720 340" xmlns="http://www.w3.org/2000/svg">
            {/* Concentric targeting circles */}
            <circle cx="360" cy="170" r="140" fill="none" stroke="#38bdf8" strokeWidth="0.8" strokeDasharray="4,6" />
            <circle cx="360" cy="170" r="80" fill="none" stroke="#38bdf8" strokeWidth="0.8" strokeDasharray="2,4" />
            <circle cx="360" cy="170" r="30" fill="none" stroke="#38bdf8" strokeWidth="0.5" />
            
            {/* Axis indicator lines */}
            <line x1="360" y1="10" x2="360" y2="330" stroke="#38bdf8" strokeWidth="0.8" strokeDasharray="3,3" />
            <line x1="180" y1="170" x2="540" y2="170" stroke="#38bdf8" strokeWidth="0.8" strokeDasharray="3,3" />
            
            {/* Corner Crosshairs */}
            <path d="M 20 20 L 40 20 M 20 20 L 20 40" stroke="#38bdf8" strokeWidth="1" />
            <path d="M 700 20 L 680 20 M 700 20 L 700 40" stroke="#38bdf8" strokeWidth="1" />
            <path d="M 20 320 L 40 320 M 20 320 L 20 300" stroke="#38bdf8" strokeWidth="1" />
            <path d="M 700 320 L 680 320 M 700 320 L 700 300" stroke="#38bdf8" strokeWidth="1" />
            
            {/* Radar ticks and Degree labels */}
            <text x="360" y="25" fill="#38bdf8" fontSize="7" fontFamily="monospace" textAnchor="middle">-90° // APEX</text>
            <text x="360" y="325" fill="#38bdf8" fontSize="7" fontFamily="monospace" textAnchor="middle">90° // BASE</text>
            <text x="195" y="173" fill="#38bdf8" fontSize="7" fontFamily="monospace" textAnchor="start">180° // PORT</text>
            <text x="525" y="173" fill="#38bdf8" fontSize="7" fontFamily="monospace" textAnchor="end">0° // STBD</text>
            
            <text x="370" y="160" fill="#38bdf8" fontSize="6" fontFamily="monospace" opacity="0.6">SYS.ROT // {rotationAngle}°</text>
          </svg>
        </div>
        
        {/* Source Deck (Left side of Table) */}
        <div className="flex flex-col items-center space-y-2 z-20">
          <div className="w-32 h-44 bg-[#0a0c12] border border-cyan-500/25 rounded-none flex items-center justify-center relative overflow-hidden group hover:border-cyan-400 transition-all duration-300">
            {/* CAD Corner Ticks */}
            <span className="absolute top-1 left-1.5 text-[8px] font-mono text-cyan-500/40 select-none font-normal">+</span>
            <span className="absolute top-1 right-1.5 text-[8px] font-mono text-cyan-500/40 select-none font-normal">+</span>
            <span className="absolute bottom-1 left-1.5 text-[8px] font-mono text-cyan-500/40 select-none font-normal">+</span>
            <span className="absolute bottom-1 right-1.5 text-[8px] font-mono text-cyan-500/40 select-none font-normal">+</span>
            
            <span className="text-[10px] font-bold text-cyan-500/60 tracking-widest uppercase text-center leading-relaxed font-mono">
              SOURCE //
              <br />
              DECK
            </span>
          </div>
        </div>

        {/* Discard Pile / Played Card (Center of Table) */}
        <div className="flex flex-col items-center space-y-2 z-20">
          <div className="w-32 h-44 bg-[#08090d]/50 border border-cyan-500/20 border-dashed rounded-none flex items-center justify-center relative">
            {/* CAD Corner Ticks */}
            <span className="absolute top-1 left-1.5 text-[8px] font-mono text-cyan-500/30 select-none font-normal">+</span>
            <span className="absolute top-1 right-1.5 text-[8px] font-mono text-cyan-500/30 select-none font-normal">+</span>
            <span className="absolute bottom-1 left-1.5 text-[8px] font-mono text-cyan-500/30 select-none font-normal">+</span>
            <span className="absolute bottom-1 right-1.5 text-[8px] font-mono text-cyan-500/30 select-none font-normal">+</span>

            <AnimatePresence mode="wait">
              {playedCard ? (
                <motion.div 
                  key={playedCard.id}
                  initial={{ scale: 0.7, opacity: 0, rotate: -10 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  exit={{ scale: 0.7, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 220, damping: 18 }}
                  className={`w-32 h-44 border rounded-none p-3 flex flex-col justify-between relative shadow-none overflow-hidden bg-[#090b12] ${
                    playedCard.difficulty === 'easy' 
                      ? 'border-emerald-500/40 text-emerald-100' 
                      : playedCard.difficulty === 'medium' 
                        ? 'border-amber-500/40 text-amber-100' 
                        : 'border-red-500/40 text-red-100'
                  }`}
                >
                  <div className="flex justify-between items-center w-full border-b border-white/5 pb-1 text-[8px] font-mono tracking-wider opacity-60">
                    <span>#{playedCard.id.substring(0, 4).toUpperCase()}</span>
                    <span className={
                      playedCard.difficulty === 'easy' ? 'text-emerald-400 font-extrabold' : playedCard.difficulty === 'medium' ? 'text-amber-400 font-extrabold' : 'text-red-400 font-extrabold'
                    }>{playedCard.difficulty.toUpperCase()}</span>
                  </div>
                  <div className="flex-1 flex items-center justify-center py-1 overflow-y-auto pr-0.5">
                    <p className="text-[10px] font-extrabold leading-normal text-left tracking-wide uppercase font-mono">
                      {playedCard.question.substring(0, 36) + (playedCard.question.length > 36 ? '...' : '')}
                    </p>
                  </div>
                  <div className="flex justify-between items-center w-full border-t border-white/5 pt-1 text-[8px] font-mono tracking-widest opacity-50">
                    <span className="uppercase truncate max-w-[50px]">{playedCard.topic.substring(0, 8)}</span>
                    <span>FP // 0{playedCard.difficulty === 'easy' ? '1' : playedCard.difficulty === 'medium' ? '2' : '3'}</span>
                  </div>
                </motion.div>
              ) : (
                <span className="text-[9px] font-extrabold text-slate-600 tracking-widest uppercase text-center font-mono">
                  AWAITING
                  <br />
                  ATTACK //
                </span>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Revolver Widget - Animates to center when firing */}
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

      {/* 3. Bottom Area: Hand Cards + Local Player Avatar */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center space-y-2 z-20 w-full max-w-2xl">
        {/* Hand Cards container */}
        <div className="flex justify-center items-center h-44 relative w-full">
          <AnimatePresence>
            {handCards.map((card, index) => {
              const total = handCards.length;
              const mid = (total - 1) / 2;
              const dist = index - mid;
              const xOffset = dist * 125;
              const arcY = Math.pow(Math.abs(dist), 1.5) * 22;
              const arcAngle = dist * 8;
              const isPlayable = phase === 'choosing' && isMyTurn;
              const isRevealed = !isDealing || revealedCards.has(card.id);

              const cardInitial = isDealing 
                ? { opacity: 0, x: -300, y: -100, rotateY: 180, scale: 0.6 }
                : { opacity: 0, y: 120, rotate: 0, scale: 0.8 };

              const cardAnimate = isDealing
                ? {
                    opacity: 1,
                    x: xOffset,
                    y: arcY,
                    rotateY: isRevealed ? 0 : 180,
                    rotate: arcAngle,
                    scale: 1
                  }
                : {
                    opacity: isPlayable ? 1 : 0.3,
                    x: xOffset,
                    y: arcY,
                    rotateY: 0,
                    rotate: arcAngle,
                    scale: 1
                  };

              const cardTransition = isDealing
                ? {
                    type: "spring" as const,
                    stiffness: 120,
                    damping: 15,
                    delay: index * 0.2,
                    rotateY: { duration: 0.4, delay: index * 0.2 + 0.2 }
                  }
                : {
                    type: "spring" as const,
                    stiffness: 180,
                    damping: 20,
                    delay: index * 0.03
                  };

              return (
                <motion.div
                  key={card.id}
                  layout
                  initial={cardInitial}
                  animate={cardAnimate}
                  exit={{ opacity: 0, y: -80 }}
                  transition={cardTransition}
                  whileHover={(!isDealing && isPlayable) ? { 
                    y: arcY - 75, 
                    rotate: 0, 
                    scale: 1.12, 
                    zIndex: 50, 
                    transition: { type: "spring", stiffness: 350, damping: 15 } 
                  } : {}}
                  onClick={() => !isDealing && handleCardClick(card)}
                  className={`absolute w-56 h-80 border rounded-none p-5 flex flex-col justify-between select-none group shadow-none transition-all duration-300 overflow-hidden bg-[#090b12] ${
                    isRevealed
                      ? card.difficulty === 'easy'
                        ? 'border-emerald-500/25 text-emerald-100 hover:border-emerald-400'
                        : card.difficulty === 'medium'
                          ? 'border-amber-500/25 text-amber-100 hover:border-amber-400'
                          : 'border-red-500/25 text-red-100 hover:border-red-400'
                      : 'bg-[#07090e] border-cyan-500/10'
                  }`}
                  style={{ transformOrigin: 'center 110%', zIndex: index, perspective: '1000px' }}
                >
                  {/* CAD Corner Ticks */}
                  <span className="absolute top-1 left-1.5 text-[8px] font-mono text-cyan-500/30 select-none font-normal">+</span>
                  <span className="absolute top-1 right-1.5 text-[8px] font-mono text-cyan-500/30 select-none font-normal">+</span>
                  <span className="absolute bottom-1 left-1.5 text-[8px] font-mono text-cyan-500/30 select-none font-normal">+</span>
                  <span className="absolute bottom-1 right-1.5 text-[8px] font-mono text-cyan-500/30 select-none font-normal">+</span>

                  {isRevealed ? (
                    <>
                      <div className="flex justify-between items-center w-full border-b border-white/5 pb-1.5 text-[9px] font-mono tracking-wider opacity-60">
                        <span>#{card.id.substring(0, 4).toUpperCase()}</span>
                        <span className={
                          card.difficulty === 'easy' ? 'text-emerald-400 font-extrabold' : card.difficulty === 'medium' ? 'text-amber-400 font-extrabold' : 'text-red-400 font-extrabold'
                        }>{card.difficulty.toUpperCase()}</span>
                      </div>
                      <div className="flex-1 flex items-center justify-center py-2 overflow-y-auto pr-0.5">
                        <p className="text-xs font-bold leading-normal text-left tracking-wide font-mono uppercase text-slate-300">
                          {card.question.substring(0, 56) + (card.question.length > 56 ? '...' : '')}
                        </p>
                      </div>
                      <div className="flex justify-between items-center w-full border-t border-white/5 pt-1.5 text-[9px] font-mono tracking-widest opacity-50">
                        <span className="uppercase truncate max-w-[80px]">{card.topic.substring(0, 10)}</span>
                        <span>FP // 0{card.difficulty === 'easy' ? '1' : card.difficulty === 'medium' ? '2' : '3'}</span>
                      </div>
                    </>
                  ) : (
                    <div className="absolute inset-1 rounded-none border border-cyan-500/10 bg-[#07090e] flex items-center justify-center overflow-hidden">
                      <div className="absolute inset-0 opacity-10">
                        <div className="absolute inset-1 border border-dashed border-cyan-500/30 rounded-none"></div>
                      </div>
                      <div className="w-3 h-3 rounded-none rotate-45 border border-cyan-500/20 bg-[#0e111a]"></div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Local Player Avatar & Status Details */}
        <div className="flex items-center gap-4 bg-[#0a0c12] border border-cyan-500/20 rounded-none p-3 shadow-none px-6">
          <div className={`w-12 h-12 rounded-none bg-[#07090e] border flex items-center justify-center font-mono font-black text-base relative transition-all duration-300 ${
            !localPlayer.isAlive ? 'border-red-500/20 opacity-30 bg-red-950/10' : 'border-cyan-500/40'
          }`}>
            {localPlayer.name.substring(0, 2).toUpperCase()}
            {!localPlayer.isAlive ? (
              <div className="absolute inset-0 bg-red-950/20 rounded-none flex items-center justify-center">
                <X size={20} className="text-red-500/60 stroke-[3px]" />
              </div>
            ) : (
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rotate-45 bg-emerald-400" />
            )}
          </div>
          <div className="flex flex-col items-start leading-none">
            <span className="text-sm font-bold text-white tracking-wide uppercase flex items-center gap-1.5 font-mono">
              {localPlayer.name} 
              <span className="text-[8px] text-slate-500 font-extrabold tracking-wider bg-white/3 px-1.5 py-0.5 rounded">// YOU</span>
            </span>
            <span className="text-[9px] font-mono font-extrabold text-slate-500 tracking-wider mt-1">
              {!localPlayer.isAlive 
                ? '// TERMINATED' 
                : phase === 'choosing' && isMyTurn 
                  ? '// YOUR TURN // SELECT CARD' 
                  : phase === 'answering' && isAnswering 
                    ? '// DECRYPTING CHALLENGE' 
                    : 'LINK STATE // SECURED'
              }
            </span>
          </div>
          {!localPlayer.isAlive && (
            <button 
              onClick={onLeaveAfterDeath}
              className="ml-4 px-4 py-2 bg-[#120a0b] border border-red-500/30 hover:border-red-500 hover:bg-red-950/20 rounded-none text-[9px] font-mono font-bold text-red-400 tracking-widest uppercase flex items-center gap-1 transition-all duration-300 cursor-pointer"
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
            <div className="bg-[#1c1f2a]/95 border border-white/8 px-8 py-5 rounded-xl shadow-2xl flex items-center gap-3">
              <ShieldWarning size={20} className="text-red-500 animate-pulse" />
              <span className={`text-md font-extrabold tracking-widest uppercase ${hudMessage?.color || botHudMessage?.color || 'text-white'}`}>
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
            className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div 
              initial={{ scale: 0.98, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.98, y: 15, opacity: 0 }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              className="bg-[#07090f] border-2 border-cyan-500/30 rounded-none p-10 max-w-4xl w-full flex flex-col relative overflow-hidden shadow-[0_0_50px_rgba(6,182,212,0.05)]"
            >
              {/* CAD Corner Ticks */}
              <span className="absolute top-2 left-2 text-[10px] font-mono text-cyan-500/30 select-none font-normal">+</span>
              <span className="absolute top-2 right-2 text-[10px] font-mono text-cyan-500/30 select-none font-normal">+</span>
              <span className="absolute bottom-2 left-2 text-[10px] font-mono text-cyan-500/30 select-none font-normal">+</span>
              <span className="absolute bottom-2 right-2 text-[10px] font-mono text-cyan-500/30 select-none font-normal">+</span>

              <div className="flex justify-between items-center mb-6">
                <span className="text-[10px] text-cyan-500/60 font-bold tracking-widest uppercase flex items-center gap-2 font-mono">
                  <span className="w-1.5 h-1.5 rotate-45 bg-red-500 animate-pulse"></span>
                  DECRYPTING PROTOCOL // {activeQuestion.card.topic.toUpperCase()}
                </span>
                <span className={`text-lg font-mono font-bold tracking-widest ${
                  timeLeft <= 3 ? 'text-red-500 animate-pulse font-black' : 'text-slate-400'
                }`}>
                  0{timeLeft}S
                </span>
              </div>

              <div className="w-full h-1.5 bg-[#05070a] border border-cyan-500/10 rounded-none overflow-hidden mb-6">
                <motion.div 
                  initial={{ width: '100%' }}
                  animate={{ width: `${(timeLeft / maxTime) * 100}%` }}
                  transition={{ duration: 1, ease: "linear" }}
                  className={`h-full rounded-none transition-colors duration-300 ${timeLeft <= 3 ? 'bg-red-500' : 'bg-cyan-500'}`}
                />
              </div>

              <h2 className="text-xl md:text-2xl font-bold text-white text-center mb-8 leading-relaxed max-w-3xl mx-auto uppercase tracking-wider font-mono">
                {activeQuestion.card.question}
              </h2>

              <div className="flex flex-col space-y-3 w-full">
                {Object.entries(activeQuestion.card.answers).map(([letter, answer]) => {
                  const isCorrectAnswer = questionResult && letter === questionResult.correctAnswer;
                  const isMyWrongAnswer = questionResult && !questionResult.correct && letter === selectedAnswer;
                  
                  let buttonStyle = "bg-[#0b0d14]/80 border-cyan-500/20 text-slate-300 hover:border-cyan-400 hover:text-black hover:bg-cyan-500";
                  if (questionResult) {
                    if (isCorrectAnswer) {
                      buttonStyle = "bg-emerald-950/40 border-emerald-500/60 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]";
                    } else if (isMyWrongAnswer) {
                      buttonStyle = "bg-red-950/40 border-red-500/60 text-red-400";
                    } else {
                      buttonStyle = "opacity-10 border-transparent text-slate-700";
                    }
                  }

                  return (
                    <button 
                      key={letter}
                      disabled={questionResult !== null || isSpectating}
                      onClick={() => handleAnswerSubmit(letter)}
                      className={`w-full py-5 px-8 border text-base font-bold tracking-widest uppercase rounded-none flex items-center gap-4 transition-all duration-200 relative overflow-hidden group ${isSpectating ? 'cursor-not-allowed' : 'cursor-pointer'} ${buttonStyle}`}
                    >
                      <div className="w-8 h-8 rounded-none border border-cyan-500/30 group-hover:border-black/50 bg-transparent flex items-center justify-center font-mono font-black text-xs text-cyan-400 group-hover:text-black transition-colors duration-200">
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
