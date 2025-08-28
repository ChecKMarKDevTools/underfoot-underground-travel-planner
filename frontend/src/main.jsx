import { createRoot } from 'react-dom/client';
import App from './App';
import N8nChatPage from './N8nChatPage';
import '../styles.css';

// Normalize trailing slashes for robust matching regardless of Vite base (e.g. "/labs/underfoot/").
const pathname = window.location.pathname.replace(/\/+$/, '');
const search = window.location.search;
// We can't rely on startsWith because the app is served under a non-root base path in production
// (see vite.config.js base). Instead, look for the segment anywhere in the pathname.
// Additionally allow triggering the n8n chat page via a bare query flag (?n8n-chat) to avoid
// needing server rewrite support for /n8n-chat under a non-root base path.
const isN8nChat = pathname.includes('/n8n-chat') || /[?&]n8n-chat(?:=|&|$)/i.test(search);

createRoot(document.getElementById('root')).render(isN8nChat ? <N8nChatPage /> : <App />);
