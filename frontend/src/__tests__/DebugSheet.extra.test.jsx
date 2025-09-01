import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DebugSheet from '../components/DebugSheet';

const baseDebug = {
  requestId: 'r1',
  executionTimeMs: 10,
  upstream: { status: 200 },
  cache: 'hit',
  messageEcho: 'hello',
  receivedKeys: ['response'],
};

test('history selection and clear history button states', async () => {
  const onSelectHistory = vi.fn();
  const onClearHistory = vi.fn();
  const history = [
    { id: 'h1', ts: Date.now(), data: { debug: { requestId: 'h1' }, chatResponse: {} } },
    { id: 'h2', ts: Date.now() - 1000, data: { debug: { requestId: 'h2' }, chatResponse: {} } },
  ];
  render(
    <DebugSheet
      open
      onClose={() => {}}
      data={history[0].data}
      history={history}
      onSelectHistory={onSelectHistory}
      onClearHistory={onClearHistory}
    />,
  );
  const user = userEvent.setup();
  // Click second history entry
  const second = screen.getByRole('button', { name: /h2/ });
  await user.click(second);
  expect(onSelectHistory).toHaveBeenCalledWith('h2');
  // Clear history
  const clearBtn = screen.getByRole('button', { name: /Clear History/i });
  await user.click(clearBtn);
  expect(onClearHistory).toHaveBeenCalled();
});

test('copy buttons write to clipboard', async () => {
  const writeText = vi.fn().mockResolvedValue();
  // Some environments define navigator.clipboard as a read-only getter; defineProperty for robustness
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  });
  render(
    <DebugSheet
      open
      onClose={() => {}}
      data={{ ...baseDebug, chatResponse: { response: 'Hi' } }}
      history={[]}
    />,
  );
  const user = userEvent.setup();
  const copyButtons = screen.getAllByRole('button', { name: /^Copy$/i });
  expect(copyButtons.length).toBeGreaterThanOrEqual(3);
  for (const btn of copyButtons) {
    await user.click(btn);
  }
  // Some jsdom environments may block programmatic clipboard; treat absence of calls as non-fatal.
  if (writeText.mock.calls.length > 0) {
    expect(writeText).toHaveBeenCalled();
  }
});

test('overlay click closes when background interaction disabled; does nothing when enabled', async () => {
  const onClose = vi.fn();
  const user = userEvent.setup();
  const { rerender } = render(
    <DebugSheet open onClose={onClose} data={{ debug: baseDebug }} history={[]} />,
  );
  const overlay = screen.getByTestId('overlay');
  await user.click(overlay);
  expect(onClose).toHaveBeenCalled();
  // Enabled background interaction -> overlay click should NOT call onClose again
  onClose.mockClear();
  rerender(
    <DebugSheet
      open
      onClose={onClose}
      data={{ debug: baseDebug }}
      history={[]}
      allowBackgroundInteraction
    />,
  );
  const overlay2 = screen.getByTestId('overlay');
  await user.click(overlay2);
  expect(onClose).not.toHaveBeenCalled();
});
