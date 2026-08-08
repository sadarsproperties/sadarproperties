import fs from 'fs';
import { CONFIG } from '../config.js';

/**
 * BatchLeads Scraper Module
 * Note: BatchLeads is a login-walled, premium real estate platform.
 * Running in headed mode by default to ensure cookies can be saved safely.
 */
export async function scrapeBatchLeads(context, targetUrl) {
  const page = await context.newPage();
  const cookiesPath = CONFIG.batchLeads.cookiesPath;

  // Load cookies if available
  if (fs.existsSync(cookiesPath)) {
    console.log('[BatchLeads Scraper] Loading saved cookies...');
    try {
      const cookies = JSON.parse(fs.readFileSync(cookiesPath, 'utf-8'));
      await context.addCookies(cookies);
    } catch (e) {
      console.error('[BatchLeads Scraper] Error loading cookies.', e);
    }
  }

  const appUrl = targetUrl || 'https://app.batchleads.io/';
  console.log(`[BatchLeads Scraper] Navigating to: ${appUrl}`);
  
  await page.goto(appUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

  // Detect if login is required
  const needsLogin = page.url().includes('auth.batchleads.io') || 
                     await page.evaluate(() => !!document.querySelector('input[type="password"]'));

  if (needsLogin) {
    console.log('[BatchLeads Scraper] Session expired or not logged in.');

    if (CONFIG.batchLeads.email && CONFIG.batchLeads.password) {
      console.log('[BatchLeads Scraper] Attempting automated login...');
      try {
        await page.fill('input[type="email"]', CONFIG.batchLeads.email);
        await page.fill('input[type="password"]', CONFIG.batchLeads.password);
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 });
      } catch (err) {
        console.warn('[BatchLeads Scraper] Automated login failed. Please complete login manually.');
      }
    } else {
      console.log('[BatchLeads Scraper] No BATCHLEADS_EMAIL/PASSWORD set. Please log in manually.');
    }

    // Fast-fail in headless mode: no human is available to complete the login,
    // so waiting for manual verification is just a wasted 3 minutes.
    const stillOnLogin =
      page.url().includes('auth.batchleads.io') ||
      (await page.evaluate(() => !!document.querySelector('input[type="password"]')).catch(() => true));
    if (process.env.SCRAPER_HEADLESS === 'true' && stillOnLogin) {
      throw new Error(
        'BatchLeads login failed. Check your credentials and try again.'
      );
    }

    // Wait for manual login to finish (headed mode only)
    console.log('[BatchLeads Scraper] Waiting for user to complete login (up to 3 minutes)...');
    await page.waitForURL('**/app.batchleads.io/**', { timeout: 180000 }).catch(() => {
      console.warn('[BatchLeads Scraper] Login timeout. Proceeding...');
    });

    // Save session cookies
    console.log('[BatchLeads Scraper] Saving cookies...');
    const cookies = await context.cookies();
    fs.writeFileSync(cookiesPath, JSON.stringify(cookies, null, 2), 'utf-8');
  }

  console.log('[BatchLeads Scraper] Successfully logged into BatchLeads.');
  console.log('[BatchLeads Scraper] Pausing for 15 seconds to let dashboard render...');
  await page.waitForTimeout(15000);

  // Selector extraction placeholder
  const properties = await page.evaluate(() => {
    const list = [];
    // BatchLeads uses modern SPA frameworks (Angular/React) with tables/grids
    const rows = document.querySelectorAll('tr, .v-data-table__wrapper tr, [role="row"]');
    
    rows.forEach(row => {
      try {
        const cells = Array.from(row.querySelectorAll('td, [role="gridcell"]'))
                           .map(c => c.textContent.trim())
                           .filter(Boolean);
        
        if (cells.length > 2) {
          list.push({
            address: cells[0] || '',
            owner: cells[1] || '',
            status: cells[2] || '',
            details: cells.slice(3).join(' | ')
          });
        }
      } catch (err) {
        // Skip individual row errors
      }
    });

    return list;
  });

  console.log(`[BatchLeads Scraper] Extracted ${properties.length} potential listings.`);
  return properties;
}
