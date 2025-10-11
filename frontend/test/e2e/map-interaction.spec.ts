import { test, expect } from '@playwright/test';

test.describe('Map Interaction E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Underfoot/);
  });

  test('should display map on initial load', async ({ page }) => {
    const map = page.getByRole('region', { name: /map/ });
    await expect(map).toBeVisible();
  });

  test('should update map when search returns places', async ({ page, context }) => {
    await context.route('**/underfoot/search', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user_intent: 'caves',
          user_location: 'grundy va',
          response: 'Found locations',
          places: [
            {
              place_id: 'test-1',
              name: 'Test Cave',
              description: 'A test cave',
              lat: 37.2018,
              lng: -82.0993,
              category: 'mystical',
              confidence: 0.9,
            },
          ],
        }),
      });
    });

    const input = page.getByRole('textbox', { name: 'Message input' });
    await input.fill('caves near grundy');

    await page.getByRole('button', { name: 'Send message' }).click();

    await expect(page.getByText(/Found 1 location/i)).toBeVisible({ timeout: 5000 });

    const map = page.getByRole('region', { name: /map/ });
    await expect(map).toBeVisible();
  });

  test('should handle place selection from chat', async ({ page, context }) => {
    await context.route('**/underfoot/search', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user_intent: 'caves',
          user_location: 'grundy va',
          response: 'Found locations',
          places: [
            {
              place_id: 'test-1',
              name: 'Cave One',
              description: 'First cave',
              lat: 37.2018,
              lng: -82.0993,
              category: 'mystical',
              confidence: 0.9,
            },
            {
              place_id: 'test-2',
              name: 'Cave Two',
              description: 'Second cave',
              lat: 37.3018,
              lng: -82.1993,
              category: 'mystical',
              confidence: 0.8,
            },
          ],
        }),
      });
    });

    const input = page.getByRole('textbox', { name: 'Message input' });
    await input.fill('caves near grundy');
    await page.getByRole('button', { name: 'Send message' }).click();

    await expect(page.getByText(/Found 2 location/i)).toBeVisible({ timeout: 5000 });

    const placeCards = page.locator('button[aria-label*="Select"]');
    await expect(placeCards.first()).toBeVisible({ timeout: 5000 });

    await placeCards.first().click();

    const firstCard = placeCards.first();
    const classes = await firstCard.getAttribute('class');
    expect(classes).toContain('border-cyber-500');
  });

  test('should display multiple places on map', async ({ page, context }) => {
    await context.route('**/underfoot/search', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user_intent: 'caves',
          user_location: 'virginia',
          response: 'Found locations',
          places: [
            {
              place_id: 'cave-1',
              name: 'Cave Alpha',
              description: 'First cave',
              lat: 37.2018,
              lng: -82.0993,
              category: 'mystical',
              confidence: 0.9,
            },
            {
              place_id: 'cave-2',
              name: 'Cave Beta',
              description: 'Second cave',
              lat: 37.3018,
              lng: -82.1993,
              category: 'mystical',
              confidence: 0.8,
            },
            {
              place_id: 'cave-3',
              name: 'Cave Gamma',
              description: 'Third cave',
              lat: 37.4018,
              lng: -82.2993,
              category: 'mystical',
              confidence: 0.7,
            },
          ],
        }),
      });
    });

    const input = page.getByRole('textbox', { name: 'Message input' });
    await input.fill('caves in virginia');
    await page.getByRole('button', { name: 'Send message' }).click();

    await expect(page.getByText(/Found 3 location/i)).toBeVisible({ timeout: 5000 });

    const map = page.getByRole('region', { name: /map/ });
    await expect(map).toBeVisible();
  });

  test('should persist map state across multiple searches', async ({ page, context }) => {
    await context.route('**/underfoot/search', (route) => {
      const url = new URL(route.request().url());
      const body = route.request().postDataJSON();

      if (body.chat_input.includes('grundy')) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            user_intent: 'caves',
            user_location: 'grundy va',
            response: 'Found locations',
            places: [
              {
                place_id: 'grundy-1',
                name: 'Grundy Cave',
                description: 'Cave in Grundy',
                lat: 37.2018,
                lng: -82.0993,
                category: 'mystical',
                confidence: 0.9,
              },
            ],
          }),
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            user_intent: 'caves',
            user_location: 'virginia',
            response: 'Found locations',
            places: [
              {
                place_id: 'va-1',
                name: 'Virginia Cave',
                description: 'Cave in VA',
                lat: 38.0,
                lng: -79.0,
                category: 'mystical',
                confidence: 0.8,
              },
            ],
          }),
        });
      }
    });

    const input = page.getByRole('textbox', { name: 'Message input' });

    await input.fill('caves near grundy');
    await page.getByRole('button', { name: 'Send message' }).click();
    await expect(page.getByText(/Grundy Cave/i)).toBeVisible({ timeout: 5000 });

    await input.fill('caves in virginia');
    await page.getByRole('button', { name: 'Send message' }).click();
    await expect(page.getByText(/Virginia Cave/i)).toBeVisible({ timeout: 5000 });

    const map = page.getByRole('region', { name: /map/ });
    await expect(map).toBeVisible();
  });

  test('should handle map with no places gracefully', async ({ page, context }) => {
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
    await input.fill('nonexistent place');
    await page.getByRole('button', { name: 'Send message' }).click();

    await expect(page.getByText(/No locations found/i)).toBeVisible({ timeout: 5000 });

    const map = page.getByRole('region', { name: /map/ });
    await expect(map).toBeVisible();
  });
});
