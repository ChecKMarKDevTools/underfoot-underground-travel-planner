import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Chat from '../components/Chat';

beforeEach(() => {
  import.meta.env = { VITE_API_BASE: 'http://localhost:9999', VITE_LIMIT: '5' };
});

test('SSE debug.fallback triggers onAutoDebug', async () => {
  const onAutoDebug = vi.fn();
  class FallbackES {
    constructor() {
      this.listeners = {};
      setTimeout(() => {
        this._emit('start', {});
        this._emit('complete', {
          response: 'SSE with fallback',
          debug: { fallback: true, requestId: 'fb1' },
        });
        this._emit('end', {});
      }, 0);
    }
    addEventListener(t, cb) {
      (this.listeners[t] ||= []).push(cb);
    }
    _emit(t, data) {
      (this.listeners[t] || []).forEach((fn) => fn({ data: JSON.stringify(data) }));
    }
    close() {}
  }
  global.EventSource = FallbackES;
  global.fetch = vi.fn();
  render(<Chat onAutoDebug={onAutoDebug} />);
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(/Message Underfoot/i), 'hi');
  await user.click(screen.getByRole('button', { name: /Send/i }));
  await waitFor(() => expect(screen.getByText('SSE with fallback')).toBeInTheDocument());
  expect(onAutoDebug).toHaveBeenCalled();
});

test('SSE complete with plain text (non JSON) uses raw response path', async () => {
  class TextES {
    constructor() {
      this.listeners = {};
      setTimeout(() => {
        this._emit('start', {});
        // Emit complete event with plain text instead of JSON stringified object
        (this.listeners['complete'] || []).forEach((fn) => fn({ data: 'RAW TEXT' }));
        this._emit('end', {});
      }, 0);
    }
    addEventListener(t, cb) {
      (this.listeners[t] ||= []).push(cb);
    }
    _emit(t, data) {
      (this.listeners[t] || []).forEach((fn) => fn({ data: JSON.stringify(data) }));
    }
    close() {}
  }
  global.EventSource = TextES;
  global.fetch = vi.fn();
  render(<Chat />);
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(/Message Underfoot/i), 'plain');
  await user.click(screen.getByRole('button', { name: /Send/i }));
  await waitFor(() => expect(screen.getByText('RAW TEXT')).toBeInTheDocument());
});

test('SSE complete with empty items does not render items container', async () => {
  class EmptyItemsES {
    constructor() {
      this.listeners = {};
      setTimeout(() => {
        this._emit('start', {});
        this._emit('complete', { response: 'No items here', items: [] });
        this._emit('end', {});
      }, 0);
    }
    addEventListener(t, cb) {
      (this.listeners[t] ||= []).push(cb);
    }
    _emit(t, data) {
      (this.listeners[t] || []).forEach((fn) => fn({ data: JSON.stringify(data) }));
    }
    close() {}
  }
  global.EventSource = EmptyItemsES;
  global.fetch = vi.fn();
  render(<Chat />);
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(/Message Underfoot/i), 'empty');
  await user.click(screen.getByRole('button', { name: /Send/i }));
  await waitFor(() => expect(screen.getByText('No items here')).toBeInTheDocument());
  // Ensure no article with first item title (would not exist)
  expect(screen.queryByRole('article', { name: /Alpha/ })).not.toBeInTheDocument();
});

test('busy state shows Digging… and prevents second submit via Enter during streaming', async () => {
  class SlowES {
    constructor() {
      this.listeners = {};
      setTimeout(() => this._emit('start', {}), 0);
      setTimeout(() => {
        this._emit('complete', { response: 'Done' });
        this._emit('end', {});
      }, 50); // delay to keep busy true
    }
    addEventListener(t, cb) {
      (this.listeners[t] ||= []).push(cb);
    }
    _emit(t, data) {
      (this.listeners[t] || []).forEach((fn) => fn({ data: JSON.stringify(data) }));
    }
    close() {}
  }
  global.EventSource = SlowES;
  global.fetch = vi.fn();
  render(<Chat />);
  const user = userEvent.setup();
  const ta = screen.getByLabelText(/Message Underfoot/i);
  await user.type(ta, 'first');
  await user.click(screen.getByRole('button', { name: /Send/i }));
  // Busy label
  await waitFor(() =>
    expect(screen.getByRole('button', { name: /Digging…/i })).toBeInTheDocument(),
  );
  // Attempt second submit
  await user.type(ta, 'second');
  await user.keyboard('{Enter}');
  // Wait for completion
  await waitFor(() => expect(screen.getByText('Done')).toBeInTheDocument());
  // Ensure only one user message (first) present, not 'second'
  expect(screen.queryByText('second')).not.toBeInTheDocument();
});
