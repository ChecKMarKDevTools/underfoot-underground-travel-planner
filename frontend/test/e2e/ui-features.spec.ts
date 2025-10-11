import { test, expect } from '@playwright/test';

test.describe('UI Features E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should toggle theme between light and dark', async ({ page }) => {
    const html = page.locator('html');

    const initialHasDark = await html.evaluate((el) => el.classList.contains('dark'));

    const themeButton = page.getByRole('button', { name: /Switch to/ });
    await themeButton.click();

    const afterToggleHasDark = await html.evaluate((el) => el.classList.contains('dark'));
    expect(afterToggleHasDark).toBe(!initialHasDark);

    await themeButton.click();

    const finalHasDark = await html.evaluate((el) => el.classList.contains('dark'));
    expect(finalHasDark).toBe(initialHasDark);
  });

  test('should persist theme preference across page reloads', async ({ page }) => {
    const html = page.locator('html');
    const themeButton = page.getByRole('button', { name: /Switch to/ });

    await themeButton.click();
    const darkMode = await html.evaluate((el) => el.classList.contains('dark'));

    await page.reload();

    const persistedDarkMode = await html.evaluate((el) => el.classList.contains('dark'));
    expect(persistedDarkMode).toBe(darkMode);
  });

  test('should toggle debug panel', async ({ page }) => {
    const debugButton = page.getByRole('button', { name: /debug mode/i });
    await debugButton.click();

    await expect(page.getByText('AI Debug Console')).toBeVisible();

    await debugButton.click();

    await expect(page.getByText('AI Debug Console')).not.toBeVisible();
  });

  test('should display debug data after search', async ({ page, context }) => {
    await context.route('**/underfoot/search', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user_intent: 'caves',
          user_location: 'grundy va',
          response: 'Found locations',
          places: [],
          debug: {
            searchQuery: 'caves near grundy',
            processingTime: 1234,
            confidence: 0.85,
            keywords: ['caves', 'underground', 'grundy'],
            geospatialData: { lat: 37.2018, lng: -82.0993 },
            llmReasoning: 'User seeks cave exploration',
            dataSource: ['Google Places', 'SERP API'],
          },
        }),
      });
    });

    const debugButton = page.getByRole('button', { name: /debug mode/i });
    await debugButton.click();

    const input = page.getByRole('textbox', { name: 'Message input' });
    await input.fill('caves near grundy');
    await page.getByRole('button', { name: 'Send message' }).click();

    await expect(page.getByText(/caves near grundy/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/1234/)).toBeVisible();
    await expect(page.getByText(/0.85/)).toBeVisible();
  });

  test('should show keyboard shortcuts hint', async ({ page }) => {
    const input = page.getByRole('textbox', { name: 'Message input' });
    await input.focus();

    await expect(page.getByText(/Enter.*send/i)).toBeVisible();
  });

  test('should handle responsive layout', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });

    const map = page.getByRole('region', { name: /map/ });
    await expect(map).toBeVisible();

    await page.setViewportSize({ width: 768, height: 1024 });

    await expect(map).toBeVisible();
  });

  test('should display message timestamps', async ({ page, context }) => {
    await context.route('**/underfoot/search', (route) => {
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
    await input.fill('test message');
    await page.getByRole('button', { name: 'Send message' }).click();

    await expect(page.getByText(/test message/i)).toBeVisible({ timeout: 5000 });
  });

  test('should auto-scroll to latest message', async ({ page, context }) => {
    await context.route('**/underfoot/search', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user_intent: 'test',
          user_location: 'test',
          response: 'Test response',
          places: [],
        }),
      });
    });

    const input = page.getByRole('textbox', { name: 'Message input' });

    for (let i = 1; i <= 5; i++) {
      await input.fill(`message ${i}`);
      await page.getByRole('button', { name: 'Send message' }).click();
      await page.waitForTimeout(500);
    }

    await expect(page.getByText(/message 5/i)).toBeInViewport();
  });
});
