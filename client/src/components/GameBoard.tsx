import React from 'react';
import { Player, Card, TriggerResult, GamePhase } from '../types';
import { socketClient } from '../network/SocketClient';
import { Sounds } from '../audio/Sounds';
import { Revolver } from './Revolver';

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
}

export const GameBoard: React.FC<GameBoardProps> = ({
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
}) => {
  const localPlayer = players.find(p => p.id === localId);
  const isLocalTurn = currentTurnId === localId && phase === 'choosing';
  const isDead = localPlayer ? !localPlayer.isAlive : false;

  const handlePlayCard = (card: Card) => {
    if (!isLocalTurn) return;
    if (card.type === 'NUMBER' && card.value! <= currentNumber) {
      alert(`Bài số phải lớn hơn ${currentNumber}!`);
      return;
    }
    Sounds.buttonClick();
    if (onCardChoice) {
      onCardChoice(card.id);
    } else {
      socketClient.send('game:play_card', { roomId, cardId: card.id });
    }
  };

  const handlePullTrigger = () => {
    if (!isLocalTurn) return;
    Sounds.buttonClick();
    if (onPullTrigger) {
      onPullTrigger();
    } else {
      socketClient.send('game:pull_trigger', { roomId });
    }
  };

  const handleMulligan = () => {
    if (!isLocalTurn) return;
    if (localPlayer?.left) return;
    Sounds.buttonClick();
    if (onMulligan) {
      onMulligan();
    } else {
      socketClient.send('game:mulligan', { roomId });
    }
  };

  const getCardColor = (type: string) => {
    switch (type) {
      case 'NUMBER': return 'bg-gray-800 border-gray-600 text-white';
      case 'JOKER': return 'bg-yellow-600 border-yellow-400 text-black font-bold';
      case 'SKIP': return 'bg-blue-600 border-blue-400 text-white';
      case 'REVERSE': return 'bg-purple-600 border-purple-400 text-white';
      case 'BLOCK': return 'bg-green-600 border-green-400 text-white';
      case 'STANDOFF': return 'bg-red-800 border-red-500 text-white animate-pulse';
      default: return 'bg-gray-800 text-white';
    }
  };

  const renderCard = (card: Card, onClick?: () => void, disabled?: boolean) => {
    return (
      <button
        key={card.id}
        disabled={disabled}
        onClick={onClick}
        className={`relative w-24 h-32 md:w-32 md:h-44 rounded-lg border-2 shadow-lg flex flex-col items-center justify-center transition-all 
          ${getCardColor(card.type)} 
          ${disabled ? 'opacity-50 cursor-not-allowed scale-95' : 'hover:-translate-y-4 hover:shadow-cyan-500/50 cursor-pointer'}
        `}
      >
        <span className="text-xl md:text-3xl font-black drop-shadow-md">
          {card.type === 'NUMBER' ? card.value : card.type}
        </span>
      </button>
    );
  };

  return (
    <div className="w-full h-full flex flex-col items-center bg-gray-900 text-white overflow-hidden relative">
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-red-500 uppercase tracking-widest drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]">
          ĐÈ SỐ - VÒNG {round}
        </h1>
        <div className="text-sm text-gray-400">
          Hướng đánh: {direction === 1 ? 'Thuận ➡️' : 'Nghịch ⬅️'}
        </div>
      </div>

      <div className="absolute top-4 right-4 flex gap-6 z-10">
        {players.filter(p => p.id !== localId).map(p => (
          <div key={p.id} className={`flex flex-col items-center p-2 rounded ${p.id === currentTurnId ? 'ring-2 ring-yellow-400 bg-yellow-400/20' : ''} ${!p.isAlive ? 'opacity-50 grayscale' : ''}`}>
            <span className="font-bold text-sm">{p.name}</span>
            <span className="text-xs">{!p.isAlive ? '💀 DEAD' : `${p.cardsCount} cards`}</span>
            <span className="text-xs text-red-400">{p.shotsFired || 0} shots</span>
          </div>
        ))}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center w-full relative z-0">
        <div className="absolute top-1/3 text-center pointer-events-none">
          <div className="text-6xl font-black text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.8)]">
            {currentNumber > 0 ? currentNumber : 'BÀN TRỐNG'}
          </div>
          <div className="text-sm text-cyan-200 mt-2 tracking-widest uppercase opacity-75">
            Số hiện tại
          </div>
        </div>

        {phase === 'trigger' && triggerResult && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-50">
            <div className="text-center">
              <Revolver
                bulletsFired={triggerResult.bulletsFired || 0}
                currentPosition={triggerResult.currentPosition || 0}
                isFiring={true}
                isSpinning={false}
                alive={triggerResult.alive}
                showShotEffect={true}
                rotationAngle={0}
              />
              <h2 className="text-4xl font-black mt-8 text-white uppercase tracking-widest">
                {triggerResult.playerName}
              </h2>
              <div className={`text-6xl font-black mt-4 uppercase tracking-widest ${triggerResult.alive ? 'text-green-500 drop-shadow-[0_0_20px_rgba(34,197,94,0.8)]' : 'text-red-600 drop-shadow-[0_0_30px_rgba(220,38,38,1)]'}`}>
                {triggerResult.alive ? '* CLICK *' : '* BANG *'}
              </div>
            </div>
          </div>
        )}

        {playedCard && phase !== 'trigger' && (
          <div className="absolute mt-32 z-20 animate-bounce">
            {renderCard(playedCard, undefined, true)}
          </div>
        )}
      </div>

      <div className="absolute bottom-0 w-full p-6 flex flex-col items-center bg-gradient-to-t from-black to-transparent pt-32">
        <div className="absolute left-6 bottom-6 flex flex-col">
          <span className="text-xl font-bold">{localPlayer?.name} (Bạn)</span>
          <span className="text-sm text-red-400">Đã bóp cò: {localPlayer?.shotsFired || 0} lần</span>
          {isDead && <span className="text-xl font-black text-red-600 uppercase mt-2">💀 ĐÃ CHẾT</span>}
        </div>

        {isLocalTurn && !isDead && (
          <div className="flex gap-4 mb-8">
            <button
              onClick={handlePullTrigger}
              className="px-8 py-3 bg-red-600 hover:bg-red-500 text-white font-black text-xl rounded shadow-[0_0_15px_rgba(220,38,38,0.6)] uppercase tracking-wider transition-transform hover:scale-110 active:scale-95"
            >
              🔫 BÓP CÒ
            </button>
            <button
              onClick={handleMulligan}
              className="px-8 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xl rounded shadow-[0_0_15px_rgba(8,145,178,0.6)] uppercase tracking-wider transition-transform hover:scale-110 active:scale-95"
            >
              🔄 ĐỔI BÀI
            </button>
          </div>
        )}

        <div className={`flex gap-2 md:gap-4 overflow-x-auto w-full max-w-5xl px-4 pb-4 ${!isLocalTurn || isDead ? 'opacity-50 pointer-events-none' : ''}`}>
          {handCards.map((card) => {
            let disabled = false;
            if (card.type === 'NUMBER' && card.value! <= currentNumber) {
              disabled = true;
            }
            return renderCard(card, () => handlePlayCard(card), disabled);
          })}
        </div>
      </div>

      {isDead && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/90 p-8 border-2 border-red-600 rounded-lg text-center z-50 shadow-[0_0_50px_rgba(220,38,38,0.6)]">
          <h2 className="text-4xl font-black text-red-600 mb-4">YOU DIED</h2>
          <button
            onClick={onLeaveAfterDeath}
            className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded font-bold transition-colors"
          >
            Về Sảnh Chờ
          </button>
        </div>
      )}
    </div>
  );
};
