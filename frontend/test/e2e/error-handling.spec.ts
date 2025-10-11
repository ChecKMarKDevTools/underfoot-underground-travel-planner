import { test, expect } from '@playwright/test';

test.describe('Error Handling E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should handle backend connection failure gracefully', async ({ page, context }) => {
    await context.route('**/underfoot/search', (route) => {
      route.abort('failed');
    });

    const input = page.getByRole('textbox', { name: 'Message input' });
    await input.fill('test query');

    await page.getByRole('button', { name: 'Send message' }).click();

    await expect(page.getByText(/Error|Failed to process search/i)).toBeVisible({ timeout: 5000 });
  });

  test('should handle API timeout', async ({ page, context }) => {
    await context.route('**/underfoot/search', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 30000));
      route.fulfill({
        status: 408,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Request timeout' }),
      });
    });

    const input = page.getByRole('textbox', { name: 'Message input' });
    await input.fill('test query');

    await page.getByRole('button', { name: 'Send message' }).click();

    await expect(page.getByText(/Error|timeout/i)).toBeVisible({ timeout: 35000 });
  });

  test('should handle 500 server error', async ({ page, context }) => {
    await context.route('**/underfoot/search', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' }),
      });
    });

    const input = page.getByRole('textbox', { name: 'Message input' });
    await input.fill('test query');

    await page.getByRole('button', { name: 'Send message' }).click();

    await expect(page.getByText(/Error|Internal server error/i)).toBeVisible({ timeout: 5000 });
  });

  test('should handle malformed API response', async ({ page, context }) => {
    await context.route('**/underfoot/search', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: 'not valid json',
      });
    });

    const input = page.getByRole('textbox', { name: 'Message input' });
    await input.fill('test query');

    await page.getByRole('button', { name: 'Send message' }).click();

    await expect(page.getByText(/Error|Failed to process search/i)).toBeVisible({ timeout: 5000 });
  });

  test('should handle API response with no places', async ({ page, context }) => {
    await context.route('**/underfoot/search', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user_intent: 'test',
          user_location: 'test',
          response: 'No results',
          places: [],
        }),
      });
    });

    const input = page.getByRole('textbox', { name: 'Message input' });
    await input.fill('nonexistent place xyz123');

    await page.getByRole('button', { name: 'Send message' }).click();

    await expect(page.getByText(/No locations found/i)).toBeVisible({ timeout: 5000 });
  });

  test('should continue working after error recovery', async ({ page, context }) => {
    let requestCount = 0;

    await context.route('**/underfoot/search', (route) => {
      requestCount++;
      if (requestCount === 1) {
        route.abort('failed');
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            user_intent: 'test',
            user_location: 'test',
            response: 'Success',
            places: [],
          }),
        });
      }
    });

    const input = page.getByRole('textbox', { name: 'Message input' });

    await input.fill('first query');
    await page.getByRole('button', { name: 'Send message' }).click();
    await expect(page.getByText(/Error|Failed/i)).toBeVisible({ timeout: 5000 });

    await input.fill('second query');
    await page.getByRole('button', { name: 'Send message' }).click();
    await expect(page.getByText(/No locations found/i)).toBeVisible({ timeout: 5000 });
  });

  test('should handle Google Maps loading failure gracefully', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'google', {
        value: undefined,
        writable: false,
      });
    });

    await page.reload();

    const map = page.getByRole('region', { name: /map/ });
    await expect(map).toBeVisible();
  });
});
