import { GoogleMapView } from './GoogleMapView';
import type { Place } from '../types';

interface MapViewProps {
  readonly places: Place[];
  readonly center: [number, number];
  readonly zoom: number;
  readonly selectedPlaceId?: string;
  readonly onPlaceSelect?: (place: Place) => void;
  readonly onMapChange?: (center: [number, number], zoom: number) => void;
}

export function MapView(props: MapViewProps) {
  return <GoogleMapView {...props} />;
}
