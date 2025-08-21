import { useRef, useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE;
const LIMIT = Number(import.meta.env.VITE_LIMIT || 5);

export default function Chat({ onDebug }) {
  const [messages, setMessages] = useState([
    {
      from: 'bot',
      text: 'I’m Underfoot. Tell me where & when (e.g., ‘Pikeville KY next week for 3 days, outdoors’). I’ll find what the big sites missed.',
    },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const threadRef = useRef(null);

  useEffect(() => {
    if (!threadRef.current) return;
    threadRef.current.scrollTop = threadRef.current.scrollHeight;
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
      if (onDebug) onDebug(data?.debug || {});
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
    <div className="grid grid-rows-[1fr,auto] gap-3">
      <div ref={threadRef} className="glass p-3 h-[65vh] overflow-auto" aria-live="polite">
        <div className="flex flex-col gap-2">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`max-w-[85%] px-3 py-2 rounded-xl border ${
                m.from === 'user'
                  ? 'ml-auto bg-[#232334] border-cm-border'
                  : 'bg-cm-card border-cm-border'
              }`}
              role="article"
              aria-label={m.from === 'user' ? 'Your message' : 'Underfoot reply'}
            >
              {m.text}
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={send} className="flex gap-2 items-end glass p-2 sticky bottom-2">
        <label htmlFor="msg" className="sr-only">
          Message Underfoot
        </label>
        <input
          id="msg"
          placeholder="Pikeville KY, outdoors, 15 miles"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={busy}
          aria-disabled={busy}
          className="w-full px-3 py-2 bg-cm-card border border-cm-border rounded-lg text-cm-text focus:outline-none focus:ring-2 focus:ring-cm-info"
        />
        <button
          type="submit"
          disabled={busy}
          className="px-4 py-2 rounded-lg font-semibold text-white bg-gradient-to-r from-cm-primary to-cm-accent disabled:opacity-60"
        >
          {busy ? 'Digging…' : 'Send'}
        </button>
      </form>
    </div>
  );
}
