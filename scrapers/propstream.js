import fs from 'fs';
import { CONFIG } from '../config.js';

/**
 * PropStream Scraper Module
 * Note: PropStream is a paid, login-walled application.
 * This script runs in headed mode by default to allow authentication and session saving.
 */
export async function scrapePropStream(context, targetUrl) {
  const page = await context.newPage();
  const cookiesPath = CONFIG.propStream.cookiesPath;

  // Load cookies if available
  if (fs.existsSync(cookiesPath)) {
    console.log('[PropStream Scraper] Loading saved cookies...');
    try {
      const cookies = JSON.parse(fs.readFileSync(cookiesPath, 'utf-8'));
      await context.addCookies(cookies);
    } catch (e) {
      console.error('[PropStream Scraper] Error loading cookies.', e);
    }
  }

  const loginUrl = 'https://login.propstream.com/';
  const appUrl = targetUrl || 'https://app.propstream.com/';

  console.log(`[PropStream Scraper] Navigating to: ${appUrl}`);
  await page.goto(appUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

  // Detect if login is required
  const needsLogin = page.url().includes('login.propstream.com') || 
                     await page.evaluate(() => !!document.querySelector('input[type="password"]'));

  if (needsLogin) {
    console.log('[PropStream Scraper] Session expired or not logged in.');

    if (CONFIG.propStream.email && CONFIG.propStream.password) {
      console.log('[PropStream Scraper] Attempting automated login...');
      try {
        await page.fill('input[name="username"], input[type="email"]', CONFIG.propStream.email);
        await page.fill('input[type="password"]', CONFIG.propStream.password);
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 });
      } catch (err) {
        console.warn('[PropStream Scraper] Automated login failed. Please complete login manually.');
      }
    } else {
      console.log('[PropStream Scraper] Please log in manually inside the browser.');
    }

    // Wait for manual login to finish
    console.log('[PropStream Scraper] Waiting for user to complete login (up to 3 minutes)...');
    await page.waitForURL('**/app.propstream.com/**', { timeout: 180000 }).catch(() => {
      console.warn('[PropStream Scraper] Login timeout. Proceeding...');
    });

    // Save session cookies
    console.log('[PropStream Scraper] Saving cookies...');
    const cookies = await context.cookies();
    fs.writeFileSync(cookiesPath, JSON.stringify(cookies, null, 2), 'utf-8');
  }

  console.log('[PropStream Scraper] Successfully logged into PropStream dashboard.');
  console.log('[PropStream Scraper] Pausing for 15 seconds to let dashboard render...');
  await page.waitForTimeout(15000);

  // PropStream tables are highly dynamic canvas or dynamic grids.
  // Below is a placeholder parser targeting standard listing grids.
  const properties = await page.evaluate(() => {
    const list = [];
    // Selectors vary widely by view (Search, My Properties, etc.)
    // We target generic grid-row or table-row containers.
    const rows = document.querySelectorAll('.grid-row, tr, [role="row"]');
    
    rows.forEach(row => {
      try {
        // Collect text values of all columns
        const cells = Array.from(row.querySelectorAll('.grid-cell, td, [role="gridcell"]'))
                           .map(c => c.textContent.trim())
                           .filter(Boolean);
        
        if (cells.length > 2) {
          list.push({
            address: cells[0] || '',
            owner: cells[1] || '',
            details: cells.slice(2).join(' | ')
          });
        }
      } catch (err) {
        // Skip individual row errors
      }
    });

    return list;
  });

  console.log(`[PropStream Scraper] Extracted ${properties.length} potential listings.`);
  return properties;
}
