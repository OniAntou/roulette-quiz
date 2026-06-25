import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { socketClient } from '../network/SocketClient';
import { ArrowLeft, Plus, Users, Shield, CheckCircle, WarningCircle } from '@phosphor-icons/react';
import { Player } from '../types';
import { Sounds } from '../audio/Sounds';

interface LobbyProps {
  roomId: string;
  players: Player[];
  localId: string;
  error: string;
  disconnect: () => void;
}

export function Lobby({ roomId, players, localId, error, disconnect }: LobbyProps) {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalCode, setModalCode] = useState<string>('');
  const [shakeModal, setShakeModal] = useState<boolean>(false);
  const [isReady, setIsReady] = useState<boolean>(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isModalOpen) return;

      if (e.key === 'Escape') {
        closeModal();
      } else if (e.key === 'Backspace') {
        setModalCode(prev => prev.slice(0, -1));
      } else if (e.key === 'Enter') {
        handleJoinSubmit();
      } else if (e.key.length === 1 && modalCode.length < 6) {
        const regex = /^[a-zA-Z0-9]$/;
        if (regex.test(e.key)) {
          setModalCode(prev => prev + e.key.toUpperCase());
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, modalCode]);

  const openModal = () => {
    Sounds.buttonClick();
    setModalCode('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleCreate = () => {
    Sounds.buttonClick();
    socketClient.createRoom(socketClient.playerName || 'GUEST');
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6);
    if (pasted.length > 0) {
      setModalCode(pasted);
    }
  };

  const handleJoinSubmit = () => {
    if (modalCode.length === 6) {
      Sounds.buttonClick();
      socketClient.joinRoom(modalCode, socketClient.playerName || 'GUEST');
      closeModal();
    } else {
      Sounds.wrong();
      setShakeModal(true);
      setTimeout(() => setShakeModal(false), 500);
    }
  };

  const toggleReady = () => {
    if (!roomId) return;
    const nextReady = !isReady;
    setIsReady(nextReady);
    socketClient.toggleReady(roomId);
  };

  return (
    <div className="w-full max-w-6xl px-12 grid grid-cols-1 md:grid-cols-2 gap-12 items-start z-10 relative">
      <div className="flex flex-col space-y-8">
        <div className="flex flex-col space-y-2">
          <span className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">LOBBY // ROOM_WAITING_STATE</span>
          <h2 className="text-sm font-semibold text-slate-300">
            {roomId ? 'PROTOCOL SECURED' : 'AWAITING PROTOCOL ACTION...'}
          </h2>
        </div>

        <div className="relative border border-white/5 rounded-xl p-8 bg-[#1c1f2a] flex flex-col justify-center items-center overflow-hidden max-w-sm">
          <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-red-500"></div>
          <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-red-500"></div>
          <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-red-500"></div>
          <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-red-500"></div>
          <span className="text-[9px] text-slate-500 font-bold tracking-widest uppercase mb-4">ROOM_ACCESS_CODE</span>
          <span className="text-5xl font-light tracking-[8px] text-white select-text">
            {roomId || '------'}
          </span>
        </div>

        <div className="flex flex-col space-y-4 max-w-sm">
          {!roomId ? (
            <>
              <button 
                onClick={handleCreate}
                className="group w-full py-4 bg-[#1c1f2a] border border-white/8 hover:border-red-500/40 hover:bg-slate-900 rounded-xl text-[11px] font-bold text-slate-300 tracking-widest uppercase flex items-center justify-between px-6 transition-all duration-200"
              >
                <span className="flex items-center gap-2"><Plus size={16} /> CREATE PROTOCOL</span>
                <span>↗</span>
              </button>
              <button 
                onClick={openModal}
                className="group w-full py-4 bg-[#1c1f2a] border border-white/8 hover:border-red-500/40 hover:bg-slate-900 rounded-xl text-[11px] font-bold text-slate-300 tracking-widest uppercase flex items-center justify-between px-6 transition-all duration-200"
              >
                <span className="flex items-center gap-2"><Shield size={16} /> JOIN PROTOCOL</span>
                <span>↗</span>
              </button>
            </>
          ) : (
            <button 
              onClick={toggleReady}
              className={`w-full py-4 rounded-xl text-[11px] font-bold tracking-widest uppercase flex items-center justify-center transition-all duration-300 ${
                isReady 
                  ? 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-400' 
                  : 'bg-red-950/20 border border-red-500/30 text-red-400 hover:bg-red-950/40'
              }`}
            >
              {isReady ? 'AWAITING PROTOCOL START...' : 'ENGAGE READY STATE'}
            </button>
          )}
        </div>

        <button onClick={disconnect}
          className="max-w-max flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-[10px] font-bold tracking-wider uppercase cursor-pointer"
        >
          <ArrowLeft size={14} /> RETURN_TO_MENU
        </button>
      </div>

      <div className="flex flex-col space-y-4">
        <span className="text-[10px] text-slate-500 font-bold tracking-widest uppercase mb-1">CONNECTED ENTITIES //</span>
        <div className="flex flex-col space-y-3">
          {players.length === 0 ? (
            <div className="text-slate-500 text-xs italic py-4 flex items-center gap-2">
              <Users size={16} /> Connecting link is idle...
            </div>
          ) : (
            players.map((player) => (
              <div key={player.id}
                className="w-full bg-[#1c1f2a] border border-white/5 rounded-xl px-5 py-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                    player.id === localId 
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/20' 
                      : 'bg-red-950/40 text-red-400 border border-red-500/20'
                  }`}>
                    {player.name.substring(0, 2).toUpperCase()}
                  </div>
                  <span className="text-sm font-bold text-white tracking-wide uppercase">
                    {player.name} {player.id === localId && <span className="text-[9px] text-slate-500 font-normal italic">(YOU)</span>}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] font-bold tracking-wider ${
                    player.isReady ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {player.isReady ? 'READY' : 'AWAITING'}
                  </span>
                  {player.isReady ? (
                    <CheckCircle size={16} className="text-emerald-400" />
                  ) : (
                    <WarningCircle size={16} className="text-red-400 animate-pulse" />
                  )}
                </div>
              </div>
            ))
          )}
        </div>
        {error && (
          <div className="text-[10px] text-red-500 font-bold tracking-widest uppercase border border-red-500/20 bg-red-950/10 px-3 py-2 rounded max-w-sm mt-4">
            EXCEPTION // {error}
          </div>
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#14161e]/80 backdrop-blur-md flex items-center justify-center z-50"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 30 }}
              animate={{ scale: 1, y: 0, x: shakeModal ? [0, -10, 10, -10, 10, 0] : 0 }}
              exit={{ scale: 0.95, y: 20, opacity: 0 }}
              transition={{ type: shakeModal ? "keyframes" : "spring", stiffness: 300, damping: 25 }}
              className="bg-[#1c1f2a] border border-white/8 rounded-xl p-8 max-w-md w-full flex flex-col items-center"
            >
              <h3 className="text-[10px] text-slate-500 font-bold tracking-widest uppercase mb-6">DECRYPT_ACCESS_CODE //</h3>
              <div className="flex space-x-2 mb-6" onPaste={handlePaste}>
                {[0, 1, 2, 3, 4, 5].map((index) => {
                  const char = modalCode[index] || '';
                  const isActive = index === modalCode.length;
                  return (
                    <div key={index} 
                      className={`w-11 h-11 bg-[#252833] rounded-lg border flex items-center justify-center text-lg font-extrabold text-red-500 transition-all ${
                        isActive ? 'border-red-500' : 'border-white/5'
                      }`}
                    >
                      {char}
                    </div>
                  );
                })}
              </div>
              <span className="text-[9px] text-slate-600 tracking-wide mb-6">
                // Type 6 characters. Press ENTER to connect.
              </span>
              <div className="flex gap-4 w-full">
                <button onClick={closeModal}
                  className="flex-1 py-2 bg-[#252833] border border-white/5 hover:border-red-500/20 text-[9px] font-bold text-slate-400 tracking-wider uppercase rounded-lg hover:text-white transition-all cursor-pointer"
                >
                  CANCEL // ESC
                </button>
                <button onClick={handleJoinSubmit}
                  className="flex-1 py-2 bg-red-950/20 border border-red-500/30 hover:border-red-500 text-[9px] font-bold text-red-400 tracking-wider uppercase rounded-lg hover:bg-red-950/40 transition-all cursor-pointer"
                >
                  CONFIRM // ENTER
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
