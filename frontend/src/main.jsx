import { createRoot } from 'react-dom/client';
import App from './App';
import '../styles.css';

// Simplified entry: only native App remains (embedded n8n chat removed)
createRoot(document.getElementById('root')).render(<App />);
