import fs from 'fs';
import { CONFIG } from '../config.js';

/**
 * Facebook Scraper Module
 * Automatically handles login sessions using local cookie storage to avoid repeated logins.
 */
export async function scrapeFacebook(context, targetUrl) {
  const page = await context.newPage();
  const cookiesPath = CONFIG.facebook.cookiesPath;

  // Try loading existing cookies to reuse session
  if (fs.existsSync(cookiesPath)) {
    console.log('[Facebook Scraper] Loading saved session cookies...');
    try {
      const cookies = JSON.parse(fs.readFileSync(cookiesPath, 'utf-8'));
      await context.addCookies(cookies);
    } catch (e) {
      console.error('[Facebook Scraper] Error loading cookies, running fresh session.', e);
    }
  }

  const url = targetUrl || 'https://www.facebook.com/marketplace/category/propertyrentals';
  console.log(`[Facebook Scraper] Navigating to: ${url}`);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

  // Check if we are prompted to log in
  const needsLogin = await page.evaluate(() => {
    return document.body.innerText.includes('Log In') && 
           (!!document.querySelector('input[name="email"]') || !!document.querySelector('[aria-label="Email or phone number"]'));
  });

  if (needsLogin) {
    console.log('[Facebook Scraper] Session expired or not logged in.');
    
    if (CONFIG.facebook.email && CONFIG.facebook.password) {
      console.log('[Facebook Scraper] Attempting automated login using credentials...');
      try {
        await page.fill('input[name="email"]', CONFIG.facebook.email);
        await page.fill('input[name="pass"]', CONFIG.facebook.password);
        await page.click('button[name="login"]');
        await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 });
      } catch (err) {
        console.warn('[Facebook Scraper] Auto login failed. Please login manually in the browser window.', err);
      }
    } else {
      console.log('[Facebook Scraper] No credentials provided in config. Please log in manually in the browser window.');
    }

    // Wait for the user to complete login and reach a logged-in page
    console.log('[Facebook Scraper] Waiting for user to complete login (up to 3 minutes)...');
    await page.waitForSelector('[aria-label="Account"], [aria-label="Facebook"], #mount_0_0_', { timeout: 180000 }).catch(() => {
      console.warn('[Facebook Scraper] Login timeout. Proceeding without active login verification...');
    });

    // Save session cookies for future runs
    console.log('[Facebook Scraper] Saving session cookies...');
    const cookies = await context.cookies();
    fs.writeFileSync(cookiesPath, JSON.stringify(cookies, null, 2), 'utf-8');
    
    // Return to the target URL if redirected
    if (!page.url().includes(url)) {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
    }
  }

  console.log('[Facebook Scraper] Scrolling to load dynamic items...');
  // Scroll down multiple times to load dynamic Marketplace cards
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => window.scrollBy(0, window.innerHeight * 2));
    await page.waitForTimeout(2000); // Wait for new items to render
  }

  // Extract Marketplace Items
  console.log('[Facebook Scraper] Extracting Marketplace items...');
  const items = await page.evaluate(() => {
    const list = [];
    // Marketplace items are usually stored inside structured divs with links
    const cards = document.querySelectorAll('div[style*="max-width"] a[href^="/marketplace/item/"]');
    
    cards.forEach(card => {
      try {
        const url = card.href || '';
        
        // Items typically contain image, price, title, and location/neighborhood text
        const textElements = Array.from(card.querySelectorAll('span')).map(span => span.textContent.trim()).filter(Boolean);
        
        if (textElements.length >= 2) {
          // Typically: [0] = Price, [1] = Title, [2] = Location (optional)
          const price = textElements[0];
          const title = textElements[1];
          const location = textElements[2] || '';
          
          list.push({
            title,
            price,
            location,
            url
          });
        }
      } catch (err) {
        // Skip card errors
      }
    });
    
    return list;
  });

  console.log(`[Facebook Scraper] Extracted ${items.length} items.`);
  return items;
}
