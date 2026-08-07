/**
 * Auction Scraper Module (Auction.com / Hubzu / Xome style marketplaces)
 *
 * Best-effort: returns [] rather than throwing when selectors or anti-bot
 * measures fail, so runScrapeTask reports 0 saved instead of crashing.
 */
export async function scrapeAuction(context, targetUrl) {
  const url = targetUrl || 'https://www.auction.com/residential/';
  let page;
  try {
    page = await context.newPage();

    await page.setExtraHTTPHeaders({
      'accept-language': 'en-US,en;q=0.9',
      'sec-ch-ua': '"Not A;Brand";v="99", "Chromium";v="122"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
    });

    console.log(`[Auction Scraper] Navigating to: ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    await page.waitForSelector('[class*="asset"], [class*="property-card"], [class*="listing"], article, a[href*="/details/"]', { timeout: 15000 }).catch(() => {
      console.log('[Auction Scraper] Listing selector not found. Parsing body directly.');
    });

    const listings = await page.evaluate(() => {
      const items = [];
      let cards = Array.from(document.querySelectorAll('[class*="asset-card"], [class*="AssetCard"], [class*="property-card"], [data-elm-id*="asset"], [class*="listing-card"]'));

      if (cards.length === 0) {
        cards = Array.from(document.querySelectorAll('a[href*="/details/"], a[href*="/property/"]'));
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
              const priceEl = parent.querySelector('[class*="price"], [class*="bid"], [class*="Price"]');
              if (priceEl) price = priceEl.textContent.trim();
              const locEl = parent.querySelector('[class*="address"], [class*="location"], [class*="Address"]');
              if (locEl) location = locEl.textContent.trim();
            }
          } else {
            const priceEl = card.querySelector('[class*="price"], [class*="bid"], [class*="Price"]');
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
            items.push({ title, address: location || title, price, startingBid: price, location, url });
          }
        } catch (err) {
          // Skip individual card failures
        }
      });

      return items;
    });

    console.log(`[Auction Scraper] Extracted ${listings.length} listings.`);
    return listings;
  } catch (err) {
    console.error(`[Auction Scraper] Failed: ${err.message}. Returning empty result set.`);
    return [];
  } finally {
    if (page) await page.close().catch(() => {});
  }
}
