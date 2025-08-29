import { test, expect } from '@playwright/test';

test('chat shows bot response and inline items when API returns data (mocked)', async ({
  page,
}) => {
  // Intercept /chat with new schema { response, items, debug }
  await page.route('**/chat', async (route) => {
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

  // Bot response appears with inline item card
  const botArticle = page.getByRole('article', { name: 'Underfoot reply' }).last();
  await expect(botArticle).toContainText('Mocked secret spots');
  await expect(botArticle).toContainText('Hidden Cavern');

  // Open debug sheet and verify debug content surfaced
  await page.getByRole('button', { name: 'Debug View' }).click();
  await expect(page.getByRole('heading', { name: 'Debug View' })).toBeVisible();
  await expect(page.getByText('mock-123')).toBeVisible();
});
