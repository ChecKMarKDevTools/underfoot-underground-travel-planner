import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyboardNavigation } from '../../src/hooks/useKeyboardNavigation';

describe('useKeyboardNavigation', () => {
  let mockOnSubmit: ReturnType<typeof vi.fn>;
  let mockOnToggleDebug: ReturnType<typeof vi.fn>;
  let mockOnToggleTheme: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnSubmit = vi.fn();
    mockOnToggleDebug = vi.fn();
    mockOnToggleTheme = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return input ref', () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation(mockOnSubmit, mockOnToggleDebug, mockOnToggleTheme),
    );

    expect(result.current.inputRef).toBeDefined();
    expect(result.current.inputRef.current).toBeNull();
  });

  it('should call onToggleDebug on Ctrl+D', () => {
    renderHook(() => useKeyboardNavigation(mockOnSubmit, mockOnToggleDebug, mockOnToggleTheme));

    const event = new KeyboardEvent('keydown', {
      key: 'd',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(event);

    expect(mockOnToggleDebug).toHaveBeenCalledTimes(1);
  });

  it('should call onToggleDebug on Meta+D (Mac)', () => {
    renderHook(() => useKeyboardNavigation(mockOnSubmit, mockOnToggleDebug, mockOnToggleTheme));

    const event = new KeyboardEvent('keydown', {
      key: 'd',
      metaKey: true,
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(event);

    expect(mockOnToggleDebug).toHaveBeenCalledTimes(1);
  });

  it('should call onToggleTheme on Ctrl+K', () => {
    renderHook(() => useKeyboardNavigation(mockOnSubmit, mockOnToggleDebug, mockOnToggleTheme));

    const event = new KeyboardEvent('keydown', {
      key: 'k',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(event);

    expect(mockOnToggleTheme).toHaveBeenCalledTimes(1);
  });

  it('should call onToggleTheme on Meta+K (Mac)', () => {
    renderHook(() => useKeyboardNavigation(mockOnSubmit, mockOnToggleDebug, mockOnToggleTheme));

    const event = new KeyboardEvent('keydown', {
      key: 'k',
      metaKey: true,
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(event);

    expect(mockOnToggleTheme).toHaveBeenCalledTimes(1);
  });

  it('should focus input on Ctrl+/', () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation(mockOnSubmit, mockOnToggleDebug, mockOnToggleTheme),
    );

    const mockTextarea = document.createElement('textarea');
    mockTextarea.focus = vi.fn();
    Object.defineProperty(result.current.inputRef, 'current', {
      value: mockTextarea,
      writable: true,
    });

    const event = new KeyboardEvent('keydown', {
      key: '/',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(event);

    expect(mockTextarea.focus).toHaveBeenCalledTimes(1);
  });

  it('should not submit on Shift+Enter', () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation(mockOnSubmit, mockOnToggleDebug, mockOnToggleTheme),
    );

    const mockTextarea = document.createElement('textarea');
    Object.defineProperty(result.current.inputRef, 'current', {
      value: mockTextarea,
      writable: true,
    });

    const event = new KeyboardEvent('keydown', {
      key: 'Enter',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(event, 'target', {
      value: mockTextarea,
      writable: false,
      configurable: true,
    });
    document.dispatchEvent(event);

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('should submit on Enter without Shift', () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation(mockOnSubmit, mockOnToggleDebug, mockOnToggleTheme),
    );

    const mockTextarea = document.createElement('textarea');
    Object.defineProperty(result.current.inputRef, 'current', {
      value: mockTextarea,
      writable: true,
    });

    const event = new KeyboardEvent('keydown', {
      key: 'Enter',
      shiftKey: false,
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(event, 'target', {
      value: mockTextarea,
      writable: false,
      configurable: true,
    });
    document.dispatchEvent(event);

    expect(mockOnSubmit).toHaveBeenCalledTimes(1);
  });

  it('should not trigger handlers without callbacks', () => {
    renderHook(() => useKeyboardNavigation());

    const event1 = new KeyboardEvent('keydown', {
      key: 'd',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    const event2 = new KeyboardEvent('keydown', {
      key: 'k',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });

    expect(() => {
      document.dispatchEvent(event1);
      document.dispatchEvent(event2);
    }).not.toThrow();
  });

  it('should cleanup event listeners on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

    const { unmount } = renderHook(() =>
      useKeyboardNavigation(mockOnSubmit, mockOnToggleDebug, mockOnToggleTheme),
    );

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
  });

  it('should prevent default on recognized shortcuts', () => {
    renderHook(() => useKeyboardNavigation(mockOnSubmit, mockOnToggleDebug, mockOnToggleTheme));

    const event = new KeyboardEvent('keydown', {
      key: 'd',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
    document.dispatchEvent(event);

    expect(preventDefaultSpy).toHaveBeenCalled();
  });
});
