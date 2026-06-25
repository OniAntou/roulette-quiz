import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface RevolverProps {
  bulletsFired: number;
  currentPosition: number;
  isSpinning: boolean;
  isFiring: boolean;
  alive: boolean;
}

export function Revolver({ bulletsFired, currentPosition, isSpinning, isFiring, alive }: RevolverProps) {
  const totalChambers = 6;
  const remaining = totalChambers - bulletsFired;
  const probability = remaining <= 0 ? '100%' : `${Math.round((1 / remaining) * 100)}%`;

  const getDangerColor = () => {
    if (remaining <= 2) return 'text-red-500';
    if (remaining <= 4) return 'text-amber-500';
    return 'text-emerald-400';
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-6">
      {/* Gun Container */}
      <motion.div 
        animate={isFiring ? { 
          x: [0, 15, -4, 2, 0], 
          y: [0, -10, 4, -1, 0], 
          rotate: [0, -6, 2, 0] 
        } : {}}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="w-80 h-[220px] relative flex items-center justify-center bg-black/10 rounded-2xl border border-white/5 shadow-inner overflow-hidden"
      >
        <svg className="w-full h-full text-slate-800" viewBox="0 0 320 220">
          <defs>
            {/* Dark industrial metal gradient for gun base */}
            <linearGradient id="gunMetal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2c303b" />
              <stop offset="50%" stopColor="#1e222b" />
              <stop offset="100%" stopColor="#111318" />
            </linearGradient>
            
            {/* Even darker metal gradient for frames and recesses */}
            <linearGradient id="darkMetal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1c1f27" />
              <stop offset="100%" stopColor="#0b0c0f" />
            </linearGradient>

            {/* Cyberpunk dark red grip wood/fiber gradient */}
            <linearGradient id="gripPattern" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#4c1d1d" />
              <stop offset="50%" stopColor="#2d1414" />
              <stop offset="100%" stopColor="#170a0a" />
            </linearGradient>

            {/* Technical grid pattern */}
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255, 255, 255, 0.015)" strokeWidth="0.5" />
            </pattern>
          </defs>

          {/* Grid Background */}
          <rect width="320" height="220" fill="url(#grid)" />

          {/* Ambient light/shadow effects behind the gun */}
          <circle cx="210" cy="110" r="70" fill="#ef4444" opacity="0.015" filter="blur(20px)" />
          <line x1="30" y1="95" x2="290" y2="95" stroke="rgba(255, 255, 255, 0.02)" strokeWidth="1" strokeDasharray="3,3" />

          {/* =======================================================
              GUN COMPONENTS (ORDERED BACK TO FRONT)
              ======================================================= */}

          {/* 1. Trigger Guard (Vòng bảo vệ cò) */}
          <path d="M 165 115 C 165 160, 220 160, 220 120" fill="none" stroke="#252a37" strokeWidth="6" strokeLinecap="round" />
          <path d="M 165 115 C 165 160, 220 160, 220 120" fill="none" stroke="#374151" strokeWidth="2.5" strokeLinecap="round" />

          {/* 2. Cò súng (Trigger) */}
          <motion.path 
            d="M 185 115 Q 192 135 180 145" 
            fill="none" 
            stroke="#ef4444" 
            strokeWidth="3.5" 
            strokeLinecap="round"
            animate={isFiring ? { rotate: [0, 25, 0] } : {}}
            style={{ transformOrigin: '185px 115px' }}
            transition={{ duration: 0.2 }}
          />

          {/* 3. Báng súng (Grip) */}
          {/* Main Grip body */}
          <path d="M 245 125 L 290 195 C 295 203, 288 212, 278 210 L 222 170 Z" fill="url(#gripPattern)" stroke="#1a1c23" strokeWidth="1.5" />
          {/* Grip decoration ledger line */}
          <path d="M 252 135 L 282 185" stroke="#ff3b30" strokeWidth="2" strokeLinecap="round" opacity="0.5" />

          {/* 4. Búa gõ (Hammer) - Rotates around (245, 80) */}
          <motion.g 
            style={{ transformOrigin: '245px 80px' }}
            animate={{ 
              rotate: isFiring ? [0, -30, 25, 0] : isSpinning ? -30 : 0 
            }}
            transition={{ 
              duration: isFiring ? 0.22 : 0.15,
              ease: "easeInOut"
            }}
          >
            {/* Mechanical Hammer shape */}
            <path d="M 240 85 L 232 55 L 245 50 L 252 65 Q 262 70 252 82 Z" fill="#2d3139" stroke="#4b5563" strokeWidth="1" />
            {/* Hammer knurling texture */}
            <line x1="235" y1="54" x2="242" y2="52" stroke="#6b7280" strokeWidth="1" />
            <line x1="237" y1="57" x2="244" y2="55" stroke="#6b7280" strokeWidth="1" />
          </motion.g>

          {/* 5. Nòng súng (Barrel) */}
          {/* Main Barrel block */}
          <path d="M 165 75 L 30 75 C 24 75, 24 115, 30 115 L 165 115 Z" fill="url(#gunMetal)" stroke="#374151" strokeWidth="1" />
          {/* Under-barrel weight */}
          <path d="M 130 115 L 35 115 L 35 122 L 130 122 Z" fill="url(#darkMetal)" stroke="#1f2937" strokeWidth="0.8" />
          {/* Neon cooling slot along barrel */}
          <path d="M 140 95 L 45 95" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" opacity="0.8" className="animate-pulse" />
          {/* Front sight (Thước ngắm) */}
          <path d="M 33 75 L 38 68 L 44 75 Z" fill="#ef4444" />

          {/* 6. Thân súng chính (Frame/Chassis) */}
          <path d="M 165 75 L 250 75 L 260 110 L 245 160 L 210 160 L 165 125 Z" fill="url(#gunMetal)" stroke="#374151" strokeWidth="1.2" />
          
          {/* Cylinder shield cutout background */}
          <circle cx="210" cy="115" r="48" fill="url(#darkMetal)" stroke="#1f2937" strokeWidth="1" />

          {/* 7. Indicator pointer (Mũi tên đỏ chỉ khe đạn hoạt động ở đỉnh 12h) */}
          <polygon points="210,63 205,53 215,53" fill="#ff3b30" />

          {/* =======================================================
              DYNAMIC ROTATING CYLINDER Group
              ======================================================= */}
          <g transform="translate(210, 115)">
            <motion.g
              animate={{ rotate: isSpinning ? -720 - (currentPosition * 60) : -(currentPosition * 60) }}
              transition={{ duration: isSpinning ? 1.2 : 0.4, ease: isSpinning ? [0.16, 1, 0.3, 1] as const : "easeOut" }}
            >
              {/* Cylinder Outer Shape */}
              <circle cx="0" cy="0" r="44" stroke="#4b5563" strokeWidth="1.5" fill="#1f232d" />
              <circle cx="0" cy="0" r="38" stroke="#111318" strokeWidth="1" fill="#14161e" />

              {/* Cylinder Flutes (Rãnh khía lõm trên ổ xoay đạn) */}
              {[0, 1, 2, 3, 4, 5].map((i) => {
                const fluteAngle = (i / 6) * Math.PI * 2 + (Math.PI / 6);
                const fluteX = Math.cos(fluteAngle) * 45;
                const fluteY = Math.sin(fluteAngle) * 45;
                return <circle key={`flute-${i}`} cx={fluteX} cy={fluteY} r="7" fill="#0d0e12" />;
              })}

              {/* Center cylinder axle */}
              <circle cx="0" cy="0" r="9" fill="#0b0c0f" stroke="#374151" strokeWidth="1" />
              <circle cx="0" cy="0" r="3" fill="#1f232d" />

              {/* 6 Chambers with Bullets */}
              {[0, 1, 2, 3, 4, 5].map((index) => {
                const angle = (index / 6) * Math.PI * 2 - Math.PI / 2;
                const bulletDist = 28;
                const x = Math.cos(angle) * bulletDist;
                const y = Math.sin(angle) * bulletDist;
                const isFired = index < bulletsFired;

                return (
                  <g key={index} transform={`translate(${x}, ${y})`}>
                    {/* Chamber rim */}
                    <circle cx="0" cy="0" r="10.5" fill="#0a0b0d" stroke="rgba(255,255,255,0.06)" strokeWidth="0.8" />
                    
                    {!isFired ? (
                      // Live Bullet (Vỏ đạn vàng đồng nguyên vẹn)
                      <>
                        <circle cx="0" cy="0" r="8" fill="#d4af37" stroke="#7c5e10" strokeWidth="0.8" />
                        <circle cx="0" cy="0" r="4.5" fill="#c0c0c0" stroke="#7f7f7f" strokeWidth="0.5" />
                        <circle cx="0" cy="0" r="1.5" fill="#7c5e10" />
                      </>
                    ) : (
                      // Fired Chamber (Vỏ đạn đã bắn rỗng đen)
                      <>
                        <circle cx="0" cy="0" r="8" fill="#5a4a2a" stroke="#2b2517" strokeWidth="0.8" opacity="0.4" />
                        <circle cx="0" cy="0" r="3.2" fill="#000000" />
                      </>
                    )}
                  </g>
                );
              })}
            </motion.g>
          </g>

          {/* Ambient overlay text line inside gun viewport */}
          <text x="30" y="200" fill="rgba(255, 255, 255, 0.15)" fontSize="7" fontFamily="monospace" letterSpacing="1">
            HAZARD MODEL // REV-06 CYBERPUNK
          </text>
        </svg>

        {/* =======================================================
            DYNAMIC BARREL MUZZLE FLASH & SPARKS (Left Side)
            ======================================================= */}
        <AnimatePresence>
          {isFiring && !alive && (
            <div className="absolute inset-0 pointer-events-none">
              <svg className="w-full h-full" viewBox="0 0 320 220">
                {/* 1. Primary Orange/Yellow Blast Wave (Tia lửa chính) */}
                <motion.g
                  initial={{ opacity: 0, scale: 0.4 }}
                  animate={{ 
                    opacity: [0, 1, 1, 0], 
                    scale: [0.6, 1.25, 1.1, 0.6] 
                  }}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                  style={{ transformOrigin: '30px 95px' }}
                >
                  {/* Outer Fire Blast polygon */}
                  <path d="M 30 95 L -20 70 L -10 90 L -65 95 L -10 100 L -20 120 Z" fill="#ff7c1f" filter="drop-shadow(0 0 8px rgba(255,124,31,0.5))" />
                  {/* Inner Intense Yellow core */}
                  <path d="M 30 95 L -10 80 L 0 95 L -45 95 L 0 95 L -10 110 Z" fill="#ffeb3b" />
                  <circle cx="30" cy="95" r="14" fill="#ffffff" />
                </motion.g>

                {/* 2. Dispersed particle lines (Các tia lửa nhỏ văng ra) */}
                {[...Array(8)].map((_, i) => {
                  const sparkAngle = Math.PI + (Math.random() * 0.7 - 0.35); // Leftward direction Math.PI +/- 20 deg
                  const sparkDistance = Math.random() * 90 + 50;
                  const tx = Math.cos(sparkAngle) * sparkDistance;
                  const ty = Math.sin(sparkAngle) * sparkDistance;
                  
                  return (
                    <motion.line
                      key={`spark-${i}`}
                      x1="30"
                      y1="95"
                      x2="30"
                      y2="95"
                      animate={{ 
                        x2: 30 + tx, 
                        y2: 95 + ty, 
                        opacity: [1, 0.8, 0] 
                      }}
                      transition={{ duration: 0.35, ease: "easeOut" }}
                      stroke="#ff9f1a"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  );
                })}
              </svg>
            </div>
          )}
        </AnimatePresence>

        {/* 3. Small blue electric click spark (Tách điện nhỏ khi bắn trượt) */}
        <AnimatePresence>
          {isFiring && alive && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 pointer-events-none"
            >
              <svg className="w-full h-full" viewBox="0 0 320 220">
                {/* Spark at hammer/firing pin area */}
                <circle cx="230" cy="72" r="3" fill="#60a5fa" filter="drop-shadow(0 0 4px #3b82f6)" />
                <line x1="230" y1="72" x2="225" y2="68" stroke="#93c5fd" strokeWidth="1" />
                <line x1="230" y1="72" x2="235" y2="76" stroke="#93c5fd" strokeWidth="1" />
              </svg>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Probability info panel */}
      <div className="flex flex-col items-center space-y-1">
        <span className="text-xs font-bold text-white tracking-widest uppercase">
          LOAD // 0{remaining}
        </span>
        <span className={`text-[10px] font-semibold tracking-wider uppercase ${getDangerColor()}`}>
          PROBABILITY // {probability}
        </span>
      </div>
    </div>
  );
}
