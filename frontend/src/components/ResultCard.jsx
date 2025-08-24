import PropTypes from 'prop-types';

export default function ResultCard({
  title,
  description,
  imageUrl,
  url,
  actionLabel = 'Learn More',
  onAction,
}) {
  return (
    <article
      className="flex items-stretch justify-between gap-4 rounded-lg bg-cm-card border border-cm-border p-4 shadow-sm transition-colors"
      aria-label={title}
    >
      <div className="flex flex-[2_2_0px] flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-base font-bold leading-tight text-cm-text">{title}</h3>
          <p className="text-sm leading-normal text-cm-sub">{description}</p>
          {url && (
            <p className="text-[11px] font-mono text-cm-sub/60 break-all">
              <a href={url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                {url}
              </a>
            </p>
          )}
        </div>
        {onAction && (
          <button
            type="button"
            onClick={onAction}
            className="flex min-w-[84px] max-w-[200px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-8 px-4 bg-cm-panel text-cm-text text-sm font-medium leading-normal w-fit border border-cm-border hover:bg-cm-panel/80 transition-colors"
          >
            <span className="truncate">{actionLabel}</span>
          </button>
        )}
      </div>
      {imageUrl && (
        <div className="w-full aspect-video rounded-lg flex-1 overflow-hidden border border-cm-border bg-cm-panel">
          <img
            src={imageUrl}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
        </div>
      )}
    </article>
  );
}

ResultCard.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  imageUrl: PropTypes.string,
  url: PropTypes.string,
  actionLabel: PropTypes.string,
  onAction: PropTypes.func,
};
