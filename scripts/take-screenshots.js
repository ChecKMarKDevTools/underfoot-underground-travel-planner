import { chromium } from '@playwright/test';
import { promises as fs } from 'fs';
import path from 'path';

const SCREENSHOTS_DIR = path.resolve('./docs/user-guide/screenshots');
const BASE_URL = 'http://localhost:5174/labs/underfoot/';

async function ensureDir(dir) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
  }
}

async function takeScreenshots() {
  // Ensure screenshots directory exists
  await ensureDir(SCREENSHOTS_DIR);
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1200, height: 800 }
  });
  const page = await context.newPage();

  try {
    console.log('Taking screenshots...');
    
    // 1. Landing page
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ 
      path: path.join(SCREENSHOTS_DIR, '01-landing-page.png'),
      fullPage: true 
    });
    console.log('✓ Landing page screenshot taken');

    // 2. Chat interface - focus on input
    await page.getByLabel('Message Underfoot').click();
    await page.screenshot({ 
      path: path.join(SCREENSHOTS_DIR, '02-chat-input-focused.png'),
      fullPage: true 
    });
    console.log('✓ Chat input focused screenshot taken');

    // 3. Chat with user message
    await page.getByLabel('Message Underfoot').fill('Pikeville KY, outdoors, hiking trails');
    await page.screenshot({ 
      path: path.join(SCREENSHOTS_DIR, '03-chat-input-filled.png'),
      fullPage: true 
    });
    console.log('✓ Chat input filled screenshot taken');

    // Send message and wait for response (using mock data)
    await page.route('**/underfoot/chat*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          response: "Great choice! I found some amazing underground gems around Pikeville. Here are some lesser-known outdoor spots perfect for hiking and exploring:",
          items: [
            {
              id: "1",
              title: "Bad Branch Falls Trail",
              description: "A hidden waterfall trail that most tourists miss. Features a stunning 60-foot cascade tucked away in a quiet gorge.",
              rating: 4.8,
              source: "Local hiking forum",
              imageUrl: "https://picsum.photos/300/200?random=1",
              url: "https://example.com/bad-branch-falls"
            },
            {
              id: "2", 
              title: "Breaks Interstate Park - Hidden Overlooks",
              description: "Secret viewpoints beyond the main tourist areas with incredible canyon views and minimal crowds.",
              rating: 4.6,
              source: "Regional outdoor blog",
              imageUrl: "https://picsum.photos/300/200?random=2", 
              url: "https://example.com/breaks-hidden"
            },
            {
              id: "3",
              title: "Pine Mountain Trail (Local Section)",
              description: "A lesser-traveled portion of the Pine Mountain Trail with old-growth forest and wildlife viewing opportunities.",
              rating: 4.7,
              source: "Hiking community",
              imageUrl: "https://picsum.photos/300/200?random=3",
              url: "https://example.com/pine-mountain-local"
            }
          ],
          debug: {
            requestId: "uf_demo_123",
            executionTimeMs: 1234,
            upstream: { status: 200, candidateCount: 5 },
            cache: { hit: false }
          }
        })
      });
    });

    await page.getByRole('button', { name: 'Send' }).click();
    
    // Wait for the mock response to be processed
    await page.waitForSelector('[role="article"]', { timeout: 5000 });
    await page.waitForTimeout(1000); // Allow time for UI to settle

    await page.screenshot({ 
      path: path.join(SCREENSHOTS_DIR, '04-chat-with-results.png'),
      fullPage: true 
    });
    console.log('✓ Chat with results screenshot taken');

    // 4. Debug view open
    await page.getByRole('button', { name: 'Debug View' }).click();
    await page.waitForSelector('[role="heading"][name="Debug View"]');
    await page.screenshot({ 
      path: path.join(SCREENSHOTS_DIR, '05-debug-view-open.png'),
      fullPage: true 
    });
    console.log('✓ Debug view open screenshot taken');

    // 5. Focus on result cards
    await page.getByRole('button', { name: 'Close' }).click();
    await page.waitForTimeout(500);
    
    // Scroll to show result cards
    const firstCard = page.locator('.result-card, [data-testid="result-card"]').first();
    if (await firstCard.count() > 0) {
      await firstCard.scrollIntoViewIfNeeded();
    }
    
    await page.screenshot({ 
      path: path.join(SCREENSHOTS_DIR, '06-result-cards-detail.png'),
      fullPage: true 
    });
    console.log('✓ Result cards detail screenshot taken');

    // 6. Mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.screenshot({ 
      path: path.join(SCREENSHOTS_DIR, '07-mobile-view.png'),
      fullPage: true 
    });
    console.log('✓ Mobile view screenshot taken');

  } catch (error) {
    console.error('Error taking screenshots:', error);
  } finally {
    await browser.close();
  }
}

// Run if called directly
if (import.meta.url === new URL(process.argv[1], 'file://').href) {
  takeScreenshots().catch(console.error);
}

export { takeScreenshots };