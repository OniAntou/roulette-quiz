import React from 'react';
import { motion } from 'framer-motion';
import { Check, X } from '@phosphor-icons/react';
import { WinnerInfo } from '../types';

interface GameOverProps {
  winnerInfo: WinnerInfo | null;
  disconnect: () => void;
}

export function GameOver({ winnerInfo, disconnect }: GameOverProps) {
  const { winner, isLocalWinner } = winnerInfo || { winner: 'No one', isLocalWinner: false };

  return (
    <div className="w-full max-w-lg px-6 flex flex-col items-center justify-center z-10 space-y-12">
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="relative w-36 h-36 flex items-center justify-center"
      >
        <div className={`absolute inset-0 rounded-full border-2 ${
          isLocalWinner ? 'border-emerald-500/30' : 'border-red-500/30'
        }`}></div>
        <div className={`absolute inset-3 rounded-full border ${
          isLocalWinner ? 'border-emerald-500/10' : 'border-red-500/10'
        }`}></div>
        {isLocalWinner ? (
          <Check size={48} className="text-emerald-400" />
        ) : (
          <X size={48} className="text-red-500" />
        )}
      </motion.div>

      <div className="flex flex-col items-center space-y-4 text-center">
        <motion.h1 
          animate={isLocalWinner ? { scale: [1, 1.03, 1] } : { opacity: [1, 0.5, 1, 0.7, 1] }}
          transition={{ duration: isLocalWinner ? 1.5 : 0.3, repeat: Infinity, repeatType: "mirror" }}
          className={`text-6xl md:text-7xl font-extrabold tracking-[8px] uppercase select-none ${
            isLocalWinner ? 'text-emerald-400' : 'text-red-500'
          }`}
        >
          {isLocalWinner ? 'VICTORY //' : 'DEFEAT //'}
        </motion.h1>
        <p className="text-sm font-semibold text-slate-300 tracking-wider uppercase">
          {isLocalWinner 
            ? `PROTOCOL SURVIVED // WINNER: ${winner.toUpperCase()}`
            : `PROTOCOL FAULT // WINNER: ${winner.toUpperCase()}`}
        </p>
      </div>

      <motion.button 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        onClick={disconnect}
        className="w-72 py-3.5 bg-[#1c1f2a] border border-white/8 hover:border-red-500/40 text-[11px] font-bold text-slate-300 tracking-widest uppercase rounded-xl hover:bg-slate-900 transition-all cursor-pointer text-center"
      >
        MAIN MENU // SYSTEM EXIT
      </motion.button>

      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {[...Array(25)].map((_, i) => {
          const size = Math.random() * 2 + 1;
          const left = Math.random() * 100;
          const duration = Math.random() * 3 + 2;
          const delay = Math.random() * 2;
          return (
            <motion.div 
              key={i}
              initial={{ y: -20, x: `${left}vw`, opacity: 0.3 }}
              animate={{ y: '105vh', opacity: 0 }}
              transition={{ duration, repeat: Infinity, delay, ease: "linear" }}
              className="absolute rounded-full"
              style={{ width: size, height: size, backgroundColor: isLocalWinner ? '#10b981' : '#ff3b30' }}
            />
          );
        })}
      </div>
    </div>
  );
}
