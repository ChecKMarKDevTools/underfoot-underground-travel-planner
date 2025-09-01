import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Chat from '../components/Chat';

const API_BASE = 'http://localhost:9999';

beforeEach(() => {
  import.meta.env = { VITE_API_BASE: API_BASE, VITE_LIMIT: '5' };
});

test('renders initial bot message and allows typing', async () => {
  render(<Chat />);
  expect(
    screen.getByText(
      /Welcome to Underfoot 🪨 Where are you headed and what do you hope to uncover there\? The stones will tell us exactly where to go\./i,
    ),
  ).toBeInTheDocument();

  const user = userEvent.setup();
  await user.type(screen.getByLabelText(/Message Underfoot/i), 'Pikeville KY, outdoors');
  expect(screen.getByDisplayValue(/Pikeville KY, outdoors/i)).toBeInTheDocument();
});

test('submits message, calls API, renders response, and calls onDebug', async () => {
  const onDebug = vi.fn();
  // Mock fetch success
  const response = 'Here are 3 local spots only the miners know.';
  global.fetch = vi.fn().mockResolvedValue({
    json: () => Promise.resolve({ response, debug: { requestId: 'abc123' } }),
  });

  render(<Chat onDebug={onDebug} />);
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(/Message Underfoot/i), 'Tell me secrets');
  await user.click(screen.getByRole('button', { name: /Send/i }));

  await waitFor(() => expect(screen.getByText(response)).toBeInTheDocument());
  expect(onDebug).toHaveBeenCalledWith(
    expect.objectContaining({ requestId: 'abc123', chatResponse: expect.any(Object) }),
  );
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

test('renders items inline under bot message (capped at 6)', async () => {
  const items = Array.from({ length: 8 }).map((_, i) => ({
    title: `Place ${i + 1}`,
    url: `https://example.com/${i + 1}`,
    summary: `Summary for place ${i + 1}`,
  }));
  const apiPayload = { response: 'Here are some ideas.', items };
  global.fetch = vi.fn().mockResolvedValue({ json: () => Promise.resolve(apiPayload) });

  render(<Chat />);
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(/Message Underfoot/i), 'give me places');
  await user.click(screen.getByRole('button', { name: /Send/i }));

  await waitFor(() => expect(screen.getByText(apiPayload.response)).toBeInTheDocument());
  // Only first 6 should render
  for (let i = 1; i <= 6; i++) {
    expect(screen.getByText(`Place ${i}`)).toBeInTheDocument();
  }
  // Ensure items beyond 6 are not rendered
  expect(screen.queryByText('Place 7')).toBeNull();
  expect(screen.queryByText('Place 8')).toBeNull();
});
