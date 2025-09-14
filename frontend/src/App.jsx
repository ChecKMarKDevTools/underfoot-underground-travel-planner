import { useState } from 'react';
import Header from './components/Header';
import Chat from './components/Chat';
import DebugSheet from './components/DebugSheet';

export default function App() {
  const [debugOpen, setDebugOpen] = useState(false);
  const [debugData, setDebugData] = useState({});
  const [debugHistory, setDebugHistory] = useState([]); // array of entries {id, ts, data}

  return (
    <div
      className={`min-h-[100dvh] max-w-5xl mx-auto flex flex-col px-3 ${debugOpen ? 'pr-[480px] max-[900px]:pr-3' : ''}`}
    >
      <Header onOpenDebug={() => setDebugOpen(true)} onRestart={() => window.location.reload()} />
      <div className="flex-1 w-full flex flex-col">
        <Chat
          onDebug={(d) => {
            const entry = { id: crypto.randomUUID(), ts: Date.now(), data: d };
            setDebugData(d);
            setDebugHistory((h) => [entry, ...h].slice(0, 50)); // keep last 50
            if (d?.fallback) {
              // placeholder for future augmentation
            }
          }}
          onAutoDebug={() => setDebugOpen(true)}
        />
        {/* Results state removed; cards now render inline within Chat messages */}
      </div>
      <DebugSheet
        open={debugOpen}
        onClose={() => setDebugOpen(false)}
        data={debugData}
        history={debugHistory}
        allowBackgroundInteraction
        onSelectHistory={(id) => {
          const found = debugHistory.find((e) => e.id === id);
          if (found) {
            setDebugData(found.data);
          }
        }}
        onClearHistory={() => setDebugHistory([])}
      />
    </div>
  );
}
