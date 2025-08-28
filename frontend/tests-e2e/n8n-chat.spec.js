import { test, expect } from '@playwright/test';
import viteConfig from '../vite.config.js';

// Ensure we respect the configured Vite base (e.g. "/labs/underfoot/") so the
// production preview build serves the correct path. We derive it directly from
// the Vite config to avoid duplicating knowledge in tests.

function buildPath(path) {
  const base = (viteConfig.base || '/').replace(/\/+$|^$/, '/');
  // Ensure exactly one trailing slash on base then append relative path.
  return `${base.replace(/\/+$/, '/')}${path.replace(/^\//, '')}`;
}

test.describe('n8n chat page', () => {
  test('renders iframe when forced via query param', async ({ page }) => {
    // Try pretty path first; if it 404s fallback to query flag approach.
    const target = buildPath('n8n-chat?iframe=1');
    const resp = await page.goto(target);
    if (!resp || resp.status() === 404) {
      await page.goto(buildPath('?n8n-chat&iframe=1'));
    }
    const iframe = page.locator('[data-testid="n8n-chat-iframe"]');
    await expect(iframe).toBeVisible();
  });
});
