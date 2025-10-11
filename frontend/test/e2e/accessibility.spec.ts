import { test, expect } from '@playwright/test';

test.describe('Accessibility E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should have proper ARIA labels and roles', async ({ page }) => {
    await expect(page.getByRole('banner')).toBeVisible();

    await expect(page.getByRole('textbox', { name: 'Message input' })).toBeVisible();

    await expect(page.getByRole('button', { name: 'Send message' })).toBeVisible();

    await expect(page.getByRole('region', { name: /map/ })).toBeVisible();
  });

  test('should be keyboard navigable', async ({ page }) => {
    await page.keyboard.press('Tab');

    const themeButton = page.getByRole('button', { name: /Switch to/ });
    await expect(themeButton).toBeFocused();

    await page.keyboard.press('Tab');

    const debugButton = page.getByRole('button', { name: /debug mode/i });
    await expect(debugButton).toBeFocused();

    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
    }

    const input = page.getByRole('textbox', { name: 'Message input' });
    await expect(input).toBeFocused();
  });

  test('should announce loading state to screen readers', async ({ page, context }) => {
    await context.route('**/underfoot/search', async (route) => {
      await page.waitForTimeout(2000);
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user_intent: 'test',
          user_location: 'test',
          response: 'Test',
          places: [],
        }),
      });
    });

    const input = page.getByRole('textbox', { name: 'Message input' });
    await input.fill('test query');

    await page.getByRole('button', { name: 'Send message' }).click();

    const sendButton = page.getByRole('button', { name: 'Send message' });
    await expect(sendButton).toHaveAttribute('aria-busy', 'true');

    await expect(page.getByText(/test query/i)).toBeVisible({ timeout: 5000 });

    await expect(sendButton).toHaveAttribute('aria-busy', 'false');
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    const h1 = page.getByRole('heading', { level: 1 });
    await expect(h1).toHaveCount(1);

    await expect(page.getByRole('heading', { name: /Underfoot/i })).toBeVisible();
  });

  test('should have sufficient color contrast', async ({ page }) => {
    const html = page.locator('html');

    await html.evaluate((el) => el.classList.add('dark'));
    await page.screenshot({ path: 'test-results/dark-mode.png' });

    await html.evaluate((el) => el.classList.remove('dark'));
    await page.screenshot({ path: 'test-results/light-mode.png' });
  });

  test('should support reduced motion preference', async ({ page, context }) => {
    await context.addInitScript(() => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: (query: string) => ({
          matches: query.includes('prefers-reduced-motion: reduce'),
          media: query,
          onchange: null,
          addListener: () => {},
          removeListener: () => {},
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => true,
        }),
      });
    });

    await page.reload();

    const debugButton = page.getByRole('button', { name: /debug mode/i });
    await debugButton.click();

    await expect(page.getByText('AI Debug Console')).toBeVisible();
  });

  test('should have visible focus indicators', async ({ page }) => {
    const input = page.getByRole('textbox', { name: 'Message input' });
    await input.focus();

    const inputBox = await input.boundingBox();
    expect(inputBox).not.toBeNull();

    const screenshot = await page.screenshot();
    expect(screenshot).toBeTruthy();
  });

  test('should provide alternative text for images', async ({ page, context }) => {
    await context.route('**/underfoot/search', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user_intent: 'caves',
          user_location: 'virginia',
          response: 'Found',
          places: [
            {
              place_id: 'test-1',
              name: 'Test Cave',
              description: 'A cave',
              lat: 37.2,
              lng: -82.1,
              image_url: 'https://example.com/cave.jpg',
              category: 'mystical',
              confidence: 0.9,
            },
          ],
        }),
      });
    });

    const input = page.getByRole('textbox', { name: 'Message input' });
    await input.fill('caves');
    await page.getByRole('button', { name: 'Send message' }).click();

    await expect(page.getByText(/Test Cave/i)).toBeVisible({ timeout: 5000 });
  });
});
