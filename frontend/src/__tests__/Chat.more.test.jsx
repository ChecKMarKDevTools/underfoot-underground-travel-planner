import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Chat from '../components/Chat';

beforeEach(() => {
  import.meta.env = { VITE_API_BASE: 'http://localhost:9999', VITE_LIMIT: '5' };
});

test('falls back immediately to HTTP when EventSource not supported', async () => {
  const orig = global.EventSource;
  // Remove EventSource to force HTTP path

  global.EventSource = undefined;
  const onDebug = vi.fn();
  global.fetch = vi.fn().mockResolvedValue({
    json: () =>
      Promise.resolve({
        response: 'HTTP direct',
        items: [
          { id: 'x1', description: 'Only desc' }, // missing title -> exercises default
          { id: 'x2', title: 'Has Title', url: 'https://example.com' },
        ],
        debug: { requestId: 'http1' },
      }),
  });
  render(<Chat onDebug={onDebug} />);
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(/Message Underfoot/i), 'plain http');
  await user.click(screen.getByRole('button', { name: /Send/i }));
  await waitFor(() => expect(screen.getByText('HTTP direct')).toBeInTheDocument());
  expect(onDebug).toHaveBeenCalledWith(
    expect.objectContaining({ transport: 'http', chatResponse: expect.any(Object) }),
  );
  // Default title fallback applied
  expect(screen.getByText('Untitled')).toBeInTheDocument();
  // Restore
  global.EventSource = orig;
});

test('network error path produces friendly error message and synthetic debug', async () => {
  const orig = global.EventSource;
  global.EventSource = undefined;
  const onDebug = vi.fn();
  global.fetch = vi.fn().mockRejectedValue(new Error('boom'));
  render(<Chat onDebug={onDebug} />);
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(/Message Underfoot/i), 'cause error');
  await user.click(screen.getByRole('button', { name: /Send/i }));
  await waitFor(() => expect(screen.getByText(/local informants ghosted me/i)).toBeInTheDocument());
  expect(onDebug).toHaveBeenCalledWith(
    expect.objectContaining({ synthetic: true, error: 'network-or-cors' }),
  );
  global.EventSource = orig;
});

test('SSE emits error before end without complete and placeholder remains', async () => {
  const onDebug = vi.fn();
  const warnings = [];
  const origWarn = console.warn;
  console.warn = (...a) => warnings.push(a);
  class ErrOnlyES {
    constructor() {
      this.listeners = {};
      setTimeout(() => {
        this._emit('start', {});
        this._emit('error', { message: 'fail' });
        this._emit('end', {});
      }, 0);
    }
    addEventListener(t, cb) {
      (this.listeners[t] ||= []).push(cb);
    }
    _emit(t, obj) {
      (this.listeners[t] || []).forEach((fn) => fn({ data: JSON.stringify(obj) }));
    }
    close() {}
  }
  global.EventSource = ErrOnlyES;
  global.fetch = vi.fn().mockRejectedValue(new Error('should not fetch'));
  render(<Chat onDebug={onDebug} />);
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(/Message Underfoot/i), 'error only');
  await user.click(screen.getByRole('button', { name: /Send/i }));
  // Wait for end event resolution
  await new Promise((r) => setTimeout(r, 10));
  // Placeholder is never replaced (streaming failure) -> still shows ellipsis
  expect(screen.getAllByText('…').length).toBeGreaterThanOrEqual(1);
  // Warn was logged
  expect(warnings.length).toBeGreaterThan(0);
  console.warn = origWarn;
});
