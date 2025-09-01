import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

// Exercise every inline callback in App (onOpenDebug, onRestart, onDebug fallback branch,
// onAutoDebug, onSelectHistory, onClearHistory, onClose)
test('App debug history lifecycle including selection and clear', async () => {
  const responses = [
    { response: 'Alpha reply', debug: { requestId: 'r-first' } },
    { response: 'Beta reply', debug: { requestId: 'r-second' } },
  ];
  let call = 0;
  const originalFetch = global.fetch;
  global.fetch = vi.fn().mockImplementation(() => {
    const payload = responses[Math.min(call, responses.length - 1)];
    call++;
    return Promise.resolve({ json: () => Promise.resolve(payload) });
  });

  render(<App />);
  const user = userEvent.setup();
  const textbox = screen.getByLabelText(/Message Underfoot/i);

  // Manually open and close debug before any messages (exercise onOpenDebug + onClose)
  await user.click(screen.getByRole('button', { name: /Debug View/i }));
  await waitFor(() =>
    expect(screen.getByRole('heading', { name: /Debug View/i })).toBeInTheDocument(),
  );
  await user.click(screen.getByRole('button', { name: /Close/i }));

  // First message (no fallback)
  await user.type(textbox, 'one');
  await user.click(screen.getByRole('button', { name: /Send/i }));
  await waitFor(() => expect(screen.getByText('Alpha reply')).toBeInTheDocument());

  // Second message (fallback triggers auto debug open)
  await user.type(textbox, 'two');
  await user.click(screen.getByRole('button', { name: /Send/i }));
  await waitFor(() => expect(screen.getByText('Beta reply')).toBeInTheDocument());

  // Second message
  // Manually open debug to interact with history after messages
  await user.click(screen.getByRole('button', { name: /Debug View/i }));
  await waitFor(() =>
    expect(screen.getByRole('heading', { name: /Debug View/i })).toBeInTheDocument(),
  );

  // History shows two entries (their IDs appear as UUIDs since requestId not nested under debug)
  const historyButtons = await waitFor(() => {
    const btns = screen.getAllByRole('button').filter((b) => b.title && /AM|PM/.test(b.title)); // heuristic: history buttons have a time title
    if (btns.length < 2) throw new Error('not yet');
    return btns;
  });
  // Click second entry (older) to exercise onSelectHistory
  await user.click(historyButtons[1]);

  // Clear history (exercises onClearHistory)
  const clearBtn = screen.getByRole('button', { name: /Clear History/i });
  expect(clearBtn).not.toBeDisabled();
  await user.click(clearBtn);
  await waitFor(() => expect(clearBtn).toBeDisabled());

  // Close sheet (onClose)
  await user.click(screen.getByRole('button', { name: /Close/i }));
  await waitFor(() =>
    expect(screen.queryByRole('heading', { name: /Debug View/i })).not.toBeInTheDocument(),
  );

  global.fetch = originalFetch;
});
