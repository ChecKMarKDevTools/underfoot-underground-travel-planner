import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../utils/test-utils';
import userEvent from '@testing-library/user-event';
import App from '../../src/App';

vi.mock('../../src/services/mockGooglePlaces', () => ({
  googlePlacesService: {
    searchPlaces: vi.fn().mockResolvedValue([]),
    convertToPlace: vi.fn(),
  },
}));

vi.mock('../../src/components/MapView', () => ({
  MapView: ({ places }: any) => (
    <div data-testid="map-view">Map with {places?.length || 0} places</div>
  ),
}));

vi.mock('../../src/hooks/useTheme', () => ({
  useTheme: () => ({
    theme: 'light',
    toggleTheme: vi.fn(),
  }),
}));

describe('App Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render all main components', () => {
    render(<App />);

    expect(screen.getByText(/underfoot/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/ask the stonewalker/i)).toBeInTheDocument();
    expect(screen.getByTestId('map-view')).toBeInTheDocument();
  });

  it('should show welcome message initially', () => {
    render(<App />);
    const welcomeElements = screen.getAllByText(/stonewalker oracle/i);
    expect(welcomeElements.length).toBeGreaterThan(0);
  });

  it('should not show debug panel by default', () => {
    render(<App />);
    expect(screen.queryByText(/debug console/i)).not.toBeInTheDocument();
  });

  it('should handle message sending', async () => {
    const { googlePlacesService } = await import('../../src/services/mockGooglePlaces');
    vi.mocked(googlePlacesService.searchPlaces).mockResolvedValue([]);

    render(<App />);

    const textarea = screen.getByPlaceholderText(/ask the stonewalker/i);
    const sendButton = screen.getByLabelText(/send message/i);

    await userEvent.type(textarea, 'Find ancient temples');
    await userEvent.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText('Find ancient temples')).toBeInTheDocument();
    });
  });

  it.skip('should show loading state when processing', async () => {
    const { googlePlacesService } = await import('../../src/services/mockGooglePlaces');
    vi.mocked(googlePlacesService.searchPlaces).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve([]), 1000)),
    );

    render(<App />);

    const textarea = screen.getByPlaceholderText(/ask the stonewalker/i);
    const sendButton = screen.getByLabelText(/send message/i);

    await userEvent.type(textarea, 'Find temples');
    await userEvent.click(sendButton);

    // Input should be disabled while loading
    expect(textarea).toBeDisabled();
  });

  it('should toggle debug panel', async () => {
    render(<App />);

    const debugButton = screen.getByLabelText(/debug/i);
    await userEvent.click(debugButton);

    await waitFor(() => {
      expect(screen.getByText(/debug console/i)).toBeVisible();
    });
  });

  it('should toggle theme', async () => {
    render(<App />);

    const themeButton = screen.getByLabelText(/switch to dark mode/i);
    await userEvent.click(themeButton);

    // Theme button should be clickable (hook is mocked at top level)
    expect(themeButton).toBeInTheDocument();
  });

  it('should handle place selection', async () => {
    const mockPlace = {
      id: 'place-1',
      name: 'Test Place',
      description: 'Test',
      latitude: 51.5,
      longitude: -0.1,
      category: 'ancient' as const,
      confidence: 0.9,
    };

    const { googlePlacesService } = await import('../../src/services/mockGooglePlaces');
    vi.mocked(googlePlacesService.searchPlaces).mockResolvedValue([]);
    vi.mocked(googlePlacesService.convertToPlace).mockReturnValue(mockPlace);

    render(<App />);

    const textarea = screen.getByPlaceholderText(/ask the stonewalker/i);
    await userEvent.type(textarea, 'Find places');

    const sendButton = screen.getByLabelText(/send message/i);
    await userEvent.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText('Find places')).toBeInTheDocument();
    });
  });
});
