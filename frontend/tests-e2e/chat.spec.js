import { test, expect } from '@playwright/test';

test('chat shows bot response and inline items when API returns data (mocked)', async ({
  page,
}) => {
  // Robust pattern: allow query params or differing base origins
  await page.route('**/underfoot/chat*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        response: 'Mocked secret spots 🌲',
        items: [
          {
            id: 'a1',
            title: 'Hidden Cavern',
            description: 'Limestone chamber',
            url: 'https://example.com/cavern',
          },
        ],
        debug: { requestId: 'mock-123' },
      }),
    });
  });

  await page.goto('/');

  const input = page.getByLabel('Message Underfoot');
  await input.fill('Anywhere underground?');
  await page.getByRole('button', { name: 'Send' }).click();

  // Ensure at least one user message renders first
  await expect(page.getByRole('article', { name: 'Your message' }).last()).toContainText(
    'Anywhere underground?',
  );

  // Bot response appears with inline item card (wait for text specifically)
  await expect(page.getByRole('article', { name: 'Underfoot reply' }).last()).toContainText(
    'Mocked secret spots',
  );
  await expect(page.getByRole('article', { name: 'Underfoot reply' }).last()).toContainText(
    'Hidden Cavern',
  );

  // Open debug sheet and verify debug content surfaced
  await page.getByRole('button', { name: 'Debug View' }).click();
  await expect(page.getByRole('heading', { name: 'Debug View' })).toBeVisible();
  // Use dedicated request id test hook for stability
  await expect(page.getByTestId('request-id')).toContainText('mock-123');
});

test('restart button reloads app state (mocked chat)', async ({ page }) => {
  await page.route('**/underfoot/chat*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        response: 'After restart results',
        items: [],
        debug: { requestId: 'after' },
      }),
    });
  });

  await page.goto('/');
  // Send a message
  await page.getByLabel('Message Underfoot').fill('Test restart');
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(page.getByRole('article', { name: 'Your message' }).last()).toContainText(
    'Test restart',
  );

  // Click restart (window.location.reload) and verify the initial welcome bot message is present again
  await page.getByRole('button', { name: 'Restart' }).click();
  await expect(page.getByRole('article', { name: 'Underfoot reply' }).first()).toContainText(
    'Welcome to Underfoot',
  );
});
