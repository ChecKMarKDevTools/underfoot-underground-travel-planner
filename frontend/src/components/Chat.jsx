import { useRef, useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE;
const LIMIT = Number(import.meta.env.VITE_LIMIT || 5);

// Chat layout modeled after ChatGPT (no sidebar):
// - Full height scrollable message column centered with max width.
// - Input composer docked at bottom with subtle divider shadow.
// - Auto-scroll to last message.
export default function Chat({ onDebug, onResults }) {
  const [messages, setMessages] = useState([
    {
      from: 'bot',
      text: 'I’m Underfoot. Tell me where & when (e.g., ‘Pikeville KY next week for 3 days, outdoors’). I’ll find what the big sites missed.',
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
      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, limit: LIMIT }),
      });
      const data = await res.json();
      if (data?.reply) setMessages((m) => [...m, { from: 'bot', text: data.reply }]);
      if (Array.isArray(data?.results) && data.results.length) {
        onResults?.(data.results);
      }
      onDebug?.(data?.debug || {});
    } catch {
      setMessages((m) => [
        ...m,
        { from: 'bot', text: 'My local informants ghosted me. Try again or broaden the area?' },
      ]);
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
          {messages.map((m, i) => (
            <div
              key={i}
              className={`w-full flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`relative max-w-[85%] rounded-xl border px-4 py-3 leading-relaxed text-sm md:text-base shadow-sm ${
                  m.from === 'user'
                    ? 'bg-[#232334] border-cm-border'
                    : 'bg-cm-card border-cm-border'
                }`}
                role="article"
                aria-label={m.from === 'user' ? 'Your message' : 'Underfoot reply'}
              >
                {m.text}
              </div>
            </div>
          ))}
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
            placeholder="Pikeville KY next week, 3 days, outdoors" // mimic ChatGPT multi-line composer
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
