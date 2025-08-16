import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

test('renders header and initial chat message', () => {
  render(<App />);
  const banner = screen.getByRole('banner');
  expect(within(banner).getByText('Underfoot')).toBeInTheDocument();
  expect(screen.getByRole('article', { name: 'Underfoot reply' })).toBeInTheDocument();
});

test('opens and closes Debug View', async () => {
  render(<App />);
  const user = userEvent.setup();

  await user.click(screen.getByRole('button', { name: /Debug View/i }));
  expect(screen.getByRole('heading', { name: /Debug View/i })).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: /Close/i }));
  expect(screen.queryByRole('heading', { name: /Debug View/i })).not.toBeInTheDocument();
});

test('restart button triggers window.location.reload', async () => {
  const original = Object.getOwnPropertyDescriptor(window, 'location');
  const reload = vi.fn();
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...window.location, reload },
  });

  render(<App />);
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: /Restart/i }));
  expect(reload).toHaveBeenCalled();

  if (original) Object.defineProperty(window, 'location', original);
});

test('Chat calls onDebug when API returns debug info', async () => {
  const reply = 'ok';
  const debug = { requestId: 'req-123' };
  const fetchMock = vi.fn().mockResolvedValue({ json: () => Promise.resolve({ reply, debug }) });
  const originalFetch = global.fetch;
  // @ts-ignore
  global.fetch = fetchMock;

  render(<App />);
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(/Message Underfoot/i), 'Hello');
  await user.click(screen.getByRole('button', { name: /Send/i }));

  // Open debug sheet to verify data was stored
  await user.click(screen.getByRole('button', { name: /Debug View/i }));
  expect(await screen.findByText(/requestId/)).toBeInTheDocument();

  global.fetch = originalFetch;
});
