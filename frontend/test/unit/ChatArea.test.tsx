import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../utils/test-utils';
import { ChatArea } from '../../src/components/ChatArea';
import { Message } from '../../src/types';

vi.mock('../../src/components/MessageBubble', () => ({
  MessageBubble: ({ message }: { message: Message }) => (
    <div data-testid={`message-${message.id}`}>{message.content}</div>
  ),
}));

describe('ChatArea', () => {
  const mockMessages: Message[] = [
    {
      id: 'msg-1',
      content: 'Hello',
      role: 'user',
      timestamp: new Date(),
    },
    {
      id: 'msg-2',
      content: 'Hi there',
      role: 'assistant',
      timestamp: new Date(),
    },
  ];

  it('should render empty state when no messages', () => {
    render(
      <ChatArea messages={[]} isLoading={false} selectedPlace={null} onPlaceSelect={vi.fn()} />,
    );
    expect(screen.getByText(/stonewalker oracle/i)).toBeInTheDocument();
  });

  it('should render keyboard shortcuts in empty state', () => {
    render(
      <ChatArea messages={[]} isLoading={false} selectedPlace={null} onPlaceSelect={vi.fn()} />,
    );
    expect(screen.getByText(/ctrl\+d/i)).toBeInTheDocument();
    expect(screen.getByText(/ctrl\+k/i)).toBeInTheDocument();
  });

  it('should render messages when provided', () => {
    render(
      <ChatArea
        messages={mockMessages}
        isLoading={false}
        selectedPlace={null}
        onPlaceSelect={vi.fn()}
      />,
    );
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('Hi there')).toBeInTheDocument();
  });

  it('should render loading indicator when loading', () => {
    render(
      <ChatArea
        messages={mockMessages}
        isLoading={true}
        selectedPlace={null}
        onPlaceSelect={vi.fn()}
      />,
    );
    expect(screen.getByText(/stonewalker analyzes/i)).toBeInTheDocument();
  });

  it('should not render loading indicator when not loading', () => {
    render(
      <ChatArea
        messages={mockMessages}
        isLoading={false}
        selectedPlace={null}
        onPlaceSelect={vi.fn()}
      />,
    );
    expect(screen.queryByText(/stonewalker analyzes/i)).not.toBeInTheDocument();
  });

  it('should render all messages in order', () => {
    render(
      <ChatArea
        messages={mockMessages}
        isLoading={false}
        selectedPlace={null}
        onPlaceSelect={vi.fn()}
      />,
    );
    const messages = screen.getAllByTestId(/^message-/);
    expect(messages).toHaveLength(2);
  });

  it('should pass selectedPlace to message bubbles', () => {
    render(
      <ChatArea
        messages={mockMessages}
        isLoading={false}
        selectedPlace="place-1"
        onPlaceSelect={vi.fn()}
      />,
    );
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('should pass onPlaceSelect to message bubbles', () => {
    const onPlaceSelect = vi.fn();
    render(
      <ChatArea
        messages={mockMessages}
        isLoading={false}
        selectedPlace={null}
        onPlaceSelect={onPlaceSelect}
      />,
    );
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('should not show empty state when messages exist', () => {
    render(
      <ChatArea
        messages={mockMessages}
        isLoading={false}
        selectedPlace={null}
        onPlaceSelect={vi.fn()}
      />,
    );
    expect(screen.queryByText(/stonewalker oracle/i)).not.toBeInTheDocument();
  });

  it('should show loading with messages', () => {
    render(
      <ChatArea
        messages={mockMessages}
        isLoading={true}
        selectedPlace={null}
        onPlaceSelect={vi.fn()}
      />,
    );
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText(/stonewalker analyzes/i)).toBeInTheDocument();
  });
});
