import { useEffect, useRef, useState, useMemo } from 'react';
import underfootLogo from './assets/underfoot-logo.png';

// N8nChatPage renders either:
// 1. Hosted Chat iframe (if VITE_N8N_CHAT_IFRAME_URL provided)
// 2. Embedded widget via @n8n/chat createChat (if VITE_N8N_CHAT_WEBHOOK_URL provided)
// Falls back to a simple message if neither is configured.
// Styling aims for full-screen immersive chat using existing color palette.

let createChatFn; // lazy import holder to avoid bundling if only iframe used

export default function N8nChatPage({ iframeUrl: iframeUrlProp, webhookUrl: webhookUrlProp }) {
  const urlParams = new URLSearchParams(
    typeof window !== 'undefined' ? window.location.search : '',
  );
  const forceIframe = urlParams.get('iframe') === '1';
  const iframeUrlEnv = import.meta.env.VITE_N8N_CHAT_IFRAME_URL;
  const webhookUrlEnv = import.meta.env.VITE_N8N_CHAT_WEBHOOK_URL;
  // If forceIframe (?iframe=1) and no env configured, fall back to about:blank so tests always have an iframe element.
  const iframeUrl =
    iframeUrlProp ?? (forceIframe ? (iframeUrlEnv ? iframeUrlEnv : 'about:blank') : iframeUrlEnv);
  const webhookUrl = webhookUrlProp ?? (forceIframe ? undefined : webhookUrlEnv);
  const metadataJson = import.meta.env.VITE_N8N_CHAT_METADATA;
  const mode = useMemo(
    () => (iframeUrl ? 'iframe' : webhookUrl ? 'widget' : 'none'),
    [iframeUrl, webhookUrl],
  );
  if (import.meta.env.DEV) {
    // Helpful during e2e debugging; no-op in production builds.

    console.debug(
      '[N8nChatPage] mode=%s iframeUrl=%s webhookUrl=%s forceIframe=%s',
      mode,
      iframeUrl,
      webhookUrl,
      forceIframe,
    );
  }
  const [error, setError] = useState(null);
  const widgetContainerRef = useRef(null);

  useEffect(() => {
    if (mode !== 'widget') return;
    let cancelled = false;
    (async () => {
      try {
        if (!createChatFn) {
          // Dynamic import so users who only use iframe don't pay cost.
          const mod = await import('@n8n/chat');
          createChatFn = mod.createChat || mod.default?.createChat || mod.default;
        }
        if (!createChatFn) throw new Error('createChat not found in @n8n/chat');
        const metadata = metadataJson ? safeParse(metadataJson) : undefined;
        const instance = createChatFn({
          webhookUrl,
          target: widgetContainerRef.current,
          theme: {
            // Map brand colors; widget supports limited theming API so we set primary/accent.
            primary: '#6B33A2',
            secondary: '#f054b2',
            background: '#0e0e12',
            text: '#f6f7fb',
          },
          metadata,
        });
        // If library returns a destroy method, clean up.
        return () => {
          if (!cancelled && instance && typeof instance.destroy === 'function') instance.destroy();
        };
      } catch (e) {
        setError(e.message || String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, webhookUrl, metadataJson]);

  if (mode === 'none') {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center text-cm-text bg-cm-bg p-6">
        <h1 className="text-2xl font-bold mb-4">Chat Not Configured</h1>
        <p className="text-cm-sub max-w-md text-center text-sm">
          Provide either VITE_N8N_CHAT_IFRAME_URL for hosted chat or VITE_N8N_CHAT_WEBHOOK_URL for
          the embedded widget.
        </p>
      </div>
    );
  }

  if (mode === 'iframe') {
    return (
      <div className="min-h-[100dvh] flex flex-col bg-cm-bg text-cm-text">
        <HeaderBar title="Underfoot · AI Chat" />
        <iframe
          src={iframeUrl}
          title="Underfoot n8n Chat"
          className="flex-1 w-full border-0"
          allow="clipboard-write"
          data-testid="n8n-chat-iframe"
        />
      </div>
    );
  }

  // widget mode
  return (
    <div className="min-h-[100dvh] flex flex-col bg-cm-bg text-cm-text">
      <HeaderBar title="Underfoot · AI Chat" />
      <div className="flex-1 relative">
        <div
          ref={widgetContainerRef}
          className="absolute inset-0"
          data-testid="n8n-chat-widget-container"
        />
        {error && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-red-600 text-white text-xs px-3 py-2 rounded shadow-soft">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

const HeaderBar = ({ title }) => {
  return (
    <div className="h-12 flex items-center justify-between px-4 border-b border-cm-border bg-cm-panel/80 backdrop-blur">
      <div className="flex items-center gap-2 min-w-0">
        <img
          src={underfootLogo}
          alt="Underfoot"
          className="h-6 w-6 object-contain select-none pointer-events-none"
        />
        <h1 className="font-semibold tracking-wide text-sm md:text-base truncate">{title}</h1>
      </div>
      <a
        href="/"
        className="text-xs md:text-sm text-cm-sub hover:text-cm-text transition-colors"
        aria-label="Back to main app"
      >
        Exit
      </a>
    </div>
  );
};

const safeParse = (str) => {
  try {
    return JSON.parse(str);
  } catch {
    return undefined;
  }
};
