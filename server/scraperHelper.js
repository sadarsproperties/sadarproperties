/**
 * Hybrid Scraper: Playwright (renders JS-heavy content) + Cheerio (efficient server-side DOM parsing)
 */
export async function scrapeWithCheerio(context, url, selectorMapping = {}) {
  const page = await context.newPage();
  console.log(`[Hybrid Scraper] Navigating to: ${url}`);
  
  // Set headers to prevent simple bot blocks
  await page.setExtraHTTPHeaders({
    'accept-language': 'en-US,en;q=0.9',
  });

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    // Wait for the main item selector to render if provided
    if (selectorMapping.itemSelector) {
      await page.waitForSelector(selectorMapping.itemSelector, { timeout: 15000 }).catch(() => {
        console.warn(`[Hybrid Scraper] itemSelector "${selectorMapping.itemSelector}" not found in initial load.`);
      });
    }
    
    const html = await page.content();
    await page.close();

    console.log('[Hybrid Scraper] Extracting DOM elements using Cheerio...');
    const cheerio = await import('cheerio');
    const $ = cheerio.load(html);
    const results = [];

    if (selectorMapping.itemSelector) {
      $(selectorMapping.itemSelector).each((i, el) => {
        try {
          const item = {};
          Object.entries(selectorMapping.fields || {}).forEach(([field, selector]) => {
            const elFound = $(el).find(selector);
            // If it's a link, capture href, otherwise text
            if (selector.includes('a') || selector === 'a') {
              item[field] = elFound.attr('href') || elFound.text().trim();
            } else {
              item[field] = elFound.text().trim();
            }
          });
          results.push(item);
        } catch (cardErr) {
          // Skip malformed cards
        }
      });
    }

    console.log(`[Hybrid Scraper] Extracted ${results.length} records.`);
    return results;
  } catch (err) {
    console.warn('[Hybrid Scraper] Cheerio parsing failed or not installed. Falling back to page-context evaluation...', err.message);
    
    // Fallback: evaluate inside page directly if cheerio is not installed offline
    try {
      const pageFallback = await context.newPage();
      await pageFallback.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      const results = await pageFallback.evaluate((mapping) => {
        if (!mapping.itemSelector) return [];
        const cards = document.querySelectorAll(mapping.itemSelector);
        const items = [];
        cards.forEach(card => {
          const item = {};
          Object.entries(mapping.fields || {}).forEach(([field, selector]) => {
            const el = card.querySelector(selector);
            if (el) {
              item[field] = el.tagName === 'A' ? el.href : el.textContent.trim();
            } else {
              item[field] = '';
            }
          });
          items.push(item);
        });
        return items;
      }, selectorMapping);
      await pageFallback.close();
      return results;
    } catch (fallbackErr) {
      console.error('[Hybrid Scraper] Fallback parsing also failed:', fallbackErr);
      return [];
    }
  }
}
