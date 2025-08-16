import { render, screen } from '@testing-library/react';
import MainContent from '../components/MainContent';

test('renders heading and tagline', () => {
  render(<MainContent />);
  expect(screen.getByRole('heading', { name: /Underfoot by CheckMarK/i })).toBeInTheDocument();
  expect(screen.getByText(/underground chat space/i)).toBeInTheDocument();
});
