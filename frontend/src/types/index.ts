export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  places?: Place[];
  debugData?: DebugData;
}

export interface Place {
  id: string;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  category: 'ancient' | 'mystical' | 'underground' | 'forgotten';
  confidence: number;
  historicalPeriod?: string;
  artifacts?: string[];
  imageUrl?: string;
  address?: string;
}

export interface DebugData {
  searchQuery: string;
  processingTime: number;
  confidence: number;
  keywords: string[];
  geospatialData: {
    boundingBox?: [number, number, number, number];
    centerPoint?: [number, number];
    searchRadius?: number;
  };
  llmReasoning: string;
  dataSource: string[];
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  selectedPlace: Place | null;
  debugMode: boolean;
  theme: 'light' | 'dark';
}

export type Theme = 'light' | 'dark';
