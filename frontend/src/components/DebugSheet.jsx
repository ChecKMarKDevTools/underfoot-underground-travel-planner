export default function DebugSheet({
  open,
  onClose,
  data,
  history = [],
  onSelectHistory,
  onClearHistory,
  allowBackgroundInteraction = false,
}) {
  if (!open) return null;

  // Provide full visibility: show entire debug object + raw chat response structure.
  const fullDebug = data || {};
  const chatResponse = data?.chatResponse || {};

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      <div
        className={`absolute inset-0 transition-colors ${allowBackgroundInteraction ? 'bg-transparent' : 'bg-black/50'} ${allowBackgroundInteraction ? 'pointer-events-none' : 'pointer-events-auto'}`}
        data-testid="overlay"
        onClick={allowBackgroundInteraction ? undefined : onClose}
      />
      <div className="absolute right-0 top-0 h-full w-[480px] max-w-[95vw] bg-[#101018] border-l border-cm-border flex flex-col pointer-events-auto shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-cm-border gap-3">
          <h2 className="text-lg font-bold flex-1">Debug View</h2>
          <div className="flex gap-2 items-center flex-wrap">
            <button
              type="button"
              onClick={() => onClearHistory?.()}
              disabled={!history.length}
              className="px-3 py-1 rounded bg-cm-card border border-cm-border hover:bg-cm-card/80 text-xs disabled:opacity-40"
            >
              Clear History
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1 rounded bg-cm-card border border-cm-border hover:bg-cm-card/80 transition-colors text-xs"
            >
              Close
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {history.length > 0 && (
            <section className="glass p-3">
              <h3 className="text-sm font-bold mb-2">History ({history.length})</h3>
              <ul className="space-y-1 max-h-40 overflow-y-auto pr-1">
                {history.map((h) => {
                  const active = h.data === data;
                  return (
                    <li key={h.id}>
                      <button
                        type="button"
                        onClick={() => onSelectHistory?.(h.id)}
                        className={`w-full text-left px-2 py-1 rounded border bg-cm-card/60 hover:bg-cm-card/90 border-cm-border/60 transition-colors ${active ? 'ring-1 ring-cm-primary' : ''}`}
                        title={new Date(h.ts).toLocaleTimeString()}
                      >
                        {new Date(h.ts).toLocaleTimeString()} – {h.data?.debug?.requestId || h.id}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
          <section className="glass p-3">
            <h3 className="text-sm font-bold">Summary</h3>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  try {
                    navigator.clipboard.writeText(
                      JSON.stringify(
                        {
                          requestId: fullDebug.requestId,
                          executionTimeMs: fullDebug.executionTimeMs,
                          upstream: fullDebug.upstream,
                          cache: fullDebug.cache,
                          messageEcho: fullDebug.messageEcho,
                          receivedKeys: fullDebug.receivedKeys,
                        },
                        null,
                        2,
                      ),
                    );
                  } catch {
                    /* noop */
                  }
                }}
                className="text-[10px] px-2 py-1 border border-cm-border rounded bg-cm-card hover:bg-cm-card/80"
              >
                Copy
              </button>
            </div>
            {/* requestId and other summary fields remain only in the JSON blob below while contract is evolving */}
            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(
                {
                  requestId: fullDebug.requestId,
                  executionTimeMs: fullDebug.executionTimeMs,
                  upstream: fullDebug.upstream,
                  cache: fullDebug.cache,
                  messageEcho: fullDebug.messageEcho,
                  receivedKeys: fullDebug.receivedKeys,
                },
                null,
                2,
              )}
            </pre>
          </section>
          <section className="glass p-3">
            <h3 className="text-sm font-bold">Full Debug Object</h3>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  try {
                    navigator.clipboard.writeText(JSON.stringify(fullDebug, null, 2));
                  } catch {
                    /* noop */
                  }
                }}
                className="text-[10px] px-2 py-1 border border-cm-border rounded bg-cm-card hover:bg-cm-card/80"
              >
                Copy
              </button>
            </div>
            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(fullDebug, null, 2)}
            </pre>
          </section>
          <section className="glass p-3">
            <h3 className="text-sm font-bold">Raw Chat Response</h3>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  try {
                    navigator.clipboard.writeText(JSON.stringify(chatResponse, null, 2));
                  } catch {
                    /* noop */
                  }
                }}
                className="text-[10px] px-2 py-1 border border-cm-border rounded bg-cm-card hover:bg-cm-card/80"
              >
                Copy
              </button>
            </div>
            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(chatResponse, null, 2)}
            </pre>
          </section>
        </div>
      </div>
    </div>
  );
}
