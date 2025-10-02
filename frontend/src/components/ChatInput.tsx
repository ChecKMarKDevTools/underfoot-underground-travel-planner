import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Send } from 'lucide-react';
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation';
import { cn } from '../utils';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  onToggleDebug: () => void;
  onToggleTheme: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  isLoading,
  onToggleDebug,
  onToggleTheme,
}) => {
  const [message, setMessage] = useState('');

  const handleSubmit = () => {
    if (message.trim() && !isLoading) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  const { inputRef } = useKeyboardNavigation(handleSubmit, onToggleDebug, onToggleTheme);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="border-t border-cyber-200 dark:border-cyber-800 bg-white dark:bg-void-900 p-4"
    >
      <div className="flex items-end space-x-3 max-w-4xl mx-auto">
        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask the Stonewalker about hidden places, ancient ruins, or forgotten paths..."
            className={cn(
              'w-full p-3 rounded-lg resize-none bg-white dark:bg-void-800 border border-void-300 dark:border-void-600',
              'text-void-900 dark:text-void-100 placeholder-void-500 dark:placeholder-void-400',
              'focus:outline-none focus:ring-2 focus:ring-cyber-400 focus:border-cyber-400',
              'transition-all duration-200 min-h-[60px] max-h-32',
            )}
            rows={1}
            maxLength={1000}
            disabled={isLoading}
            aria-label="Message input"
          />

          <div className="absolute bottom-2 right-2 flex items-center space-x-1 pointer-events-none">
            <span className="text-xs text-void-400 font-mono">{message.length}/1000</span>
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleSubmit}
          disabled={!message.trim() || isLoading}
          className={cn(
            'p-3 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-cyber-400',
            'bg-gradient-to-r from-cyber-500 to-neon-500 text-white shadow-lg',
            'hover:from-cyber-600 hover:to-neon-600 disabled:opacity-50 disabled:cursor-not-allowed',
            'disabled:hover:from-cyber-500 disabled:hover:to-neon-500',
          )}
          aria-label="Send message"
        >
          <Send className="w-5 h-5" />
        </motion.button>
      </div>

      <div className="mt-2 text-center">
        <p className="text-xs text-void-500 dark:text-void-500 font-mono">
          Press <kbd className="px-1 py-0.5 bg-void-200 dark:bg-void-700 rounded">Enter</kbd> to
          send •
          <kbd className="px-1 py-0.5 bg-void-200 dark:bg-void-700 rounded ml-1">Shift+Enter</kbd>{' '}
          for new line
        </p>
      </div>
    </motion.div>
  );
};
