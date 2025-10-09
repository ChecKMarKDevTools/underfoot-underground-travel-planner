import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../utils/test-utils';
import { ChatInput } from '../../src/components/ChatInput';
import userEvent from '@testing-library/user-event';

vi.mock('../../src/hooks/useKeyboardNavigation', () => ({
  useKeyboardNavigation: () => ({
    inputRef: { current: null },
  }),
}));

describe('ChatInput', () => {
  const defaultProps = {
    onSendMessage: vi.fn(),
    isLoading: false,
    onToggleDebug: vi.fn(),
    onToggleTheme: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render textarea', () => {
    render(<ChatInput {...defaultProps} />);
    const textarea = screen.getByPlaceholderText(/ask the stonewalker/i);
    expect(textarea).toBeInTheDocument();
  });

  it('should render send button', () => {
    render(<ChatInput {...defaultProps} />);
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('should show character counter', () => {
    render(<ChatInput {...defaultProps} />);
    expect(screen.getByText('0/1000')).toBeInTheDocument();
  });

  it('should update character counter on input', async () => {
    const user = userEvent.setup();
    render(<ChatInput {...defaultProps} />);

    const textarea = screen.getByPlaceholderText(/ask the stonewalker/i);
    await user.type(textarea, 'Hello');

    expect(screen.getByText('5/1000')).toBeInTheDocument();
  });

  it('should call onSendMessage when send button clicked', async () => {
    const user = userEvent.setup();
    const onSendMessage = vi.fn();
    render(<ChatInput {...defaultProps} onSendMessage={onSendMessage} />);

    const textarea = screen.getByPlaceholderText(/ask the stonewalker/i);
    await user.type(textarea, 'Test message');

    const button = screen.getByRole('button');
    await user.click(button);

    expect(onSendMessage).toHaveBeenCalledWith('Test message');
  });

  it('should clear input after sending', async () => {
    const user = userEvent.setup();
    render(<ChatInput {...defaultProps} />);

    const textarea = screen.getByPlaceholderText(/ask the stonewalker/i) as HTMLTextAreaElement;
    await user.type(textarea, 'Test message');

    const button = screen.getByRole('button');
    await user.click(button);

    expect(textarea.value).toBe('');
  });

  it('should not send empty message', async () => {
    const user = userEvent.setup();
    const onSendMessage = vi.fn();
    render(<ChatInput {...defaultProps} onSendMessage={onSendMessage} />);

    const button = screen.getByRole('button');
    await user.click(button);

    expect(onSendMessage).not.toHaveBeenCalled();
  });

  it('should not send whitespace-only message', async () => {
    const user = userEvent.setup();
    const onSendMessage = vi.fn();
    render(<ChatInput {...defaultProps} />);

    const textarea = screen.getByPlaceholderText(/ask the stonewalker/i);
    await user.type(textarea, '   ');

    const button = screen.getByRole('button');
    await user.click(button);

    expect(onSendMessage).not.toHaveBeenCalled();
  });

  it('should disable input when loading', () => {
    render(<ChatInput {...defaultProps} isLoading={true} />);

    const textarea = screen.getByPlaceholderText(/ask the stonewalker/i);
    const button = screen.getByRole('button');

    expect(textarea).toBeDisabled();
    expect(button).toBeDisabled();
  });

  it('should enable input when not loading', () => {
    render(<ChatInput {...defaultProps} isLoading={false} />);

    const textarea = screen.getByPlaceholderText(/ask the stonewalker/i);

    expect(textarea).not.toBeDisabled();
  });

  it('should enforce character limit', async () => {
    const user = userEvent.setup();
    render(<ChatInput {...defaultProps} />);

    const textarea = screen.getByPlaceholderText(/ask the stonewalker/i);

    expect(textarea).toHaveAttribute('maxlength', '1000');
  });
});
