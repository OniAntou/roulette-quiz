import React, { useEffect } from 'react';
import type { Variants } from 'framer-motion';
import { motion, useAnimation } from 'framer-motion';
import { Trophy, Skull, ArrowLeft, Star } from '@phosphor-icons/react';
import { WinnerInfo } from '../types';
import { ThemeToggle } from './ThemeToggle';

interface GameOverProps {
  winnerInfo: WinnerInfo | null;
  disconnect: () => void;
}

// Scanline overlay for CRT effect
function ScanlineOverlay() {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-10 overflow-hidden"
      style={{
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.04) 2px, rgba(0,0,0,0.04) 4px)',
      }}
    />
  );
}

// Floating particle
function Particle({ isWin, i }: { isWin: boolean; i: number }) {
  const left = (i * 4.1 + Math.sin(i * 1.3) * 8 + 50) % 100;
  const size = (i % 3) + 1.5;
  const duration = 3 + (i % 4);
  const delay = (i * 0.18) % 3;

  const color = isWin
    ? i % 3 === 0 ? 'var(--emerald-theme)' : i % 3 === 1 ? 'var(--amber-theme)' : 'var(--cyan-theme)'
    : i % 2 === 0 ? 'var(--red-theme)' : 'var(--cyan-theme)';

  return (
    <motion.div
      key={i}
      className="absolute rounded-full"
      style={{ width: size, height: size, backgroundColor: color, left: `${left}%`, top: '-10px' }}
      animate={{ y: '105vh', opacity: [0.8, 0.5, 0] }}
      transition={{ duration, repeat: Infinity, delay, ease: 'linear' }}
    />
  );
}

// Glitch text effect for DEFEAT
function GlitchText({ text, className }: { text: string; className: string }) {
  return (
    <div className="relative select-none">
      <motion.span
        className={`${className} absolute inset-0`}
        style={{ color: 'var(--red-theme)', clipPath: 'inset(0 0 60% 0)', left: '3px', opacity: 0.7 }}
        animate={{ x: [-3, 3, -2, 0], opacity: [0.7, 0, 0.7, 0.5, 0.7] }}
        transition={{ duration: 0.15, repeat: Infinity, repeatDelay: 2.5 }}
      >
        {text}
      </motion.span>
      <motion.span
        className={`${className} absolute inset-0`}
        style={{ color: 'var(--cyan-theme)', clipPath: 'inset(60% 0 0 0)', left: '-3px', opacity: 0.7 }}
        animate={{ x: [3, -3, 2, 0], opacity: [0.7, 0, 0.7, 0.5, 0.7] }}
        transition={{ duration: 0.15, repeat: Infinity, repeatDelay: 2.5, delay: 0.05 }}
      >
        {text}
      </motion.span>
      <span className={className}>{text}</span>
    </div>
  );
}

export function GameOver({ winnerInfo, disconnect }: GameOverProps) {
  const { winner, isLocalWinner } = winnerInfo || { winner: 'UNKNOWN', isLocalWinner: false };
  const isAnnihilation = winner === 'No one';
  const controls = useAnimation();

  useEffect(() => {
    controls.start('visible');
  }, [controls]);

  const containerVariants: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.12 } },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 180, damping: 20 } },
  };

  return (
    <>
      <div className="fixed top-5 right-5 z-50"><ThemeToggle /></div>

      {/* Background particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {[...Array(30)].map((_, i) => <Particle key={i} isWin={isLocalWinner} i={i} />)}
      </div>

      {/* Radial glow background */}
      <motion.div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          background: isLocalWinner
            ? 'radial-gradient(circle at center, rgba(16,185,129,0.08) 0%, transparent 60%)'
            : isAnnihilation
              ? 'radial-gradient(circle at center, rgba(239,68,68,0.2) 0%, rgba(185,28,28,0.05) 60%)'
              : 'radial-gradient(circle at center, rgba(239,68,68,0.05) 0%, transparent 60%)',
        }}
      />

      <ScanlineOverlay />

      <motion.div
        className="relative z-20 flex flex-col items-center gap-8 w-full max-w-lg px-6 mx-auto mt-12"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Core emblem */}
        <motion.div variants={itemVariants} className="relative flex items-center justify-center w-48 h-48">
          {/* Outer rotating brackets */}
          <motion.div
            className="absolute rounded-full"
            style={{
              width: 220, height: 220,
              border: `2px solid ${isLocalWinner ? 'var(--emerald-theme)' : 'var(--red-theme)'}`,
              borderTopColor: 'transparent',
              borderBottomColor: 'transparent',
              opacity: 0.4,
            }}
            animate={{ rotate: isLocalWinner ? 360 : -360 }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          />
          {/* Pulse ring */}
          <motion.div
            className="absolute rounded-full bg-transparent"
            style={{
              width: 130, height: 130,
              border: `2px solid ${isLocalWinner ? 'var(--emerald-theme)' : 'var(--red-theme)'}`,
            }}
            animate={{ scale: [1, 1.08, 1], opacity: [0.15, 0.05, 0.15] }}
            transition={{ duration: 2.5, repeat: Infinity }}
          />
          {/* Core circle */}
          <motion.div
            className="relative w-32 h-32 rounded-full flex items-center justify-center"
            style={{
              background: isLocalWinner
                ? 'radial-gradient(circle, rgba(16,185,129,0.15) 0%, rgba(16,185,129,0.04) 100%)'
                : 'radial-gradient(circle, rgba(239,68,68,0.15) 0%, rgba(239,68,68,0.04) 100%)',
              border: `1.5px solid ${isLocalWinner ? 'var(--emerald-theme-border)' : 'var(--red-theme-border)'}`,
              boxShadow: isLocalWinner
                ? '0 0 40px rgba(16,185,129,0.2), inset 0 0 30px rgba(16,185,129,0.05)'
                : isAnnihilation
                  ? '0 0 80px rgba(239,68,68,0.5), inset 0 0 50px rgba(239,68,68,0.2)'
                  : '0 0 40px rgba(239,68,68,0.2), inset 0 0 30px rgba(239,68,68,0.05)',
            }}
            animate={isLocalWinner
              ? { boxShadow: ['0 0 30px rgba(16,185,129,0.2)', '0 0 60px rgba(16,185,129,0.35)', '0 0 30px rgba(16,185,129,0.2)'] }
              : isAnnihilation
                ? { boxShadow: ['0 0 60px rgba(239,68,68,0.4)', '0 0 100px rgba(239,68,68,0.7)', '0 0 60px rgba(239,68,68,0.4)'] }
                : { boxShadow: ['0 0 30px rgba(239,68,68,0.2)', '0 0 60px rgba(239,68,68,0.35)', '0 0 30px rgba(239,68,68,0.2)'] }
            }
            transition={{ duration: 2, repeat: Infinity }}
          >
            {isLocalWinner ? (
              <motion.div
                animate={{ rotate: [0, 5, -5, 0], scale: [1, 1.1, 1] }}
                transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1 }}
              >
                <Trophy size={52} weight="fill" style={{ color: 'var(--amber-theme)' }} />
              </motion.div>
            ) : (
              <motion.div
                animate={{ rotate: isAnnihilation ? [0, -10, 10, -10, 10, 0] : [0, -3, 3, 0], scale: isAnnihilation ? [1, 1.2, 1] : 1 }}
                transition={{ duration: isAnnihilation ? 0.5 : 0.3, repeat: Infinity, repeatDelay: isAnnihilation ? 0.5 : 2 }}
              >
                <Skull size={isAnnihilation ? 64 : 52} weight="fill" style={{ color: 'var(--red-theme)' }} />
              </motion.div>
            )}
          </motion.div>

          {/* Corner brackets */}
          {[[-1,-1], [1,-1], [-1,1], [1,1]].map(([sx, sy], i) => (
            <div key={i} className="absolute w-4 h-4"
              style={{
                top: sy === -1 ? 0 : 'auto', bottom: sy === 1 ? 0 : 'auto',
                left: sx === -1 ? 0 : 'auto', right: sx === 1 ? 0 : 'auto',
                borderTop: sy === -1 ? `2px solid ${isLocalWinner ? 'var(--emerald-theme)' : 'var(--red-theme)'}` : 'none',
                borderBottom: sy === 1 ? `2px solid ${isLocalWinner ? 'var(--emerald-theme)' : 'var(--red-theme)'}` : 'none',
                borderLeft: sx === -1 ? `2px solid ${isLocalWinner ? 'var(--emerald-theme)' : 'var(--red-theme)'}` : 'none',
                borderRight: sx === 1 ? `2px solid ${isLocalWinner ? 'var(--emerald-theme)' : 'var(--red-theme)'}` : 'none',
              }}
            />
          ))}
        </motion.div>

        {/* Main headline */}
        <motion.div variants={itemVariants} className="flex flex-col items-center gap-3 w-full">
          {isLocalWinner ? (
            <motion.h1
              className="text-7xl md:text-8xl font-black tracking-[10px] uppercase"
              style={{ color: 'var(--emerald-theme)' }}
              animate={{
                textShadow: [
                  '0 0 10px rgba(16,185,129,0.3)',
                  '0 0 30px rgba(16,185,129,0.7)',
                  '0 0 10px rgba(16,185,129,0.3)',
                ],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              VICTORY
            </motion.h1>
          ) : (
            <GlitchText
              text={isAnnihilation ? "ANNIHILATION" : "DEFEAT"}
              className={`${isAnnihilation ? 'text-5xl md:text-6xl text-center' : 'text-7xl md:text-8xl'} font-black tracking-[10px] uppercase block w-full whitespace-nowrap overflow-visible leading-tight`}
              // @ts-ignore
              style={{ color: 'var(--red-theme)' }}
            />
          )}

          {/* Winner name plate */}
          <div className={`relative px-8 py-3 border rounded-xl backdrop-blur-sm overflow-hidden text-center w-full max-w-sm ${
            isLocalWinner
              ? 'border-emerald-theme-border bg-emerald-theme-bg'
              : 'border-border-theme bg-panel-solid/60'
          }`}>
            <div className="absolute top-0 left-0 w-full h-[1px]"
              style={{
                background: isLocalWinner
                  ? 'linear-gradient(90deg, transparent, var(--emerald-theme), transparent)'
                  : 'linear-gradient(90deg, transparent, var(--border-theme-strong), transparent)',
              }}
            />
            <p className="text-sm font-black tracking-[3px] uppercase" style={{ color: isLocalWinner ? 'var(--emerald-theme)' : 'var(--text-theme-muted)' }}>
              {isLocalWinner ? '// WINNER //' : isAnnihilation ? '// MUTUAL DESTRUCTION //' : '// ELIMINATED //'}
            </p>
            <p className="text-2xl font-black tracking-widest uppercase mt-1" style={{ color: 'var(--text-theme)' }}>
              {winner}
            </p>
            {isLocalWinner && (
              <div className="flex justify-center gap-1 mt-2">
                {[...Array(5)].map((_, i) => (
                  <motion.div key={i}
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.15 }}
                  >
                    <Star size={12} weight="fill" style={{ color: 'var(--amber-theme)' }} />
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* Stats bar */}
        <motion.div
          variants={itemVariants}
          className="w-full grid grid-cols-3 gap-3"
        >
          {[
            { label: 'STATUS', value: isLocalWinner ? 'ALIVE' : 'DECEASED' },
            { label: 'ROUND', value: 'COMPLETE' },
            { label: 'PROTOCOL', value: isLocalWinner ? 'PASS' : 'FAIL' },
          ].map((stat) => (
            <div key={stat.label}
              className="flex flex-col items-center gap-1 border border-border-theme rounded-xl py-3 px-2 bg-panel-solid/40 backdrop-blur-sm"
            >
              <span className="text-[9px] font-black tracking-[2px] uppercase" style={{ color: 'var(--text-theme-muted)' }}>{stat.label}</span>
              <span className={`text-xs font-black tracking-wider uppercase ${
                stat.value === 'ALIVE' || stat.value === 'PASS' ? 'text-emerald-theme' :
                stat.value === 'DECEASED' || stat.value === 'FAIL' ? 'text-red-theme' :
                'text-text-theme'
              }`}>{stat.value}</span>
            </div>
          ))}
        </motion.div>

        {/* CTA Button */}
        <motion.div variants={itemVariants} className="w-full">
          <motion.button
            onClick={disconnect}
            className="group relative w-full py-5 rounded-2xl overflow-hidden cursor-pointer font-black text-sm tracking-[4px] uppercase transition-all duration-300"
            style={{
              background: 'var(--bg-panel-solid)',
              border: '1px solid var(--border-theme)',
              color: 'var(--text-theme-secondary)',
            }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
          >
            {/* Animated left bar */}
            <motion.div
              className="absolute left-0 top-0 bottom-0 w-[3px]"
              style={{ backgroundColor: isLocalWinner ? 'var(--emerald-theme)' : 'var(--red-theme)' }}
              initial={{ scaleY: 0 }}
              whileHover={{ scaleY: 1 }}
              transition={{ duration: 0.2 }}
            />
            {/* Shimmer */}
            <motion.div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              style={{
                background: isLocalWinner
                  ? 'linear-gradient(90deg, transparent, rgba(16,185,129,0.05), transparent)'
                  : 'linear-gradient(90deg, transparent, rgba(239,68,68,0.05), transparent)',
              }}
            />
            <span className="relative z-10 flex items-center justify-center gap-3">
              <ArrowLeft size={16} />
              RETURN TO MAIN MENU
            </span>
          </motion.button>
        </motion.div>

        {/* Bottom label */}
        <motion.p
          variants={itemVariants}
          className="text-[9px] font-bold tracking-[3px] uppercase"
          style={{ color: 'var(--text-theme-dim)' }}
        >
          // ROULETTE_PROTOCOL // SESSION_TERMINATED //
        </motion.p>
      </motion.div>
    </>
  );
}
