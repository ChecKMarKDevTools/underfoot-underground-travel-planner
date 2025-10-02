import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../utils/test-utils';
import { Header } from '../../src/components/Header';

describe('Header', () => {
  const defaultProps = {
    theme: 'light' as const,
    debugMode: false,
    onToggleTheme: vi.fn(),
    onToggleDebug: vi.fn(),
  };

  it('should render app title', () => {
    render(<Header {...defaultProps} />);
    expect(screen.getByText('Underfoot')).toBeInTheDocument();
  });

  it('should render subtitle', () => {
    render(<Header {...defaultProps} />);
    expect(screen.getByText(/Stonewalker Oracle/)).toBeInTheDocument();
  });

  it('should render theme toggle button', () => {
    render(<Header {...defaultProps} />);
    const themeButton = screen.getByLabelText(/switch to.*mode/i);
    expect(themeButton).toBeInTheDocument();
  });

  it('should render debug toggle button', () => {
    render(<Header {...defaultProps} />);
    const debugButton = screen.getByLabelText(/debug mode/i);
    expect(debugButton).toBeInTheDocument();
  });

  it('should call onToggleTheme when theme button clicked', async () => {
    const onToggleTheme = vi.fn();
    const { user } = render(<Header {...defaultProps} onToggleTheme={onToggleTheme} />);

    const themeButton = screen.getByLabelText(/switch to.*mode/i);
    await user.click(themeButton);

    expect(onToggleTheme).toHaveBeenCalledTimes(1);
  });

  it('should call onToggleDebug when debug button clicked', async () => {
    const onToggleDebug = vi.fn();
    const { user } = render(<Header {...defaultProps} onToggleDebug={onToggleDebug} />);

    const debugButton = screen.getByLabelText(/debug mode/i);
    await user.click(debugButton);

    expect(onToggleDebug).toHaveBeenCalledTimes(1);
  });

  it('should highlight debug button when debug mode active', () => {
    const { rerender } = render(<Header {...defaultProps} debugMode={false} />);
    let debugButton = screen.getByLabelText(/debug mode/i);
    let initialClass = debugButton.className;

    rerender(<Header {...defaultProps} debugMode={true} />);
    debugButton = screen.getByLabelText(/debug mode/i);

    expect(debugButton.className).not.toBe(initialClass);
  });

  it('should show Moon icon in light theme', () => {
    render(<Header {...defaultProps} theme="light" />);
    const themeButton = screen.getByLabelText(/switch to dark mode/i);
    expect(themeButton).toBeInTheDocument();
  });

  it('should show Sun icon in dark theme', () => {
    render(<Header {...defaultProps} theme="dark" />);
    const themeButton = screen.getByLabelText(/switch to light mode/i);
    expect(themeButton).toBeInTheDocument();
  });
});
