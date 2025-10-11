import { useState, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Header } from './components/Header';
import { ChatArea } from './components/ChatArea';
import { ChatInput } from './components/ChatInput';
import { MapView } from './components/MapView';
import { DebugPanel } from './components/DebugPanel';
import { useTheme } from './hooks/useTheme';
import { Message, Place, DebugData } from './types';
import { sendChatMessage, SearchResponse } from './services/api';
import { generateId, pluralize } from './utils';

function App() {
  const { theme, toggleTheme } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<string | null>(null);
  const [debugMode, setDebugMode] = useState(false);
  const [currentDebugData, setCurrentDebugData] = useState<DebugData | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([37.2018, -82.0993]);
  const [mapZoom, setMapZoom] = useState(10);

  // Get all places from all messages
  const allPlaces = messages.reduce<Place[]>((acc, message) => {
    if (message.places) {
      return [...acc, ...message.places];
    }
    return acc;
  }, []);

  const createUserMessage = (content: string): Message => ({
    id: generateId(),
    content,
    role: 'user',
    timestamp: new Date(),
  });

  const processApiResponse = (
    response: SearchResponse,
    content: string,
  ): { places: Place[]; debugData: DebugData; assistantMessage: Message } => {
    const places: Place[] = (response.places || []).map((result: any) => ({
      id: result.place_id || generateId(),
      name: result.name || 'Unknown Location',
      description: result.description || result.editorial_summary?.overview || '',
      latitude: result.geometry?.location?.lat || result.lat || 0,
      longitude: result.geometry?.location?.lng || result.lng || 0,
      category: result.category || 'mystical',
      confidence: result.confidence || result.rating || 0.5,
      historicalPeriod: result.historical_period,
      artifacts: result.artifacts,
      imageUrl: result.image_url,
      address: result.formatted_address || result.vicinity || result.address,
    }));

    const debugData: DebugData = response.debug || {
      searchQuery: content,
      processingTime: 0,
      confidence: 0.8,
      keywords: [],
      geospatialData: {},
      llmReasoning: 'Search completed',
      dataSource: ['Backend API'],
    };

    const assistantMessage: Message = {
      id: generateId(),
      content:
        places.length > 0
          ? `Found ${places.length} ${pluralize(places.length, 'location')}. ${places[0]?.name} shows strongest resonance.`
          : 'No locations found matching your query.',
      role: 'assistant',
      timestamp: new Date(),
      places,
      debugData,
    };

    return { places, debugData, assistantMessage };
  };

  const createErrorMessage = (error: unknown, content: string): Message => ({
    id: generateId(),
    content:
      error instanceof Error
        ? `Error: ${error.message}`
        : 'Failed to process search. Check backend connection.',
    role: 'assistant',
    timestamp: new Date(),
    places: [],
    debugData: {
      searchQuery: content,
      processingTime: 0,
      confidence: 0,
      keywords: [],
      geospatialData: {},
      llmReasoning: 'Error occurred during search',
      dataSource: ['Error Handler'],
    },
  });

  const handleSendMessage = useCallback(
    async (content: string) => {
      const userMessage = createUserMessage(content);
      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      try {
        const response: SearchResponse = await sendChatMessage(content, false);
        const { places, debugData, assistantMessage } = processApiResponse(response, content);

        setMessages((prev) => [...prev, assistantMessage]);
        setCurrentDebugData(debugData);

        if (!selectedPlace && places.length > 0) {
          setSelectedPlace(places[0].id);
        }
      } catch (error) {
        console.error('Error processing message:', error);
        const errorMessage = createErrorMessage(error, content);
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    },
    [selectedPlace],
  );

  const handlePlaceSelect = useCallback((place: Place) => {
    setSelectedPlace(place.id);
  }, []);

  const handleMapChange = useCallback((center: [number, number], zoom: number) => {
    setMapCenter(center);
    setMapZoom(zoom);
  }, []);

  const toggleDebugMode = useCallback(() => {
    setDebugMode((prev) => !prev);
  }, []);

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-void-900 text-void-900 dark:text-void-100">
      <Header
        theme={theme}
        debugMode={debugMode}
        onToggleTheme={toggleTheme}
        onToggleDebug={toggleDebugMode}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Chat Panel */}
        <div className="flex-1 flex flex-col min-w-0">
          <main className="flex-1 flex flex-col min-h-0">
            <ChatArea
              messages={messages}
              isLoading={isLoading}
              selectedPlace={selectedPlace}
              onPlaceSelect={(placeId: string) => setSelectedPlace(placeId)}
            />

            <ChatInput
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
              onToggleDebug={toggleDebugMode}
              onToggleTheme={toggleTheme}
            />
          </main>
        </div>

        {/* Map */}
        <section
          className="w-[40%] min-w-0 p-4 border-l border-cyber-200 dark:border-cyber-700"
          aria-label="Interactive map showing search results"
        >
          <MapView
            places={allPlaces}
            center={mapCenter}
            zoom={mapZoom}
            selectedPlaceId={selectedPlace}
            onPlaceSelect={handlePlaceSelect}
            onMapChange={handleMapChange}
          />
        </section>

        {/* Debug Panel - Slides in from right */}
        <AnimatePresence>
          {debugMode && (
            <DebugPanel
              debugData={currentDebugData}
              isVisible={debugMode}
              onClose={() => setDebugMode(false)}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default App;
