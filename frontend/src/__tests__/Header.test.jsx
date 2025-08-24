import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Header from '../components/Header';

vi.mock('../assets/underfoot-logo.png', () => ({ default: 'logo.png' }));

test('renders logo and core buttons', () => {
  render(<Header />);
  expect(screen.getByAltText(/Underfoot logo/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Restart/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Debug View/i })).toBeInTheDocument();
});

test('buttons trigger callbacks', async () => {
  const onOpenDebug = vi.fn();
  const onRestart = vi.fn();
  const user = userEvent.setup();
  render(<Header onOpenDebug={onOpenDebug} onRestart={onRestart} />);

  await user.click(screen.getByRole('button', { name: /Restart/i }));
  await user.click(screen.getByRole('button', { name: /Debug View/i }));

  expect(onRestart).toHaveBeenCalled();
  expect(onOpenDebug).toHaveBeenCalled();
});
