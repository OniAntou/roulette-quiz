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
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="15%" stopColor="#f3f4f6" />
              <stop offset="45%" stopColor="#d1d5db" />
              <stop offset="80%" stopColor="#9ca3af" />
              <stop offset="100%" stopColor="#707682" />
            </linearGradient>

            {/* Dark metal for hammer, sights and mechanical joints */}
            <linearGradient id="darkSteel" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4b5563" />
              <stop offset="50%" stopColor="#1f2937" />
              <stop offset="100%" stopColor="#0d0e12" />
            </linearGradient>

            {/* Cylinder Steel with realistic rounded shading */}
            <linearGradient id="cylinderSteel" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="20%" stopColor="#e5e7eb" />
              <stop offset="50%" stopColor="#9ca3af" />
              <stop offset="80%" stopColor="#5a606d" />
              <stop offset="100%" stopColor="#2c3038" />
            </linearGradient>

            {/* 3D Flute indentation gradient */}
            <linearGradient id="fluteGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#08090b" />
              <stop offset="35%" stopColor="#181a20" />
              <stop offset="75%" stopColor="#676d7b" />
              <stop offset="100%" stopColor="#d1d5db" />
            </linearGradient>

            {/* Rubber Grip black texture pattern */}
            <pattern id="gripTexture" width="3" height="3" patternUnits="userSpaceOnUse">
              <circle cx="1.5" cy="1.5" r="0.5" fill="#141518" />
            </pattern>

            {/* Cylinder Mask */}
            <clipPath id="cylinderClip">
              <rect x="92" y="78" width="54" height="44" rx="3" />
            </clipPath>
          </defs>

          {/* =======================================================
              TAURUS RAGING BULL REVOLVER (RIGHT-FACING)
              ======================================================= */}

          {/* 1. Black Rubber Grip with Red Cushion Spine, Finger Grooves & Textured Panel */}
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
            strokeWidth="1.5" 
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
          />
          {/* Grip Dotted Textured Layer */}
          <path 
            d="M 83 135 
               C 80 148, 75 165, 60 200 
               C 62 202, 82 202, 86 195 
               C 88 185, 84 180, 86 172 
               C 88 162, 82 156, 84 148 
               C 86 142, 85 138, 83 135 Z" 
            fill="url(#gripTexture)" 
          />
          {/* Highlight line on rubber grip to show 3D volume */}
          <path 
            d="M 84 136 C 82 148, 77 165, 63 198" 
            fill="none" 
            stroke="#3a3f4d" 
            strokeWidth="0.8" 
            opacity="0.5" 
          />
          {/* Brass Medallion at the bottom corner (Logo tròn màu vàng) */}
          <circle cx="88" cy="198" r="4.5" fill="#d4af37" stroke="#9a7b1c" strokeWidth="0.8" />
          <circle cx="88" cy="198" r="2.5" fill="#111215" />
          {/* Taurus emblem letter representation in medallion */}
          <path d="M 87 197 Q 88.5 198, 87 199.5" fill="none" stroke="#d4af37" strokeWidth="0.6" />

          {/* 2. Trigger Guard with Screw Detail */}
          <path d="M 92 124 C 92 158, 142 158, 142 120 Z" fill="none" stroke="url(#ragingSteel)" strokeWidth="4.5" strokeLinecap="round" />
          {/* Small screw on trigger guard base */}
          <circle cx="132" cy="136" r="1.5" fill="#1f2937" />

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
            <line x1="92" y1="79" x2="146" y2="79" stroke="#ffffff" strokeWidth="0.8" opacity="0.45" />
            <line x1="92" y1="121" x2="146" y2="121" stroke="#111317" strokeWidth="0.8" opacity="0.4" />
          </g>

          {/* 7. Cylinder Release Latch & Plate (Chốt mở ổ đạn phía sau có răng nhám) */}
          <rect x="75" y="93" width="16" height="10" rx="1.5" fill="url(#ragingSteel)" stroke="#4b5563" strokeWidth="0.8" />
          {/* Latch serration lines */}
          <line x1="78" y1="95" x2="78" y2="101" stroke="#374151" strokeWidth="0.8" />
          <line x1="81" y1="95" x2="81" y2="101" stroke="#374151" strokeWidth="0.8" />
          <line x1="84" y1="95" x2="84" y2="101" stroke="#374151" strokeWidth="0.8" />
          <circle cx="87" cy="98" r="1" fill="#111317" />

          {/* 4. Hammer (Búa gõ Raging Bull với răng cưa chống trượt) */}
          <motion.g
            style={{ transformOrigin: '76px 86px' }}
            animate={{ 
              rotate: isFiring ? [0, 35, -20, 0] : isSpinning ? 35 : 0 
            }}
            transition={{ 
              duration: isFiring ? 0.22 : 0.15,
              ease: "easeInOut"
            }}
          >
            <path
              d="M 76 82 
                 Q 62 66 52 70 
                 Q 60 84 72 86 Z"
              fill="url(#darkSteel)"
              stroke="#4b5563"
              strokeWidth="0.8"
            />
            {/* Hammer spur serrations (Răng khía) */}
            <line x1="53" y1="69" x2="56" y2="67" stroke="#9ca3af" strokeWidth="0.6" />
            <line x1="55" y1="71" x2="58" y2="69" stroke="#9ca3af" strokeWidth="0.6" />
            <line x1="57" y1="73" x2="60" y2="71" stroke="#9ca3af" strokeWidth="0.6" />
          </motion.g>

          {/* 8. Main Frame & Crane (Thành súng thép bọc ổ đạn + càng xoay) */}
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
          {/* Detailed Crane Arm seam (Càng xoay ổ đạn ở góc dưới trước) */}
          <path 
            d="M 134 114 L 145 114 L 145 120 L 138 120 Z" 
            fill="url(#ragingSteel)" 
            stroke="#4b5563" 
            strokeWidth="0.6" 
          />
          {/* Sideplate split seam lines (Đường ghép mảnh thân súng) */}
          <path d="M 88 120 C 88 108, 86 104, 76 104" fill="none" stroke="#787f8c" strokeWidth="0.8" opacity="0.6" />
          
          {/* Mechanical flat-head screws on Frame (Ốc vít dẹt xẻ rãnh) */}
          {/* Screw 1: under cylinder */}
          <g transform="translate(138, 126)">
            <circle cx="0" cy="0" r="2.5" fill="url(#ragingSteel)" stroke="#374151" strokeWidth="0.8" />
            <line x1="-1.5" y1="-1" x2="1.5" y2="1" stroke="#374151" strokeWidth="0.6" />
          </g>
          {/* Screw 2: behind cylinder latch */}
          <g transform="translate(86, 85)">
            <circle cx="0" cy="0" r="2" fill="url(#ragingSteel)" stroke="#374151" strokeWidth="0.6" />
            <line x1="-1.2" y1="1.2" x2="1.2" y2="-1.2" stroke="#374151" strokeWidth="0.5" />
          </g>

          {/* 9. Rear Sight (Thước ngắm sau có ốc điều chỉnh gió) */}
          <path d="M 72 74 L 84 74 L 84 70 L 78 70 L 78 74" fill="#111317" stroke="#111317" strokeWidth="0.8" />
          <circle cx="81" cy="72" r="0.8" fill="#9ca3af" />

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

          {/* Polished highlight lines on top/bottom edges of barrel */}
          <line x1="145" y1="75" x2="284" y2="75" stroke="#ffffff" strokeWidth="1" opacity="0.75" />
          <line x1="145" y1="115" x2="284" y2="115" stroke="#ffffff" strokeWidth="0.8" opacity="0.6" />
          <line x1="145" y1="74" x2="145" y2="116" stroke="#ffffff" strokeWidth="0.8" opacity="0.5" />

          {/* Muzzle end cap shape */}
          <ellipse cx="285" cy="95.5" rx="2.5" ry="20.5" fill="#111317" />

          {/* Vented Rib Slots (5 khe tản nhiệt đen nằm ngang mặt trên nòng có vạch phản sáng ở đáy) */}
          {[155, 180, 205, 230, 255].map((x) => (
            <g key={`vent-${x}`}>
              <rect x={x} y="77" width="15" height="3.2" fill="#111317" />
              <line x1={x} y1="80.2" x2={x + 15} y2="80.2" stroke="#ffffff" strokeWidth="0.5" opacity="0.35" />
            </g>
          ))}

          {/* Front Sight Blade with Red Ramp Insert (Đầu ruồi ngắm trước có vạch đỏ phản quang) */}
          <rect x="272" y="70" width="13" height="4" fill="#111317" />
          <polygon points="273,74 277,70 280,70 276,74" fill="#ef4444" />

          {/* Ejector Rod Slot & Rod (Thanh đẩy vỏ đạn chìm dưới nòng) */}
          <rect x="145" y="106" width="70" height="6" rx="3" fill="#111317" />
          <rect x="150" y="108" width="55" height="2" fill="url(#ragingSteel)" rx="0.5" />
          <rect x="205" y="107.5" width="4" height="3" fill="#9ca3af" rx="0.5" />

          {/* Engravings on Frame / Technical texts */}
          <text x="143" y="126" fill="#787f8c" fontSize="4" fontFamily="monospace" fontWeight="bold" opacity="0.8">.44 MAGNUM</text>
          <text x="143" y="131" fill="#787f8c" fontSize="3.5" fontFamily="monospace" opacity="0.7">TAURUS INT. BRAZIL</text>

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
            letterSpacing="1.2" 
            textAnchor="middle"
            opacity="0.7"
          >
            RAGING BULL
          </text>
          {/* Main dark gray text */}
          <text 
            x="215" 
            y="98" 
            fill="#3a3d47" 
            fontSize="14" 
            fontFamily="Impact, Arial Black, sans-serif" 
            fontStyle="italic" 
            fontWeight="black" 
            letterSpacing="1.2" 
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
