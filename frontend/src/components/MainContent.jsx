import PropTypes from 'prop-types';
import ResultCard from './ResultCard';

export default function MainContent({ results }) {
  if (!results?.length) return null;
  return (
    <main className="flex flex-col gap-6 px-4 py-6">
      <div className="flex flex-col gap-6" aria-label="Search results">
        {results.map((r) => (
          <ResultCard key={r.id || r.url || r.title} {...r} />
        ))}
      </div>
    </main>
  );
}

MainContent.propTypes = {
  results: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      title: PropTypes.string.isRequired,
      description: PropTypes.string.isRequired,
      imageUrl: PropTypes.string,
      url: PropTypes.string,
    }),
  ),
};
