import logo from '../assets/underfoot-logo.png';

export default function Header({ onOpenDebug, onRestart }) {
  return (
    <header className="sticky top-0 z-10 bg-cm-panel backdrop-blur border-b border-cm-border">
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-3">
          <img
            src={logo}
            alt="Underfoot logo"
            className="h-10 w-10 rounded-md border border-cm-border"
          />
          <h1 className="text-lg font-extrabold tracking-wide">Underfoot</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRestart}
            className="px-3 py-2 rounded-lg bg-cm-card border border-cm-border hover:bg-cm-card/80 transition-colors"
          >
            Restart
          </button>
          <button
            type="button"
            aria-label="Open Debug View"
            onClick={onOpenDebug}
            className="px-3 py-2 rounded-lg bg-cm-card border border-cm-border hover:bg-cm-card/80 transition-colors"
          >
            Debug View
          </button>
        </div>
      </div>
    </header>
  );
}
