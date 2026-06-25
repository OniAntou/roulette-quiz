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
    <>
      {/* Tactical Blueprint Ambient Background - Pure Industrial Brutalist */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10 bg-[#07080b]">
        {/* Subtle grid lines */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:32px_32px]" />
        
        {/* Vignette shadow */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black opacity-60" />

        {/* Blueprint technical lines */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.035]" xmlns="http://www.w3.org/2000/svg">
          <line x1="5%" y1="0" x2="5%" y2="100%" stroke="white" strokeWidth="1" strokeDasharray="5,5" />
          <line x1="95%" y1="0" x2="95%" y2="100%" stroke="white" strokeWidth="1" strokeDasharray="5,5" />
          <line x1="0" y1="12%" x2="100%" y2="12%" stroke="white" strokeWidth="1" />
          <line x1="0" y1="88%" x2="100%" y2="88%" stroke="white" strokeWidth="1" />
          
          {/* Target crosshairs in corners */}
          <circle cx="5%" cy="12%" r="8" fill="none" stroke="white" strokeWidth="1" />
          <circle cx="95%" cy="12%" r="8" fill="none" stroke="white" strokeWidth="1" />
          <circle cx="5%" cy="88%" r="8" fill="none" stroke="white" strokeWidth="1" />
          <circle cx="95%" cy="88%" r="8" fill="none" stroke="white" strokeWidth="1" />
        </svg>

        {/* Corner coordinates / Technical Labels */}
        <div className="absolute top-6 left-6 font-mono text-[8px] text-white/10 tracking-widest">SYS.LOC // 47.11.02</div>
        <div className="absolute top-6 right-6 font-mono text-[8px] text-white/10 tracking-widest">VER.PRT // 2.0.26</div>
        <div className="absolute bottom-6 left-6 font-mono text-[8px] text-white/10 tracking-widest">LAT.DEG // 90.00.00</div>
        <div className="absolute bottom-6 right-6 font-mono text-[8px] text-white/10 tracking-widest">HAZ.STA // ACTIVE</div>
      </div>

      <div className="w-full max-w-6xl px-6 md:px-12 grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20 items-center z-10 py-10">
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="flex flex-col space-y-6"
        >
          <div className="inline-flex max-w-max px-2 py-0.5 border border-white/10 rounded-sm font-mono text-[9px] text-slate-500 tracking-widest uppercase">
            EST. CONNECTION // SECURE
          </div>
          <h1 className="text-6xl sm:text-7xl font-mono font-black tracking-tight leading-[0.9] text-white select-none">
            ROULETTE<br />
            <span className="text-slate-500 font-normal">PROTOCOL</span>
          </h1>
          <p className="text-slate-500 font-mono text-xs leading-relaxed max-w-[40ch] uppercase tracking-wider">
            High-stakes trivia multiplayer system. Answer correctly or pull the trigger. Survive to decrypt the next level.
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
          className="flex flex-col space-y-6"
        >
          {/* Username access terminal */}
          <div className="border border-white/10 rounded-lg p-6 flex flex-col space-y-3 bg-black/20 focus-within:border-white/30 transition-all duration-300">
            <label className="font-mono text-[9px] text-slate-500 tracking-widest">
              // USER_IDENTIFICATION_KEY
            </label>
            <div className="flex items-center space-x-2">
              <input 
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value.substring(0, 12).toUpperCase())}
                disabled={status === 'connecting'}
                className="bg-transparent text-3xl font-mono font-bold text-white focus:outline-none w-full uppercase tracking-wider placeholder-slate-800"
                placeholder="INPUT_NAME"
              />
              <span className="w-2.5 h-6 bg-white/40 animate-pulse"></span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col space-y-3">
            {[
              { label: 'INITIALIZE ONLINE', icon: Globe, onClick: () => handleSubmit('online') },
              { label: 'LOCAL PROTOCOL // LAN', icon: WifiHigh, onClick: handleLanClick },
              { label: 'BOT PROTOCOL // VS CPU', icon: Robot, onClick: () => setShowBotModal(true), isGreen: true }
            ].map((btn, i) => {
              const Icon = btn.icon;
              const hoverBorderColor = btn.isGreen ? 'hover:border-emerald-500/30' : 'hover:border-white/30';
              const hoverBgColor = btn.isGreen ? 'hover:bg-emerald-950/10' : 'hover:bg-white/5';
              const hoverTextColor = btn.isGreen ? 'hover:text-emerald-400' : 'hover:text-white';
              
              return (
                <motion.button 
                  key={i}
                  whileHover={{ x: 6 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={btn.onClick}
                  disabled={status === 'connecting'}
                  className={`flex items-center justify-between px-6 py-4.5 bg-black/10 border border-white/10 rounded-lg font-mono text-xs font-bold text-slate-400 tracking-widest uppercase cursor-pointer transition-all duration-200 ${hoverBorderColor} ${hoverBgColor} ${hoverTextColor}`}
                >
                  <span className="flex items-center gap-3">
                    <Icon size={18} className="text-slate-500" />
                    {btn.label}
                  </span>
                  <ArrowRight size={18} className="text-slate-600" />
                </motion.button>
              );
            })}
          </div>

          {status === 'connecting' && (
            <div className="text-[10px] text-amber-500 font-mono font-extrabold tracking-widest uppercase flex items-center gap-3 bg-amber-500/5 border border-amber-500/20 px-4 py-3 rounded-lg">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              CONNECTING CENTRAL SERVER...
            </div>
          )}
          
          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-[10px] text-red-500 font-mono font-extrabold tracking-widest uppercase border border-red-500/20 bg-red-950/20 px-4 py-3 rounded-lg"
            >
              EXCEPTION // {error}
            </motion.div>
          )}

          <div className="text-[9px] font-mono text-slate-600 tracking-wider">
            // ESC key drops current connection state. system ready.
          </div>
        </motion.div>

        <AnimatePresence>
          {showLanModal && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            >
              <motion.div 
                initial={{ scale: 0.98, y: 10 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.98, y: 10, opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="bg-[#0b0c10] border border-white/10 rounded-lg p-8 max-w-2xl w-full flex flex-col relative"
              >
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                <h3 className="font-mono text-[9px] text-slate-500 tracking-widest uppercase mb-5 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                  // DISCOVERED LAN SERVERS
                </h3>
                
                <div className="flex flex-col space-y-2 mb-6 max-h-48 overflow-y-auto pr-1">
                  {isSearchingLan ? (
                    <div className="text-[10px] text-amber-500 font-mono font-extrabold tracking-widest uppercase flex items-center gap-3 p-5 border border-white/5 rounded-lg bg-white/2">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                      </span>
                      SCANNING FREQUENCIES...
                    </div>
                  ) : lanServers.length > 0 ? (
                    lanServers.map((server, i) => (
                      <button
                        key={i}
                        onClick={() => { setShowLanModal(false); handleSubmit('lan', `${server.ip}:${server.port}`); }}
                        className="flex items-center justify-between p-4 bg-black/20 border border-white/10 rounded-lg hover:border-emerald-500/30 hover:bg-emerald-950/10 transition-all duration-200 cursor-pointer group"
                      >
                        <div className="flex flex-col items-start gap-1">
                          <span className="text-xs font-bold text-slate-300 uppercase font-mono">{server.name}</span>
                          <span className="text-[9px] text-slate-500 font-mono bg-black/40 px-2 py-0.5 rounded">{server.ip}:{server.port}</span>
                        </div>
                        <ArrowRight size={18} className="text-slate-500 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all duration-200" />
                      </button>
                    ))
                  ) : (
                    <div className="text-[9px] font-mono text-slate-500 font-bold tracking-widest uppercase p-6 border border-dashed border-white/10 rounded-lg text-center bg-black/10">
                      NO ACTIVE SERVERS FOUND ON NETWORK
                    </div>
                  )}
                </div>

                <h3 className="font-mono text-[9px] text-slate-500 tracking-widest uppercase mb-3">// MANUAL IP DIRECT CONNECTION</h3>
                <div className="flex space-x-3 mb-8">
                  <input 
                    type="text"
                    placeholder="192.168.1.X:3000"
                    value={manualIp}
                    onChange={(e) => setManualIp(e.target.value)}
                    className="flex-1 bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder-slate-700 focus:outline-none focus:border-white/30 font-mono uppercase"
                  />
                  <button
                    onClick={() => {
                      if(manualIp) {
                        setShowLanModal(false);
                        handleSubmit('lan', manualIp);
                      }
                    }}
                    className="px-6 py-3 bg-red-950/20 border border-red-500/30 text-[9px] font-mono font-bold text-red-400 tracking-widest uppercase rounded-lg hover:bg-red-950/40 hover:border-red-500/50 transition-all duration-200 cursor-pointer"
                  >
                    CONNECT
                  </button>
                </div>

                <div className="flex justify-end border-t border-white/5 pt-4">
                  <button onClick={() => setShowLanModal(false)}
                    className="px-5 py-2 bg-black/20 border border-white/10 hover:border-red-500/30 text-[9px] font-mono font-bold text-slate-500 tracking-wider uppercase rounded-lg hover:text-white hover:bg-red-950/10 transition-all duration-200 cursor-pointer"
                  >
                    ABORT
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
              className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            >
              <motion.div 
                initial={{ scale: 0.98, y: 10 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.98, y: 10, opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="bg-[#0b0c10] border border-white/10 rounded-lg p-8 max-w-md w-full flex flex-col items-center relative"
              >
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent"></div>
                <h3 className="font-mono text-[9px] text-slate-500 tracking-widest uppercase mb-6 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  // SELECT BOT COUNT
                </h3>
                
                <div className="flex gap-3 mb-8 w-full justify-center">
                  {[1, 2, 3].map((count) => (
                    <button
                      key={count}
                      onClick={() => {
                        Sounds.buttonClick();
                        setSelectedBotCount(count);
                      }}
                      className={`w-24 h-24 rounded-lg border flex flex-col items-center justify-center gap-1 transition-all duration-200 cursor-pointer ${
                        selectedBotCount === count
                          ? 'bg-emerald-950/20 border-emerald-500/50 text-emerald-400'
                          : 'bg-black/20 border-white/10 text-slate-500 hover:border-white/20 hover:text-slate-300'
                      }`}
                    >
                      <span className="font-mono text-3xl font-black">{count}</span>
                      <span className="font-mono text-[9px] tracking-widest uppercase">BOTS</span>
                    </button>
                  ))}
                </div>

                <div className="flex gap-3 w-full border-t border-white/5 pt-5">
                  <button onClick={() => setShowBotModal(false)}
                    className="flex-1 py-3 bg-black/20 border border-white/10 text-[9px] font-mono font-bold text-slate-500 tracking-wider uppercase rounded-lg hover:border-red-500/30 hover:text-red-400 transition-all duration-200 cursor-pointer"
                  >
                    CANCEL
                  </button>
                  <button onClick={handleBotStart}
                    className="flex-1 py-3 bg-emerald-950/25 border border-emerald-500/40 text-[9px] font-mono font-bold text-emerald-400 tracking-wider uppercase rounded-lg hover:bg-emerald-950/50 hover:border-emerald-500 transition-all duration-200 cursor-pointer"
                  >
                    START MISSION
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
