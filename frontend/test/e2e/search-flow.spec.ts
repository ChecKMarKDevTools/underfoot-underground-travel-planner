import { test, expect } from '@playwright/test';

test.describe('Search Flow E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Underfoot/);
  });

  test('should complete successful search flow with results', async ({ page }) => {
    const input = page.getByRole('textbox', { name: 'Message input' });
    await input.fill('underground halloween events near grundy va');

    const sendButton = page.getByRole('button', { name: 'Send message' });
    await sendButton.click();

    await expect(page.getByText('underground halloween events near grundy va')).toBeVisible();

    await expect(page.locator('text=/Found \\d+ location|No locations found/i')).toBeVisible({
      timeout: 15000,
    });

    const map = page.getByRole('region', { name: /map/ });
    await expect(map).toBeVisible();
  });

  test('should handle empty search gracefully', async ({ page }) => {
    const sendButton = page.getByRole('button', { name: 'Send message' });
    await expect(sendButton).toBeDisabled();
  });

  test('should display loading state during search', async ({ page }) => {
    const input = page.getByRole('textbox', { name: 'Message input' });
    await input.fill('haunted mines appalachia');

    const sendButton = page.getByRole('button', { name: 'Send message' });
    await sendButton.click();

    await expect(sendButton).toBeDisabled();

    await expect(page.locator('text=/Found \\d+ location|No locations found/i')).toBeVisible({
      timeout: 15000,
    });

    await expect(sendButton).not.toBeDisabled();
  });

  test('should handle multiple consecutive searches', async ({ page }) => {
    const input = page.getByRole('textbox', { name: 'Message input' });

    await input.fill('caves near grundy');
    await page.getByRole('button', { name: 'Send message' }).click();
    await expect(page.getByText('caves near grundy')).toBeVisible();

    await input.fill('underground tours virginia');
    await page.getByRole('button', { name: 'Send message' }).click();
    await expect(page.getByText('underground tours virginia')).toBeVisible();

    const messages = page.locator('[role="article"]');
    await expect(messages).toHaveCount(4);
  });

  test('should clear input after sending message', async ({ page }) => {
    const input = page.getByRole('textbox', { name: 'Message input' });
    await input.fill('test query');

    await page.getByRole('button', { name: 'Send message' }).click();

    await expect(input).toHaveValue('');
  });

  test('should allow sending message with Enter key', async ({ page }) => {
    const input = page.getByRole('textbox', { name: 'Message input' });
    await input.fill('test query');

    await input.press('Enter');

    await expect(page.getByText('test query')).toBeVisible();
    await expect(input).toHaveValue('');
  });

  test('should not send message with Shift+Enter', async ({ page }) => {
    const input = page.getByRole('textbox', { name: 'Message input' });
    await input.fill('line 1');

    await input.press('Shift+Enter');

    await expect(page.getByText(/^line 1$/)).not.toBeVisible();
  });

  test('should display search results with place information', async ({ page }) => {
    const input = page.getByRole('textbox', { name: 'Message input' });
    await input.fill('underground events grundy va');

    await page.getByRole('button', { name: 'Send message' }).click();

    await expect(page.locator('text=/Found \\d+ location/i')).toBeVisible({ timeout: 15000 });

    await expect(page.locator('button[aria-label*="Select"]').first()).toBeVisible({
      timeout: 5000,
    });
  });
});
