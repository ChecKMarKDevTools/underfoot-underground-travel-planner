import { test, expect } from '@playwright/test';

test.describe('Underfoot Chat Application', () => {
  test('should load the application', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Underfoot/);
    await expect(page.getByRole('heading', { name: 'Underfoot' })).toBeVisible();
  });

  test('should display Stonewalker welcome message', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Stonewalker Oracle' })).toBeVisible();
    await expect(page.getByText(/I am Stonewalker/)).toBeVisible();
  });

  test('should send a message and receive response', async ({ page }) => {
    await page.goto('/');

    const input = page.getByRole('textbox', { name: 'Message input' });
    await input.fill('Ancient ruins near London');

    const sendButton = page.getByRole('button', { name: 'Send message' });
    await sendButton.click();

    await expect(page.getByText('Ancient ruins near London')).toBeVisible();

    // Wait for assistant response (should contain "locations detected" or be one of the random responses)
    await expect(
      page.locator(
        'text=/locations detected|pulse with unusual energy|forgotten pathways|Ancient algorithms|nexus points|Quantum traces/i',
      ),
    ).toBeVisible({ timeout: 10000 });
  });

  test('should toggle theme', async ({ page }) => {
    await page.goto('/');

    const themeButton = page.getByRole('button', { name: /Switch to/ });
    await themeButton.click();

    const html = page.locator('html');
    const hasDarkClass = await html.evaluate((el) => el.classList.contains('dark'));
    expect(hasDarkClass).toBeTruthy();
  });

  test('should toggle debug panel', async ({ page }) => {
    await page.goto('/');

    const debugButton = page.getByRole('button', { name: /debug mode/ });
    await debugButton.click();

    await expect(page.getByText('AI Debug Console')).toBeVisible();
  });

  test('should display map', async ({ page }) => {
    await page.goto('/');

    const map = page.getByRole('region', { name: /map/ });
    await expect(map).toBeVisible();
    await expect(page.getByText('Leaflet')).toBeVisible();
  });
});
