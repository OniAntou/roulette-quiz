import React from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon } from '@phosphor-icons/react';
import { useTheme } from '../theme/ThemeContext';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <motion.button
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.92 }}
      onClick={toggleTheme}
      className={`w-10 h-10 flex items-center justify-center rounded-lg border transition-all duration-300 cursor-pointer ${className}`}
      style={{
        backgroundColor: 'var(--bg-input)',
        borderColor: 'var(--border-medium)',
        color: 'var(--text-muted)',
      }}
      title={theme === 'dark' ? 'Chế độ sáng' : 'Chế độ tối'}
    >
      {theme === 'dark' ? (
        <Sun size={18} weight="bold" />
      ) : (
        <Moon size={18} weight="bold" />
      )}
    </motion.button>
  );
}
