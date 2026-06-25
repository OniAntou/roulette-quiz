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
    <div className="w-full max-w-lg px-6 flex flex-col items-center justify-center z-10 space-y-12 py-10">
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="relative w-56 h-56 flex items-center justify-center"
      >
        <div className={`absolute inset-0 rounded-full border-2 blur-sm ${
          isLocalWinner ? 'border-emerald-500/40 shadow-[0_0_30px_rgba(16,185,129,0.2)]' : 'border-red-500/40 shadow-[0_0_30px_rgba(239,68,68,0.2)]'
        }`}></div>
        <div className={`absolute inset-0 rounded-full border-2 ${
          isLocalWinner ? 'border-emerald-500/30' : 'border-red-500/30'
        }`}></div>
        <div className={`absolute inset-4 rounded-full border ${
          isLocalWinner ? 'border-emerald-500/10' : 'border-red-500/10'
        }`}></div>
        {isLocalWinner ? (
          <Check size={80} className="text-emerald-400 drop-shadow-[0_0_15px_rgba(16,185,129,0.4)]" />
        ) : (
          <X size={80} className="text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.4)]" />
        )}
      </motion.div>

      <div className="flex flex-col items-center space-y-4 text-center">
        <motion.h1 
          animate={isLocalWinner ? { scale: [1, 1.05, 1], filter: ["drop-shadow(0 0 10px rgba(16,185,129,0.3))", "drop-shadow(0 0 20px rgba(16,185,129,0.5))", "drop-shadow(0 0 10px rgba(16,185,129,0.3))"] } : { opacity: [1, 0.4, 0.9, 0.3, 1] }}
          transition={{ duration: isLocalWinner ? 2 : 0.4, repeat: Infinity, repeatType: "mirror" }}
          className={`text-8xl md:text-9xl font-black tracking-[14px] uppercase select-none ${
            isLocalWinner ? 'text-emerald-400' : 'text-red-500'
          }`}
        >
          {isLocalWinner ? 'VICTORY //' : 'DEFEAT //'}
        </motion.h1>
        <p className="text-base font-extrabold text-slate-300 tracking-wider uppercase bg-white/3 border border-white/5 rounded-xl px-6 py-3 backdrop-blur-sm shadow-sm">
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
        className="group relative w-96 py-5 bg-[#1c1f2a]/90 border border-white/8 hover:border-red-500/40 text-sm font-bold text-slate-300 tracking-widest uppercase rounded-2xl hover:text-white hover:bg-slate-900 hover:shadow-[0_0_20px_rgba(239,68,68,0.1)] transition-all duration-300 overflow-hidden cursor-pointer text-center"
      >
        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-red-500 scale-y-0 group-hover:scale-y-100 transition-transform duration-300"></div>
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
