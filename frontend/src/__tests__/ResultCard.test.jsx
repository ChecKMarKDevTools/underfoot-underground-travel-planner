import { render, screen } from '@testing-library/react';
import ResultCard from '../components/ResultCard';

test('ResultCard renders title, description, url, and optional action button', () => {
  render(
    <ResultCard
      title="Test Title"
      description="Fancy description"
      imageUrl="https://example.com/img.png"
      url="https://example.com/article"
      onAction={() => {}}
    />,
  );
  expect(screen.getByRole('article', { name: /Test Title/i })).toBeInTheDocument();
  expect(screen.getByText(/Fancy description/i)).toBeInTheDocument();
  expect(screen.getByText('https://example.com/article')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Learn More/i })).toBeInTheDocument();
});
