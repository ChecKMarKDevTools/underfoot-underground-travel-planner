import { useEffect, useRef, useCallback, useState } from 'react';
import type { Place } from '../types';

// Create marker SVG with dynamic colors - simple pin shape
const createMarkerSVG = (color: string, isSelected: boolean) => {
  const size = isSelected ? 32 : 24;

  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="12" cy="12" r="10" fill="${color}" stroke="#ffffff" stroke-width="2"/>
  <circle cx="12" cy="12" r="4" fill="#ffffff"/>
</svg>`;
};

const getConfidenceColor = (confidence: number) => {
  if (confidence >= 0.9) return '#22c55e'; // matrix-500 green
  if (confidence >= 0.8) return '#3b82f6'; // cyber-500 cyan/blue
  if (confidence >= 0.7) return '#0ea5e9'; // neon-500 blue
  if (confidence >= 0.6) return '#a855f7'; // mystic-500 purple
  return '#64748b'; // void-500 gray
};

const createMarkerIcon = (place: Place, isSelected: boolean) => {
  const color = getConfidenceColor(place.confidence);
  const svg = createMarkerSVG(color, isSelected);
  return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
};

interface GoogleMapViewProps {
  readonly places: Place[];
  readonly center: [number, number];
  readonly zoom: number;
  readonly selectedPlaceId?: string;
  readonly onPlaceSelect?: (place: Place) => void;
  readonly onMapChange?: (center: [number, number], zoom: number) => void;
}

export function GoogleMapView({
  places,
  center,
  zoom,
  selectedPlaceId,
  onPlaceSelect,
  onMapChange,
}: GoogleMapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (window.google?.maps) {
      setIsLoaded(true);
      return;
    }

    const checkGoogleMaps = setInterval(() => {
      if (window.google?.maps) {
        setIsLoaded(true);
        clearInterval(checkGoogleMaps);
      }
    }, 50);

    const timeout = setTimeout(() => {
      clearInterval(checkGoogleMaps);
      console.error('Google Maps failed to load');
    }, 10000);

    return () => {
      clearInterval(checkGoogleMaps);
      clearTimeout(timeout);
    };
  }, []);

  const initMap = useCallback(() => {
    if (!mapRef.current || !isLoaded || isInitialized) return;
    if (!window.google?.maps?.Map) {
      console.warn('Google Maps not fully loaded yet');
      return;
    }

    try {
      const mapOptions: google.maps.MapOptions = {
        center: { lat: center[0], lng: center[1] },
        zoom: zoom,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }],
          },
          {
            featureType: 'transit',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }],
          },
        ],
        zoomControl: true,
        mapTypeControl: false,
        scaleControl: true,
        streetViewControl: false,
        rotateControl: false,
        fullscreenControl: true,
        gestureHandling: 'cooperative',
        clickableIcons: false,
        tilt: 0,
        keyboardShortcuts: false,
      };

      googleMapRef.current = new window.google.maps.Map(mapRef.current, mapOptions);
      setIsInitialized(true);
    } catch (error) {
      console.error('Failed to initialize Google Map:', error);
    }
  }, [center, zoom, isLoaded, isInitialized]);

  const clearMarkers = useCallback(() => {
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];
  }, []);

  const addMarkers = useCallback(() => {
    if (!googleMapRef.current || !isLoaded || !window.google?.maps?.Marker) return;

    clearMarkers();

    places.forEach((place) => {
      try {
        const isSelected = selectedPlaceId === place.id;
        const size = isSelected ? 36 : 24;
        const pinHeight = isSelected ? 54 : 36;

        const marker = new window.google.maps.Marker({
          position: { lat: place.latitude, lng: place.longitude },
          map: googleMapRef.current,
          title: place.name,
          icon: {
            url: createMarkerIcon(place, isSelected),
            scaledSize: new window.google.maps.Size(size, pinHeight),
            anchor: new window.google.maps.Point(size / 2, pinHeight),
          },
          animation: window.google.maps.Animation.DROP,
          zIndex: isSelected ? 1000 : undefined,
        });

        const infoWindow = new window.google.maps.InfoWindow({
          content: `
            <div class="p-2">
              <h3 class="font-semibold text-void-900 mb-1">${place.name}</h3>
              <p class="text-sm text-void-700 mb-2">${place.address || place.description}</p>
              <div class="flex items-center justify-between text-xs">
                <span class="bg-cyber-100 text-cyber-800 px-2 py-1 rounded">
                  ${place.category}
                </span>
                ${
                  place.confidence
                    ? `
                  <div class="flex items-center gap-1">
                    <span>⚡</span>
                    <span>${Math.round(place.confidence * 100)}%</span>
                  </div>
                `
                    : ''
                }
              </div>
            </div>
          `,
          maxWidth: 300,
        });

        marker.addListener('click', () => {
          infoWindow.open(googleMapRef.current, marker);
          if (onPlaceSelect) {
            onPlaceSelect(place);
          }
        });

        markersRef.current.push(marker);
      } catch (error) {
        console.error('Failed to create marker for place:', place.name, error);
      }
    });
  }, [places, isLoaded, onPlaceSelect, clearMarkers, selectedPlaceId]);

  useEffect(() => {
    if (selectedPlaceId && googleMapRef.current) {
      const place = places.find((p) => p.id === selectedPlaceId);
      if (place) {
        googleMapRef.current.setCenter({ lat: place.latitude, lng: place.longitude });
        googleMapRef.current.setZoom(Math.max(zoom, 15));
      }
    }
  }, [selectedPlaceId, places, zoom]);

  useEffect(() => {
    initMap();
  }, [initMap]);

  useEffect(() => {
    addMarkers();
  }, [addMarkers]);

  if (!isLoaded) {
    return (
      <div className="h-full w-full rounded-lg overflow-hidden border border-cyber-200 dark:border-cyber-700 flex items-center justify-center bg-gray-100 dark:bg-void-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={mapRef}
      className="h-full w-full rounded-lg overflow-hidden border border-cyber-200 dark:border-cyber-700"
    />
  );
}
