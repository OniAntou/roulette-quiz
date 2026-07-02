import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { socketClient } from '../network/SocketClient';
import { ArrowLeft, Plus, Users, Shield, CheckCircle, WarningCircle, Copy } from '@phosphor-icons/react';
import { Player } from '../types';
import { Sounds } from '../audio/Sounds';
import { ThemeToggle } from './ThemeToggle';
import { ChatBox } from './ChatBox';

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
  const [copied, setCopied] = useState<boolean>(false);
  const [isBrowseOpen, setIsBrowseOpen] = useState<boolean>(false);
  const [availableRooms, setAvailableRooms] = useState<{id: string, players: number, max: number}[]>([]);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isPublicMode, setIsPublicMode] = useState<boolean>(true);

  const handleCopyCode = async () => {
    if (!roomId) return;
    await navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    const onRoomList = (data: { rooms: { id: string; players: number; max: number }[] }) => {
      setAvailableRooms(data.rooms);
      setIsRefreshing(false);
    };
    
    socketClient.on('room:list_result', onRoomList);
    
    return () => {
      socketClient.off('room:list_result', onRoomList);
    };
  }, []);

  const openBrowse = () => {
    Sounds.buttonClick();
    setIsBrowseOpen(true);
    refreshRooms();
  };

  const closeBrowse = () => {
    setIsBrowseOpen(false);
  };

  const refreshRooms = () => {
    setIsRefreshing(true);
    socketClient.getRooms();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isBrowseOpen && e.key === 'Escape') {
        closeBrowse();
        return;
      }
      
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

    const handleGlobalPaste = (e: ClipboardEvent) => {
      if (!isModalOpen) return;
      const pasted = e.clipboardData?.getData('text')?.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6);
      if (pasted && pasted.length > 0) {
        setModalCode(pasted);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('paste', handleGlobalPaste);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('paste', handleGlobalPaste);
    };
  }, [isModalOpen, modalCode, isBrowseOpen]);

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
    socketClient.createRoom(socketClient.playerName || 'GUEST', isPublicMode);
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
    <>
      <div className="fixed top-5 right-5 z-50"><ThemeToggle /></div>
      <div className="w-full max-w-6xl px-4 sm:px-6 md:px-12 grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12 md:gap-20 items-start z-10 relative py-6 sm:py-8">
      <div className="flex flex-col space-y-8">
        <div className="flex flex-col space-y-2">
          <span className="text-[10px] text-text-theme-muted font-extrabold tracking-widest uppercase">LOBBY // ROOM_WAITING_STATE</span>
          <h2 className="text-sm font-extrabold text-text-theme-secondary">
            {roomId ? 'PROTOCOL SECURED' : 'AWAITING PROTOCOL ACTION...'}
          </h2>
        </div>

        <div className="relative border border-border-theme rounded-2xl p-6 sm:p-10 bg-panel-solid/80 backdrop-blur-md flex flex-col justify-center items-center overflow-hidden max-w-sm w-full shadow-lg">
          <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-red-theme-border"></div>
          <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-red-theme-border"></div>
          <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-red-theme-border"></div>
          <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-red-theme-border"></div>
          <span className="text-[9px] text-text-theme-muted font-extrabold tracking-widest uppercase mb-4">ROOM_ACCESS_CODE</span>
          <span className="text-5xl sm:text-6xl md:text-7xl font-black tracking-[6px] sm:tracking-[10px] text-text-theme select-text">
            {roomId || '------'}
          </span>
          {roomId && (
            <button
              onClick={() => { handleCopyCode(); Sounds.buttonClick(); }}
              className={`mt-4 px-4 py-2 text-[10px] font-extrabold tracking-widest uppercase rounded-lg border transition-all duration-300 cursor-pointer flex items-center gap-2 ${
                copied
                  ? 'border-emerald-theme-border text-emerald-theme'
                  : 'border-border-theme text-text-theme-muted hover:border-cyan-theme hover:text-cyan-theme'
              }`}
            >
              {copied ? (
                <><CheckCircle size={14} /><span>COPIED!</span></>
              ) : (
                <><Copy size={14} /><span>COPY</span></>
              )}
            </button>
          )}
        </div>

        <div className="flex flex-col space-y-4 max-w-sm w-full">
          {!roomId ? (
            <>
              <div className="flex flex-col space-y-3 w-full">
                <button 
                  onClick={handleCreate}
                  className="group w-full py-5 sm:py-6 bg-panel-solid/80 backdrop-blur-md border border-border-theme hover:border-red-theme-border hover:bg-surface-2 rounded-2xl text-sm sm:text-base font-extrabold text-text-theme-secondary tracking-widest uppercase flex items-center justify-between px-5 sm:px-8 transition-all duration-300 overflow-hidden"
                >
                  <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-red-theme scale-y-0 group-hover:scale-y-100 transition-transform duration-300 origin-center"></div>
                  <span className="flex items-center gap-3 transition-transform duration-300 group-hover:translate-x-2">
                    <Plus size={24} className="text-text-theme-muted group-hover:text-red-theme transition-colors" /> 
                    CREATE PROTOCOL
                  </span>
                  <span className="group-hover:translate-x-1.5 transition-transform duration-300">↗</span>
                </button>
                
                <div 
                  onClick={() => { Sounds.buttonHover(); setIsPublicMode(!isPublicMode); }}
                  className="flex items-center justify-end gap-3 cursor-pointer select-none px-2 group"
                >
                  <span className={`text-[9px] font-extrabold tracking-widest uppercase transition-colors ${isPublicMode ? 'text-emerald-theme' : 'text-text-theme-muted group-hover:text-red-theme'}`}>
                    {isPublicMode ? 'PUBLIC (LISTED)' : 'PRIVATE (HIDDEN)'}
                  </span>
                  <div className={`w-8 h-4 rounded-full border flex items-center p-0.5 transition-all duration-300 ${isPublicMode ? 'bg-emerald-theme/20 border-emerald-theme/50' : 'bg-surface-2 border-border-theme'}`}>
                    <div className={`w-2.5 h-2.5 rounded-full transition-transform duration-300 ${isPublicMode ? 'bg-emerald-theme translate-x-4' : 'bg-text-theme-muted translate-x-0'}`} />
                  </div>
                </div>
              </div>
              <button 
                onClick={openModal}
                className="group w-full py-5 sm:py-6 bg-panel-solid/80 backdrop-blur-md border border-border-theme hover:border-red-theme-border hover:bg-surface-2 rounded-2xl text-sm sm:text-base font-extrabold text-text-theme-secondary tracking-widest uppercase flex items-center justify-between px-5 sm:px-8 transition-all duration-300 overflow-hidden"
              >
                <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-red-theme scale-y-0 group-hover:scale-y-100 transition-transform duration-300 origin-center"></div>
                <span className="flex items-center gap-3 transition-transform duration-300 group-hover:translate-x-2">
                  <Shield size={24} className="text-text-theme-muted group-hover:text-red-theme transition-colors" /> 
                  JOIN PROTOCOL
                </span>
                <span className="group-hover:translate-x-1.5 transition-transform duration-300">↗</span>
              </button>
              <button 
                onClick={openBrowse}
                className="group w-full py-5 sm:py-6 bg-panel-solid/80 backdrop-blur-md border border-border-theme hover:border-emerald-theme-border hover:bg-surface-2 rounded-2xl text-sm sm:text-base font-extrabold text-text-theme-secondary tracking-widest uppercase flex items-center justify-between px-5 sm:px-8 transition-all duration-300 overflow-hidden"
              >
                <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-emerald-theme scale-y-0 group-hover:scale-y-100 transition-transform duration-300 origin-center"></div>
                <span className="flex items-center gap-3 transition-transform duration-300 group-hover:translate-x-2">
                  <Users size={24} className="text-text-theme-muted group-hover:text-emerald-theme transition-colors" /> 
                  BROWSE OPEN PROTOCOLS
                </span>
                <span className="group-hover:translate-x-1.5 transition-transform duration-300">↗</span>
              </button>
            </>
          ) : (
            <button 
              onClick={toggleReady}
              className={`w-full py-5 sm:py-6 rounded-2xl text-sm sm:text-base font-extrabold tracking-widest uppercase flex items-center justify-center transition-all duration-300 border cursor-pointer ${
                isReady 
                  ? 'bg-emerald-theme-bg border-emerald-theme-border text-emerald-theme hover:bg-emerald-theme-bg-hover' 
                  : 'bg-red-theme-bg border-red-theme-border text-red-theme hover:bg-red-theme-bg-hover'
              }`}
            >
              {isReady ? 'AWAITING PROTOCOL START...' : 'ENGAGE READY STATE'}
            </button>
          )}
        </div>

        <button onClick={disconnect}
          className="max-w-max flex items-center gap-2 text-text-theme-muted hover:text-text-theme hover:translate-x-[-2px] transition-all text-xs font-bold tracking-wider uppercase cursor-pointer"
        >
          <ArrowLeft size={18} /> RETURN_TO_MENU
        </button>
      </div>

      <div className="flex flex-col space-y-4 w-full">
        <span className="text-xs text-text-theme-muted font-extrabold tracking-widest uppercase mb-1">CONNECTED ENTITIES //</span>
        <div className="flex flex-col space-y-3 w-full">
          {players.length === 0 ? (
            <div className="text-text-theme-muted text-xs italic py-6 px-6 border border-dashed border-border-theme rounded-2xl bg-input-theme flex items-center gap-3">
              <Users size={18} className="text-text-theme-dim animate-pulse" /> Connecting link is idle...
            </div>
          ) : (
            players.map((player) => (
              <div key={player.id}
                className="w-full bg-panel-solid/80 backdrop-blur-sm border border-border-theme rounded-2xl px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between shadow-sm hover:border-border-theme-strong transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center font-black text-sm sm:text-base ${
                    player.id === localId 
                      ? 'bg-emerald-theme-bg text-emerald-theme border border-emerald-theme-border' 
                      : 'bg-red-theme-bg text-red-theme border border-red-theme-border'
                  }`}>
                    {player.name.substring(0, 2).toUpperCase()}
                  </div>
                  <span className="text-sm sm:text-base font-extrabold text-text-theme tracking-wide uppercase">
                    {player.name} {player.id === localId && <span className="text-[11px] text-text-theme-muted font-normal italic">(YOU)</span>}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-extrabold tracking-wider ${
                    player.isReady ? 'text-emerald-theme font-black' : 'text-red-theme font-black'
                  }`}>
                    {player.isReady ? 'READY' : 'AWAITING'}
                  </span>
                  {player.isReady ? (
                    <CheckCircle size={24} className="text-emerald-theme" />
                  ) : (
                    <WarningCircle size={24} className="text-red-theme animate-pulse" />
                  )}
                </div>
              </div>
            ))
          )}
        </div>
        {error && (
          <div className="text-[10px] text-red-theme font-extrabold tracking-widest uppercase border border-red-theme-border bg-red-theme-bg px-4 py-3 rounded-xl max-w-sm mt-4 shadow-md">
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
            className="fixed inset-0 bg-overlay-solid/90 backdrop-blur-md flex items-center justify-center z-50 p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0, x: shakeModal ? [0, -10, 10, -10, 10, 0] : 0 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              transition={{ type: shakeModal ? "keyframes" : "spring", stiffness: 350, damping: 25 }}
              className="glass-panel rounded-2xl p-8 max-w-md w-full flex flex-col items-center relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-border-theme-strong to-transparent"></div>
              <h3 className="text-[10px] text-text-theme-muted font-extrabold tracking-widest uppercase mb-6 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-theme animate-pulse"></span>
                DECRYPT_ACCESS_CODE //
              </h3>
              <div className="flex space-x-2 sm:space-x-2.5 mb-6" onPaste={handlePaste}>
                {[0, 1, 2, 3, 4, 5].map((index) => {
                  const char = modalCode[index] || '';
                  const isActive = index === modalCode.length;
                  return (
                    <div key={index} 
                      className={`w-11 h-11 sm:w-14 sm:h-14 bg-surface-2 rounded-xl border flex items-center justify-center text-xl sm:text-2xl font-black text-red-theme transition-all duration-300 shadow-inner ${
                        isActive ? 'border-red-theme scale-105' : 'border-border-theme'
                      }`}
                    >
                      {char}
                    </div>
                  );
                })}
              </div>
              <span className="text-xs text-text-theme-dim font-semibold tracking-wide mb-6">
                // Type 6 characters. Press ENTER to connect.
              </span>
              <div className="flex gap-3 sm:gap-4 w-full">
                <button onClick={closeModal}
                  className="flex-1 py-3 sm:py-4 bg-surface-2 border border-border-theme hover:border-red-theme-border text-[10px] sm:text-xs font-extrabold text-text-theme-muted tracking-wider uppercase rounded-xl hover:text-text-theme hover:bg-red-theme-bg transition-all duration-300 cursor-pointer"
                >
                  CANCEL // ESC
                </button>
                <button onClick={handleJoinSubmit}
                  className="flex-1 py-3 sm:py-4 bg-red-theme-bg border border-red-theme-border hover:border-red-theme text-[10px] sm:text-xs font-extrabold text-red-theme tracking-wider uppercase rounded-xl hover:bg-red-theme-bg-hover transition-all duration-300 cursor-pointer"
                >
                  CONFIRM // ENTER
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {isBrowseOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-overlay-solid/90 backdrop-blur-md flex items-center justify-center z-50 p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              className="glass-panel rounded-2xl p-8 max-w-lg w-full flex flex-col relative overflow-hidden max-h-[80vh]"
            >
              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-border-theme-strong to-transparent"></div>
              
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-[10px] text-emerald-theme font-extrabold tracking-widest uppercase flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-theme animate-pulse"></span>
                  OPEN_PROTOCOLS_SCANNER //
                </h3>
                <button onClick={refreshRooms} className="text-[9px] text-text-theme-muted hover:text-text-theme transition-colors font-bold uppercase tracking-widest border border-border-theme px-3 py-1.5 rounded-lg cursor-pointer">
                  {isRefreshing ? 'SCANNING...' : 'REFRESH'}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 space-y-3 min-h-[200px]">
                {availableRooms.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-8 text-text-theme-muted italic border border-dashed border-border-theme rounded-xl">
                    <span className="text-xs mb-2 block">NO OPEN PROTOCOLS DETECTED</span>
                    <span className="text-[9px] opacity-70">Initiate your own protocol to begin.</span>
                  </div>
                ) : (
                  availableRooms.map((room) => (
                    <div 
                      key={room.id}
                      onClick={() => {
                        Sounds.buttonClick();
                        socketClient.joinRoom(room.id, socketClient.playerName || 'GUEST');
                        closeBrowse();
                      }}
                      className="group cursor-pointer bg-surface-2 hover:bg-emerald-theme-bg border border-border-theme hover:border-emerald-theme-border rounded-xl p-4 flex items-center justify-between transition-all duration-300"
                    >
                      <div className="flex flex-col">
                        <span className="font-mono text-text-theme group-hover:text-emerald-theme font-bold tracking-widest uppercase transition-colors">
                          PROTOCOL_{room.id}
                        </span>
                        <span className="text-[9px] text-text-theme-muted tracking-widest mt-1">
                          STATUS: WAITING_FOR_SUBJECTS
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-xs font-mono font-bold text-text-theme-muted group-hover:text-emerald-theme transition-colors">
                          {room.players} / {room.max}
                        </span>
                        <div className="w-8 h-8 rounded-lg bg-input-theme group-hover:bg-emerald-theme-bg border border-border-theme group-hover:border-emerald-theme flex items-center justify-center transition-all">
                          <span className="text-text-theme-muted group-hover:text-emerald-theme transition-colors font-bold">↗</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-6 w-full">
                <button onClick={closeBrowse}
                  className="w-full py-4 bg-surface-2 border border-border-theme hover:border-red-theme-border text-xs font-extrabold text-text-theme-muted tracking-wider uppercase rounded-xl hover:text-text-theme hover:bg-red-theme-bg transition-all duration-300 cursor-pointer"
                >
                  CLOSE_SCANNER // ESC
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
      <ChatBox roomId={roomId} localId={localId} />
    </>
  );
}
