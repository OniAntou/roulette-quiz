import React from 'react';
import { motion } from 'framer-motion';

interface RevolverProps {
  bulletsFired: number;
  currentPosition: number;
  isSpinning: boolean;
  isFiring: boolean;
  alive: boolean;
}

export function Revolver({ bulletsFired, currentPosition, isSpinning, isFiring, alive }: RevolverProps) {
  const totalChambers = 6;
  const radius = 26;

  const remaining = totalChambers - bulletsFired;
  const probability = remaining <= 0 ? '100%' : `${Math.round((1 / remaining) * 100)}%`;
  
  const getDangerColor = () => {
    if (remaining <= 2) return 'text-red-500';
    if (remaining <= 4) return 'text-amber-500';
    return 'text-emerald-400';
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-6">
      <motion.div 
        animate={isFiring ? { x: [0, 8, -4, 2, 0], y: [0, -6, 2, -1, 0], rotate: [0, -5, 2, 0] } : {}}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className="w-48 h-48 relative flex items-center justify-center"
      >
        <svg className="absolute inset-0 w-full h-full text-slate-800" viewBox="0 0 160 160">
          <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2,2" fill="none" opacity="0.15" />
          <circle cx="80" cy="80" r="52" stroke="currentColor" strokeWidth="0.5" fill="none" opacity="0.1" />
          <line x1="10" y1="80" x2="150" y2="80" stroke="currentColor" strokeWidth="0.5" opacity="0.1" />
          <line x1="80" y1="10" x2="80" y2="150" stroke="currentColor" strokeWidth="0.5" opacity="0.1" />
          <path d="M 32 32 L 95 32 L 128 65 L 128 128 L 60 136 L 32 95 Z" stroke="currentColor" strokeWidth="1.5" fill="#1c1f2a" opacity="0.9" />
          <circle cx="80" cy="80" r="9" stroke="currentColor" strokeWidth="1" fill="#14161e" />
        </svg>

        <motion.svg 
          animate={{ rotate: isSpinning ? -20 : 0 }}
          transition={{ duration: 0.1 }}
          className="absolute w-[24px] h-[36px] origin-bottom text-slate-600"
          style={{ top: '20px', right: '48px', transformOrigin: '15px 30px' }}
          viewBox="0 0 24 36"
        >
          <path d="M 0 30 L 5 10 L 15 5 L 22 22 Z" fill="#2d3139" stroke="currentColor" strokeWidth="1.5" />
        </motion.svg>

        <motion.div
          animate={{ rotate: isSpinning ? -720 - (currentPosition * 60) : -(currentPosition * 60) }}
          transition={{ duration: isSpinning ? 1.2 : 0.4, ease: isSpinning ? [0.16, 1, 0.3, 1] as const : "easeOut" }}
          className="w-28 h-28 relative flex items-center justify-center"
        >
          <svg className="w-full h-full text-slate-700" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="44" stroke="currentColor" strokeWidth="2" fill="#1f232d" />
            <circle cx="50" cy="50" r="38" stroke="currentColor" strokeWidth="1" fill="#13151b" />
            {[0, 1, 2, 3, 4, 5].map((i) => {
              const fluteAngle = (i / 6) * Math.PI * 2 + (Math.PI / 6);
              const fluteX = 50 + Math.cos(fluteAngle) * 45;
              const fluteY = 50 + Math.sin(fluteAngle) * 45;
              return <circle key={`flute-${i}`} cx={fluteX} cy={fluteY} r="7" fill="#14161e" />;
            })}
          </svg>

          {[0, 1, 2, 3, 4, 5].map((index) => {
            const angle = (index / 6) * Math.PI * 2 - Math.PI / 2;
            const x = 56 + Math.cos(angle) * radius;
            const y = 56 + Math.sin(angle) * radius;
            const isFired = index < bulletsFired;

            return (
              <div 
                key={index}
                className="absolute w-[22px] h-[22px] rounded-full border border-white/10 bg-[#0a0b0d] flex items-center justify-center"
                style={{ left: `${x}px`, top: `${y}px`, transform: 'translate(-50%, -50%)' }}
              >
                {!isFired ? (
                  <div className="w-[16px] h-[16px] rounded-full bg-[#d4af37] border border-[#7c5e10] flex items-center justify-center shadow-inner">
                    <div className="w-[8px] h-[8px] rounded-full bg-[#c0c0c0] flex items-center justify-center">
                      <div className="w-[3px] h-[3px] rounded-full bg-[#7c5e10]"></div>
                    </div>
                  </div>
                ) : (
                  <div className="w-[16px] h-[16px] rounded-full bg-[#5a4a2a]/50 border border-white/5 flex items-center justify-center">
                    <div className="w-[6px] h-[6px] rounded-full bg-black"></div>
                  </div>
                )}
              </div>
            );
          })}
        </motion.div>

        <div className="absolute top-2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[10px] border-t-[#ff3b30] z-20"></div>

        {isFiring && !alive && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {[...Array(12)].map((_, i) => {
              const sparkAngle = Math.random() * Math.PI * 2;
              const sparkDistance = Math.random() * 80 + 40;
              return (
                <motion.div 
                  key={i}
                  initial={{ width: 2, height: 12, rotate: (sparkAngle * 180)/Math.PI - 90, scaleY: 0.2, opacity: 1, x: 0, y: -25 }}
                  animate={{ x: Math.cos(sparkAngle) * sparkDistance, y: -25 + Math.sin(sparkAngle) * sparkDistance, scaleY: 1.5, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="absolute bg-gradient-to-t from-yellow-500 to-red-500 rounded"
                />
              );
            })}
          </div>
        )}
      </motion.div>

      <div className="flex flex-col items-center space-y-1">
        <span className="text-[11px] font-bold text-white tracking-widest uppercase">
          LOAD // 0{remaining}
        </span>
        <span className={`text-[9px] font-semibold tracking-wider uppercase ${getDangerColor()}`}>
          PROBABILITY // {probability}
        </span>
      </div>
    </div>
  );
}
