export default function DebugSheet({ open, onClose, data }) {
  if (!open) return null;
  return (
    <div className='fixed inset-0 z-50'>
      <div className='absolute inset-0 bg-black/50' data-testid='overlay' onClick={onClose} />
      <div className='absolute right-0 top-0 h-full w-[420px] max-w-[90vw] bg-[#101018] border-l border-cm-border flex flex-col'>
        <div className='flex items-center justify-between p-4 border-b border-cm-border'>
          <h2 className='text-lg font-bold'>Debug View</h2>
          <button
            type='button'
            onClick={onClose}
            className='px-3 py-1 rounded bg-cm-card border border-cm-border hover:bg-cm-card/80 transition-colors'
          >
            Close
          </button>
        </div>

        <div className='flex-1 overflow-y-auto p-4 space-y-3'>
          <section className='glass p-3'>
            <h3 className='text-base font-bold'>Parse & Radius</h3>
            <pre className='mt-2 text-xs overflow-x-auto whitespace-pre-wrap'>
              {JSON.stringify(
                {
                  parsed: data?.parsed,
                  radiusCore: data?.radiusCore,
                  radiusUsed: data?.radiusUsed,
                  coreCount: data?.coreCount,
                  stretchCount: data?.stretchCount,
                  nearbyCount: data?.nearbyCount,
                  executionTimeMs: data?.executionTimeMs,
                  requestId: data?.requestId,
                },
                null,
                2,
              )}
            </pre>
          </section>

          <section className='glass p-3'>
            <h3 className='text-base font-bold'>Raw (truncated)</h3>
            <pre className='mt-2 text-xs overflow-x-auto whitespace-pre-wrap'>
              {JSON.stringify(data?.raw ?? {}, null, 2)}
            </pre>
          </section>

          <section className='glass p-3'>
            <h3 className='text-base font-bold'>Filtered (truncated)</h3>
            <pre className='mt-2 text-xs overflow-x-auto whitespace-pre-wrap'>
              {JSON.stringify(data?.filtered ?? {}, null, 2)}
            </pre>
          </section>
        </div>
      </div>
    </div>
  );
}
