import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, WifiHigh, Globe, Robot } from '@phosphor-icons/react';
import { ConnectionStatus } from '../types';
import { Sounds } from '../audio/Sounds';
import { ThemeToggle } from './ThemeToggle';

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

const SCRAMBLE_CHARS = '!<>-_\\/[]{}—=+*^?#_$%@&0123456789ABCDEF';

interface MainMenuProps {
  connect: (mode: string, name: string, ip?: string) => void;
  startBot: (count: number) => void;
  error: string;
  status: ConnectionStatus;
}

const cornerLabels = [
  { text: 'SYS.LOC // 47.11.02', pos: 'top-6 left-6' },
  { text: 'VER.PRT // 2.0.26', pos: 'top-6 right-6' },
  { text: 'LAT.DEG // 90.00.00', pos: 'bottom-6 left-6' },
  { text: 'HAZ.STA // ACTIVE', pos: 'bottom-6 right-6' },
];

const buttonDefs = [
  { label: 'INITIALIZE ONLINE', icon: Globe, onClick: 'online' as const, glowColor: 'var(--cyan-theme-light)', borderHover: 'hover:border-cyan-theme', bgHover: 'hover:bg-cyan-theme-muted', textHover: 'hover:text-cyan-theme' },
  { label: 'LOCAL PROTOCOL // LAN', icon: WifiHigh, onClick: 'lan' as const, glowColor: 'var(--cyan-theme-light)', borderHover: 'hover:border-border-theme-hover', bgHover: 'hover:bg-surface-2', textHover: 'hover:text-text-theme' },
  { label: 'BOT PROTOCOL // VS CPU', icon: Robot, onClick: 'bot' as const, glowColor: 'var(--emerald-theme-bg)', borderHover: 'hover:border-emerald-theme-border', bgHover: 'hover:bg-emerald-theme-bg', textHover: 'hover:text-emerald-theme', isGreen: true },
];

// Floating particles config
const PARTICLES = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  left: `${Math.random() * 100}%`,
  size: 1 + Math.random() * 2,
  duration: 8 + Math.random() * 12,
  delay: Math.random() * 10,
  opacity: 0.15 + Math.random() * 0.25,
}));

export function MainMenu({ connect, startBot, error, status }: MainMenuProps) {
  const [name, setName] = useState<string>('');
  const [showBotModal, setShowBotModal] = useState<boolean>(false);
  const [showLanModal, setShowLanModal] = useState<boolean>(false);
  const [lanServers, setLanServers] = useState<any[]>([]);
  const [selectedBotCount, setSelectedBotCount] = useState<number>(1);
  const [manualIp, setManualIp] = useState<string>('');
  const [isSearchingLan, setIsSearchingLan] = useState<boolean>(false);

  // Scramble decode for title
  const [titleChars, setTitleChars] = useState(() => 'ROULETTE'.split('').map(() => SCRAMBLE_CHARS[0]));
  const [titleSettled, setTitleSettled] = useState(() => Array(8).fill(false));
  const scrambleTimers = useRef<ReturnType<typeof setInterval>[]>([]);
  const [shakingBox, setShakingBox] = useState<number | null>(null);

  // Random box shake effect
  useEffect(() => {
    const triggerShake = () => {
      const boxIndex = Math.floor(Math.random() * 4); // 0=input, 1-3=buttons
      setShakingBox(boxIndex);
      setTimeout(() => setShakingBox(null), 400);
    };

    const interval = setInterval(() => {
      if (Math.random() > 0.5) triggerShake();
    }, 2500 + Math.random() * 3500);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const target = 'ROULETTE';
    const startTime = Date.now();

    target.split('').forEach((finalChar, i) => {
      const letterDelay = i * 60;
      const letterDuration = 800 + Math.random() * 400;
      const letterStart = Date.now() + letterDelay;
      let frame = 0;

      const interval = setInterval(() => {
        const elapsed = Date.now() - letterStart;
        if (elapsed < 0) return;

        const progress = Math.min(elapsed / letterDuration, 1);

        if (progress >= 1) {
          setTitleChars(prev => { const n = [...prev]; n[i] = finalChar; return n; });
          setTitleSettled(prev => { const n = [...prev]; n[i] = true; return n; });
          clearInterval(interval);
          return;
        }

        frame++;
        const speed = Math.max(1, Math.floor(4 - progress * 3));
        if (frame % speed === 0) {
          const rand = SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
          setTitleChars(prev => { const n = [...prev]; n[i] = rand; return n; });
        }
      }, 30);

      scrambleTimers.current.push(interval);
    });

    return () => scrambleTimers.current.forEach(clearInterval);
  }, []);

  // Periodic Glitch effect for ROULETTE title
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.3) {
        const glitchCount = 1 + Math.floor(Math.random() * 2);
        const glitchIndices = Array.from({ length: glitchCount }, () => Math.floor(Math.random() * 8));
        const originalChars: string[] = [];

        setTitleChars(prev => {
          const next = [...prev];
          glitchIndices.forEach(idx => {
            originalChars[idx] = next[idx];
            next[idx] = SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
          });
          return next;
        });
        setTitleSettled(prev => {
          const next = [...prev];
          glitchIndices.forEach(idx => {
            next[idx] = false;
          });
          return next;
        });

        setTimeout(() => {
          setTitleChars(prev => {
            const next = [...prev];
            glitchIndices.forEach(idx => {
              next[idx] = 'ROULETTE'[idx];
            });
            return next;
          });
          setTitleSettled(prev => {
            const next = [...prev];
            glitchIndices.forEach(idx => {
              next[idx] = true;
            });
            return next;
          });
        }, 120 + Math.random() * 80);
      }
    }, 3500);

    return () => clearInterval(interval);
  }, []);

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

  const handleButtonClick = (onClickType: string) => {
    if (onClickType === 'lan') handleLanClick();
    else if (onClickType === 'bot') setShowBotModal(true);
    else handleSubmit(onClickType);
  };

  return (
    <>
      <div className="fixed top-5 right-5 z-50">
        <ThemeToggle />
      </div>

      {/* Tactical Blueprint Ambient Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10 bg-surface blood-glitch-active">
        {/* Breathing grid */}
        <div className="absolute inset-0 bg-[linear-gradient(var(--grid-line)_1px,transparent_1px),linear-gradient(90deg,var(--grid-line)_1px,transparent_1px)] bg-[size:32px_32px] grid-breathe" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg-body via-transparent to-bg-body opacity-40" />
        
        {/* Static */}
        <div className="absolute inset-0 static-glitch opacity-15" />

        {/* SVG technical lines */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.035]" xmlns="http://www.w3.org/2000/svg">
          <line x1="5%" y1="0" x2="5%" y2="100%" stroke="currentColor" strokeWidth="1" strokeDasharray="5,5" className="text-text-theme" />
          <line x1="95%" y1="0" x2="95%" y2="100%" stroke="currentColor" strokeWidth="1" strokeDasharray="5,5" className="text-text-theme" />
          <line x1="0" y1="12%" x2="100%" y2="12%" stroke="currentColor" strokeWidth="1" className="text-text-theme" />
          <line x1="0" y1="88%" x2="100%" y2="88%" stroke="currentColor" strokeWidth="1" className="text-text-theme" />
          <circle cx="5%" cy="12%" r="8" fill="none" stroke="currentColor" strokeWidth="1" className="text-text-theme" />
          <circle cx="95%" cy="12%" r="8" fill="none" stroke="currentColor" strokeWidth="1" className="text-text-theme" />
          <circle cx="5%" cy="88%" r="8" fill="none" stroke="currentColor" strokeWidth="1" className="text-text-theme" />
          <circle cx="95%" cy="88%" r="8" fill="none" stroke="currentColor" strokeWidth="1" className="text-text-theme" />
        </svg>

        {/* Technical Blueprint Scope/Crosshair Graphic */}
        <div className="absolute right-[5%] bottom-[10%] w-[380px] h-[380px] opacity-[0.12] text-cyan-theme pointer-events-none select-none">
          <motion.svg 
            animate={{ rotate: 360 }}
            transition={{ duration: 45, repeat: Infinity, ease: "linear" }}
            className="w-full h-full" 
            viewBox="0 0 200 200"
          >
            <circle cx="100" cy="100" r="95" fill="none" stroke="currentColor" strokeWidth="0.8" strokeDasharray="4,8" />
            <circle cx="100" cy="100" r="70" fill="none" stroke="currentColor" strokeWidth="0.5" />
            <circle cx="100" cy="100" r="45" fill="none" stroke="currentColor" strokeWidth="0.8" strokeDasharray="2,4" />
            <circle cx="100" cy="100" r="20" fill="none" stroke="currentColor" strokeWidth="0.5" />
            <line x1="0" y1="100" x2="200" y2="100" stroke="currentColor" strokeWidth="0.5" strokeDasharray="3,3" />
            <line x1="100" y1="0" x2="100" y2="200" stroke="currentColor" strokeWidth="0.5" strokeDasharray="3,3" />
            <path d="M 10 100 L 25 100 M 175 100 L 190 100 M 100 10 L 100 25 M 100 175 L 100 190" stroke="currentColor" strokeWidth="1.2" />
            <text x="105" y="25" fill="currentColor" fontSize="6" fontFamily="monospace" opacity="0.8">AZM // 090</text>
            <text x="105" y="175" fill="currentColor" fontSize="6" fontFamily="monospace" opacity="0.8">RNG // MAX</text>
          </motion.svg>
        </div>

        {/* Multiple scan beams */}
        <div className="absolute top-[20%] left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-theme to-transparent opacity-30 scan-beam pointer-events-none" />
        <div className="absolute top-[55%] left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-theme-muted to-transparent opacity-20 scan-beam-slow pointer-events-none" />
        <div className="absolute top-[80%] left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-emerald-theme to-transparent opacity-15 scan-beam pointer-events-none" style={{ animationDelay: '3s' }} />

        {/* Vertical scan line */}
        <div className="absolute top-0 left-[30%] w-[1px] h-full bg-gradient-to-b from-transparent via-cyan-theme to-transparent opacity-15 scan-vertical pointer-events-none" />

        {/* Floating particles */}
        {PARTICLES.map(p => (
          <div
            key={p.id}
            className="absolute rounded-full bg-cyan-theme"
            style={{
              left: p.left,
              bottom: '-10px',
              width: p.size,
              height: p.size,
              opacity: 0,
              animation: `float-particle ${p.duration}s linear ${p.delay}s infinite`,
            }}
          />
        ))}

        {/* Corner labels with typewriter effect */}
        {cornerLabels.map((label, i) => (
          <TypewriterLabel key={label.pos} text={label.text} pos={label.pos} delay={800 + i * 200} />
        ))}
      </div>

      <div className="w-full h-screen px-8 md:px-16 lg:px-24 grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-24 items-center z-10">
        {/* Title block */}
        <div className="flex flex-col space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="inline-flex max-w-max px-2 py-0.5 border border-border-theme rounded-sm font-mono text-[9px] text-text-theme-muted tracking-widest uppercase"
          >
            EST. CONNECTION // SECURE
          </motion.div>

          <div className="select-none flex flex-col items-start">
            <h1 className="text-7xl sm:text-8xl lg:text-9xl font-mono font-black tracking-[0.05em] leading-[0.9] text-text-theme">
              {titleChars.map((char, i) => (
                <span
                  key={i}
                  className="inline-block transition-colors duration-100"
                  style={{
                    textShadow: titleSettled[i]
                      ? '0 0 20px var(--cyan-theme-light), 0 0 40px var(--cyan-theme-muted), 0 0 60px var(--cyan-theme-muted)'
                      : '0 0 8px var(--cyan-theme)',
                    color: titleSettled[i] ? undefined : 'var(--cyan-theme)',
                  }}
                >
                  {char}
                </span>
              ))}
            </h1>
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.9, duration: 0.5, ease: 'easeOut' }}
              className="block text-7xl sm:text-8xl lg:text-9xl font-mono font-normal tracking-[0.05em] leading-[0.9] text-text-theme-muted mt-1"
            >
              PROTOCOL
            </motion.span>
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1, duration: 0.4 }}
            className="text-text-theme-muted font-mono text-sm leading-relaxed max-w-[45ch] uppercase tracking-wider"
          >
            High-stakes trivia multiplayer system. Answer correctly or pull the trigger. Survive to decrypt the next level.
          </motion.p>
        </div>

        {/* Right column */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.3 }}
          className="flex flex-col space-y-8"
        >
          {/* Username input with focus glow */}
          <div className={`border border-border-theme rounded-xl p-8 flex flex-col space-y-4 bg-input-theme animate-pulse-glow transition-all duration-300 ${shakingBox === 0 ? 'box-shake' : ''}`}>
            <label className="font-mono text-[9px] text-text-theme-muted tracking-widest">
              // USER_IDENTIFICATION_KEY
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value.substring(0, 12).toUpperCase())}
                disabled={status === 'connecting'}
                className="bg-transparent text-4xl sm:text-5xl font-mono font-bold text-text-theme focus:outline-none w-full uppercase tracking-wider placeholder-text-theme-dim"
                placeholder="INPUT_NAME"
              />
              <span className="w-2.5 h-6 bg-text-theme/40 terminal-cursor" />
            </div>
          </div>

          {/* Action buttons with glow + shimmer + staggered entrance */}
          <div className="flex flex-col space-y-4">
            {buttonDefs.map((btn, i) => {
              const Icon = btn.icon;
              return (
                <motion.button
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.12, duration: 0.35 }}
                  whileHover={{ x: 6, boxShadow: `0 0 20px 4px ${btn.glowColor}` }}
                  whileTap={{ scale: 0.98 }}
                  onMouseEnter={() => {
                    try {
                      Sounds.buttonHover();
                    } catch (e) {}
                  }}
                  onClick={() => handleButtonClick(btn.onClick)}
                  disabled={status === 'connecting'}
                  className={`btn-shimmer flex items-center justify-between px-8 py-5 bg-input-theme border border-border-theme rounded-lg font-mono text-sm font-bold text-text-theme-muted tracking-widest uppercase cursor-pointer transition-all duration-200 ${btn.borderHover} ${btn.bgHover} ${btn.textHover} ${shakingBox === i + 1 ? 'box-shake' : ''}`}
                >
                  <span className="flex items-center gap-3">
                    <Icon size={18} className="text-text-theme-muted" />
                    {btn.label}
                  </span>
                  <ArrowRight size={18} className="text-text-theme-dim" />
                </motion.button>
              );
            })}
          </div>

          {status === 'connecting' && (
            <div className="text-[10px] text-amber-theme font-mono font-extrabold tracking-widest uppercase flex items-center gap-3 bg-amber-theme-bg border border-amber-theme-border px-4 py-3 rounded-lg">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-theme opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-theme"></span>
              </span>
              CONNECTING CENTRAL SERVER...
            </div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-[10px] text-red-theme font-mono font-extrabold tracking-widest uppercase border border-red-theme-border bg-red-theme-bg px-4 py-3 rounded-lg"
            >
              EXCEPTION // {error}
            </motion.div>
          )}

          <div className="text-[9px] font-mono text-text-theme-dim tracking-wider">
            // ESC key drops current connection state. system ready.
          </div>
        </motion.div>

        {/* LAN Modal */}
        <AnimatePresence>
          {showLanModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-overlay-solid/90 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0, filter: 'blur(4px)' }}
                animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
                exit={{ scale: 0.95, opacity: 0, filter: 'blur(4px)' }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="bg-panel-solid border border-border-theme rounded-lg p-8 max-w-2xl w-full flex flex-col relative"
              >
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-border-theme-strong to-transparent"></div>
                <h3 className="font-mono text-[9px] text-text-theme-muted tracking-widest uppercase mb-5 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-theme animate-pulse"></span>
                  // DISCOVERED LAN SERVERS
                </h3>

                <div className="flex flex-col space-y-2 mb-6 max-h-48 overflow-y-auto pr-1">
                  {isSearchingLan ? (
                    <div className="text-[10px] text-amber-theme font-mono font-extrabold tracking-widest uppercase flex items-center gap-3 p-5 border border-border-theme rounded-lg bg-input-theme">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-theme opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-theme"></span>
                      </span>
                      SCANNING FREQUENCIES...
                    </div>
                  ) : lanServers.length > 0 ? (
                    lanServers.map((server, i) => (
                      <button
                        key={i}
                        onMouseEnter={() => {
                          try {
                            Sounds.buttonHover();
                          } catch (e) {}
                        }}
                        onClick={() => { setShowLanModal(false); handleSubmit('lan', `${server.ip}:${server.port}`); }}
                        className="flex items-center justify-between p-4 bg-input-theme border border-border-theme rounded-lg hover:border-emerald-theme-border hover:bg-emerald-theme-bg transition-all duration-200 cursor-pointer group"
                      >
                        <div className="flex flex-col items-start gap-1">
                          <span className="text-xs font-bold text-text-theme-secondary uppercase font-mono">{server.name}</span>
                          <span className="text-[9px] text-text-theme-muted font-mono bg-surface-2 px-2 py-0.5 rounded">{server.ip}:{server.port}</span>
                        </div>
                        <ArrowRight size={18} className="text-text-theme-muted group-hover:text-emerald-theme group-hover:translate-x-1 transition-all duration-200" />
                      </button>
                    ))
                  ) : (
                    <div className="text-[9px] font-mono text-text-theme-muted font-bold tracking-widest uppercase p-6 border border-dashed border-border-theme rounded-lg text-center bg-input-theme">
                      NO ACTIVE SERVERS FOUND ON NETWORK
                    </div>
                  )}
                </div>

                <h3 className="font-mono text-[9px] text-text-theme-muted tracking-widest uppercase mb-3">// MANUAL IP DIRECT CONNECTION</h3>
                <div className="flex space-x-3 mb-8">
                  <input
                    type="text"
                    placeholder="192.168.1.X:3000"
                    value={manualIp}
                    onChange={(e) => setManualIp(e.target.value)}
                    className="flex-1 bg-input-theme border border-border-theme rounded-lg px-4 py-3 text-sm text-text-theme placeholder-text-theme-dim focus:outline-none focus:border-border-theme-hover font-mono uppercase"
                  />
                  <button
                    onMouseEnter={() => {
                      try {
                        Sounds.buttonHover();
                      } catch (e) {}
                    }}
                    onClick={() => {
                      if(manualIp) {
                        setShowLanModal(false);
                        handleSubmit('lan', manualIp);
                      }
                    }}
                    className="px-6 py-3 bg-red-theme-bg border border-red-theme-border text-[9px] font-mono font-bold text-red-theme tracking-widest uppercase rounded-lg hover:bg-red-theme-bg-hover hover:border-red-theme transition-all duration-200 cursor-pointer"
                  >
                    CONNECT
                  </button>
                </div>

                <div className="flex justify-end border-t border-border-theme pt-4">
                  <button 
                    onClick={() => setShowLanModal(false)}
                    onMouseEnter={() => {
                      try {
                        Sounds.buttonHover();
                      } catch (e) {}
                    }}
                    className="px-5 py-2 bg-input-theme border border-border-theme hover:border-red-theme-border text-[9px] font-mono font-bold text-text-theme-muted tracking-wider uppercase rounded-lg hover:text-text-theme hover:bg-red-theme-bg transition-all duration-200 cursor-pointer"
                  >
                    ABORT
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bot Modal */}
        <AnimatePresence>
          {showBotModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-overlay-solid/90 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0, filter: 'blur(4px)' }}
                animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
                exit={{ scale: 0.95, opacity: 0, filter: 'blur(4px)' }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="bg-panel-solid border border-border-theme rounded-lg p-8 max-w-md w-full flex flex-col items-center relative"
              >
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-emerald-theme-border to-transparent"></div>
                <h3 className="font-mono text-[9px] text-text-theme-muted tracking-widest uppercase mb-6 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-theme animate-pulse"></span>
                  // SELECT BOT COUNT
                </h3>

                <div className="flex gap-3 mb-8 w-full justify-center">
                  {[1, 2, 3].map((count) => (
                    <button
                      key={count}
                      onMouseEnter={() => {
                        try {
                          Sounds.buttonHover();
                        } catch (e) {}
                      }}
                      onClick={() => {
                        Sounds.buttonClick();
                        setSelectedBotCount(count);
                      }}
                      className={`w-24 h-24 rounded-lg border flex flex-col items-center justify-center gap-1 transition-all duration-200 cursor-pointer ${
                        selectedBotCount === count
                          ? 'bg-emerald-theme-bg border-emerald-theme-border text-emerald-theme'
                          : 'bg-input-theme border-border-theme text-text-theme-muted hover:border-border-theme-strong hover:text-text-theme-secondary'
                      }`}
                    >
                      <span className="font-mono text-3xl font-black">{count}</span>
                      <span className="font-mono text-[9px] tracking-widest uppercase">BOTS</span>
                    </button>
                  ))}
                </div>

                <div className="flex gap-3 w-full border-t border-border-theme pt-5">
                  <button 
                    onClick={() => setShowBotModal(false)}
                    onMouseEnter={() => {
                      try {
                        Sounds.buttonHover();
                      } catch (e) {}
                    }}
                    className="flex-1 py-3 bg-input-theme border border-border-theme text-[9px] font-mono font-bold text-text-theme-muted tracking-wider uppercase rounded-lg hover:border-red-theme-border hover:text-red-theme transition-all duration-200 cursor-pointer"
                  >
                    CANCEL
                  </button>
                  <button 
                    onClick={handleBotStart}
                    onMouseEnter={() => {
                      try {
                        Sounds.buttonHover();
                      } catch (e) {}
                    }}
                    className="flex-1 py-3 bg-emerald-theme-bg border border-emerald-theme-border text-[9px] font-mono font-bold text-emerald-theme tracking-wider uppercase rounded-lg hover:bg-emerald-theme-bg-hover hover:border-emerald-theme transition-all duration-200 cursor-pointer"
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

/* Typewriter label component */
function TypewriterLabel({ text, pos, delay }: { text: string; pos: string; delay: number }) {
  const [displayed, setDisplayed] = useState('');
  const [showDot, setShowDot] = useState(false);

  useEffect(() => {
    const startTimer = setTimeout(() => {
      setShowDot(true);
      let i = 0;
      const interval = setInterval(() => {
        if (i < text.length) {
          setDisplayed(text.slice(0, i + 1));
          i++;
        } else {
          clearInterval(interval);
        }
      }, 30);
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(startTimer);
  }, [text, delay]);

  return (
    <div
      className={`absolute ${pos} font-mono text-[8px] text-text-theme-dim tracking-widest`}
      style={{ opacity: showDot ? 1 : 0, transition: 'opacity 0.3s' }}
    >
      {showDot && (
        <span className="inline-block w-1 h-1 rounded-full bg-cyan-theme mr-1.5 align-middle animate-dot-blink" />
      )}
      {displayed}
      {showDot && displayed.length < text.length && (
        <span className="inline-block w-1.5 h-3 bg-cyan-theme/60 ml-0.5 align-middle terminal-cursor" />
      )}
    </div>
  );
}
