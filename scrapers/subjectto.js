/**
 * Subject-To Scraper Module
 *
 * Subject-to / creative-finance leads are mostly forum- and community-sourced,
 * so there is no single canonical listing site. This scraper does a generic,
 * best-effort card extraction against whatever URL is supplied and returns []
 * rather than throwing when nothing matches — CSV import and manual entry are
 * the reliable population paths for this category.
 */
export async function scrapeSubjectTo(context, targetUrl) {
  if (!targetUrl) {
    console.log('[Subject-To Scraper] No URL supplied; nothing to scrape. Returning empty result set.');
    return [];
  }

  let page;
  try {
    page = await context.newPage();

    await page.setExtraHTTPHeaders({
      'accept-language': 'en-US,en;q=0.9',
      'sec-ch-ua': '"Not A;Brand";v="99", "Chromium";v="122"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
    });

    console.log(`[Subject-To Scraper] Navigating to: ${targetUrl}`);
    const resp = await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(2500);

    // Detect anti-bot blocks so the readout reports WHY instead of "0 saved"
    const __title = await page.title();
    const __body = await page.evaluate(() => document.body?.innerText || '').catch(() => '');
    if ((resp && resp.status() === 403) || /access denied|blocked|captcha|just a moment|403/i.test(__title + ' ' + __body)) {
      throw new Error('Subject-to listing source is currently unavailable from this network (the site blocks automated access). Please try again later.');
    }

    await page.waitForSelector('[class*="listing"], [class*="card"], [class*="post"], article, a[href*="/property"]', { timeout: 15000 }).catch(() => {
      console.log('[Subject-To Scraper] Listing selector not found. Parsing body directly.');
    });

    const listings = await page.evaluate(() => {
      const items = [];
      let cards = Array.from(document.querySelectorAll('[class*="listing-card"], [class*="property-card"], [class*="post"], article'));

      if (cards.length === 0) {
        cards = Array.from(document.querySelectorAll('a[href*="/property"], a[href*="/listing"]'));
      }

      cards.forEach((card) => {
        try {
          let title = '';
          let url = '';
          let price = '';
          let location = '';

          if (card.tagName.toLowerCase() === 'a') {
            url = card.href || '';
            title = (card.innerText || card.title || '').trim();
          } else {
            const priceEl = card.querySelector('[class*="price"], [class*="Price"]');
            if (priceEl) price = priceEl.textContent.trim();

            const addressEl = card.querySelector('[class*="address"], [class*="Address"], [class*="location"]');
            if (addressEl) {
              location = addressEl.textContent.trim();
              title = location;
            }

            const link = card.querySelector('a');
            if (link) url = link.href || '';
            if (!title && link) title = (link.innerText || link.title || '').trim();
          }

          if (title && url) {
            items.push({ title, address: location || title, price, location, url });
          }
        } catch (err) {
          // Skip individual card failures
        }
      });

      return items;
    });

    console.log(`[Subject-To Scraper] Extracted ${listings.length} listings.`);
    return listings;
  } catch (err) {
    if (err && err.message && err.message.includes('unavailable')) throw err;
    console.error(`[Subject-To Scraper] Failed: ${err.message}. Returning empty result set.`);
    return [];
  } finally {
    if (page) await page.close().catch(() => {});
  }
}
