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

// Deprecated: embedded n8n chat path removed. This file remains temporarily to avoid
// unexpected CI config references. All tests skipped; will be deleted in a follow-up.
test.describe.skip('n8n chat page (removed)', () => {
  test('placeholder', () => {});
});
