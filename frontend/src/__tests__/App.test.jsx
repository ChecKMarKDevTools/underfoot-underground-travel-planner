import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

test('renders header and initial chat message (no results yet)', () => {
  render(<App />);
  const [banner] = screen.getAllByRole('banner');
  expect(within(banner).getByText('Underfoot')).toBeInTheDocument();
  expect(screen.getByRole('article', { name: 'Underfoot reply' })).toBeInTheDocument();
  // No result articles besides chat at this point
  expect(screen.queryByLabelText('Search results')).not.toBeInTheDocument();
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

test('Chat calls onDebug and renders inline item cards from new shape', async () => {
  const response = 'ok';
  const debug = { requestId: 'req-123' };
  const items = [
    { id: 'r1', title: 'Mine Entrance', description: 'Old shaft', url: 'https://example.com/mine' },
  ];
  const fetchMock = vi
    .fn()
    .mockResolvedValue({ json: () => Promise.resolve({ response, debug, items }) });
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

  // Inline item card should render
  await waitFor(() =>
    expect(screen.getByRole('article', { name: /Mine Entrance/i })).toBeInTheDocument(),
  );

  global.fetch = originalFetch;
});
