import React from 'react';
import { motion } from 'framer-motion';
import { Cog, Sun, Moon, Bug, BugOff } from 'lucide-react';
import { cn } from '../utils';

interface HeaderProps {
  theme: 'light' | 'dark';
  debugMode: boolean;
  onToggleTheme: () => void;
  onToggleDebug: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  theme,
  debugMode,
  onToggleTheme,
  onToggleDebug,
}) => {
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="flex items-center justify-between p-4 border-b border-cyber-200 dark:border-cyber-800 bg-gradient-to-r from-void-50 via-cyber-50 to-neon-50 dark:from-void-900 dark:via-void-800 dark:to-void-900 relative overflow-hidden"
    >
      {/* Background banner image */}
      <div
        className="absolute inset-0 opacity-20 dark:opacity-10 bg-cover bg-center"
        style={{
          backgroundImage: `url('/AlbedoBase_XL_fantasy_digital_illustration_of_the_Stonewalker_3.jpg')`,
          filter: 'blur(1px) brightness(0.7)',
        }}
      />

      <div className="flex items-center space-x-4 relative z-10">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 rounded-full bg-gradient-to-br from-cyber-500 to-neon-500 flex items-center justify-center shadow-lg"
        >
          <Cog className="w-6 h-6 text-white" />
        </motion.div>
        <div>
          <h1
            className="font-brand text-3xl font-bold text-cyber-400 dark:text-cyber-300 drop-shadow-lg"
            style={{
              textShadow: '2px 2px 4px rgba(0,0,0,0.7), 0 0 12px rgba(6,182,212,0.6)',
            }}
          >
            Underfoot
          </h1>
          <p
            className="text-sm text-neon-300 dark:text-neon-200 font-mono drop-shadow-md"
            style={{
              textShadow: '1px 1px 2px rgba(0,0,0,0.7)',
            }}
          >
            Stonewalker Oracle • Ancient Maps Revealed
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-2 relative z-10">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onToggleDebug}
          className={cn(
            'p-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-cyber-400',
            debugMode
              ? 'bg-neon-500 text-white shadow-lg'
              : 'bg-void-200 dark:bg-void-700 hover:bg-void-300 dark:hover:bg-void-600',
          )}
          aria-label={`${debugMode ? 'Disable' : 'Enable'} debug mode`}
          title="Toggle Debug Mode (Ctrl+D)"
        >
          {debugMode ? <BugOff className="w-5 h-5" /> : <Bug className="w-5 h-5" />}
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onToggleTheme}
          className="p-2 rounded-lg bg-void-200 dark:bg-void-700 hover:bg-void-300 dark:hover:bg-void-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-cyber-400"
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          title="Toggle Theme (Ctrl+K)"
        >
          {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
        </motion.button>
      </div>
    </motion.header>
  );
};
