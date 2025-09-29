import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { Place } from '../types';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in React Leaflet
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom cyber-fantasy marker icon
const cyberIcon = new L.Icon({
  iconUrl:
    'data:image/svg+xml;base64,' +
    btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" fill="none">
      <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 24 12 24s12-15 12-24c0-6.627-5.373-12-12-12z" fill="#3b82f6"/>
      <circle cx="12" cy="12" r="6" fill="#1d4ed8"/>
      <circle cx="12" cy="12" r="3" fill="#fff"/>
    </svg>
  `),
  iconSize: [24, 36],
  iconAnchor: [12, 36],
  popupAnchor: [0, -36],
});

interface MapViewProps {
  readonly places: Place[];
  readonly center: [number, number];
  readonly zoom: number;
  readonly selectedPlaceId?: string;
  readonly onPlaceSelect?: (place: Place) => void;
  readonly onMapChange?: (center: [number, number], zoom: number) => void;
}

function MapUpdater({
  center,
  zoom,
  selectedPlaceId,
  places,
}: {
  readonly center: [number, number];
  readonly zoom: number;
  readonly selectedPlaceId?: string;
  readonly places: Place[];
}) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, zoom);
  }, [map, center, zoom]);

  useEffect(() => {
    if (selectedPlaceId) {
      const place = places.find((p) => p.id === selectedPlaceId);
      if (place) {
        map.setView([place.latitude, place.longitude], Math.max(zoom, 15));
        // Find and open the popup for the selected place
        map.eachLayer((layer) => {
          if (layer instanceof L.Marker && layer.options.alt === place.id) {
            layer.openPopup();
          }
        });
      }
    }
  }, [map, selectedPlaceId, places, zoom]);

  return null;
}

export function MapView({
  places,
  center,
  zoom,
  selectedPlaceId,
  onPlaceSelect,
  onMapChange,
}: MapViewProps) {
  const mapRef = useRef<L.Map>(null);

  const handleMapEvents = () => {
    const map = mapRef.current;
    if (map && onMapChange) {
      const center = map.getCenter();
      const zoom = map.getZoom();
      onMapChange([center.lat, center.lng], zoom);
    }
  };

  return (
    <div className="h-full w-full rounded-lg overflow-hidden border border-cyber-200 dark:border-cyber-700">
      <MapContainer
        center={center}
        zoom={zoom}
        className="h-full w-full"
        ref={mapRef}
        whenReady={() => {
          const map = mapRef.current;
          if (map) {
            map.on('moveend zoomend', handleMapEvents);
          }
        }}
        keyboard={true}
        attributionControl={true}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          className="sepia-[0.1] contrast-[1.2] brightness-[0.85] hue-rotate-[200deg] saturate-[0.8]"
        />

        <MapUpdater center={center} zoom={zoom} selectedPlaceId={selectedPlaceId} places={places} />

        {places.map((place) => (
          <Marker
            key={place.id}
            position={[place.latitude, place.longitude]}
            icon={cyberIcon}
            alt={place.id}
            eventHandlers={{
              click: () => onPlaceSelect?.(place),
            }}
          >
            <Popup className="cyber-popup">
              <div className="p-2">
                <h3 className="font-semibold text-void-900 mb-1">{place.name}</h3>
                <p className="text-sm text-void-700 mb-2">{place.address || place.description}</p>
                <div className="flex items-center justify-between text-xs">
                  <span className="bg-cyber-100 text-cyber-800 px-2 py-1 rounded">
                    {place.category}
                  </span>
                  {place.confidence && (
                    <div className="flex items-center gap-1">
                      <span>⚡</span>
                      <span>{Math.round(place.confidence * 100)}%</span>
                    </div>
                  )}
                </div>
                {place.description && (
                  <p className="text-sm text-void-600 mt-2 leading-relaxed">{place.description}</p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
