import { render, screen } from '@testing-library/react';
import MainContent from '../components/MainContent';

test('renders nothing when no results', () => {
  const { container } = render(<MainContent results={[]} />);
  expect(container).toBeEmptyDOMElement();
});

test('renders provided results', () => {
  render(
    <MainContent
      results={[
        {
          id: '1',
          title: 'Cave Tour',
          description: 'Guided descent into a lesser-known cavern.',
          url: 'https://example.com/cave',
        },
      ]}
    />,
  );
  expect(screen.getByRole('article', { name: /Cave Tour/i })).toBeInTheDocument();
  expect(screen.getByText(/lesser-known cavern/i)).toBeInTheDocument();
  expect(screen.getByText('https://example.com/cave')).toBeInTheDocument();
});
