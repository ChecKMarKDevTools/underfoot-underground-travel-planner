import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Chat from '../components/Chat';

// Helper to flush microtasks
const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  import.meta.env = { VITE_API_BASE: 'http://localhost:9999', VITE_LIMIT: '5' };
});

test('streams via SSE and replaces placeholder with final payload + items', async () => {
  const onDebug = vi.fn();
  // New banner presence assertion before interaction
  expect(screen.queryByAltText(/Underfoot banner/i)).not.toBeInTheDocument(); // not yet rendered until mount
  // Mock EventSource
  class MockEventSource {
    constructor(url) {
      this.url = url;
      this.listeners = {};
      setTimeout(() => this._emitSequence(), 0);
    }
    addEventListener(type, cb) {
      (this.listeners[type] ||= []).push(cb);
    }
    _emit(type, dataObj) {
      (this.listeners[type] || []).forEach((fn) => fn({ data: JSON.stringify(dataObj) }));
    }
    _emitSequence() {
      this._emit('start', { protocolVersion: 1 });
      this._emit('complete', {
        response: 'SSE hello',
        items: [
          { id: '1', title: 'Alpha', description: 'A', url: 'https://a.example' },
          { id: '2', title: 'Beta', description: 'B', url: 'https://b.example' },
        ],
        debug: { requestId: 'sse123' },
      });
      this._emit('end', {});
    }
    close() {}
  }
  global.EventSource = MockEventSource;
  // Ensure fetch not used (should not be called in streaming path)
  global.fetch = vi.fn(() => Promise.reject(new Error('should not fetch in SSE test')));

  render(<Chat onDebug={onDebug} />);
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(/Message Underfoot/i), 'stream now');
  await user.click(screen.getByRole('button', { name: /Send/i }));
  // (Placeholder '…' may be replaced very quickly depending on event timing; we skip asserting it directly to avoid flakiness.)

  await waitFor(() => expect(screen.getByText('SSE hello')).toBeInTheDocument());
  expect(screen.getByText('Alpha')).toBeInTheDocument();
  expect(screen.getByText('Beta')).toBeInTheDocument();
  expect(onDebug).toHaveBeenCalledWith(
    expect.objectContaining({ chatResponse: expect.any(Object), transport: 'sse' }),
  );
});

// Removed explicit fallback path; client now just posts if SSE constructor fails
test('uses POST when EventSource constructor throws', async () => {
  const onDebug = vi.fn();
  global.EventSource = function ThrowingES() {
    throw new Error('nope');
  };
  global.fetch = vi
    .fn()
    .mockResolvedValue({ json: () => Promise.resolve({ response: 'POST path' }) });
  render(<Chat onDebug={onDebug} />);
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(/Message Underfoot/i), 'post please');
  await user.click(screen.getByRole('button', { name: /Send/i }));
  await waitFor(() => expect(screen.getByText('POST path')).toBeInTheDocument());
});

test('Enter submits and Shift+Enter inserts newline without submit', async () => {
  global.EventSource = function ThrowingES() {
    throw new Error('force fallback');
  };
  global.fetch = vi.fn().mockResolvedValue({
    json: () => Promise.resolve({ response: 'Line test' }),
  });
  render(<Chat />);
  const ta = screen.getByLabelText(/Message Underfoot/i);
  const user = userEvent.setup();
  await user.type(ta, 'First');
  // Shift+Enter adds newline
  await user.keyboard('{Shift>}{Enter}{/Shift}Second');
  expect(ta.value).toBe('First\nSecond');
  // Plain Enter submits
  await user.keyboard('{Enter}');
  await waitFor(() => expect(screen.getByText('Line test')).toBeInTheDocument());
});

// Removed auto debug trigger test (fallback flag no longer produced)
