import { test, expect } from '@playwright/test';

test('home page renders and debug panel toggles', async ({ page }) => {
  await page.goto('/');
  const banner = page.getByRole('banner');
  await expect(banner.getByText('Underfoot')).toBeVisible();
  await expect(banner.getByText('Underground travel planner — find the secret stuff.')).toBeVisible();

  await page.getByRole('button', { name: 'Debug View' }).click();
  await expect(page.getByRole('heading', { name: 'Debug View' })).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByRole('heading', { name: 'Debug View' })).toHaveCount(0);
});

test('chat input sends and shows user message', async ({ page }) => {
  await page.goto('/');

  const input = page.getByLabel('Message Underfoot');
  await input.fill('Pikeville KY, outdoors, 15 miles');
  await page.getByRole('button', { name: 'Send' }).click();

  await expect(page.getByRole('article', { name: 'Your message' }).last()).toContainText('Pikeville, KY');
});
