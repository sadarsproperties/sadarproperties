/**
 * FSBO (For Sale By Owner) Scraper Module
 *
 * Best-effort: returns [] rather than throwing when selectors or anti-bot
 * measures fail, so runScrapeTask reports 0 saved instead of crashing.
 */
export async function scrapeFSBO(context, targetUrl) {
  const url = targetUrl || 'https://www.forsalebyowner.com/search/list';
  let page;
  try {
    page = await context.newPage();

    await page.setExtraHTTPHeaders({
      'accept-language': 'en-US,en;q=0.9',
      'sec-ch-ua': '"Not A;Brand";v="99", "Chromium";v="122"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
    });

    console.log(`[FSBO Scraper] Navigating to: ${url}`);
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(4000);

    // Detect anti-bot blocks so the readout reports WHY instead of "0 saved"
    const title = await page.title();
    const bodyText = await page.evaluate(() => document.body?.innerText || '').catch(() => '');
    if ((resp && resp.status() === 403) || /access denied|blocked|captcha|just a moment|403/i.test(title + ' ' + bodyText)) {
      throw new Error(
        'FSBO is currently unavailable from this network (the site blocks automated access). Please try again later.'
      );
    }

    await page.waitForSelector('[class*="listing"], [class*="card"], article, a[href*="/listing/"], a[href*="/home/"]', { timeout: 15000 }).catch(() => {
      console.log('[FSBO Scraper] Listing selector not found. Parsing body directly.');
    });

    const listings = await page.evaluate(() => {
      const items = [];
      let cards = Array.from(document.querySelectorAll('[class*="listing-card"], [class*="ListingCard"], article[class*="listing"], [data-testid*="listing"]'));

      if (cards.length === 0) {
        cards = Array.from(document.querySelectorAll('a[href*="/listing/"], a[href*="/home/"]'));
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
            const parent = card.parentElement;
            if (parent) {
              const priceEl = parent.querySelector('[class*="price"], [class*="Price"]');
              if (priceEl) price = priceEl.textContent.trim();
              const locEl = parent.querySelector('[class*="address"], [class*="location"], [class*="Address"]');
              if (locEl) location = locEl.textContent.trim();
            }
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

    console.log(`[FSBO Scraper] Extracted ${listings.length} listings.`);
    return listings;
  } catch (err) {
    console.error(`[FSBO Scraper] Failed: ${err.message}. Returning empty result set.`);
    return [];
  } finally {
    if (page) await page.close().catch(() => {});
  }
}
