import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SpeakerSimpleX, SpeakerHigh, SpeakerLow } from '@phosphor-icons/react';
import { Sounds } from '../audio/Sounds';

interface VolumeSliderProps {
  className?: string;
  buttonClassName?: string;
}

export function VolumeSlider({ className = '', buttonClassName = '' }: VolumeSliderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [volume, setVolume] = useState(() => Sounds.getVolume());
  const [isMuted, setIsMuted] = useState(() => Sounds.isMuted());
  const popupRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    Sounds.setMuted(newMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    Sounds.setVolume(val);
    if (val === 0) {
      setIsMuted(true);
      Sounds.setMuted(true);
    } else if (isMuted) {
      setIsMuted(false);
      Sounds.setMuted(false);
    }
  };

  const SpeakerIcon = isMuted || volume === 0
    ? SpeakerSimpleX
    : volume < 0.5
      ? SpeakerLow
      : SpeakerHigh;

  const fillPercent = isMuted ? 0 : Math.round(volume * 100);

  return (
    <div ref={popupRef} className={`relative ${className}`}>
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        onClick={() => setIsOpen(!isOpen)}
        onDoubleClick={toggleMute}
        className={["w-10 h-10 flex items-center justify-center rounded-lg border transition-all duration-300 cursor-pointer", buttonClassName].filter(Boolean).join(" ")}
        style={buttonClassName ? {} : {
          backgroundColor: 'var(--bg-input)',
          borderColor: 'var(--border-medium)',
          color: 'var(--text-muted)',
        }}
        title={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh (double-click)'}
      >
        <SpeakerIcon size={18} weight="bold" />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.12 }}
            className="absolute top-full left-0 mt-2 z-50"
          >
            <div
              className="w-44 border px-3 py-2.5"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-medium)',
              }}
            >
              {/* Header with brackets */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] font-mono tracking-[0.15em] uppercase opacity-50" style={{ color: 'var(--text-muted)' }}>
                  [ VOL ]
                </span>
                <span
                  className="text-[11px] font-mono font-bold tabular-nums"
                  style={{ color: isMuted ? 'var(--text-muted)' : 'var(--cyan-theme)' }}
                >
                  {isMuted ? '--' : `${fillPercent}%`}
                </span>
              </div>

              {/* Slider track */}
              <div className="relative h-4 flex items-center">
                <input
                  ref={sliderRef}
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                {/* Custom track */}
                <div
                  className="w-full h-1.5 rounded-none relative overflow-hidden"
                  style={{ backgroundColor: 'var(--border-medium)' }}
                >
                  <div
                    className="absolute inset-y-0 left-0 transition-all duration-75"
                    style={{
                      width: `${fillPercent}%`,
                      backgroundColor: isMuted ? 'var(--text-muted)' : 'var(--cyan-theme)',
                      opacity: isMuted ? 0.3 : 1,
                    }}
                  />
                </div>
                {/* Custom thumb */}
                <div
                  className="absolute w-3 h-3 border pointer-events-none transition-all duration-75"
                  style={{
                    left: `calc(${fillPercent}% - 6px)`,
                    top: '50%',
                    marginTop: '-6px',
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: isMuted ? 'var(--text-muted)' : 'var(--cyan-theme)',
                    opacity: isMuted ? 0.3 : 1,
                  }}
                />
              </div>

              {/* Bottom labels */}
              <div className="flex justify-between mt-1.5">
                <span className="text-[8px] font-mono opacity-30" style={{ color: 'var(--text-muted)' }}>0</span>
                <span className="text-[8px] font-mono opacity-30" style={{ color: 'var(--text-muted)' }}>100</span>
              </div>

              {/* Mute indicator */}
              {isMuted && (
                <div
                  className="mt-1.5 text-[9px] font-mono tracking-wider text-center"
                  style={{ color: 'var(--red-theme)' }}
                >
                  MUTED
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
