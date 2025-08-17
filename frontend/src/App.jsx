import { useState } from 'react';
import Header from './components/Header';
import Chat from './components/Chat';
import DebugSheet from './components/DebugSheet';

export default function App() {
  const [debugOpen, setDebugOpen] = useState(false);
  const [debugData, setDebugData] = useState({});

  return (
    <div className='min-h-[100dvh] max-w-4xl mx-auto grid grid-rows-[auto,1fr] gap-3 px-3'>
      <Header onOpenDebug={() => setDebugOpen(true)} onRestart={() => window.location.reload()} />
      <Chat onDebug={(d) => setDebugData(d)} />
      <DebugSheet open={debugOpen} onClose={() => setDebugOpen(false)} data={debugData} />
    </div>
  );
}
