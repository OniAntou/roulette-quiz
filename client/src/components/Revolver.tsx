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
        className="w-80 h-[220px] relative flex items-center justify-center bg-[#0d0e12]/60 backdrop-blur-md rounded-2xl border border-white/8 shadow-2xl overflow-hidden"
      >
        <svg className="w-full h-full text-slate-800" viewBox="0 0 320 220">
          <defs>
            {/* Dark industrial metal gradient for gun base */}
            <linearGradient id="gunMetal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#323644" />
              <stop offset="50%" stopColor="#20242e" />
              <stop offset="100%" stopColor="#13151b" />
            </linearGradient>
            
            {/* Even darker metal gradient for frames and recesses */}
            <linearGradient id="darkMetal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1a1c24" />
              <stop offset="100%" stopColor="#08090c" />
            </linearGradient>

            {/* Cyberpunk dark red grip wood/fiber gradient */}
            <linearGradient id="gripPattern" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#5a2222" />
              <stop offset="50%" stopColor="#371717" />
              <stop offset="100%" stopColor="#1d0a0a" />
            </linearGradient>

            {/* Brass radial gradient for bullets */}
            <radialGradient id="bulletBrass" cx="40%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#ffee93" />
              <stop offset="60%" stopColor="#d4af37" />
              <stop offset="100%" stopColor="#7c5e10" />
            </radialGradient>

            {/* Bullet primer gradient */}
            <radialGradient id="bulletPrimer" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="40%" stopColor="#c0c0c0" />
              <stop offset="100%" stopColor="#6e6e6e" />
            </radialGradient>

            {/* Fired bullet cap dark depth */}
            <radialGradient id="firedCap" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#1e2029" />
              <stop offset="80%" stopColor="#0d0e12" />
              <stop offset="100%" stopColor="#000000" />
            </radialGradient>

            {/* Cyberpunk neon red glow filter */}
            <filter id="redGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feComponentTransfer in="blur" result="glow">
                <feFuncA type="linear" slope="2" />
              </feComponentTransfer>
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Technical grid pattern */}
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255, 255, 255, 0.02)" strokeWidth="0.5" />
            </pattern>
          </defs>

          {/* Grid Background */}
          <rect width="320" height="220" fill="url(#grid)" />

          {/* Ambient red neon falloff behind the cylinder */}
          <circle cx="210" cy="115" r="65" fill="#ff3b30" opacity="0.03" filter="blur(15px)" />
          <line x1="30" y1="95" x2="290" y2="95" stroke="rgba(255, 255, 255, 0.025)" strokeWidth="1" strokeDasharray="3,3" />

          {/* =======================================================
              GUN COMPONENTS (ORDERED BACK TO FRONT)
              ======================================================= */}

          {/* 1. Trigger Guard (Vòng bảo vệ cò) */}
          <path d="M 165 125 C 165 165, 215 165, 215 125" fill="none" stroke="url(#gunMetal)" strokeWidth="6.5" strokeLinecap="round" />
          <path d="M 165 125 C 165 165, 215 165, 215 125" fill="none" stroke="#ff3b30" strokeWidth="1.5" filter="url(#redGlow)" opacity="0.4" />

          {/* 2. Cò súng (Trigger) */}
          <motion.path 
            d="M 185 122 Q 192 142 180 150" 
            fill="none" 
            stroke="#d4af37" 
            strokeWidth="3.5" 
            strokeLinecap="round"
            animate={isFiring ? { rotate: [0, 20, 0] } : {}}
            style={{ transformOrigin: '185px 122px' }}
            transition={{ duration: 0.18 }}
          />

          {/* 3. Báng súng (Grip) */}
          {/* Main carbon-wood fiber grip */}
          <path d="M 245 130 L 290 198 C 295 206, 288 215, 278 213 L 222 173 Z" fill="url(#gripPattern)" stroke="#111317" strokeWidth="1.5" />
          {/* Rubberized non-slip backstrap panel */}
          <path d="M 276 177 L 290 198 C 291 202, 288 212, 278 213 L 260 199 Z" fill="#0b0c0f" />
          {/* Neon Led stripe on grip */}
          <path d="M 252 140 L 278 190" stroke="#ff3b30" strokeWidth="2.5" strokeLinecap="round" filter="url(#redGlow)" opacity="0.8" />
          {/* Hex screw head details */}
          <circle cx="235" cy="165" r="3" fill="#6b7280" stroke="#2a2e38" strokeWidth="0.8" />
          <circle cx="275" cy="200" r="3" fill="#6b7280" stroke="#2a2e38" strokeWidth="0.8" />

          {/* 4. Búa gõ Skeletonized (Hammer) - Rotates around (245, 80) */}
          <motion.g 
            style={{ transformOrigin: '245px 80px' }}
            animate={{ 
              rotate: isFiring ? [0, -35, 25, 0] : isSpinning ? -35 : 0 
            }}
            transition={{ 
              duration: isFiring ? 0.22 : 0.15,
              ease: "easeInOut"
            }}
          >
            {/* Skeletonized Hammer Outer Shape */}
            <path d="M 242 84 L 230 52 C 228 47, 238 43, 244 48 L 253 66 C 255 70, 254 78, 246 84 Z" fill="url(#darkMetal)" stroke="#4b5563" strokeWidth="1.2" />
            {/* Cutout gap for the skeletonized design */}
            <path d="M 240 70 L 236 56 L 244 54 Z" fill="#0d0e12" stroke="#2a2e38" strokeWidth="0.5" />
          </motion.g>

          {/* 5. Nòng súng (Barrel) */}
          {/* Tactical picatinny accessory rail on top */}
          <path d="M 40 68 L 160 68 L 160 74 L 40 74 Z" fill="url(#darkMetal)" stroke="#374151" strokeWidth="0.5" />
          <rect x="52" y="67" width="5" height="4" fill="#08090c" />
          <rect x="68" y="67" width="5" height="4" fill="#08090c" />
          <rect x="84" y="67" width="5" height="4" fill="#08090c" />
          <rect x="100" y="67" width="5" height="4" fill="#08090c" />
          <rect x="116" y="67" width="5" height="4" fill="#08090c" />
          <rect x="132" y="67" width="5" height="4" fill="#08090c" />
          <rect x="148" y="67" width="5" height="4" fill="#08090c" />

          {/* Main Barrel block with vát xéo 45 độ at muzzle */}
          <path d="M 165 74 L 42 74 L 30 86 L 30 104 L 42 116 L 165 116 Z" fill="url(#gunMetal)" stroke="#374151" strokeWidth="1.2" />
          {/* Under-barrel chassis weight */}
          <path d="M 140 116 L 38 116 L 38 123 L 140 123 Z" fill="url(#darkMetal)" stroke="#1a1c24" strokeWidth="0.8" />
          {/* Front sight (Thước ngắm) */}
          <path d="M 33 86 L 30 78 L 38 86 Z" fill="#ff3b30" filter="url(#redGlow)" />

          {/* Glowing Nuclear/Plasma Core inside barrel slits */}
          <rect x="52" y="90" width="96" height="10" fill="#08090c" rx="3" />
          <rect x="54" y="92" width="92" height="6" fill="#ff3b30" rx="2" filter="url(#redGlow)" />
          
          {/* Outer heat shield ventilation cuts (3 slots) */}
          <rect x="58" y="91" width="22" height="8" rx="4" fill="none" stroke="#ff3b30" strokeWidth="1" filter="url(#redGlow)" opacity="0.7" />
          <rect x="90" y="91" width="22" height="8" rx="4" fill="none" stroke="#ff3b30" strokeWidth="1" filter="url(#redGlow)" opacity="0.7" />
          <rect x="122" y="91" width="22" height="8" rx="4" fill="none" stroke="#ff3b30" strokeWidth="1" filter="url(#redGlow)" opacity="0.7" />

          {/* 6. Thân súng chính (Frame/Chassis) */}
          <path d="M 165 74 L 250 74 L 265 110 L 245 165 L 210 165 L 165 125 Z" fill="url(#gunMetal)" stroke="#4b5563" strokeWidth="1.2" />
          {/* Decorative neon panel lines on main receiver */}
          <path d="M 175 82 L 235 82 L 245 110 M 235 155 L 180 120" fill="none" stroke="#ff3b30" strokeWidth="1.5" filter="url(#redGlow)" opacity="0.75" />
          
          {/* Cylinder shield cutout background ring */}
          <circle cx="210" cy="115" r="48" fill="url(#darkMetal)" stroke="#1a1c24" strokeWidth="1" />

          {/* 7. Active chamber indicator pointer (Chỉ định góc 12h) */}
          <polygon points="210,63 205,53 215,53" fill="#ff3b30" filter="url(#redGlow)" />

          {/* =======================================================
              DYNAMIC ROTATING CYLINDER Group (Ổ xoay đạn)
              ======================================================= */}
          <g transform="translate(210, 115)">
            <motion.g
              animate={{ rotate: isSpinning ? -720 - (currentPosition * 60) : -(currentPosition * 60) }}
              transition={{ duration: isSpinning ? 1.2 : 0.4, ease: isSpinning ? [0.16, 1, 0.3, 1] as const : "easeOut" }}
            >
              {/* Cylinder Outer shell */}
              <circle cx="0" cy="0" r="44" stroke="#4b5563" strokeWidth="1.5" fill="#1f232d" />
              <circle cx="0" cy="0" r="38" stroke="#08090c" strokeWidth="1.2" fill="#14161e" />

              {/* Cylinder Flutes */}
              {[0, 1, 2, 3, 4, 5].map((i) => {
                const fluteAngle = (i / 6) * Math.PI * 2 + (Math.PI / 6);
                const fluteX = Math.cos(fluteAngle) * 45;
                const fluteY = Math.sin(fluteAngle) * 45;
                return <circle key={`flute-${i}`} cx={fluteX} cy={fluteY} r="7" fill="#08090c" />;
              })}

              {/* Center axle assembly */}
              <circle cx="0" cy="0" r="9" fill="#08090c" stroke="#374151" strokeWidth="1.2" />
              <circle cx="0" cy="0" r="3" fill="#20242e" />

              {/* 6 Chambers with Bullets */}
              {[0, 1, 2, 3, 4, 5].map((index) => {
                const angle = (index / 6) * Math.PI * 2 - Math.PI / 2;
                const bulletDist = 28;
                const x = Math.cos(angle) * bulletDist;
                const y = Math.sin(angle) * bulletDist;
                const isFired = index < bulletsFired;

                return (
                  <g key={index} transform={`translate(${x}, ${y})`}>
                    {/* Chamber brass casing edge */}
                    <circle cx="0" cy="0" r="10.5" fill="#08090c" stroke="rgba(255,255,255,0.06)" strokeWidth="0.8" />
                    
                    {!isFired ? (
                      // Live Casing (Mạ đồng vàng cao cấp phản quang)
                      <>
                        <circle cx="0" cy="0" r="8" fill="url(#bulletBrass)" stroke="#5c450c" strokeWidth="0.8" />
                        <circle cx="0" cy="0" r="4.5" fill="url(#bulletPrimer)" stroke="#4f4f4f" strokeWidth="0.5" />
                        <circle cx="0" cy="0" r="1.5" fill="#3d2c04" />
                      </>
                    ) : (
                      // Spent Chamber (Vỏ đạn đen cháy)
                      <>
                        <circle cx="0" cy="0" r="8" fill="url(#firedCap)" stroke="#1a1c22" strokeWidth="0.8" />
                        <circle cx="0" cy="0" r="3.2" fill="#000000" stroke="#111111" strokeWidth="0.5" />
                      </>
                    )}
                  </g>
                );
              })}
            </motion.g>
          </g>

          {/* Technical code/asset stamp */}
          <text x="30" y="200" fill="rgba(255, 255, 255, 0.15)" fontSize="7" fontFamily="monospace" letterSpacing="1">
            HAZARD MODEL // V2.03 GLOW-REVOLVER
          </text>
        </svg>

        {/* =======================================================
            DYNAMIC BARREL MUZZLE FLASH & SPARKS (Left Side Muzzle)
            ======================================================= */}
        <AnimatePresence>
          {isFiring && !alive && (
            <div className="absolute inset-0 pointer-events-none">
              <svg className="w-full h-full" viewBox="0 0 320 220">
                {/* 1. Primary Orange/Yellow Blast Wave */}
                <motion.g
                  initial={{ opacity: 0, scale: 0.4 }}
                  animate={{ 
                    opacity: [0, 1, 1, 0], 
                    scale: [0.6, 1.25, 1.1, 0.6] 
                  }}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                  style={{ transformOrigin: '30px 95px' }}
                >
                  {/* Outer Blast cloud */}
                  <path d="M 30 95 L -20 70 L -10 90 L -65 95 L -10 100 L -20 120 Z" fill="#ff7c1f" filter="drop-shadow(0 0 8px rgba(255,124,31,0.5))" />
                  {/* Inner yellow core */}
                  <path d="M 30 95 L -10 80 L 0 95 L -45 95 L 0 95 L -10 110 Z" fill="#ffeb3b" />
                  <circle cx="30" cy="95" r="14" fill="#ffffff" />
                </motion.g>

                {/* 2. Dispersed spark rays (8 particles) */}
                {[...Array(8)].map((_, i) => {
                  const sparkAngle = Math.PI + (Math.random() * 0.7 - 0.35); // Leftward Math.PI +/- 20 deg
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

        {/* 3. Small blue electric spark on surviving click */}
        <AnimatePresence>
          {isFiring && alive && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 pointer-events-none"
            >
              <svg className="w-full h-full" viewBox="0 0 320 220">
                {/* Electric strike at firing pin area */}
                <circle cx="230" cy="72" r="3" fill="#60a5fa" filter="drop-shadow(0 0 4px #3b82f6)" />
                <line x1="230" y1="72" x2="225" y2="68" stroke="#93c5fd" strokeWidth="1" />
                <line x1="230" y1="72" x2="235" y2="76" stroke="#93c5fd" strokeWidth="1" />
              </svg>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Probability HUD info panel */}
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
