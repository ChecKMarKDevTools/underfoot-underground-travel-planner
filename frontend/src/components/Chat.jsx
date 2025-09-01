import { useRef, useState, useEffect } from 'react';
import ResultCard from './ResultCard';

// Default API base to current origin if env not provided (improves local DX)
const API_BASE = import.meta.env.VITE_API_BASE || window.location.origin;
const LIMIT = Number(import.meta.env.VITE_LIMIT || 5);

// Chat layout modeled after ChatGPT (no sidebar):
// - Full height scrollable message column centered with max width.
// - Input composer docked at bottom with subtle divider shadow.
// - Auto-scroll to last message.
export default function Chat({ onDebug }) {
  const [messages, setMessages] = useState([
    {
      from: 'bot',
      text: 'Welcome to Underfoot 🪨 Where are you headed and what do you hope to uncover there? The stones will tell us exactly where to go.',
    },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    // Smooth-scroll newest message into view (jsdom may not implement smooth behavior)
    if (endRef.current && typeof endRef.current.scrollIntoView === 'function') {
      try {
        endRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
      } catch {
        // Fallback: direct call without options
        try {
          endRef.current.scrollIntoView();
        } catch {
          /* noop */
        }
      }
    }
  }, [messages]);

  const send = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    setMessages((m) => [...m, { from: 'user', text }]);
    setInput('');
    setBusy(true);
    try {
      // Decide if we want to attempt streaming (simple heuristic: always try; fallback on error)
      const sseUrl = `${API_BASE.replace(/\/$/, '')}/underfoot/chat?stream=true&message=${encodeURIComponent(
        text,
      )}`;
      let usedStreaming = false;
      if ('EventSource' in window) {
        try {
          usedStreaming = true;
          await new Promise((resolve) => {
            let finalPayload = null;
            const es = new EventSource(sseUrl);
            es.addEventListener('start', () => {
              // Insert a placeholder bot message we'll update when complete
              setMessages((m) => [...m, { from: 'bot', text: '…', streaming: true }]);
            });
            es.addEventListener('complete', (evt) => {
              try {
                finalPayload = JSON.parse(evt.data);
              } catch {
                finalPayload = { response: evt.data };
              }
              const replyText = finalPayload?.response;
              const rawItems = Array.isArray(finalPayload?.items) ? finalPayload.items : [];
              const attached = rawItems.slice(0, 6).map((r, idx) => ({
                id: r.id ?? r.url ?? r.title ?? idx,
                title: r.title ?? 'Untitled',
                description: r.description ?? '(no summary provided)',
                imageUrl: r.imageUrl,
                url: r.url,
                rating: r.rating,
                source: r.source,
              }));
              setMessages((m) => {
                const copy = [...m];
                // Replace last streaming placeholder
                for (let i = copy.length - 1; i >= 0; i--) {
                  if (copy[i].streaming) {
                    copy[i] = {
                      from: 'bot',
                      text: replyText || '(no reply)',
                      items: attached.length ? attached : undefined,
                    };
                    break;
                  }
                }
                return copy;
              });
              const debugPayload = {
                ...(finalPayload?.debug || {}),
                chatResponse: finalPayload,
                transport: 'sse',
              };
              onDebug?.(debugPayload);
            });
            es.addEventListener('error', (evt) => {
              console.warn('SSE error', evt);
            });
            es.addEventListener('end', () => {
              es.close();
              resolve();
            });
          });
        } catch (err) {
          console.warn('SSE attempt failed, falling back', err);
          usedStreaming = false;
        }
      }

      if (!usedStreaming) {
        const endpoint = `${API_BASE.replace(/\/$/, '')}/underfoot/chat`;
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chatInput: text, limit: LIMIT }),
        });
        const data = await res.json();
        const replyText = data?.response;
        let botMessage = null;
        if (replyText) botMessage = { from: 'bot', text: replyText };
        const rawItems = Array.isArray(data?.items) ? data.items : [];
        const attached = rawItems.slice(0, 6).map((r, idx) => ({
          id: r.id ?? r.url ?? r.title ?? idx,
          title: r.title ?? 'Untitled',
          description: r.description ?? '(no summary provided)',
          imageUrl: r.imageUrl,
          url: r.url,
          rating: r.rating,
          source: r.source,
        }));
        if (botMessage) {
          if (attached.length) botMessage.items = attached;
          setMessages((m) => [...m, botMessage]);
        }
        const debugPayload = { ...(data?.debug || {}), chatResponse: data, transport: 'http' };
        onDebug?.(debugPayload);
      }
    } catch {
      setMessages((m) => [
        ...m,
        { from: 'bot', text: 'My local informants ghosted me. Try again or broaden the area?' },
      ]);
      onDebug?.({ synthetic: true, error: 'network-or-cors', at: Date.now() });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="flex flex-col w-full mx-auto max-w-3xl flex-1 min-h-[60vh] sm:min-h-[65vh] pt-2">
      <div
        className="flex-1 overflow-y-auto px-2 sm:px-0 pb-6 flex flex-col justify-end"
        aria-live="polite"
        aria-label="Conversation thread"
      >
        <div className="flex flex-col gap-4">
          {messages.map((m, i) => {
            const isUser = m.from === 'user';
            return (
              <div key={i} className={`w-full flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`group relative max-w-[85%] rounded-xl border px-4 py-3 leading-relaxed text-sm md:text-base shadow-sm flex flex-col gap-4 ${
                    isUser ? 'bg-[#232334] border-cm-border' : 'bg-cm-card border-cm-border'
                  }`}
                  role="article"
                  aria-label={isUser ? 'Your message' : 'Underfoot reply'}
                >
                  <div>
                    {m.text}
                    {/* No fallback badge now that backend does not synthesize fallback */}
                  </div>
                  {!isUser && Array.isArray(m.items) && m.items.length > 0 && (
                    <div className="flex flex-col gap-3 pt-1 border-t border-cm-border/50">
                      {m.items.map((item) => (
                        <ResultCard
                          key={item.id}
                          title={item.title}
                          description={item.description}
                          imageUrl={item.imageUrl}
                          url={item.url}
                          actionLabel="Open"
                          onAction={() => window.open(item.url, '_blank', 'noopener,noreferrer')}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>
      </div>
      <form
        onSubmit={send}
        className="sticky bottom-0 -mb-2 bg-gradient-to-t from-[#0d0d16] via-[#0d0d16]/95 to-[#0d0d16]/0 pt-6"
      >
        <div className="border border-cm-border bg-cm-panel/70 backdrop-blur rounded-2xl p-3 flex gap-3 items-end">
          <label htmlFor="msg" className="sr-only">
            Message Underfoot
          </label>
          <textarea
            id="msg"
            placeholder="I'd love to find the oldest grave that exists in Salem" // default helper prompt
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={busy}
            aria-disabled={busy}
            rows={1}
            className="resize-none w-full max-h-48 bg-transparent border-0 focus:ring-0 outline-none text-cm-text placeholder-cm-sub/50 leading-relaxed"
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = 'auto';
              el.style.height = Math.min(el.scrollHeight, 192) + 'px';
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!busy && input.trim()) {
                  // mimic submit
                  e.currentTarget.form?.requestSubmit();
                }
              }
            }}
          />
          <button
            type="submit"
            disabled={busy}
            className="self-center px-4 py-2 rounded-lg font-semibold text-white bg-gradient-to-r from-cm-primary to-cm-accent disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {busy ? 'Digging…' : 'Send'}
          </button>
        </div>
        <p className="text-[10px] text-cm-sub mt-2 text-center select-none">
          Underfoot experimental model.
        </p>
      </form>
    </section>
  );
}
