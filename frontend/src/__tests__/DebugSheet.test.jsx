import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DebugSheet from '../components/DebugSheet';

test('returns null when closed', () => {
  const { container } = render(<DebugSheet open={false} onClose={() => {}} data={{}} />);
  expect(container.firstChild).toBeNull();
});

test('renders debug sections, history, and closes on click', async () => {
  const onClose = vi.fn();
  const history = [
    { id: '1', ts: Date.now(), data: { debug: { requestId: 'req1' }, chatResponse: { a: 1 } } },
    {
      id: '2',
      ts: Date.now() - 1000,
      data: { debug: { requestId: 'req2' }, chatResponse: { b: 2 } },
    },
  ];
  render(
    <DebugSheet
      open
      onClose={onClose}
      data={history[0].data}
      history={history}
      onSelectHistory={() => {}}
      onClearHistory={() => {}}
    />,
  );

  expect(screen.getByRole('heading', { name: /Debug View/i })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /Summary/i })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /Full Debug Object/i })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /Raw Chat Response/i })).toBeInTheDocument();

  const user = userEvent.setup();
  // Ensure copy buttons exist
  expect(screen.getAllByText(/Copy/i).length).toBeGreaterThan(0);
  // click on the overlay to close
  const overlay = screen.getByTestId('overlay');
  await user.click(overlay);

  expect(onClose).toHaveBeenCalled();
});
