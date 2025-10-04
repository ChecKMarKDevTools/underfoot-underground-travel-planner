import { useState, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Header } from './components/Header';
import { ChatArea } from './components/ChatArea';
import { ChatInput } from './components/ChatInput';
import { MapView } from './components/MapView';
import { DebugPanel } from './components/DebugPanel';
import { useTheme } from './hooks/useTheme';
import { Message, Place, DebugData } from './types';
import { mockPlaces, generateMockDebugData, responses } from './data/mockData';
import { googlePlacesService } from './services/mockGooglePlaces';
import { generateId } from './utils';

function App() {
  const { theme, toggleTheme } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<string | null>(null);
  const [debugMode, setDebugMode] = useState(false);
  const [currentDebugData, setCurrentDebugData] = useState<DebugData | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([51.5074, -0.1278]);
  const [mapZoom, setMapZoom] = useState(12);

  // Get all places from all messages
  const allPlaces = messages.reduce<Place[]>((acc, message) => {
    if (message.places) {
      return [...acc, ...message.places];
    }
    return acc;
  }, []);

  const handleSendMessage = useCallback(
    async (content: string) => {
      const userMessage: Message = {
        id: generateId(),
        content,
        role: 'user',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      try {
        // Try to search for real places using Google Places API (mock version)
        const googlePlaces = await googlePlacesService.searchPlaces(content, {
          lat: 51.5074,
          lng: -0.1278,
        });

        let places: Place[] = [];

        if (googlePlaces.length > 0) {
          // Convert Google Places to our Place format
          places = googlePlaces.map((gp) => googlePlacesService.convertToPlace(gp));
        } else {
          // Fallback to mock places if no Google results
          places = mockPlaces.slice(0, Math.floor(Math.random() * 3) + 1);
        }

        // Simulate AI processing delay
        await new Promise((resolve) => setTimeout(resolve, 1500 + Math.random() * 1000));

        // Generate response based on places found
        let response = responses[Math.floor(Math.random() * responses.length)];

        if (googlePlaces.length > 0) {
          const topPlace = places[0];
          response = `${places.length} locations detected. ${topPlace?.name} shows strongest resonance. Check the confidence ratings before exploring.`;
        }

        const debugData = generateMockDebugData(content);

        // Enhanced debug data with Google Places info
        debugData.dataSource =
          googlePlaces.length > 0
            ? [
                'Google Places API',
                'Cyber-Enhanced Mystical Sight',
                'Digital Ley Line Analysis',
                'Real-time Location Matrix',
              ]
            : debugData.dataSource;

        const assistantMessage: Message = {
          id: generateId(),
          content: response,
          role: 'assistant',
          timestamp: new Date(),
          places,
          debugData,
        };

        setMessages((prev) => [...prev, assistantMessage]);
        setCurrentDebugData(debugData);

        // Auto-select first place if none selected
        if (!selectedPlace && places.length > 0) {
          setSelectedPlace(places[0].id);
        }
      } catch (error) {
        console.error('Error processing message:', error);

        // Fallback to mock data on error
        const fallbackPlaces = mockPlaces.slice(0, Math.floor(Math.random() * 3) + 1);
        const debugData = generateMockDebugData(content);

        const assistantMessage: Message = {
          id: generateId(),
          content:
            'Connection disrupted. Consulting backup archives to show what I can still sense.',
          role: 'assistant',
          timestamp: new Date(),
          places: fallbackPlaces,
          debugData,
        };

        setMessages((prev) => [...prev, assistantMessage]);
        setCurrentDebugData(debugData);
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
