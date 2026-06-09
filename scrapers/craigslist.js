/**
 * Craigslist Scraper Module
 */
export async function scrapeCraigslist(context, targetUrl) {
  const page = await context.newPage();
  
  // Default fallback if no URL is provided
  const url = targetUrl || 'https://newyork.craigslist.org/search/apt';
  
  console.log(`[Craigslist Scraper] Navigating to: ${url}`);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

  console.log('[Craigslist Scraper] Waiting for listing elements...');
  // Wait for the main result list
  await page.waitForSelector('.cl-search-result, li.result-row, .gallery-card', { timeout: 15000 }).catch(() => {
    console.log('[Craigslist Scraper] Search listings selector not found. Attempting to parse body directly.');
  });

  // Extract items
  const listings = await page.evaluate(() => {
    const items = [];
    
    // Selectors can vary based on Craigslist's web layout updates (modern vs classic view)
    // Modern view uses .cl-search-result, classic uses li.result-row
    const cards = document.querySelectorAll('.cl-search-result, li.result-row, .gallery-card');
    
    cards.forEach((card) => {
      try {
        // Price
        let price = '';
        const priceEl = card.querySelector('.priceinfo, .price, .label-price');
        if (priceEl) price = priceEl.textContent.trim();

        // Title and Link
        let title = '';
        let url = '';
        const titleEl = card.querySelector('.titlestring, .result-title, a.posting-title');
        if (titleEl) {
          title = titleEl.textContent.trim();
          url = titleEl.href || '';
        } else {
          const mainLink = card.querySelector('a');
          if (mainLink) {
            title = mainLink.innerText || mainLink.title || '';
            url = mainLink.href || '';
          }
        }

        // Location / neighborhood
        let location = '';
        const locationEl = card.querySelector('.location, .meta, .result-hood');
        if (locationEl) {
          location = locationEl.textContent.trim().replace(/[()]/g, '');
        }

        // Posting date/time
        let date = '';
        const dateEl = card.querySelector('time, .date, .meta-datetime');
        if (dateEl) {
          date = dateEl.dateTime || dateEl.textContent.trim();
        }

        if (title && url) {
          items.push({
            title,
            price,
            location,
            url,
            date
          });
        }
      } catch (err) {
        // Suppress errors for single invalid cards
      }
    });

    return items;
  });

  console.log(`[Craigslist Scraper] Extracted ${listings.length} listings.`);
  return listings;
}
