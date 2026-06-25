import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, WifiHigh, Globe, Robot } from '@phosphor-icons/react';
import { ConnectionStatus } from '../types';
import { Sounds } from '../audio/Sounds';

const RANDOM_NAMES = [
  'PHANTOM', 'CIPHER', 'GHOST', 'ROGUE', 'SHADOW', 'NEXUS', 'VIPER', 'STORM',
  'BLAZE', 'FROST', 'RAVEN', 'TITAN', 'SPARK', 'VENOM', 'WRAITH', 'ZENITH',
  'APEX', 'BOLT', 'CRUX', 'DRIFT', 'ECHO', 'FLUX', 'GRID', 'HAZE',
  'ION', 'JOLT', 'KNOT', 'LYNX', 'MESH', 'NOVA', 'ONYX', 'PELT',
  'QUARK', 'RIFT', 'SURGE', 'TALON', 'ULTRA', 'VOID', 'WAVE', 'XENON',
  'YIELD', 'ZERO', 'ATLAS', 'BRISK', 'CORAL', 'DAWN', 'EDGE', 'FOAM',
  'GUST', 'HAWK', 'IRON', 'JADE', 'KARMA', 'LUNA', 'MIST', 'NEON',
  'OPAL', 'PEARL', 'RAIN', 'SAGE', 'TEAL', 'UNITY', 'VALE', 'WHISPER'
];

function getRandomName(): string {
  return RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
}

interface MainMenuProps {
  connect: (mode: string, name: string, ip?: string) => void;
  startBot: (count: number) => void;
  error: string;
  status: ConnectionStatus;
}

export function MainMenu({ connect, startBot, error, status }: MainMenuProps) {
  const [name, setName] = useState<string>('GUEST');
  const [showBotModal, setShowBotModal] = useState<boolean>(false);
  const [showLanModal, setShowLanModal] = useState<boolean>(false);
  const [lanServers, setLanServers] = useState<any[]>([]);
  const [selectedBotCount, setSelectedBotCount] = useState<number>(1);
  const [manualIp, setManualIp] = useState<string>('');
  const [isSearchingLan, setIsSearchingLan] = useState<boolean>(false);

  const handleSubmit = (mode: string, ip?: string) => {
    Sounds.buttonClick();
    const finalName = name.trim().toUpperCase() || getRandomName();
    connect(mode, finalName, ip);
  };

  const handleLanClick = async () => {
    Sounds.buttonClick();
    setShowLanModal(true);
    setIsSearchingLan(true);
    try {
      const baseHost = window.location.hostname || 'localhost';
      const res = await fetch(`http://${baseHost}:3000/lan-servers`);
      const data = await res.json();
      setLanServers(data.servers || []);
    } catch (e) {
      console.error('Failed to fetch LAN servers', e);
    } finally {
      setIsSearchingLan(false);
    }
  };

  const handleBotStart = () => {
    Sounds.buttonClick();
    const finalName = name.trim().toUpperCase() || getRandomName();
    startBot(selectedBotCount);
  };

  return (
    <div className="w-full max-w-6xl px-6 md:px-12 grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20 items-center z-10 py-10">
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col space-y-8"
      >
        <div className="inline-flex max-w-max px-3 py-1 bg-red-950/20 border border-red-500/30 rounded text-[9px] font-bold text-red-400 tracking-widest uppercase shadow-[0_0_15px_rgba(239,68,68,0.05)]">
          SECURE CONNECTION PROTOCOL //
        </div>
        <h1 className="text-6xl sm:text-7xl lg:text-8xl font-black tracking-tighter leading-[0.85] text-transparent bg-clip-text bg-gradient-to-br from-white via-slate-100 to-slate-500">
          ROULETTE<br />
          <span className="text-slate-500 drop-shadow-[0_0_30px_rgba(255,255,255,0.05)]">PROTOCOL.</span>
        </h1>
        <p className="text-slate-400 text-sm md:text-base leading-relaxed max-w-[45ch] font-medium">
          The ultimate high-stakes trivia multiplayer system. Decrypted for elite minds. Answer correctly or pull the trigger. Survive to conquer.
        </p>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
        className="flex flex-col space-y-6"
      >
        {/* Username access terminal */}
        <div className="bg-[#1c1f2a]/80 backdrop-blur-md border border-white/8 rounded-2xl p-6 flex flex-col space-y-3 relative overflow-hidden transition-all duration-300 focus-within:border-red-500/50 focus-within:shadow-[0_0_30px_rgba(239,68,68,0.08)] group">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-red-500/30 to-transparent"></div>
          <label className="text-[9px] font-extrabold text-slate-500 tracking-wider flex justify-between items-center">
            <span>USER_IDENTIFICATION_KEY</span>
            <span className="text-red-500/60 font-mono group-focus-within:animate-pulse">ACTIVE_LINK</span>
          </label>
          <div className="flex items-center space-x-2">
            <input 
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value.substring(0, 12).toUpperCase())}
              disabled={status === 'connecting'}
              className="bg-transparent text-2xl font-black text-white focus:outline-none w-full uppercase tracking-wide placeholder-slate-700"
              placeholder="ENTER_NAME"
            />
            <span className="terminal-cursor text-2xl font-bold text-red-500">_</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col space-y-4">
          <button 
            onClick={() => handleSubmit('online')}
            disabled={status === 'connecting'}
            className="group relative flex items-center justify-between px-6 py-4.5 bg-[#1c1f2a]/80 backdrop-blur-md border border-white/8 rounded-2xl text-[12px] font-bold text-slate-300 tracking-widest uppercase cursor-pointer hover:border-red-500/40 hover:text-white hover:shadow-[0_0_25px_rgba(239,68,68,0.12)] transition-all duration-300 overflow-hidden"
          >
            <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-red-500 scale-y-0 group-hover:scale-y-100 transition-transform duration-300 origin-center"></div>
            <span className="flex items-center gap-4 transition-transform duration-300 group-hover:translate-x-2">
              <Globe size={18} className="text-slate-500 group-hover:text-red-500 transition-colors" />
              INITIALIZE ONLINE
            </span>
            <ArrowRight size={18} className="text-slate-500 group-hover:text-red-500 group-hover:translate-x-1 transition-all duration-300" />
          </button>

          <button 
            onClick={handleLanClick}
            disabled={status === 'connecting'}
            className="group relative flex items-center justify-between px-6 py-4.5 bg-[#1c1f2a]/80 backdrop-blur-md border border-white/8 rounded-2xl text-[12px] font-bold text-slate-300 tracking-widest uppercase cursor-pointer hover:border-red-500/40 hover:text-white hover:shadow-[0_0_25px_rgba(239,68,68,0.12)] transition-all duration-300 overflow-hidden"
          >
            <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-red-500 scale-y-0 group-hover:scale-y-100 transition-transform duration-300 origin-center"></div>
            <span className="flex items-center gap-4 transition-transform duration-300 group-hover:translate-x-2">
              <WifiHigh size={18} className="text-slate-500 group-hover:text-red-500 transition-colors" />
              LOCAL PROTOCOL // LAN
            </span>
            <ArrowRight size={18} className="text-slate-500 group-hover:text-red-500 group-hover:translate-x-1 transition-all duration-300" />
          </button>

          <button 
            onClick={() => setShowBotModal(true)}
            disabled={status === 'connecting'}
            className="group relative flex items-center justify-between px-6 py-4.5 bg-[#1c1f2a]/80 backdrop-blur-md border border-white/8 rounded-2xl text-[12px] font-bold text-slate-300 tracking-widest uppercase cursor-pointer hover:border-emerald-500/40 hover:text-white hover:shadow-[0_0_25px_rgba(16,185,129,0.12)] transition-all duration-300 overflow-hidden"
          >
            <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-emerald-500 scale-y-0 group-hover:scale-y-100 transition-transform duration-300 origin-center"></div>
            <span className="flex items-center gap-4 transition-transform duration-300 group-hover:translate-x-2">
              <Robot size={18} className="text-slate-500 group-hover:text-emerald-500 transition-colors" />
              BOT PROTOCOL // VS CPU
            </span>
            <ArrowRight size={18} className="text-slate-500 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all duration-300" />
          </button>
        </div>

        {status === 'connecting' && (
          <div className="text-[10px] text-amber-500 font-extrabold tracking-widest uppercase flex items-center gap-3 bg-amber-500/5 border border-amber-500/20 px-4 py-3 rounded-xl">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            INITIALIZING CENTRAL SERVER LINK...
          </div>
        )}
        
        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-[10px] text-red-500 font-extrabold tracking-widest uppercase border border-red-500/20 bg-red-950/20 px-4 py-3 rounded-xl shadow-[0_0_15px_rgba(239,68,68,0.05)]"
          >
            EXCEPTION // {error}
          </motion.div>
        )}

        <div className="text-[10px] text-slate-600 tracking-wide font-semibold text-center md:text-left">
          // Type your name and initialize connection state. ESC to drop socket link.
        </div>
      </motion.div>

      <AnimatePresence>
        {showLanModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#0c0d12]/90 backdrop-blur-md flex items-center justify-center z-50 p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              className="glass-panel rounded-2xl p-8 max-w-lg w-full flex flex-col relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
              <h3 className="text-[10px] text-slate-500 font-extrabold tracking-widest uppercase mb-5 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                LOCAL PROTOCOL // DISCOVERED SERVERS
              </h3>
              
              <div className="flex flex-col space-y-3 mb-6 max-h-48 overflow-y-auto pr-1">
                {isSearchingLan ? (
                  <div className="text-[10px] text-amber-500 font-extrabold tracking-widest uppercase flex items-center gap-3 p-5 border border-white/5 rounded-xl bg-white/2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                    </span>
                    SCANNING LOCAL FREQUENCIES...
                  </div>
                ) : lanServers.length > 0 ? (
                  lanServers.map((server, i) => (
                    <button
                      key={i}
                      onClick={() => { setShowLanModal(false); handleSubmit('lan', `${server.ip}:${server.port}`); }}
                      className="flex items-center justify-between p-4 bg-[#252833]/50 border border-white/5 rounded-xl hover:border-emerald-500/40 hover:bg-emerald-950/20 transition-all duration-300 cursor-pointer group"
                    >
                      <div className="flex flex-col items-start gap-1">
                        <span className="text-sm font-extrabold text-slate-300 group-hover:text-emerald-400 transition-colors uppercase">{server.name}</span>
                        <span className="text-[9px] text-slate-500 tracking-wider font-mono bg-black/30 px-2 py-0.5 rounded">{server.ip}:{server.port}</span>
                      </div>
                      <ArrowRight size={18} className="text-slate-500 group-hover:text-emerald-500 group-hover:translate-x-1.5 transition-all duration-300" />
                    </button>
                  ))
                ) : (
                  <div className="text-[10px] text-slate-500 font-bold tracking-widest uppercase p-6 border border-dashed border-white/8 rounded-xl text-center bg-black/10">
                    NO ACTIVE SERVERS FOUND ON LOCAL NETWORK
                  </div>
                )}
              </div>

              <h3 className="text-[10px] text-slate-500 font-extrabold tracking-widest uppercase mb-3">MANUAL OVERRIDE // ENTER IP</h3>
              <div className="flex space-x-3 mb-8">
                <input 
                  type="text"
                  placeholder="192.168.1.X:3000"
                  value={manualIp}
                  onChange={(e) => setManualIp(e.target.value)}
                  className="flex-1 bg-[#252833]/50 border border-white/8 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-red-500/50 focus:shadow-[0_0_15px_rgba(239,68,68,0.05)] font-mono transition-all uppercase"
                />
                <button
                  onClick={() => {
                    if(manualIp) {
                      setShowLanModal(false);
                      handleSubmit('lan', manualIp);
                    }
                  }}
                  className="px-6 py-3 bg-red-950/30 border border-red-500/30 text-[10px] font-extrabold text-red-400 tracking-wider uppercase rounded-xl hover:bg-red-950/60 hover:border-red-500 transition-all duration-300 cursor-pointer"
                >
                  CONNECT
                </button>
              </div>

              <div className="flex justify-end border-t border-white/5 pt-4">
                <button onClick={() => setShowLanModal(false)}
                  className="px-6 py-2.5 bg-[#252833]/50 border border-white/8 hover:border-red-500/30 text-[10px] font-extrabold text-slate-400 tracking-wider uppercase rounded-xl hover:text-white hover:bg-red-950/10 transition-all duration-300 cursor-pointer"
                >
                  ABORT CONNECTIONS
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showBotModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#0c0d12]/90 backdrop-blur-md flex items-center justify-center z-50 p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              className="glass-panel rounded-2xl p-8 max-w-md w-full flex flex-col items-center relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent"></div>
              <h3 className="text-[10px] text-slate-500 font-extrabold tracking-widest uppercase mb-6 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                SELECT BOT COUNT //
              </h3>
              
              <div className="flex gap-4 mb-8 w-full justify-center">
                {[1, 2, 3].map((count) => (
                  <button
                    key={count}
                    onClick={() => {
                      Sounds.buttonClick();
                      setSelectedBotCount(count);
                    }}
                    className={`w-20 h-20 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all duration-300 cursor-pointer ${
                      selectedBotCount === count
                        ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.15)] scale-105'
                        : 'bg-[#252833]/40 border-white/8 text-slate-400 hover:border-white/20 hover:bg-[#252833]/70 hover:scale-102'
                    }`}
                  >
                    <span className="text-3xl font-black">{count}</span>
                    <span className="text-[8px] font-extrabold tracking-widest uppercase">BOTS</span>
                  </button>
                ))}
              </div>

              <div className="flex gap-4 w-full border-t border-white/5 pt-5">
                <button onClick={() => setShowBotModal(false)}
                  className="flex-1 py-3 bg-[#252833]/50 border border-white/8 hover:border-red-500/30 text-[10px] font-extrabold text-slate-400 tracking-wider uppercase rounded-xl hover:text-white hover:bg-red-950/10 transition-all duration-300 cursor-pointer"
                >
                  CANCEL
                </button>
                <button onClick={handleBotStart}
                  className="flex-1 py-3 bg-emerald-950/30 border border-emerald-500/30 hover:border-emerald-500/80 text-[10px] font-extrabold text-emerald-400 tracking-wider uppercase rounded-xl hover:bg-emerald-950/60 hover:shadow-[0_0_20px_rgba(16,185,129,0.12)] transition-all duration-300 cursor-pointer"
                >
                  START MISSION
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
