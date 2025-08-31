export default function DebugSheet({ open, onClose, data }) {
  if (!open) return null;

  // Provide full visibility: show entire debug object + raw chat response structure.
  const fullDebug = data || {};
  const chatResponse = data?.chatResponse || {};

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50" data-testid="overlay" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-[480px] max-w-[95vw] bg-[#101018] border-l border-cm-border flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-cm-border">
          <h2 className="text-lg font-bold">Debug View</h2>
          <div className="flex gap-2 items-center">
            <button
              type="button"
              onClick={() => {
                try {
                  navigator.clipboard.writeText(
                    JSON.stringify({ debug: fullDebug, chatResponse }, null, 2),
                  );
                } catch {
                  /* noop */
                }
              }}
              className="px-3 py-1 rounded bg-cm-card border border-cm-border hover:bg-cm-card/80 text-xs"
            >
              Copy JSON
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1 rounded bg-cm-card border border-cm-border hover:bg-cm-card/80 transition-colors"
            >
              Close
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          <section className="glass p-3">
            <h3 className="text-sm font-bold">Summary</h3>
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
            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(fullDebug, null, 2)}
            </pre>
          </section>
          <section className="glass p-3">
            <h3 className="text-sm font-bold">Raw Chat Response</h3>
            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(chatResponse, null, 2)}
            </pre>
          </section>
        </div>
      </div>
    </div>
  );
}
