import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Brain, Database, Target, MapPin } from 'lucide-react';
import { DebugData } from '../types';
import { cn } from '../utils';

interface DebugPanelProps {
  debugData: DebugData | null;
  isVisible: boolean;
  onClose: () => void;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({ debugData, isVisible, onClose }) => {
  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.aside
        initial={{ opacity: 0, x: 300 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 300 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="w-96 h-full bg-white dark:bg-void-900 border-l border-cyber-200 dark:border-cyber-800 shadow-2xl overflow-y-auto flex flex-col"
        aria-label="Debug information panel"
      >
        <div className="p-4 border-b border-cyber-200 dark:border-cyber-800 bg-gradient-to-r from-cyber-50 to-neon-50 dark:from-void-800 dark:to-void-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Brain className="w-5 h-5 text-cyber-600 dark:text-cyber-400" />
              <h3 className="font-body font-semibold text-void-900 dark:text-void-100">
                AI Debug Console
              </h3>
            </div>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-void-200 dark:hover:bg-void-600 transition-colors focus:outline-none focus:ring-2 focus:ring-cyber-400"
              aria-label="Close debug panel"
            >
              <X className="w-4 h-4" />
            </motion.button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-area">
          {debugData ? (
            <>
              <DebugSection icon={<Target className="w-4 h-4" />} title="Query Analysis">
                <div className="space-y-2">
                  <div>
                    <label className="text-xs font-mono text-void-500 dark:text-void-400">
                      Original Query
                    </label>
                    <div className="bg-void-100 dark:bg-void-800 p-2 rounded text-sm font-mono">
                      {debugData.searchQuery}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-mono text-void-500 dark:text-void-400">
                      Extracted Keywords
                    </label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {debugData.keywords.map((keyword, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-cyber-100 dark:bg-cyber-900 text-cyber-800 dark:text-cyber-200 text-xs rounded-full font-mono"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </DebugSection>

              <DebugSection icon={<Clock className="w-4 h-4" />} title="Performance Metrics">
                <div className="grid grid-cols-2 gap-2">
                  <MetricCard
                    label="Processing Time"
                    value={`${debugData.processingTime.toFixed(0)}ms`}
                    color="text-green-600 dark:text-green-400"
                  />
                  <MetricCard
                    label="Confidence"
                    value={`${(debugData.confidence * 100).toFixed(1)}%`}
                    color="text-blue-600 dark:text-blue-400"
                  />
                </div>
              </DebugSection>

              <DebugSection icon={<MapPin className="w-4 h-4" />} title="Geospatial Data">
                <div className="space-y-2">
                  <div>
                    <label className="text-xs font-mono text-void-500 dark:text-void-400">
                      Search Center
                    </label>
                    <div className="text-sm font-mono">
                      {debugData.geospatialData.centerPoint?.[0].toFixed(4)},{' '}
                      {debugData.geospatialData.centerPoint?.[1].toFixed(4)}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-mono text-void-500 dark:text-void-400">
                      Search Radius
                    </label>
                    <div className="text-sm font-mono">
                      {debugData.geospatialData.searchRadius?.toLocaleString()}m
                    </div>
                  </div>
                  {debugData.geospatialData.boundingBox && (
                    <div>
                      <label className="text-xs font-mono text-void-500 dark:text-void-400">
                        Bounding Box
                      </label>
                      <div className="text-xs font-mono bg-void-100 dark:bg-void-800 p-2 rounded">
                        {debugData.geospatialData.boundingBox
                          .map((coord) => coord.toFixed(4))
                          .join(', ')}
                      </div>
                    </div>
                  )}
                </div>
              </DebugSection>

              <DebugSection icon={<Brain className="w-4 h-4" />} title="AI Reasoning">
                <div className="bg-void-100 dark:bg-void-800 p-3 rounded text-sm leading-relaxed">
                  {debugData.llmReasoning}
                </div>
              </DebugSection>

              <DebugSection icon={<Database className="w-4 h-4" />} title="Data Sources">
                <div className="space-y-1">
                  {debugData.dataSource.map((source, index) => (
                    <div key={index} className="flex items-center space-x-2 text-sm">
                      <div className="w-2 h-2 bg-cyber-500 rounded-full"></div>
                      <span>{source}</span>
                    </div>
                  ))}
                </div>
              </DebugSection>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Brain className="w-12 h-12 text-void-400 dark:text-void-600 mb-4" />
              <h3 className="font-heading font-semibold text-void-700 dark:text-void-300 mb-2">
                No Debug Data Yet
              </h3>
              <p className="text-sm text-void-500 dark:text-void-500 max-w-xs">
                Send a message to the Stonewalker to see the AI reasoning and processing details
                appear here.
              </p>
            </div>
          )}
        </div>
      </motion.aside>
    </AnimatePresence>
  );
};

interface DebugSectionProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}

const DebugSection: React.FC<DebugSectionProps> = ({ icon, title, children }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="border border-void-200 dark:border-void-700 rounded-lg p-3"
  >
    <div className="flex items-center space-x-2 mb-2">
      <div className="text-cyber-600 dark:text-cyber-400">{icon}</div>
      <h4 className="font-body font-medium text-sm text-void-900 dark:text-void-100">{title}</h4>
    </div>
    {children}
  </motion.div>
);

interface MetricCardProps {
  label: string;
  value: string;
  color?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  color = 'text-void-900 dark:text-void-100',
}) => (
  <div className="bg-void-50 dark:bg-void-800 p-2 rounded">
    <div className="text-xs font-mono text-void-500 dark:text-void-400 mb-1">{label}</div>
    <div className={cn('text-sm font-bold', color)}>{value}</div>
  </div>
);
