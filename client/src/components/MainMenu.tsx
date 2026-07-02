import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, WifiHigh, Globe, Robot, SpeakerSimpleX, SpeakerHigh } from '@phosphor-icons/react';
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
  startBot: (count: number, name: string) => void;
  error: string;
  status: ConnectionStatus;
}

const cornerLabels = [
  { text: 'SYS.LOC // 47.11.02', pos: 'top-6 left-6', hideOnMobile: true },
  { text: 'VER.PRT // 2.0.26', pos: 'top-6 right-6', hideOnMobile: true },
  { text: 'LAT.DEG // 90.00.00', pos: 'bottom-6 left-6', hideOnMobile: true },
  { text: 'HAZ.STA // ACTIVE', pos: 'bottom-6 right-6', hideOnMobile: true },
];

const buttonDefs = [
  { label: 'INITIALIZE ONLINE', icon: Globe, onClick: 'online' as const, tier: 'primary' as const },
  { label: 'LOCAL PROTOCOL // LAN', icon: WifiHigh, onClick: 'lan' as const, tier: 'secondary' as const },
  { label: 'BOT PROTOCOL // VS CPU', icon: Robot, onClick: 'bot' as const, tier: 'tertiary' as const },
];

// Floating particles config
const PARTICLES = Array.from({ length: 15 }, (_, i) => ({
  id: i,
  left: `${Math.random() * 100}%`,
  size: 1 + Math.random() * 2,
  duration: 8 + Math.random() * 12,
  delay: Math.random() * 10,
  opacity: 0.15 + Math.random() * 0.25,
}));

let globalInteracted = false;

export function MainMenu({ connect, startBot, error, status }: MainMenuProps) {
  const [hasInteracted, setHasInteracted] = useState<boolean>(globalInteracted);
  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  const [loadingText, setLoadingText] = useState<string>('SYS.BOOT: DECRYPTING ENGINE...');
  const [name, setName] = useState<string>('');

  // Track theme for canvas
  useEffect(() => {
    const updateTheme = () => {
      themeRef.current = document.documentElement.getAttribute('data-theme') || 'dark';
    };
    updateTheme();
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  // Fake Loading Progress Effect
  useEffect(() => {
    if (hasInteracted) return;
    const interval = setInterval(() => {
      setLoadingProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        const next = prev + Math.floor(Math.random() * 12) + 6;
        return Math.min(next, 100);
      });
    }, 120);
    return () => clearInterval(interval);
  }, [hasInteracted]);

  // Loading Status Text Effect
  useEffect(() => {
    if (loadingProgress < 25) {
      setLoadingText('LOADING_CORE_RESOURCES...');
    } else if (loadingProgress < 55) {
      setLoadingText('SYNC_AUDIO_CONTEXT_ENGINE...');
    } else if (loadingProgress < 85) {
      setLoadingText('DECRYPTING_TACTICAL_INTERFACE...');
    } else if (loadingProgress < 100) {
      setLoadingText('ESTABLISHING_SECURE_TUNNEL...');
    } else {
      setLoadingText('DECRYPTION COMPLETE // SYS READY');
    }
  }, [loadingProgress]);
  const [showBotModal, setShowBotModal] = useState<boolean>(false);
  const [showLanModal, setShowLanModal] = useState<boolean>(false);
  const [lanServers, setLanServers] = useState<any[]>([]);
  const [selectedBotCount, setSelectedBotCount] = useState<number>(1);
  const [manualIp, setManualIp] = useState<string>('');
  const [isSearchingLan, setIsSearchingLan] = useState<boolean>(false);
  const [trail, setTrail] = useState<{ x: number, y: number, id: number }[]>([]);
  const trailId = React.useRef(0);
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    return localStorage.getItem('roulette-quiz-muted') === 'true';
  });

  // Sync mute state with Sounds
  useEffect(() => {
    Sounds.setMuted(isMuted);
  }, [isMuted]);

  // Initialize mute state on mount
  useEffect(() => {
    Sounds.initMuted();
  }, []);

  // Mouse cloud-tear effect (canvas)
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const stampsRef = React.useRef<{ x: number; y: number; born: number; rmax: number; seed: number }[]>([]);
  const lastMouseRef = React.useRef<{ x: number; y: number } | null>(null);
  const animFrameRef = React.useRef<number>(0);
  const themeRef = React.useRef<string>('dark');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear any stale stamps from previous instance
    stampsRef.current = [];
    lastMouseRef.current = null;

    const R_START = 3;
    const R_END = 110;
    const R_VARY = 0.45;
    const LIFETIME = 1000;
    const STAMP_STEP = 12;
    const MAX_STAMPS = 70;

    // Smoother easing
    const easeOutExpo = (t: number) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
    const easeInOutQuad = (t: number) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

    let w = 0, h = 0;
    let mountedAt = performance.now();
    const resize = () => {
      const rect = canvas.parentElement!.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = w * devicePixelRatio;
      canvas.height = h * devicePixelRatio;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const addStamp = (x: number, y: number) => {
      if (stampsRef.current.length >= MAX_STAMPS) stampsRef.current.shift();
      stampsRef.current.push({
        x, y,
        born: performance.now(),
        rmax: R_END * (1 - R_VARY + Math.random() * R_VARY),
        seed: Math.random() * Math.PI * 2,
      });
    };

    const stampAlong = (x: number, y: number) => {
      const last = lastMouseRef.current;
      if (!last) { addStamp(x, y); }
      else {
        const dx = x - last.x, dy = y - last.y;
        const dist = Math.hypot(dx, dy);
        const steps = Math.max(1, Math.ceil(dist / STAMP_STEP));
        for (let i = 1; i <= steps; i++) {
          addStamp(last.x + (dx * i) / steps, last.y + (dy * i) / steps);
        }
      }
      lastMouseRef.current = { x, y };
    };

    // Organic shape with multi-octave noise
    const carve = (x: number, y: number, r: number, alpha: number, seed: number) => {
      // Soft radial gradient with 5 stops for smooth edge
      const g = ctx.createRadialGradient(x, y, r * 0.1, x, y, r);
      g.addColorStop(0, `rgba(255,255,255,${alpha})`);
      g.addColorStop(0.25, `rgba(255,255,255,${0.95 * alpha})`);
      g.addColorStop(0.5, `rgba(255,255,255,${0.6 * alpha})`);
      g.addColorStop(0.75, `rgba(255,255,255,${0.2 * alpha})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;

      // Organic wobble with 2 noise octaves
      ctx.beginPath();
      const segs = 32;
      for (let i = 0; i <= segs; i++) {
        const a = (i / segs) * Math.PI * 2;
        const n1 = Math.sin(a * 3 + seed) * 0.12;
        const n2 = Math.sin(a * 7 + seed * 2.1) * 0.06;
        const n3 = Math.sin(a * 13 + seed * 0.7) * 0.03;
        const wob = 0.8 + n1 + n2 + n3;
        const rr = r * wob;
        const px = x + Math.cos(a) * rr;
        const py = y + Math.sin(a) * rr;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    };

    let running = false;
    const loop = () => {
      const now = performance.now();
      ctx.clearRect(0, 0, w, h);

      // Only draw overlay when there are active stamps
      if (stampsRef.current.length > 0) {
        // Dark overlay (theme-aware)
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = themeRef.current === 'light' ? 'rgba(245,245,245,0.88)' : 'rgba(10,10,10,0.88)';
        ctx.fillRect(0, 0, w, h);

        // Carve holes
        ctx.globalCompositeOperation = 'destination-out';
        for (let i = stampsRef.current.length - 1; i >= 0; i--) {
          const s = stampsRef.current[i];
          const t = (now - s.born) / LIFETIME;
          if (t >= 1) { stampsRef.current.splice(i, 1); continue; }
          const ease = easeOutExpo(t);
          const r = R_START + (s.rmax - R_START) * ease;
          // Smooth fade: hold longer, then fade quickly at end
          const alpha = t < 0.3 ? 1 : 1 - easeInOutQuad((t - 0.3) / 0.7);
          carve(s.x, s.y, r, Math.max(0, alpha), s.seed);
        }
      }

      if (stampsRef.current.length) {
        animFrameRef.current = requestAnimationFrame(loop);
      } else {
        running = false;
      }
    };

    const start = () => {
      if (!running) { running = true; animFrameRef.current = requestAnimationFrame(loop); }
    };

    const onMouseMove = (e: MouseEvent) => {
      // Ignore events for 100ms after mount to prevent stale stamps
      if (performance.now() - mountedAt < 100) return;
      const rect = canvas.getBoundingClientRect();
      stampAlong(e.clientX - rect.left, e.clientY - rect.top);
      start();
    };

    const onMouseLeave = () => { lastMouseRef.current = null; };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseleave', onMouseLeave);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseleave', onMouseLeave);
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animFrameRef.current);
      stampsRef.current = [];
      lastMouseRef.current = null;
    };
  }, []);

  // Start Menu BGM
  useEffect(() => {
    const initAudio = () => {
      Sounds.startMenuBGM();
      window.removeEventListener('click', initAudio);
      window.removeEventListener('keydown', initAudio);
    };

    window.addEventListener('click', initAudio);
    window.addEventListener('keydown', initAudio);

    // Try to start immediately (works if AudioContext is already active from previous screen)
    Sounds.startMenuBGM();

    return () => {
      window.removeEventListener('click', initAudio);
      window.removeEventListener('keydown', initAudio);
      Sounds.stopMenuBGM();
    };
  }, []);

  // Scramble decode for title
  const [titleChars, setTitleChars] = useState(() => 'ROULETTE'.split('').map(() => SCRAMBLE_CHARS[0]));
  const [titleSettled, setTitleSettled] = useState(() => Array(8).fill(false));
  const scrambleTimers = useRef<ReturnType<typeof setInterval>[]>([]);
  const [shakingBox, setShakingBox] = useState<number | null>(null);
  const [buttonRipples, setButtonRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const rippleId = React.useRef(0);

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
    startBot(selectedBotCount, finalName);
  };

  const handleButtonClick = (onClickType: string, e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = rippleId.current++;
    setButtonRipples(prev => [...prev, { id, x, y }]);
    setTimeout(() => setButtonRipples(prev => prev.filter(r => r.id !== id)), 600);
    if (onClickType === 'lan') handleLanClick();
    else if (onClickType === 'bot') setShowBotModal(true);
    else handleSubmit(onClickType);
  };

  return (
    <>
      <div className="fixed top-5 left-5 z-50">
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => setIsMuted(!isMuted)}
          className="w-10 h-10 flex items-center justify-center rounded-lg border transition-all duration-300 cursor-pointer"
          style={{
            backgroundColor: 'var(--bg-input)',
            borderColor: 'var(--border-medium)',
            color: 'var(--text-muted)',
          }}
          title={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
        >
          {isMuted ? <SpeakerSimpleX size={18} weight="bold" /> : <SpeakerHigh size={18} weight="bold" />}
        </motion.button>
      </div>

      <div className="fixed top-5 right-5 z-50">
        <ThemeToggle />
      </div>

      <AnimatePresence>
        {!hasInteracted && (
          <motion.div 
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } }}
            onClick={() => {
              globalInteracted = true;
              setHasInteracted(true);
              Sounds.startMenuBGM();
            }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center cursor-pointer select-none font-mono"
            style={{ backgroundColor: 'var(--bg-body)', color: 'var(--color-text-main)' }}
          >
            {/* Minimalist container: spacious, clean */}
            <div className="flex flex-col items-center space-y-12 md:space-y-20 max-w-3xl w-full px-6 md:px-8">
              
              {/* Header text with elegant tracking and font weight */}
              <div className="flex flex-col items-center space-y-4 md:space-y-6">
                <span className="text-[11px] md:text-[13px] tracking-[0.4em] md:tracking-[0.6em] uppercase" style={{ color: 'var(--color-text-muted)' }}>SYSTEM INITIALIZATION</span>
                <div className="relative px-8 py-4">
                  {/* Corner brackets */}
                  <div className="absolute top-0 left-0 w-4 h-4 border-t border-l" style={{ borderColor: 'var(--color-border)' }}></div>
                  <div className="absolute top-0 right-0 w-4 h-4 border-t border-r" style={{ borderColor: 'var(--color-border)' }}></div>
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l" style={{ borderColor: 'var(--color-border)' }}></div>
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r" style={{ borderColor: 'var(--color-border)' }}></div>
                  <h2 className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-thin tracking-[0.15em] md:tracking-[0.25em] uppercase translate-x-[0.125em]" style={{ color: 'var(--color-text-main)' }}>
                    ROULETTE
                  </h2>
                </div>
              </div>

              {/* Extremely clean, thin progress line */}
              <div className="w-full flex flex-col space-y-8 items-center">
                <div className="w-full h-[1px] relative" style={{ backgroundColor: 'var(--color-border-subtle)' }}>
                  <motion.div 
                    className="absolute top-0 left-0 h-full"
                    style={{ backgroundColor: 'var(--color-text-muted)', width: `${loadingProgress}%` }}
                    transition={{ ease: "easeOut" }}
                  />
                </div>
                
                {/* Numeric progress indicator */}
                <div className="flex justify-between w-full text-[14px] tracking-widest uppercase" style={{ color: 'var(--color-text-muted)' }}>
                  <span>{loadingText}</span>
                  <span className="font-bold tabular-nums" style={{ color: 'var(--color-text-main)' }}>
                    {String(loadingProgress).padStart(3, '0')}%
                  </span>
                </div>
              </div>

              {/* Decorative lines */}
              <div className="w-full flex justify-center gap-8 mt-2">
                <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-transparent opacity-30" style={{ '--tw-gradient-to': 'var(--color-border)' } as React.CSSProperties}></div>
                <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-transparent opacity-30" style={{ '--tw-gradient-to': 'var(--color-border)' } as React.CSSProperties}></div>
              </div>

              {/* Bottom interactive action */}
              <div className="h-8 flex items-center justify-center">
                {loadingProgress === 100 && (
                  <motion.span 
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: [0.4, 1, 0.4], y: 0 }}
                    transition={{ 
                      opacity: { repeat: Infinity, duration: 2, ease: "easeInOut" },
                      y: { duration: 0.5 } 
                    }}
                    className="text-[16px] tracking-[0.5em] uppercase font-medium translate-x-[0.25em]"
                    style={{ color: 'var(--color-text-main)' }}
                  >
                    [ CLICK TO START ]
                  </motion.span>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tactical Blueprint Ambient Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10 bg-surface blood-glitch-active">
        {/* Layer revealed by cloud tear — theme-aware */}
        <div className="absolute inset-0 bg-gradient-to-br via-transparent to-transparent" style={{ background: `linear-gradient(to bottom right, var(--tear-gradient-1), transparent 50%, var(--tear-gradient-2))` }} />
        <div className="absolute inset-0 bg-[linear-gradient(var(--grid-line)_1px,transparent_1px),linear-gradient(90deg,var(--grid-line)_1px,transparent_1px)] bg-[size:32px_32px] opacity-40" />
        
        {/* Cloud tear canvas */}
        <canvas ref={canvasRef} className="absolute inset-0 z-10 pointer-events-none" />
        
        {/* Breathing grid */}
        <div className="absolute inset-0 bg-[linear-gradient(var(--grid-line)_1px,transparent_1px),linear-gradient(90deg,var(--grid-line)_1px,transparent_1px)] bg-[size:32px_32px] grid-breathe opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg-body via-transparent to-bg-body opacity-40" />
        
        {/* Static */}
        <div className="absolute inset-0 static-glitch opacity-15" />

        {/* Technical Blueprint Scope/Crosshair Graphic */}
        <div className="hidden lg:block absolute right-[5%] bottom-[10%] w-[280px] lg:w-[380px] h-[280px] lg:h-[380px] opacity-[0.12] text-cyan-theme pointer-events-none select-none">
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

        {/* Floating particles - reduced on mobile for performance */}
        {PARTICLES.map(p => (
          <div
            key={p.id}
            className="absolute rounded-full bg-cyan-theme hidden sm:block"
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
          <div key={label.pos} className={label.hideOnMobile ? 'hidden md:block' : ''}>
            <TypewriterLabel text={label.text} pos={label.pos} delay={800 + i * 200} />
          </div>
        ))}

        {/* Cloud tear overlay — dark mask with hole at cursor */}
      </div>

      <div className="w-full h-screen px-5 sm:px-8 md:px-16 lg:px-24 grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 lg:gap-24 items-center z-10 overflow-y-auto md:overflow-hidden">
        {/* Title block */}
        <div className="flex flex-col space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="inline-flex max-w-max px-3 py-1 border border-border-theme rounded-sm font-mono text-[10px] text-text-theme-muted tracking-widest uppercase"
          >
            EST. CONNECTION // SECURE
          </motion.div>

          <div className="select-none flex flex-col items-start">
            <h1 className="text-5xl sm:text-7xl lg:text-9xl font-mono font-black tracking-[0.05em] leading-[0.9] text-text-theme">
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
              className="block text-5xl sm:text-7xl lg:text-9xl font-mono font-normal tracking-[0.05em] leading-[0.9] text-text-theme-muted mt-1"
            >
              PROTOCOL
            </motion.span>
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1, duration: 0.4 }}
            className="text-text-theme-muted font-mono text-sm sm:text-base leading-relaxed max-w-[45ch] uppercase tracking-wider mt-4"
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
          {/* Username input */}
          <div className="border border-border rounded-md p-4 sm:p-6 flex flex-col space-y-2 bg-surface transition-all duration-300">
            <label className="font-mono text-[10px] text-text-muted tracking-widest">
              // USER_IDENTIFICATION_KEY
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value.substring(0, 12).toUpperCase())}
              disabled={status === 'connecting'}
              placeholder="INPUT_NAME"
              className="bg-transparent text-text-main font-mono font-bold text-2xl sm:text-3xl md:text-4xl uppercase tracking-wider focus:outline-none focus:border-brand placeholder:text-text-muted/30 w-full transition-colors"
            />
          </div>

          {/* Action buttons */}
          <div className="flex flex-col space-y-3">
            {buttonDefs.map((btn, i) => {
              const Icon = btn.icon;
              const isPrimary = btn.tier === 'primary';
              const isTertiary = btn.tier === 'tertiary';

              return (
                <motion.button
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + i * 0.15, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
                  whileTap={{ scale: 0.98 }}
                  onMouseEnter={() => {
                    try { Sounds.buttonHover(); } catch (e) {}
                  }}
                  onClick={(e) => handleButtonClick(btn.onClick, e)}
                  disabled={status === 'connecting'}
                  className={`group relative flex items-center justify-between px-5 sm:px-8 py-5 bg-surface border rounded-md font-mono text-xs sm:text-sm font-bold tracking-widest uppercase cursor-pointer transition-all duration-200 ease-out overflow-hidden ${
                    isPrimary
                      ? 'border-brand/40 shadow-[3px_3px_0px_var(--color-brand)] hover:shadow-[0px_0px_0px_var(--color-brand)] hover:translate-y-[3px] hover:bg-brand/5 hover:text-brand'
                      : isTertiary
                        ? 'border-emerald-theme/40 shadow-[3px_3px_0px_var(--color-emerald-theme)] hover:shadow-[0px_0px_0px_var(--color-emerald-theme)] hover:translate-y-[3px] hover:bg-emerald-theme/5 hover:text-emerald-theme'
                        : 'border-border shadow-[3px_3px_0px_var(--color-border)] hover:shadow-[0px_0px_0px_var(--color-border)] hover:translate-y-[3px] hover:bg-surface-hover hover:text-text-main'
                  } ${shakingBox === i + 1 ? 'box-shake' : ''}`}
                >
                  <span className="flex items-center gap-3">
                    <Icon 
                      size={18} 
                      weight={isPrimary ? 'fill' : 'bold'} 
                      className={isPrimary ? 'text-brand' : ''}
                    />
                    {btn.label}
                  </span>
                  <ArrowRight size={18} className="text-text-muted group-hover:text-current transition-colors" />
                  
                  {/* Ripple effects */}
                  <AnimatePresence>
                    {buttonRipples.map(ripple => (
                      <motion.span
                        key={ripple.id}
                        initial={{ scale: 0, opacity: 0.5 }}
                        animate={{ scale: 4, opacity: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                        className="absolute rounded-full pointer-events-none bg-current/20"
                        style={{
                          left: ripple.x,
                          top: ripple.y,
                          width: 20,
                          height: 20,
                          marginLeft: -10,
                          marginTop: -10,
                        }}
                      />
                    ))}
                  </AnimatePresence>
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
                className="bg-panel-solid border border-border-theme rounded-lg p-5 sm:p-8 max-w-2xl w-full flex flex-col relative max-h-[90vh] overflow-y-auto"
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
                className="bg-panel-solid border border-border-theme rounded-lg p-5 sm:p-8 max-w-md w-full flex flex-col items-center relative max-h-[90vh] overflow-y-auto"
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
      className={`absolute ${pos} font-mono text-[9px] text-text-theme-dim tracking-widest`}
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
