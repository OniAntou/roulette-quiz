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
          rotate: [0, 5, -1, 0] 
        } : {}}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="w-80 h-[220px] relative flex items-center justify-center pointer-events-none select-none"
        style={{
          filter: 'drop-shadow(0px 12px 20px rgba(0, 0, 0, 0.6))'
        }}
      >
        <svg className="w-full h-full text-slate-800" viewBox="0 0 320 220">
          <defs>
            {/* Polished Steel/Silver for frame and barrel */}
            <linearGradient id="classicSteel" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="25%" stopColor="#e5e7eb" />
              <stop offset="65%" stopColor="#9ca3af" />
              <stop offset="100%" stopColor="#4b5563" />
            </linearGradient>

            {/* Darker Steel for hammer, trigger and mechanical parts */}
            <linearGradient id="darkSteel" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6b7280" />
              <stop offset="50%" stopColor="#374151" />
              <stop offset="100%" stopColor="#111827" />
            </linearGradient>

            {/* Cylinder Steel with deep shadow gradients */}
            <linearGradient id="cylinderSteel" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#d1d5db" />
              <stop offset="25%" stopColor="#9ca3af" />
              <stop offset="60%" stopColor="#4b5563" />
              <stop offset="90%" stopColor="#1f2937" />
              <stop offset="100%" stopColor="#111317" />
            </linearGradient>

            {/* Rich wood grain gradient for classic grip */}
            <linearGradient id="woodGrip" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a0522d" />
              <stop offset="40%" stopColor="#8b4513" />
              <stop offset="85%" stopColor="#5c2e0b" />
              <stop offset="100%" stopColor="#2d1705" />
            </linearGradient>

            {/* Cylinder Mask to clip spinning flutes */}
            <clipPath id="cylinderClip">
              <rect x="92" y="78" width="54" height="42" rx="3" />
            </clipPath>
          </defs>

          {/* =======================================================
              CLASSIC REVOLVER (RIGHT FACING)
              ======================================================= */}

          {/* 1. Wood Grip (Báng súng gỗ cổ điển cong quyến rũ) */}
          <path 
            d="M 75 120 
               C 72 130, 68 152, 50 195 
               C 47 202, 52 208, 60 208 
               C 72 208, 82 205, 94 184 
               C 97 168, 97 148, 92 128 Z" 
            fill="url(#woodGrip)" 
            stroke="#4a2e1b" 
            strokeWidth="1.2" 
          />
          {/* Grip Medal screw detail */}
          <circle cx="72" cy="165" r="3.5" fill="#d4af37" stroke="#9a7b1c" strokeWidth="0.8" />
          <circle cx="72" cy="165" r="1.5" fill="#111317" />

          {/* 2. Trigger Guard (Vòng bảo vệ cò súng kim loại cong) */}
          <path d="M 92 124 C 92 155, 135 155, 135 120 Z" fill="none" stroke="url(#classicSteel)" strokeWidth="4.5" strokeLinecap="round" />

          {/* 3. Trigger (Cò súng cong truyền thống) */}
          <motion.path 
            d="M 112 122 C 112 135, 106 142, 104 142" 
            fill="none" 
            stroke="#111317" 
            strokeWidth="3.2" 
            strokeLinecap="round"
            animate={isFiring ? { rotate: [0, -15, 0] } : {}}
            style={{ transformOrigin: '112px 122px' }}
            transition={{ duration: 0.18 }}
          />

          {/* 4. Hammer (Búa gõ cổ điển) */}
          <motion.path
            d="M 78 80 Q 64 68 56 68 Q 62 82 72 86 Z"
            fill="url(#darkSteel)"
            stroke="#4b5563"
            strokeWidth="0.8"
            style={{ transformOrigin: '78px 86px' }}
            animate={{ 
              rotate: isFiring ? [0, 35, -20, 0] : isSpinning ? 35 : 0 
            }}
            transition={{ 
              duration: isFiring ? 0.22 : 0.15,
              ease: "easeInOut"
            }}
          />

          {/* 5. Cylinder Frame Cutout Shadow */}
          <rect x="90" y="76" width="58" height="46" rx="2" fill="#111317" />

          {/* 6. Cylinder (Ổ đạn xoay nhìn nghiêng - Che đạn) */}
          <g clipPath="url(#cylinderClip)">
            {/* Base cylinder metal */}
            <rect x="92" y="78" width="54" height="42" rx="3" fill="url(#cylinderSteel)" />
            
            {/* Spinning flutes (Rãnh dọc xoay cuộn theo chuyển động dọc) */}
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
                  {/* The Flute groove */}
                  <rect 
                    x="92" 
                    y={60 + (i * 18)} 
                    width="54" 
                    height="8" 
                    rx="3" 
                    fill="#15181e" 
                    stroke="#111317" 
                    strokeWidth="0.8" 
                  />
                  {/* Cylinder Lock Notch (Khía khóa ổ đạn) */}
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

            {/* Cylinder axle central shaft representation */}
            <rect x="90" y="97" width="58" height="4" fill="url(#darkSteel)" opacity="0.35" />
            
            {/* Subtle light reflections on cylinder body */}
            <line x1="92" y1="79" x2="146" y2="79" stroke="#ffffff" strokeWidth="0.8" opacity="0.35" />
            <line x1="92" y1="120" x2="146" y2="120" stroke="#111317" strokeWidth="0.8" opacity="0.4" />
          </g>

          {/* 7. Main Frame (Thân súng thép cổ điển bọc quanh ổ đạn) */}
          <path 
            d="M 75 78 
               C 75 74, 90 74, 145 78 
               L 145 120 
               C 120 120, 105 125, 92 128 
               L 92 135 
               L 75 120 Z" 
            fill="url(#classicSteel)" 
            stroke="#9ca3af" 
            strokeWidth="1.2" 
          />

          {/* 8. Classic Long Tapered Barrel (Nòng súng tròn thon dài cổ điển) */}
          <path 
            d="M 145 78 
               L 285 82 
               L 285 110 
               L 145 114 Z" 
            fill="url(#classicSteel)" 
            stroke="#9ca3af" 
            strokeWidth="0.8" 
          />
          
          {/* Muzzle end opening curvature */}
          <ellipse cx="285" cy="96" rx="2.5" ry="14" fill="#111317" />

          {/* 9. Ejector Rod & Housing (Thanh đẩy vỏ đạn dưới nòng) */}
          <rect x="145" y="114" width="75" height="4" fill="url(#darkSteel)" rx="1" />
          <rect x="210" y="113" width="10" height="6" fill="#4b5563" rx="0.5" />

          {/* 10. Front Sight Blade (Đầu ruồi ngắm cổ điển) */}
          <path d="M 270 82 Q 280 72 284 82 Z" fill="#4b5563" />

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
