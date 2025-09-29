import { useEffect, useRef } from 'react';

export const useKeyboardNavigation = (
  onSubmit?: () => void,
  onToggleDebug?: () => void,
  onToggleTheme?: () => void,
) => {
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Global keyboard shortcuts
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 'd':
            event.preventDefault();
            onToggleDebug?.();
            break;
          case 'k':
            event.preventDefault();
            onToggleTheme?.();
            break;
          case '/':
            event.preventDefault();
            inputRef.current?.focus();
            break;
        }
      }

      // Enter to submit (but not Shift+Enter)
      if (event.key === 'Enter' && !event.shiftKey && event.target === inputRef.current) {
        event.preventDefault();
        onSubmit?.();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onSubmit, onToggleDebug, onToggleTheme]);

  return { inputRef };
};
