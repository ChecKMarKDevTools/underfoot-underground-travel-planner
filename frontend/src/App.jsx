import { useState } from 'react';
import Header from './components/Header';
import Chat from './components/Chat';
import DebugSheet from './components/DebugSheet';

export default function App() {
  const [debugOpen, setDebugOpen] = useState(false);
  const [debugData, setDebugData] = useState({});

  return (
    <div className="min-h-[100dvh] max-w-5xl mx-auto flex flex-col px-3">
      <Header onOpenDebug={() => setDebugOpen(true)} onRestart={() => window.location.reload()} />
      <div className="flex-1 w-full flex flex-col">
        <Chat
          onDebug={(d) => {
            setDebugData(d);
            // augment latest bot message with fallback flag if present
            if (d?.fallback) {
              // No direct mutation of Chat's internal state from here; Chat sets flag inline. Left for future synergy.
            }
          }}
          onAutoDebug={() => setDebugOpen(true)}
        />
        {/* Results state removed; cards now render inline within Chat messages */}
      </div>
      <DebugSheet open={debugOpen} onClose={() => setDebugOpen(false)} data={debugData} />
    </div>
  );
}
