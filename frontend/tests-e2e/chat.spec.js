import { test, expect } from '@playwright/test';

test('chat shows bot response and inline items when API returns data (mocked)', async ({
  page,
}) => {
  // Intercept streaming (SSE) and non-stream chat endpoints; simulate full SSE lifecycle.
  await page.route('**/underfoot/chat*', async (route) => {
    const url = route.request().url();
    const payload = {
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
    };

    if (url.includes('stream=true')) {
      // Simulate SSE events: start -> complete (with data) -> end
      const sseBody = [
        'event: start',
        'data: {}',
        '',
        'event: complete',
        `data: ${JSON.stringify(payload)}`,
        '',
        'event: end',
        'data: {}',
        '',
      ].join('\n');
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream; charset=utf-8',
        body: sseBody,
      });
      return;
    }

    // Fallback non-stream path (should not be used if SSE path works, but included for robustness)
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(payload),
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
  // Assert requestId present inside the summary JSON blob (first pre under Summary heading)
  const summarySection = page.getByRole('heading', { name: 'Summary' }).locator('..');
  const summaryPre = summarySection.locator('pre').first();
  await expect(summaryPre).toContainText('mock-123');
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
