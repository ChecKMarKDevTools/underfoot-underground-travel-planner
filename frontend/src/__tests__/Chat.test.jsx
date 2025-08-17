import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Chat from '../components/Chat';

const API_BASE = 'http://localhost:9999';

beforeEach(() => {
  import.meta.env = { VITE_API_BASE: API_BASE, VITE_LIMIT: '5' };
});

test('renders initial bot message and allows typing', async () => {
  render(<Chat />);
  expect(screen.getByText(/I’m Underfoot/i)).toBeInTheDocument();

  const user = userEvent.setup();
  await user.type(screen.getByLabelText(/Message Underfoot/i), 'Pikeville KY, outdoors');
  expect(screen.getByDisplayValue(/Pikeville KY, outdoors/i)).toBeInTheDocument();
});

test('submits message, calls API, renders reply, and calls onDebug', async () => {
  const onDebug = vi.fn();
  // Mock fetch success
  const reply = 'Here are 3 local spots only the miners know.';
  global.fetch = vi.fn().mockResolvedValue({
    json: () => Promise.resolve({ reply, debug: { requestId: 'abc123' } }),
  });

  render(<Chat onDebug={onDebug} />);
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(/Message Underfoot/i), 'Tell me secrets');
  await user.click(screen.getByRole('button', { name: /Send/i }));

  await waitFor(() => expect(screen.getByText(reply)).toBeInTheDocument());
  expect(onDebug).toHaveBeenCalledWith({ requestId: 'abc123' });
});

test('handles network error gracefully', async () => {
  global.fetch = vi.fn().mockRejectedValue(new Error('network down'));

  render(<Chat />);
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(/Message Underfoot/i), 'hello');
  await user.click(screen.getByRole('button', { name: /Send/i }));

  await waitFor(() =>
    expect(screen.getByText(/My local informants ghosted me/i)).toBeInTheDocument(),
  );
});
