/**
 * Craigslist Scraper Module
 */
export async function scrapeCraigslist(context, targetUrl) {
  const page = await context.newPage();
  
  // Set real-user request headers
  await page.setExtraHTTPHeaders({
    'accept-language': 'en-US,en;q=0.9',
    'sec-ch-ua': '"Not A;Brand";v="99", "Chromium";v="122"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
  });

  // Default fallback if no URL is provided
  const url = targetUrl || 'https://newyork.craigslist.org/search/apt';
  
  console.log(`[Craigslist Scraper] Navigating to: ${url}`);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

  console.log('[Craigslist Scraper] Waiting for listing elements...');
  // Wait for the main result list or fallback cards
  await page.waitForSelector('.cl-search-result, li.result-row, .gallery-card, .cl-static-search-result, a[href*="/apa/"]', { timeout: 15000 }).catch(() => {
    console.log('[Craigslist Scraper] Search listings selector not found. Attempting to parse body directly.');
  });

  // Extract items using robust selector checks
  const listings = await page.evaluate(() => {
    const items = [];
    
    // Selectors can vary based on Craigslist's web layout updates (modern vs classic vs static view)
    let cards = Array.from(document.querySelectorAll('.cl-search-result, li.result-row, .gallery-card, .cl-static-search-result, .cl-results-page-card'));
    
    // Fallback: broaden search to extract raw link items directly
    if (cards.length === 0) {
      cards = Array.from(document.querySelectorAll('a[href*="/apa/"], a[href*="/sub/"], a[href*="/hsh/"], a[href*="/vac/"], a[href*="/hou/"]'));
    }

    cards.forEach((card) => {
      try {
        let title = '';
        let url = '';
        let price = '';
        let location = '';
        let date = '';

        if (card.tagName.toLowerCase() === 'a') {
          // If the selector returned raw anchor elements
          url = card.href || '';
          title = card.innerText || card.title || '';
          
          const parent = card.parentElement;
          if (parent) {
            const priceEl = parent.querySelector('.price, .label-price, .priceinfo');
            if (priceEl) price = priceEl.textContent.trim();
            const locEl = parent.querySelector('.location, .meta, .result-hood');
            if (locEl) location = locEl.textContent.trim().replace(/[()]/g, '');
          }
        } else {
          // Standard card selectors
          const priceEl = card.querySelector('.priceinfo, .price, .label-price');
          if (priceEl) price = priceEl.textContent.trim();

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

          const locationEl = card.querySelector('.location, .meta, .result-hood');
          if (locationEl) {
            location = locationEl.textContent.trim().replace(/[()]/g, '');
          }

          const dateEl = card.querySelector('time, .date, .meta-datetime');
          if (dateEl) {
            date = dateEl.dateTime || dateEl.textContent.trim();
          }
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
        // Skip individual card failures
      }
    });

    return items;
  });

  console.log(`[Craigslist Scraper] Extracted ${listings.length} listings.`);
  return listings;
}
