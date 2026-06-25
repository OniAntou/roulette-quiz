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
      {/* Gun Container - Layout-free lying flat on table with drop-shadow */}
      <motion.div 
        animate={isFiring ? { 
          x: [0, -15, 4, -2, 0], 
          y: [0, -8, 3, -1, 0], 
          rotate: [0, 4, -1, 0] 
        } : {}}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="w-80 h-[220px] relative flex items-center justify-center pointer-events-none select-none"
        style={{
          filter: 'drop-shadow(0px 15px 25px rgba(0, 0, 0, 0.7))'
        }}
      >
        <svg className="w-full h-full text-slate-800" viewBox="0 0 320 220">
          <defs>
            {/* Cement/Light Gray Matte Paint for primary slide and barrel */}
            <linearGradient id="cementGray" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#e5e7eb" />
              <stop offset="40%" stopColor="#d1d5db" />
              <stop offset="100%" stopColor="#9ca3af" />
            </linearGradient>

            {/* Darker Tactical Metal for chassis and frame */}
            <linearGradient id="darkChassis" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4b5563" />
              <stop offset="60%" stopColor="#374151" />
              <stop offset="100%" stopColor="#1f2937" />
            </linearGradient>

            {/* Deep Charcoal for cylinder and mechanical hollows */}
            <linearGradient id="charcoalMetal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2c303b" />
              <stop offset="100%" stopColor="#12141a" />
            </linearGradient>

            {/* Brass radial gradient for bullet casings */}
            <radialGradient id="bulletBrass" cx="40%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#ffee93" />
              <stop offset="60%" stopColor="#d4af37" />
              <stop offset="100%" stopColor="#7c5e10" />
            </radialGradient>

            {/* Silver primer cap for bullets */}
            <radialGradient id="bulletPrimer" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="55%" stopColor="#c0c0c0" />
              <stop offset="100%" stopColor="#737373" />
            </radialGradient>

            {/* Deep black for fired chambers */}
            <radialGradient id="firedCap" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#222530" />
              <stop offset="70%" stopColor="#0b0c10" />
              <stop offset="100%" stopColor="#000000" />
            </radialGradient>

            {/* Glowing Red Led filter */}
            <filter id="neonRedGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* =======================================================
              ARTSTATION SPEC SCI-FI GUN (RIGHT FACING)
              ======================================================= */}

          {/* 1. Trigger Guard (Xám đậm, dạng nét gấp khúc góc cạnh) */}
          <path d="M 105 125 L 105 160 L 152 160 L 140 125 Z" fill="none" stroke="#374151" strokeWidth="4" strokeLinecap="square" />

          {/* 2. Cò súng (Trigger - dạng gấp khúc tương lai) */}
          <motion.path 
            d="M 125 128 L 132 143 L 123 150" 
            fill="none" 
            stroke="#111317" 
            strokeWidth="3.5" 
            strokeLinecap="square"
            animate={isFiring ? { rotate: [0, -18, 0] } : {}}
            style={{ transformOrigin: '125px 128px' }}
            transition={{ duration: 0.18 }}
          />

          {/* 3. Báng súng (Grip - Dáng thẳng đứng chém góc) */}
          {/* Main Grip body */}
          <path d="M 64 125 L 94 125 L 85 212 L 48 212 C 44 212, 42 208, 44 204 L 54 140 Z" fill="url(#darkChassis)" stroke="#1f2937" strokeWidth="1" />
          {/* Grip Side Panel (ốp má báng súng) */}
          <path d="M 60 135 L 86 135 L 78 204 L 52 204 Z" fill="#2c303b" />
          {/* Grip pattern lines */}
          <line x1="58" y1="145" x2="84" y2="145" stroke="#1f2937" strokeWidth="1.5" />
          <line x1="56" y1="155" x2="82" y2="155" stroke="#1f2937" strokeWidth="1.5" />
          <line x1="54" y1="165" x2="80" y2="165" stroke="#1f2937" strokeWidth="1.5" />
          <line x1="52" y1="175" x2="78" y2="175" stroke="#1f2937" strokeWidth="1.5" />
          {/* Small red triangle badge on grip bottom */}
          <polygon points="56,196 61,196 58.5,191" fill="#ff3b30" />

          {/* 4. Búa gõ (Hammer) - Quay quanh tâm (85, 75) */}
          <motion.g 
            style={{ transformOrigin: '85px 75px' }}
            animate={{ 
              rotate: isFiring ? [0, 30, -20, 0] : isSpinning ? 30 : 0 
            }}
            transition={{ 
              duration: isFiring ? 0.22 : 0.15,
              ease: "easeInOut"
            }}
          >
            {/* Hammer shape */}
            <path d="M 85 75 L 88 52 C 88 48, 80 45, 75 50 L 72 68 Q 67 74, 85 75 Z" fill="url(#cementGray)" stroke="#4b5563" strokeWidth="0.8" />
          </motion.g>

          {/* 5. Nòng súng (Boxy Sci-Fi Barrel) */}
          {/* Main rectangular block of the barrel */}
          <path d="M 145 70 L 280 70 L 290 75 L 290 117 L 280 122 L 145 122 Z" fill="url(#cementGray)" stroke="#9ca3af" strokeWidth="1" />
          {/* Front Sight (Thước ngắm đầu nòng) */}
          <path d="M 276 70 L 280 62 L 285 70 Z" fill="#374151" />
          {/* Square Muzzle opening (Mặt cắt họng súng hình vuông vát nghiêng) */}
          <path d="M 290 75 L 298 75 L 298 117 L 290 117 Z" fill="#111317" />
          <rect x="292" y="80" width="4" height="32" fill="#050608" rx="0.5" />

          {/* 6. Thân súng chính dưới (Lower Chassis/Receiver) */}
          <path d="M 145 122 L 200 122 L 200 134 L 125 134 L 105 125 Z" fill="url(#darkChassis)" stroke="#1f2937" strokeWidth="1" />
          {/* Under-barrel lock button detail */}
          <rect x="185" y="125" width="8" height="5" fill="#111317" rx="1" />

          {/* 7. KABANN ARMORY Text engraving on barrel */}
          <text x="175" y="93" fill="#4b5563" fontSize="8" fontFamily="monospace" fontWeight="900" letterSpacing="0.5">KABANN ARMORY</text>
          <text x="175" y="103" fill="#6b7280" fontSize="7" fontFamily="monospace" fontWeight="bold">HC-X07</text>

          {/* 8. Oval slots (3 khe dọc trang trí của ArtStation súng) */}
          <rect x="160" y="78" width="4" height="12" rx="2" fill="#4b5563" opacity="0.7" />
          <rect x="210" y="78" width="4" height="12" rx="2" fill="#4b5563" opacity="0.7" />
          <rect x="270" y="78" width="4" height="12" rx="2" fill="#4b5563" opacity="0.7" />
          <rect x="156" y="98" width="12" height="3" rx="1" fill="#4b5563" opacity="0.7" />

          {/* Small red indicator triangles on frame */}
          <polygon points="148,84 153,84 150.5,79" fill="#ff3b30" />
          <polygon points="148,119 153,119 150.5,114" fill="#ff3b30" />

          {/* 9. Thân súng trên bọc ổ đạn (Upper Receiver) */}
          <path d="M 94 75 L 145 70 L 145 85 L 100 90 Z" fill="url(#cementGray)" stroke="#9ca3af" strokeWidth="1" />
          <circle cx="100" cy="80" r="1.5" fill="#4b5563" />
          <circle cx="106" cy="80" r="1.5" fill="#4b5563" />

          {/* Active chamber indicator pointer at top (12 o'clock) */}
          <polygon points="115,63 110,53 120,53" fill="#ff3b30" filter="url(#neonRedGlow)" />

          {/* =======================================================
              DYNAMIC ROTATING CYLINDER Group (Ổ xoay đạn ở giữa-trái)
              ======================================================= */}
          <g transform="translate(115, 115)">
            <motion.g
              animate={{ rotate: isSpinning ? -720 - (currentPosition * 60) : -(currentPosition * 60) }}
              transition={{ duration: isSpinning ? 1.2 : 0.4, ease: isSpinning ? [0.16, 1, 0.3, 1] as const : "easeOut" }}
            >
              {/* Cylinder Outer Shell */}
              <circle cx="0" cy="0" r="44" stroke="#374151" strokeWidth="1.5" fill="url(#charcoalMetal)" />
              <circle cx="0" cy="0" r="38" stroke="#08090c" strokeWidth="1.2" fill="#14161e" />

              {/* Cylinder Flutes (Đường cắt dọc) */}
              {[0, 1, 2, 3, 4, 5].map((i) => {
                const fluteAngle = (i / 6) * Math.PI * 2 + (Math.PI / 6);
                const fluteX = Math.cos(fluteAngle) * 44;
                const fluteY = Math.sin(fluteAngle) * 44;
                return <circle key={`flute-${i}`} cx={fluteX} cy={fluteY} r="7.5" fill="#08090c" />;
              })}

              {/* Center axle assembly */}
              <circle cx="0" cy="0" r="10" fill="#08090c" stroke="#374151" strokeWidth="1" />
              <circle cx="0" cy="0" r="3.5" fill="#2c303b" />

              {/* 6 Chambers with Bullets */}
              {[0, 1, 2, 3, 4, 5].map((index) => {
                const angle = (index / 6) * Math.PI * 2 - Math.PI / 2;
                const bulletDist = 27;
                const x = Math.cos(angle) * bulletDist;
                const y = Math.sin(angle) * bulletDist;
                const isFired = index < bulletsFired;

                return (
                  <g key={index} transform={`translate(${x}, ${y})`}>
                    {/* Chamber rim border */}
                    <circle cx="0" cy="0" r="10" fill="#07080a" stroke="rgba(255,255,255,0.06)" strokeWidth="0.8" />
                    
                    {!isFired ? (
                      // Live Bullet (Vỏ đồng vàng mạ)
                      <>
                        <circle cx="0" cy="0" r="7.5" fill="url(#bulletBrass)" stroke="#5c450c" strokeWidth="0.8" />
                        <circle cx="0" cy="0" r="4.2" fill="url(#bulletPrimer)" stroke="#4f4f4f" strokeWidth="0.5" />
                        <circle cx="0" cy="0" r="1.3" fill="#3d2c04" />
                      </>
                    ) : (
                      // Fired Chamber
                      <>
                        <circle cx="0" cy="0" r="7.5" fill="url(#firedCap)" stroke="#111317" strokeWidth="0.8" />
                        <circle cx="0" cy="0" r="3" fill="#000000" stroke="#080808" strokeWidth="0.5" />
                      </>
                    )}
                  </g>
                );
              })}
            </motion.g>
          </g>
        </svg>

        {/* =======================================================
            DYNAMIC MUZZLE FLASH & SPARKS (Phun sang PHẢI)
            ======================================================= */}
        <AnimatePresence>
          {isFiring && !alive && (
            <div className="absolute inset-0 pointer-events-none">
              <svg className="w-full h-full" viewBox="0 0 320 220">
                {/* 1. Muzzle Flash Core Blast */}
                <motion.g
                  initial={{ opacity: 0, scale: 0.4 }}
                  animate={{ 
                    opacity: [0, 1, 1, 0], 
                    scale: [0.6, 1.25, 1.1, 0.6] 
                  }}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                  style={{ transformOrigin: '298px 96px' }}
                >
                  {/* Fire blast polygon pointing right */}
                  <path d="M 298 96 L 335 72 L 328 88 L 375 96 L 328 104 L 335 120 Z" fill="#ff7c1f" filter="drop-shadow(0 0 8px rgba(255,124,31,0.5))" />
                  {/* Yellow core */}
                  <path d="M 298 96 L 325 82 L 315 96 L 350 96 L 315 96 L 325 110 Z" fill="#ffeb3b" />
                  <circle cx="298" cy="96" r="12" fill="#ffffff" />
                </motion.g>

                {/* 2. Spark particles blowing right */}
                {[...Array(8)].map((_, i) => {
                  const sparkAngle = (Math.random() * 0.7 - 0.35); // Rightward direction +/- 20 deg
                  const sparkDistance = Math.random() * 90 + 50;
                  const tx = Math.cos(sparkAngle) * sparkDistance;
                  const ty = Math.sin(sparkAngle) * sparkDistance;
                  
                  return (
                    <motion.line
                      key={`spark-${i}`}
                      x1="298"
                      y1="96"
                      x2="298"
                      y2="96"
                      animate={{ 
                        x2: 298 + tx, 
                        y2: 96 + ty, 
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

        {/* 3. Small blue electric spark on surviving click (Hammer area: 85, 75) */}
        <AnimatePresence>
          {isFiring && alive && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 pointer-events-none"
            >
              <svg className="w-full h-full" viewBox="0 0 320 220">
                <circle cx="95" cy="74" r="3" fill="#60a5fa" filter="drop-shadow(0 0 4px #3b82f6)" />
                <line x1="95" y1="74" x2="90" y2="70" stroke="#93c5fd" strokeWidth="1" />
                <line x1="95" y1="74" x2="100" y2="78" stroke="#93c5fd" strokeWidth="1" />
              </svg>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Probability text */}
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
