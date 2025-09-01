import { render, screen } from '@testing-library/react';
import Header from '../components/Header';

vi.mock('../assets/underfoot-logo.png', () => ({ default: 'logo.png' }));

test('no longer renders change my mind button or banner popover', () => {
  render(<Header />);
  expect(screen.queryByRole('button', { name: /change my mind/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('dialog', { name: /banner preview/i })).not.toBeInTheDocument();
});
