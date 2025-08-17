import { test, expect } from '@playwright/test';

test('chat shows bot reply when API returns data (mocked)', async ({ page }) => {
  // Intercept any /chat request and return a mocked reply and debug info
  await page.route('**/chat', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ reply: 'Mocked secret spots 🌲', debug: { requestId: 'mock-123' } }),
    });
  });

  await page.goto('/');

  const input = page.getByLabel('Message Underfoot');
  await input.fill('Anywhere underground?');
  await page.getByRole('button', { name: 'Send' }).click();

  // Bot reply appears from mocked backend (last reply)
  await expect(page.getByRole('article', { name: 'Underfoot reply' }).last()).toContainText(
    'Mocked secret spots',
  );

  // Open debug sheet and verify debug content surfaced
  await page.getByRole('button', { name: 'Debug View' }).click();
  await expect(page.getByRole('heading', { name: 'Debug View' })).toBeVisible();
  await expect(page.getByText('mock-123')).toBeVisible();
});
