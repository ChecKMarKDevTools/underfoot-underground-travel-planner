/**
 * API client for backend communication
 */

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

export interface SearchRequest {
  chat_input: string;
  force?: boolean;
}

export interface SearchResponse {
  user_intent: string;
  user_location: string;
  response: string;
  places: any[];
  debug?: any;
  request_id?: string;
  timestamp?: string;
}

export interface HealthResponse {
  status: string;
  timestamp: string;
  elapsed_ms: number;
  dependencies: Record<string, any>;
}

/**
 * Send chat message to backend
 */
export async function sendChatMessage(message: string, force = false): Promise<SearchResponse> {
  const response = await fetch(`${API_BASE}/underfoot/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chat_input: message,
      force,
    } as SearchRequest),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.message || error.error || 'Search failed');
  }

  return response.json();
}

/**
 * Check backend health
 */
export async function checkHealth(): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE}/health`);

  if (!response.ok) {
    throw new Error('Health check failed');
  }

  return response.json();
}

/**
 * Connect to SSE stream (future use)
 */
export function connectSSE(
  message: string,
  onMessage: (data: any) => void,
  onError?: (error: Error) => void,
): () => void {
  const eventSource = new EventSource(
    `${API_BASE}/underfoot/stream?message=${encodeURIComponent(message)}`,
  );

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessage(data);
    } catch (error) {
      console.error('Failed to parse SSE data:', error);
    }
  };

  eventSource.onerror = (event) => {
    console.error('SSE error:', event);
    if (onError) {
      onError(new Error('SSE connection failed'));
    }
    eventSource.close();
  };

  return () => eventSource.close();
}
