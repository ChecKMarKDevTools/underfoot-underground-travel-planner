const { chromium } = require('playwright');

(async () => {
  // Use your WSS endpoint
  const browser = await chromium.connectOverCDP(
    'wss://brd-customer-hl_eecaf1e0-zone-scraping_browser1:bhpwttf8j7kz@brd.superproxy.io:9222',
  );
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('https://example.com');
  const title = await page.title();
  console.log('Page title:', title);

  await browser.close();
})();
