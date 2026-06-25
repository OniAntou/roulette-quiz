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

  const [isDealing, setIsDealing] = useState<boolean>(false);
  const [dealtCards, setDealtCards] = useState<CardData[]>([]);
  const [revealedCards, setRevealedCards] = useState<Set<string>>(new Set());
  const prevHandCardsLength = useRef<number>(0);

  useEffect(() => {
    setBulletsFired(0);
    setCurrentPosition(0);
    setIsSpinning(false);
    setIsFiring(false);
    prevHandCardsLength.current = 0;
  }, [round]);

  useEffect(() => {
    if (handCards.length > 0 && handCards.length !== prevHandCardsLength.current && phase === 'choosing') {
      prevHandCardsLength.current = handCards.length;
      setIsDealing(true);
      setRevealedCards(new Set());
      setDealtCards(handCards);

      const dealSequence = async () => {
        for (let i = 0; i < handCards.length; i++) {
          await new Promise(resolve => setTimeout(resolve, i === 0 ? 300 : 200));
          Sounds.cardDeal();
          setRevealedCards(prev => new Set([...prev, handCards[i].id]));
          setTimeout(() => Sounds.cardFlip(), 100);
        }
        await new Promise(resolve => setTimeout(resolve, 400));
        setIsDealing(false);
        setDealtCards([]);
      };

      dealSequence();
    }
  }, [handCards, phase]);

  useEffect(() => {
    if (triggerResult) {
      setIsSpinning(true);
      Sounds.gunClick();
      
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
        }, 2000);

        return () => clearTimeout(resetFireTimer);
      }, 1200);

      return () => clearTimeout(spinTimer);
    }
  }, [triggerResult]);

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

  const handleAnswerSubmit = (letter: string) => {
    Sounds.buttonClick();
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
        <span className="text-[11px] font-bold text-white tracking-widest uppercase">
          PROTOCOL // 0{round}
        </span>
        <span className="text-[10px] font-bold text-emerald-400 tracking-wider">
          ● LINK SECURED
        </span>
        <span className={`text-[11px] font-bold tracking-widest uppercase ${getHUDPhaseColor()}`}>
          {getHUDPhaseLabel()}
        </span>
      </div>

      <div className="flex items-start justify-center space-x-10 mt-4">
        {opponentPlayers.map((opponent) => {
          const cardCount = opponent.cardsCount || 0;
          return (
            <div key={opponent.id} className="flex flex-col items-center space-y-3">
              <div className="relative">
                <div className={`w-12 h-12 rounded-lg bg-[#1c1f2a] border flex items-center justify-center font-bold text-xs ${
                  !opponent.isAlive ? 'border-red-500/30 opacity-30' : 'border-red-500/60'
                }`}>
                  {opponent.name.substring(0, 2).toUpperCase()}
                  {!opponent.isAlive && (
                    <X size={20} className="absolute text-red-500 stroke-[3px]" />
                  )}
                </div>
              </div>
              <span className="text-[11px] font-bold text-white tracking-wider uppercase">
                {opponent.name}
              </span>
              
              {/* Opponent's face-down cards */}
              {opponent.isAlive && cardCount > 0 && (
                <div className="flex justify-center items-center h-20 relative">
                  {Array.from({ length: cardCount }).map((_, index) => {
                    const total = cardCount;
                    const mid = (total - 1) / 2;
                    const dist = index - mid;
                    const xOffset = dist * 28;
                    const arcY = Math.abs(dist) * 4;
                    const arcAngle = dist * 6;

                    return (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: -30 }}
                        animate={{ opacity: 1, y: arcY, x: xOffset, rotate: arcAngle }}
                        transition={{ type: "spring", stiffness: 200, damping: 20, delay: index * 0.05 }}
                        className="absolute w-11 h-16 rounded-md border border-white/10 bg-[#1a1d26] shadow-lg"
                        style={{ transformOrigin: 'center 120%', zIndex: index }}
                      >
                        {/* Card back pattern */}
                        <div className="absolute inset-1 rounded border border-white/5 bg-[#181b24] flex items-center justify-center overflow-hidden">
                          <div className="absolute inset-0 opacity-20">
                            <div className="absolute inset-1 border border-dashed border-white/10 rounded"></div>
                            <div className="absolute inset-2 border border-dotted border-white/5 rounded"></div>
                          </div>
                          <div className="w-4 h-4 rounded-full border border-white/10 bg-[#1e2028]"></div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              <span className="text-[9px] font-bold text-slate-500 tracking-wider">
                {!opponent.isAlive 
                  ? '// TERMINATED' 
                  : phase === 'choosing' && currentTurnId !== localId 
                    ? '// THINKING_CARDS' 
                    : phase === 'answering' && currentTurnId === localId 
                      ? '// DECRYPTING' 
                      : `CARDS // [0${cardCount}]`
                }
              </span>
            </div>
          );
        })}
        {opponentPlayers.length === 0 && (
          <div className="flex flex-col items-center space-y-2">
            <div className="w-12 h-12 rounded-lg bg-[#1c1f2a] border border-white/10 flex items-center justify-center font-bold text-xs text-slate-500">
              ?
            </div>
            <span className="text-[11px] font-bold text-slate-500 tracking-wider uppercase">
              WAITING...
            </span>
          </div>
        )}
      </div>

      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-8 items-center my-auto">
        <div className="flex justify-center md:justify-start">
          <div className="w-28 h-40 bg-[#1c1f2a] border border-white/5 rounded-xl flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/3 to-transparent"></div>
            <span className="text-[9px] font-bold text-slate-600 tracking-widest uppercase text-center leading-relaxed">
              SOURCE //
              <br />
              DECK
            </span>
          </div>
        </div>

        <div className="flex justify-center">
          <div className="w-64 h-64 bg-[#1c1f2a]/40 border border-white/5 rounded-xl flex items-center justify-center relative">
            <AnimatePresence mode="wait">
              {playedCard ? (
                <motion.div 
                  key={playedCard.id}
                  initial={{ scale: 0.8, opacity: 0, y: 50 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 20 }}
                  className={`w-36 h-52 border rounded-xl p-5 flex flex-col justify-between relative shadow-lg ${
                    playedCard.difficulty === 'easy' 
                      ? 'bg-[#0f2e22]/90 border-emerald-500/40 text-emerald-100' 
                      : playedCard.difficulty === 'medium' 
                        ? 'bg-[#33260f]/90 border-amber-500/40 text-amber-100' 
                        : 'bg-[#341113]/90 border-red-500/40 text-red-100'
                  }`}
                >
                  <p className="text-[11px] font-semibold leading-relaxed text-left mt-2">
                    {playedCard.question}
                  </p>
                  <span className="absolute bottom-2 right-4 text-4xl font-light text-white/5 select-none">Q</span>
                </motion.div>
              ) : (
                <div className="flex flex-col items-center justify-center space-y-2">
                  <div className="w-36 h-52 border border-white/5 border-dashed rounded-xl flex items-center justify-center">
                    <span className="text-[9px] font-bold text-slate-600 tracking-widest uppercase">
                      AWAITING ATTACK //
                    </span>
                  </div>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="flex justify-center md:justify-end">
          <div className="bg-[#1c1f2a]/40 border border-white/5 rounded-xl px-8 py-6 max-w-max flex flex-col items-center">
            <span className="text-[9px] font-bold text-slate-500 tracking-widest uppercase mb-4">FIREPOWER //</span>
            <Revolver 
              bulletsFired={bulletsFired}
              currentPosition={currentPosition}
              isSpinning={isSpinning}
              isFiring={isFiring}
              alive={triggerResult ? triggerResult.alive : true}
            />
          </div>
        </div>
      </div>

      <div className="w-full flex flex-col items-center space-y-6">
        <div className="flex justify-center items-center h-28 relative">
          <AnimatePresence>
            {isDealing ? (
              dealtCards.map((card, index) => {
                const total = dealtCards.length;
                const mid = (total - 1) / 2;
                const dist = index - mid;
                const xOffset = dist * 75;
                const arcY = Math.pow(Math.abs(dist), 1.5) * 14;
                const arcAngle = dist * 10;
                const isRevealed = revealedCards.has(card.id);

                return (
                  <motion.div
                    key={`dealing-${card.id}`}
                    initial={{ opacity: 0, x: -300, y: -100, rotateY: 180, scale: 0.6 }}
                    animate={{
                      opacity: 1,
                      x: xOffset,
                      y: arcY,
                      rotateY: isRevealed ? 0 : 180,
                      rotate: arcAngle,
                      scale: 1
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 120,
                      damping: 15,
                      delay: index * 0.2,
                      rotateY: { duration: 0.4, delay: index * 0.2 + 0.2 }
                    }}
                    className={`absolute w-36 h-52 border rounded-xl p-5 flex flex-col justify-between shadow-xl ${
                      isRevealed
                        ? card.difficulty === 'easy'
                          ? 'bg-[#0f2e22]/95 border-emerald-500/40 text-emerald-100'
                          : card.difficulty === 'medium'
                            ? 'bg-[#33260f]/95 border-amber-500/40 text-amber-100'
                            : 'bg-[#341113]/95 border-red-500/40 text-red-100'
                        : 'bg-[#1a1d26] border-white/10'
                    }`}
                    style={{ transformOrigin: 'center 110%', zIndex: index, perspective: '1000px' }}
                  >
                    {isRevealed ? (
                      <>
                        <p className="text-[11px] font-semibold leading-relaxed text-left mt-2">
                          {card.question.substring(0, 56) + (card.question.length > 56 ? '...' : '')}
                        </p>
                        <span className="absolute bottom-2 right-4 text-4xl font-light text-white/3 select-none">Q</span>
                      </>
                    ) : (
                      <div className="absolute inset-1 rounded border border-white/5 bg-[#181b24] flex items-center justify-center overflow-hidden">
                        <div className="absolute inset-0 opacity-20">
                          <div className="absolute inset-1 border border-dashed border-white/10 rounded"></div>
                          <div className="absolute inset-2 border border-dotted border-white/5 rounded"></div>
                        </div>
                        <div className="w-4 h-4 rounded-full border border-white/10 bg-[#1e2028]"></div>
                      </div>
                    )}
                  </motion.div>
                );
              })
            ) : (
              handCards.map((card, index) => {
                const total = handCards.length;
                const mid = (total - 1) / 2;
                const dist = index - mid;
                const xOffset = dist * 75;
                const arcY = Math.pow(Math.abs(dist), 1.5) * 14;
                const arcAngle = dist * 10;
                const isPlayable = phase === 'choosing' && isMyTurn;

                return (
                  <motion.div
                    key={card.id}
                    initial={{ opacity: 0, y: 120, rotate: 0, scale: 0.8 }}
                    animate={{ opacity: isPlayable ? 1 : 0.3, y: arcY, x: xOffset, rotate: arcAngle, scale: 1 }}
                    exit={{ opacity: 0, y: -80 }}
                    transition={{ type: "spring", stiffness: 180, damping: 20, delay: index * 0.03 }}
                    whileHover={isPlayable ? { y: arcY - 60, rotate: 0, scale: 1.12, zIndex: 50, transition: { type: "spring", stiffness: 300, damping: 18 } } : {}}
                    onClick={() => handleCardClick(card)}
                    className={`absolute w-36 h-52 border rounded-xl p-5 flex flex-col justify-between cursor-pointer select-none group shadow-xl transition-shadow duration-200 hover:shadow-2xl ${
                      card.difficulty === 'easy'
                        ? 'bg-[#0f2e22]/95 border-emerald-500/40 text-emerald-100 hover:border-emerald-400'
                        : card.difficulty === 'medium'
                          ? 'bg-[#33260f]/95 border-amber-500/40 text-amber-100 hover:border-amber-400'
                          : 'bg-[#341113]/95 border-red-500/40 text-red-100 hover:border-red-400'
                    }`}
                    style={{ transformOrigin: 'center 110%', zIndex: index }}
                  >
                    <p className="text-[11px] font-semibold leading-relaxed text-left mt-2">
                      {card.question.substring(0, 56) + (card.question.length > 56 ? '...' : '')}
                    </p>
                    <span className="absolute bottom-2 right-4 text-4xl font-light text-white/3 select-none">Q</span>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Local Player Info - Left side */}
      <div className="absolute bottom-6 left-6 z-20">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg bg-[#1c1f2a] border flex items-center justify-center font-bold text-xs ${
            !localPlayer.isAlive ? 'border-red-500/30 opacity-30' : 'border-emerald-500/60'
          }`}>
            {localPlayer.name.substring(0, 2).toUpperCase()}
            {!localPlayer.isAlive && (
              <X size={20} className="absolute text-red-500 stroke-[3px]" />
            )}
          </div>
          <div className="flex flex-col items-start leading-none">
            <span className="text-sm font-extrabold text-white tracking-wide uppercase">
              {localPlayer.name} <span className="text-[9px] text-slate-500 font-normal italic">(YOU)</span>
            </span>
            <span className="text-[9px] font-bold text-slate-500 tracking-wider mt-1">
              {!localPlayer.isAlive 
                ? '// TERMINATED' 
                : phase === 'choosing' && isMyTurn 
                  ? '// YOUR TURN // SELECT A CARD' 
                  : phase === 'answering' && isAnswering 
                    ? '// DECRYPTING CHALLENGE' 
                    : 'LINK STATE // SECURED'
              }
            </span>
          </div>
          {!localPlayer.isAlive && (
            <button 
              onClick={onLeaveAfterDeath}
              className="ml-4 px-4 py-2 bg-red-950/20 border border-red-500/30 hover:bg-red-950/40 rounded-lg text-[10px] font-bold text-red-400 tracking-widest uppercase flex items-center gap-2 transition-all duration-200"
            >
              <ArrowLeft size={12} />
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
            className="fixed inset-0 bg-[#14161e]/80 backdrop-blur-md flex items-center justify-center z-50"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20, opacity: 0 }}
              className="bg-[#1c1f2a] border border-white/8 rounded-xl p-8 max-w-2xl w-full flex flex-col"
            >
              <div className="flex justify-between items-center mb-6">
                <span className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">
                  DECRYPTING PROTOCOL // {activeQuestion.card.topic.toUpperCase()}
                </span>
                <span className={`text-[11px] font-bold tracking-wider ${
                  timeLeft <= 3 ? 'text-red-500 animate-ping' : 'text-slate-400'
                }`}>
                  0{timeLeft}s
                </span>
              </div>

              <div className="w-full h-[3px] bg-white/5 rounded-full overflow-hidden mb-6">
                <motion.div 
                  initial={{ width: '100%' }}
                  animate={{ width: `${(timeLeft / maxTime) * 100}%` }}
                  transition={{ duration: 1, ease: "linear" }}
                  className="h-full bg-red-500"
                />
              </div>

              <h2 className="text-xl md:text-2xl font-bold text-white text-center mb-8 leading-relaxed max-w-xl mx-auto">
                {activeQuestion.card.question}
              </h2>

              <div className="flex flex-col space-y-3 w-full">
                {Object.entries(activeQuestion.card.answers).map(([letter, answer]) => {
                  const isCorrectAnswer = questionResult && letter === questionResult.correctAnswer;
                  const isWrongAnswer = questionResult && !questionResult.correct && letter !== questionResult.correctAnswer;
                  
                  let buttonStyle = "bg-[#252833] border-white/5 text-slate-300 hover:border-red-500/40 hover:text-white";
                  if (questionResult) {
                    if (isCorrectAnswer) {
                      buttonStyle = "bg-emerald-950/40 border-emerald-500/60 text-emerald-400";
                    } else if (isWrongAnswer) {
                      buttonStyle = "bg-red-950/20 border-red-500/10 text-slate-600 opacity-50";
                    } else {
                      buttonStyle = "opacity-20 border-transparent text-slate-600";
                    }
                  }

                  return (
                    <button 
                      key={letter}
                      disabled={questionResult !== null || isSpectating}
                      onClick={() => handleAnswerSubmit(letter)}
                      className={`w-full py-3.5 px-6 border text-xs font-semibold tracking-wide uppercase rounded-xl flex items-center gap-4 transition-all duration-200 ${isSpectating ? 'cursor-not-allowed' : 'cursor-pointer'} ${buttonStyle}`}
                    >
                      <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center font-bold text-[10px] text-slate-500">
                        {letter}
                      </div>
                      <span className="text-left leading-normal">{answer}</span>
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
