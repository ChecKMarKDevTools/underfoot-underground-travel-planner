import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Message } from '../types';
import { MessageBubble } from './MessageBubble';
import { cn } from '../utils';

interface ChatAreaProps {
  messages: Message[];
  isLoading: boolean;
  selectedPlace: string | null;
  onPlaceSelect: (placeId: string) => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  messages,
  isLoading,
  selectedPlace,
  onPlaceSelect,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div
      ref={scrollRef}
      className={cn(
        'flex-1 overflow-y-auto p-4 space-y-4 scroll-area',
        'bg-gradient-to-b from-white to-gray-50 dark:from-void-900 dark:to-void-800',
      )}
      role="log"
      aria-live="polite"
      aria-label="Chat conversation"
    >
      {messages.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12"
        >
          <div className="text-6xl mb-4">🗺️</div>
          <h3 className="font-heading text-xl font-semibold text-void-700 dark:text-void-300 mb-2">
            Stonewalker Oracle
          </h3>
          <p className="text-void-600 dark:text-void-400 max-w-md mx-auto">
            I am Stonewalker, a mystical guide who uncovers hidden places through ancient sight
            enhanced by digital networks. Ask me about locations and I will reveal what resonates.
          </p>
          <div className="mt-6 text-sm text-void-500 dark:text-void-500 space-y-1">
            <p>
              <kbd className="px-2 py-1 bg-void-200 dark:bg-void-700 rounded text-xs">Ctrl+/</kbd>{' '}
              Focus input
            </p>
            <p>
              <kbd className="px-2 py-1 bg-void-200 dark:bg-void-700 rounded text-xs">Ctrl+D</kbd>{' '}
              Toggle debug
            </p>
            <p>
              <kbd className="px-2 py-1 bg-void-200 dark:bg-void-700 rounded text-xs">Ctrl+K</kbd>{' '}
              Toggle theme
            </p>
          </div>
        </motion.div>
      )}

      <AnimatePresence>
        {messages.map((message, index) => (
          <MessageBubble
            key={message.id}
            message={message}
            selectedPlace={selectedPlace}
            onPlaceSelect={onPlaceSelect}
            delay={index * 0.1}
          />
        ))}
      </AnimatePresence>

      {isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="flex items-center space-x-3 text-void-600 dark:text-void-400"
        >
          <div className="flex space-x-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
                className="w-2 h-2 bg-cyber-500 rounded-full"
              />
            ))}
          </div>
          <span className="font-mono text-sm">
            Stonewalker analyzes the quantum resonance patterns...
          </span>
        </motion.div>
      )}
    </div>
  );
};
