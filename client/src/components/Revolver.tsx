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
  return (
    <div className="flex flex-col items-center justify-center space-y-6">
      {/* Gun Container - Layout-free lying flat on table with drop-shadow */}
      <motion.div 
        animate={isFiring ? { 
          x: [0, -12, 3, -1, 0], 
          y: [0, -6, 2, -1, 0], 
          rotate: [-90, -85, -91, -90] 
        } : {
          rotate: -90
        }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="w-80 h-[220px] relative flex items-center justify-center pointer-events-none select-none"
        style={{
          filter: 'drop-shadow(-12px 0px 20px rgba(0, 0, 0, 0.6))'
        }}
      >
        <svg className="w-full h-full text-slate-800" viewBox="0 0 320 220">
          <defs>
            {/* Matte Silver Steel Gradient for Raging Bull */}
            <linearGradient id="ragingSteel" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f3f4f6" />
              <stop offset="20%" stopColor="#e5e7eb" />
              <stop offset="50%" stopColor="#d1d5db" />
              <stop offset="85%" stopColor="#9ca3af" />
              <stop offset="100%" stopColor="#787f8c" />
            </linearGradient>

            {/* Dark metal for hammer, sights and mechanical joints */}
            <linearGradient id="darkSteel" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4b5563" />
              <stop offset="50%" stopColor="#1f2937" />
              <stop offset="100%" stopColor="#111317" />
            </linearGradient>

            {/* Cylinder Steel with realistic rounded shading */}
            <linearGradient id="cylinderSteel" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#e5e7eb" />
              <stop offset="25%" stopColor="#d1d5db" />
              <stop offset="55%" stopColor="#9ca3af" />
              <stop offset="85%" stopColor="#5a606d" />
              <stop offset="100%" stopColor="#373d47" />
            </linearGradient>

            {/* 3D Flute indentation gradient */}
            <linearGradient id="fluteGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0d0e12" />
              <stop offset="35%" stopColor="#1a1c22" />
              <stop offset="80%" stopColor="#7a818f" />
              <stop offset="100%" stopColor="#d1d5db" />
            </linearGradient>

            {/* Cylinder Mask */}
            <clipPath id="cylinderClip">
              <rect x="92" y="78" width="54" height="44" rx="3" />
            </clipPath>
          </defs>

          {/* =======================================================
              TAURUS RAGING BULL REVOLVER (RIGHT-FACING)
              ======================================================= */}

          {/* 1. Black Rubber Grip with Red Cushion Spine & Finger Grooves */}
          {/* Main Grip Body (Black rubber) */}
          <path 
            d="M 78 126 
               C 75 140, 70 160, 50 206 
               C 48 212, 54 214, 62 214 
               C 80 214, 94 212, 96 202 
               C 98 188, 92 182, 94 172 
               C 96 162, 90 156, 92 146 
               C 94 138, 92 132, 88 126 Z" 
            fill="#23252a" 
            stroke="#111215" 
            strokeWidth="1.2" 
          />
          {/* Red Cushion Backstrap (Sống báng màu đỏ đặc trưng Raging Bull) */}
          <path 
            d="M 78 126 
               C 75 140, 70 160, 50 206 
               L 54 208 
               C 73 164, 78 144, 81 126 Z" 
            fill="#dc2626" 
          />
          {/* Grip Inner Shading Panel */}
          <path 
            d="M 83 135 
               C 80 148, 75 165, 60 200 
               C 62 202, 82 202, 86 195 
               C 88 185, 84 180, 86 172 
               C 88 162, 82 156, 84 148 
               C 86 142, 85 138, 83 135 Z" 
            fill="#181a1f" 
            opacity="0.8" 
          />
          {/* Brass Medallion at the bottom corner (Logo tròn màu vàng) */}
          <circle cx="88" cy="198" r="4.5" fill="#d4af37" stroke="#9a7b1c" strokeWidth="0.8" />
          <circle cx="88" cy="198" r="2.5" fill="#111215" />

          {/* 2. Trigger Guard */}
          <path d="M 92 124 C 92 158, 142 158, 142 120 Z" fill="none" stroke="url(#ragingSteel)" strokeWidth="4.5" strokeLinecap="round" />

          {/* 3. Trigger (Cò súng màu bạc nhạt) */}
          <motion.path 
            d="M 116 122 C 116 138, 108 144, 105 144" 
            fill="none" 
            stroke="#e5e7eb" 
            strokeWidth="3.2" 
            strokeLinecap="round"
            animate={isFiring ? { rotate: [0, -15, 0] } : {}}
            style={{ transformOrigin: '116px 122px' }}
            transition={{ duration: 0.18 }}
          />

          {/* 4. Hammer (Búa gõ Raging Bull) */}
          <motion.path
            d="M 76 82 
               Q 62 66 52 70 
               Q 60 84 72 86 Z"
            fill="url(#darkSteel)"
            stroke="#4b5563"
            strokeWidth="0.8"
            style={{ transformOrigin: '76px 86px' }}
            animate={{ 
              rotate: isFiring ? [0, 35, -20, 0] : isSpinning ? 35 : 0 
            }}
            transition={{ 
              duration: isFiring ? 0.22 : 0.15,
              ease: "easeInOut"
            }}
          />

          {/* 5. Cylinder Frame Cutout Shadow */}
          <rect x="90" y="76" width="58" height="48" rx="2" fill="#111317" />

          {/* 6. Cylinder (Ổ đạn Raging Bull nhìn nghiêng che đạn) */}
          <g clipPath="url(#cylinderClip)">
            {/* Base cylinder steel */}
            <rect x="92" y="78" width="54" height="44" rx="3" fill="url(#cylinderSteel)" />
            
            {/* Spinning flutes (Các khía lõm 3D) */}
            <motion.g
              animate={{ 
                y: isSpinning 
                  ? [0, -108] 
                  : -(currentPosition * 18) 
              }}
              transition={{ 
                duration: isSpinning ? 1.2 : 0.4, 
                ease: isSpinning ? [0.16, 1, 0.3, 1] as const : "easeOut" 
              }}
            >
              {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <g key={`flute-group-${i}`}>
                  {/* Flute rounded groove */}
                  <rect 
                    x="94" 
                    y={60 + (i * 18)} 
                    width="48" 
                    height="10" 
                    rx="5" 
                    fill="url(#fluteGradient)" 
                  />
                  {/* Lock notch */}
                  <rect 
                    x="95" 
                    y={64 + (i * 18)} 
                    width="4" 
                    height="2" 
                    fill="#111317" 
                  />
                </g>
              ))}
            </motion.g>

            {/* Cylinder axis rod representation */}
            <rect x="90" y="99" width="58" height="3" fill="url(#darkSteel)" opacity="0.35" />
            
            {/* Subtle reflections */}
            <line x1="92" y1="79" x2="146" y2="79" stroke="#ffffff" strokeWidth="0.8" opacity="0.35" />
            <line x1="92" y1="121" x2="146" y2="121" stroke="#111317" strokeWidth="0.8" opacity="0.4" />
          </g>

          {/* 7. Cylinder Release Latch (Nút gạt mở ổ đạn phía sau) */}
          <rect x="76" y="94" width="14" height="8" rx="1.5" fill="url(#ragingSteel)" stroke="#4b5563" strokeWidth="0.8" />
          <circle cx="80" cy="98" r="2" fill="#111317" />
          <line x1="79" y1="98" x2="81" y2="98" stroke="#ffffff" strokeWidth="0.6" />

          {/* 8. Main Frame (Thành súng bạc thép chắc chắn bọc ổ đạn) */}
          <path 
            d="M 72 74 
               C 72 74, 90 74, 145 74 
               L 145 120 
               C 118 120, 105 125, 92 128 
               L 92 135 
               L 72 120 Z" 
            fill="url(#ragingSteel)" 
            stroke="#4b5563" 
            strokeWidth="1.2" 
          />

          {/* 9. Rear Sight (Khe ngắm sau màu đen) */}
          <path d="M 72 74 L 84 74 L 84 70 L 78 70 L 78 74" fill="#111317" stroke="#111317" strokeWidth="0.8" />

          {/* 10. Massive Flat-Top Barrel (Nòng súng Raging Bull vuông phẳng) */}
          <path 
            d="M 145 74 
               L 285 74 
               L 285 116 
               L 145 116 Z" 
            fill="url(#ragingSteel)" 
            stroke="#4b5563" 
            strokeWidth="1.2" 
          />

          {/* Muzzle end cap shape */}
          <ellipse cx="285" cy="95.5" rx="2.5" ry="20.5" fill="#111317" />

          {/* Vented Rib Slots (5 khe tản nhiệt đen nằm ngang mặt trên nòng) */}
          <rect x="155" y="77" width="15" height="3" fill="#111317" />
          <rect x="180" y="77" width="15" height="3" fill="#111317" />
          <rect x="205" y="77" width="15" height="3" fill="#111317" />
          <rect x="230" y="77" width="15" height="3" fill="#111317" />
          <rect x="255" y="77" width="15" height="3" fill="#111317" />

          {/* Front Sight Blade (Đầu ruồi ngắm trước đen phẳng) */}
          <rect x="272" y="70" width="13" height="4" fill="#111317" />

          {/* Ejector Rod Slot & Rod (Thanh đẩy vỏ đạn chìm dưới nòng) */}
          <rect x="145" y="106" width="70" height="6" rx="3" fill="#111317" />
          <rect x="150" y="108" width="55" height="2" fill="url(#ragingSteel)" rx="0.5" />

          {/* Engraved "RAGING BULL" Text (Khắc chữ 3D tinh xảo) */}
          {/* White shadow offset */}
          <text 
            x="215.5" 
            y="98.5" 
            fill="#ffffff" 
            fontSize="14" 
            fontFamily="Impact, Arial Black, sans-serif" 
            fontStyle="italic" 
            fontWeight="black" 
            letterSpacing="1" 
            textAnchor="middle"
            opacity="0.6"
          >
            RAGING BULL
          </text>
          {/* Main dark gray text */}
          <text 
            x="215" 
            y="98" 
            fill="#41454f" 
            fontSize="14" 
            fontFamily="Impact, Arial Black, sans-serif" 
            fontStyle="italic" 
            fontWeight="black" 
            letterSpacing="1" 
            textAnchor="middle"
          >
            RAGING BULL
          </text>

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
                  style={{ transformOrigin: '285px 96px' }}
                >
                  {/* Fire blast polygon pointing right */}
                  <path d="M 285 96 L 322 72 L 315 88 L 362 96 L 315 104 L 322 120 Z" fill="#ff7c1f" filter="drop-shadow(0 0 8px rgba(255,124,31,0.5))" />
                  {/* Yellow core */}
                  <path d="M 285 96 L 312 82 L 302 96 L 337 96 L 302 96 L 312 110 Z" fill="#ffeb3b" />
                  <circle cx="285" cy="96" r="12" fill="#ffffff" />
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
                      x1="285"
                      y1="96"
                      x2="285"
                      y2="96"
                      animate={{ 
                        x2: 285 + tx, 
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

        {/* 3. Small blue electric spark on surviving click (Hammer strike area: 92, 96) */}
        <AnimatePresence>
          {isFiring && alive && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 pointer-events-none"
            >
              <svg className="w-full h-full" viewBox="0 0 320 220">
                <circle cx="92" cy="96" r="3" fill="#60a5fa" filter="drop-shadow(0 0 4px #3b82f6)" />
                <line x1="92" y1="96" x2="87" y2="90" stroke="#93c5fd" strokeWidth="1" />
                <line x1="92" y1="96" x2="97" y2="102" stroke="#93c5fd" strokeWidth="1" />
              </svg>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
