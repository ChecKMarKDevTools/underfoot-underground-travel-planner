import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// Mock BEFORE importing component so dynamic import uses this stub.
const createChat = vi.fn(() => ({ destroy: vi.fn() }));
vi.mock('@n8n/chat', () => ({ createChat }));

import N8nChatPage from '../N8nChatPage.jsx';

describe('N8nChatPage', () => {
  it('renders not configured message when no props', () => {
    render(<N8nChatPage />);
    expect(screen.getByText(/Chat Not Configured/i)).toBeInTheDocument();
  });

  it('renders iframe when iframeUrl prop provided', () => {
    render(<N8nChatPage iframeUrl="https://example.com/chat" />);
    const iframe = screen.getByTitle(/n8n Chat/i);
    expect(iframe).toHaveAttribute('src', 'https://example.com/chat');
  });

  it('initializes widget when webhookUrl prop provided', async () => {
    render(<N8nChatPage webhookUrl="https://hook/chat" />);
    await waitFor(() => expect(createChat).toHaveBeenCalled());
  });

  it('forces iframe mode via query param even with webhook only', () => {
    const origLocation = window.location;
    delete window.location; // override for test
    window.location = new URL('http://localhost/n8n-chat?iframe=1');
    render(<N8nChatPage webhookUrl="https://hook/chat" />);
    const iframe = screen.getByTestId('n8n-chat-iframe');
    expect(iframe).toBeInTheDocument();
    window.location = origLocation; // restore
  });

  it('gracefully ignores invalid metadata json', () => {
    const origEnv = import.meta.env.VITE_N8N_CHAT_METADATA;
    // @ts-ignore - mutate for test
    import.meta.env.VITE_N8N_CHAT_METADATA = '{not-json';
    render(<N8nChatPage webhookUrl="https://hook/chat" />);
    // still initializes widget without throwing
    return waitFor(() => expect(createChat).toHaveBeenCalled()).finally(() => {
      // @ts-ignore restore
      import.meta.env.VITE_N8N_CHAT_METADATA = origEnv;
    });
  });
});
