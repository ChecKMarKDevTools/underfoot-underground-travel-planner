import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DebugSheet from '../components/DebugSheet';

test('returns null when closed', () => {
  const { container } = render(<DebugSheet open={false} onClose={() => {}} data={{}} />);
  expect(container.firstChild).toBeNull();
});

test('renders debug sections when open and closes on click', async () => {
  const onClose = vi.fn();
  render(
    <DebugSheet
      open
      onClose={onClose}
      data={{ parsed: { city: 'Pikeville' }, radiusCore: 5, filtered: { a: 1 }, raw: { b: 2 } }}
    />,
  );

  expect(screen.getByRole('heading', { name: /Debug View/i })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /Summary/i })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /Full Debug Object/i })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /Raw Chat Response/i })).toBeInTheDocument();

  const user = userEvent.setup();
  // click on the overlay to close
  const overlay = screen.getByTestId('overlay');
  await user.click(overlay);

  expect(onClose).toHaveBeenCalled();
});
