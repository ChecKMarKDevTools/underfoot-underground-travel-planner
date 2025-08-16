import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Header from '../components/Header';

vi.mock('../assets/underfoot-logo.png', () => ({ default: 'logo.png' }));

test('renders logo alt text and subtitle', () => {
  render(<Header />);
  expect(screen.getByAltText(/Underfoot by CheckMarK logo/i)).toBeInTheDocument();
  expect(screen.getByText(/Underground travel planner/i)).toBeInTheDocument();
});

test('buttons trigger callbacks', async () => {
  const onOpenDebug = vi.fn();
  const onRestart = vi.fn();
  render(<Header onOpenDebug={onOpenDebug} onRestart={onRestart} />);

  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: /Restart/i }));
  await user.click(screen.getByRole('button', { name: /Debug View/i }));

  expect(onRestart).toHaveBeenCalled();
  expect(onOpenDebug).toHaveBeenCalled();
});
