import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../utils/test-utils';
import { MessageBubble } from '../../src/components/MessageBubble';
import { Message, Place } from '../../src/types';

describe('MessageBubble', () => {
  const mockPlace: Place = {
    id: 'place-1',
    name: 'Test Place',
    description: 'A test place',
    latitude: 51.5074,
    longitude: -0.1278,
    category: 'ancient',
    confidence: 0.9,
    historicalPeriod: 'Medieval',
    artifacts: ['Artifact 1', 'Artifact 2'],
    imageUrl: 'https://example.com/image.jpg',
  };

  const mockUserMessage: Message = {
    id: 'msg-1',
    content: 'Hello world',
    role: 'user',
    timestamp: new Date('2024-01-15T14:30:00'),
  };

  const mockAssistantMessage: Message = {
    id: 'msg-2',
    content: 'Hello user',
    role: 'assistant',
    timestamp: new Date('2024-01-15T14:31:00'),
    places: [mockPlace],
  };

  it('should render user message', () => {
    render(
      <MessageBubble message={mockUserMessage} selectedPlace={null} onPlaceSelect={vi.fn()} />,
    );
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('should render assistant message', () => {
    render(
      <MessageBubble message={mockAssistantMessage} selectedPlace={null} onPlaceSelect={vi.fn()} />,
    );
    expect(screen.getByText('Hello user')).toBeInTheDocument();
  });

  it('should render timestamp', () => {
    render(
      <MessageBubble message={mockUserMessage} selectedPlace={null} onPlaceSelect={vi.fn()} />,
    );
    expect(screen.getByText(/\d{2}:\d{2}/)).toBeInTheDocument();
  });

  it('should render places when provided', () => {
    render(
      <MessageBubble message={mockAssistantMessage} selectedPlace={null} onPlaceSelect={vi.fn()} />,
    );
    expect(screen.getByText('Test Place')).toBeInTheDocument();
  });

  it('should not render places section for user messages', () => {
    render(
      <MessageBubble message={mockUserMessage} selectedPlace={null} onPlaceSelect={vi.fn()} />,
    );
    expect(screen.queryByText('Test Place')).not.toBeInTheDocument();
  });

  it('should render place description', () => {
    render(
      <MessageBubble message={mockAssistantMessage} selectedPlace={null} onPlaceSelect={vi.fn()} />,
    );
    expect(screen.getByText('A test place')).toBeInTheDocument();
  });

  it('should render confidence percentage', () => {
    render(
      <MessageBubble message={mockAssistantMessage} selectedPlace={null} onPlaceSelect={vi.fn()} />,
    );
    expect(screen.getByText('90%')).toBeInTheDocument();
  });

  it('should render historical period when provided', () => {
    render(
      <MessageBubble message={mockAssistantMessage} selectedPlace={null} onPlaceSelect={vi.fn()} />,
    );
    expect(screen.getByText(/Medieval/)).toBeInTheDocument();
  });

  it('should render artifacts when provided', () => {
    render(
      <MessageBubble message={mockAssistantMessage} selectedPlace={null} onPlaceSelect={vi.fn()} />,
    );
    expect(screen.getByText(/Artifact 1.*Artifact 2/)).toBeInTheDocument();
  });

  it('should call onPlaceSelect when place card clicked', async () => {
    const onPlaceSelect = vi.fn();
    const { user } = render(
      <MessageBubble
        message={mockAssistantMessage}
        selectedPlace={null}
        onPlaceSelect={onPlaceSelect}
      />,
    );

    const placeCard = screen.getByText('Test Place').closest('button');
    expect(placeCard).not.toBeNull();
    if (placeCard) {
      await user.click(placeCard);
      expect(onPlaceSelect).toHaveBeenCalledWith('place-1');
    }
  });

  it('should highlight selected place', () => {
    const { container } = render(
      <MessageBubble
        message={mockAssistantMessage}
        selectedPlace="place-1"
        onPlaceSelect={vi.fn()}
      />,
    );
    const placeCard = screen.getByText('Test Place').closest('button');
    expect(placeCard).not.toBeNull();
    if (placeCard) {
      expect(placeCard.className).toContain('border-cyber');
    }
  });

  it('should not highlight unselected place', () => {
    const { container } = render(
      <MessageBubble
        message={mockAssistantMessage}
        selectedPlace="other-place"
        onPlaceSelect={vi.fn()}
      />,
    );
    const placeCard = screen.getByText('Test Place').closest('button');
    expect(placeCard).not.toBeNull();
    if (placeCard) {
      expect(placeCard.className).toContain('border-void');
    }
  });

  it('should render category icon for ancient', () => {
    render(
      <MessageBubble message={mockAssistantMessage} selectedPlace={null} onPlaceSelect={vi.fn()} />,
    );
    expect(screen.getByText('🏛️')).toBeInTheDocument();
  });

  it('should render category icon for mystical', () => {
    const mysticalPlace = { ...mockPlace, category: 'mystical' as const };
    const message = { ...mockAssistantMessage, places: [mysticalPlace] };
    render(<MessageBubble message={message} selectedPlace={null} onPlaceSelect={vi.fn()} />);
    expect(screen.getByText('✨')).toBeInTheDocument();
  });

  it('should render category icon for underground', () => {
    const undergroundPlace = { ...mockPlace, category: 'underground' as const };
    const message = { ...mockAssistantMessage, places: [undergroundPlace] };
    render(<MessageBubble message={message} selectedPlace={null} onPlaceSelect={vi.fn()} />);
    expect(screen.getByText('🕳️')).toBeInTheDocument();
  });

  it('should render category icon for forgotten', () => {
    const forgottenPlace = { ...mockPlace, category: 'forgotten' as const };
    const message = { ...mockAssistantMessage, places: [forgottenPlace] };
    render(<MessageBubble message={message} selectedPlace={null} onPlaceSelect={vi.fn()} />);
    expect(screen.getByText('👻')).toBeInTheDocument();
  });

  it('should handle multiple places', () => {
    const place2 = { ...mockPlace, id: 'place-2', name: 'Test Place 2' };
    const message = { ...mockAssistantMessage, places: [mockPlace, place2] };
    render(<MessageBubble message={message} selectedPlace={null} onPlaceSelect={vi.fn()} />);

    expect(screen.getByText('Test Place')).toBeInTheDocument();
    expect(screen.getByText('Test Place 2')).toBeInTheDocument();
  });

  it('should apply correct confidence color for high confidence', () => {
    const highConfPlace = { ...mockPlace, confidence: 0.95 };
    const message = { ...mockAssistantMessage, places: [highConfPlace] };
    render(<MessageBubble message={message} selectedPlace={null} onPlaceSelect={vi.fn()} />);

    const confidence = screen.getByText('95%');
    expect(confidence.className).toContain('text-white');
  });

  it('should apply correct confidence color for medium confidence', () => {
    const medConfPlace = { ...mockPlace, confidence: 0.75 };
    const message = { ...mockAssistantMessage, places: [medConfPlace] };
    render(<MessageBubble message={message} selectedPlace={null} onPlaceSelect={vi.fn()} />);

    const confidence = screen.getByText('75%');
    expect(confidence.className).toContain('text-white');
  });

  it('should apply correct confidence color for low confidence', () => {
    const lowConfPlace = { ...mockPlace, confidence: 0.5 };
    const message = { ...mockAssistantMessage, places: [lowConfPlace] };
    render(<MessageBubble message={message} selectedPlace={null} onPlaceSelect={vi.fn()} />);

    const confidence = screen.getByText('50%');
    expect(confidence.className).toContain('text-white');
  });
});
