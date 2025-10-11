import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Clock, Gem } from 'lucide-react';
import { Message, Place } from '../types';
import { formatTimestamp, cn } from '../utils';

interface MessageBubbleProps {
  message: Message;
  selectedPlace: string | null;
  onPlaceSelect: (placeId: string) => void;
  delay?: number;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  selectedPlace,
  onPlaceSelect,
  delay = 0,
}) => {
  const isUser = message.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.3 }}
      className={cn('flex w-full', isUser ? 'justify-end' : 'justify-start')}
    >
      <div className={cn('w-[80%]', 'space-y-2')}>
        <div
          className={cn(
            'message-bubble w-full', // Add w-full to ensure it takes full available width
            isUser ? 'message-user' : 'message-assistant',
          )}
        >
          <div className="flex items-start mb-2 w-full">
            <span className="font-mono text-xs opacity-75 shrink-0 mr-auto">
              {isUser ? 'You' : 'Stonewalker'}
            </span>
            <span className="font-mono text-xs opacity-75 shrink-0 ml-3">
              {formatTimestamp(message.timestamp)}
            </span>
          </div>
          <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
        </div>

        {message.places && message.places.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: delay + 0.2 }}
            className="space-y-2"
          >
            <h4 className="font-body text-sm font-semibold text-cyber-700 dark:text-cyber-300 flex items-center">
              <MapPin className="w-4 h-4 mr-1" />
              Revealed Locations ({message.places.length})
            </h4>
            <div className="grid gap-2">
              {message.places.map((place) => (
                <PlaceCard
                  key={place.id}
                  place={place}
                  isSelected={selectedPlace === place.id}
                  onClick={() => onPlaceSelect(place.id)}
                />
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

interface PlaceCardProps {
  place: Place;
  isSelected: boolean;
  onClick: () => void;
}

const PlaceCard: React.FC<PlaceCardProps> = ({ place, isSelected, onClick }) => {
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'bg-matrix-500'; // High confidence - green
    if (confidence >= 0.8) return 'bg-cyber-500'; // Good confidence - cyan
    if (confidence >= 0.7) return 'bg-neon-500'; // Medium confidence - blue
    if (confidence >= 0.6) return 'bg-mystic-500'; // Lower confidence - purple
    return 'bg-void-500'; // Low confidence - gray
  };

  const categoryIcons = {
    ancient: '🏛️',
    mystical: '✨',
    underground: '🕳️',
    forgotten: '👻',
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        'p-3 rounded-lg border-2 transition-all duration-200 text-left w-full',
        'focus:outline-none focus:ring-2 focus:ring-cyber-400',
        isSelected
          ? 'border-cyber-500 bg-cyber-50 dark:bg-cyber-900/20 shadow-lg'
          : 'border-void-200 dark:border-void-700 bg-white dark:bg-void-800 hover:border-cyber-300 dark:hover:border-cyber-600',
      )}
      aria-label={`Select ${place.name} on map`}
    >
      {place.imageUrl && (
        <div className="w-full h-32 mb-3 rounded-lg overflow-hidden bg-void-200 dark:bg-void-700">
          <img
            src={place.imageUrl}
            alt={place.name}
            className="w-full h-full object-cover transition-transform duration-200 hover:scale-105"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
        </div>
      )}

      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center space-x-2">
          <span className="text-lg">{categoryIcons[place.category]}</span>
          <h5 className="font-body font-semibold text-sm text-void-900 dark:text-void-100">
            {place.name}
          </h5>
        </div>
        <div className="flex items-center space-x-1">
          <div
            className={cn(
              'px-2 py-1 rounded-full text-xs font-mono text-white',
              getConfidenceColor(place.confidence),
            )}
          >
            {Math.round(place.confidence * 100)}%
          </div>
        </div>
      </div>

      <p className="text-xs text-void-600 dark:text-void-400 mb-2 leading-relaxed">
        {place.description}
      </p>

      {place.historicalPeriod && (
        <div className="flex items-center text-xs text-void-500 dark:text-void-500 mb-2">
          <Clock className="w-3 h-3 mr-1" />
          {place.historicalPeriod}
        </div>
      )}

      {place.artifacts && place.artifacts.length > 0 && (
        <div className="flex items-start text-xs text-void-500 dark:text-void-500">
          <Gem className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0" />
          <span className="line-clamp-2">{place.artifacts.join(' • ')}</span>
        </div>
      )}
    </motion.button>
  );
};
