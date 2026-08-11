/**
 * Realtor Directory Scraper Module
 *
 * Best-effort agent-directory extraction (Realtor.com / Zillow agent finder /
 * brokerage sites). Anti-bot measures make these unreliable, so this returns []
 * rather than throwing — CSV import is the reliable population path for realtors.
 */
export async function scrapeRealtors(context, targetUrl) {
  if (!targetUrl) {
    console.log('[Realtor Directory Scraper] No URL supplied; nothing to scrape. Returning empty result set.');
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

    console.log(`[Realtor Directory Scraper] Navigating to: ${targetUrl}`);
    const resp = await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(2500);

    // Detect anti-bot blocks so the readout reports WHY instead of "0 saved"
    const __title = await page.title();
    if ((resp && resp.status() === 403) || /access denied|blocked|forbidden|captcha|just a moment/i.test(__title)) {
      throw new Error('Realtor.com directory is currently unavailable from this network (the site blocks automated access). Please try again later.');
    }

    await page.waitForSelector('[class*="agent"], [class*="Agent"], [class*="card"], [itemprop="realEstateAgent"]', { timeout: 15000 }).catch(() => {
      console.log('[Realtor Directory Scraper] Agent selector not found. Parsing body directly.');
    });

    const agents = await page.evaluate(() => {
      const items = [];
      const cards = Array.from(document.querySelectorAll('[class*="agent-card"], [class*="AgentCard"], [class*="agent-list"], [itemprop="realEstateAgent"], [data-testid*="agent"]'));

      cards.forEach((card) => {
        try {
          const nameEl = card.querySelector('[class*="name"], [itemprop="name"], h2, h3, a');
          const name = nameEl ? nameEl.textContent.trim() : '';

          const brokerageEl = card.querySelector('[class*="broker"], [class*="office"], [class*="company"]');
          const brokerage = brokerageEl ? brokerageEl.textContent.trim() : '';

          const phoneEl = card.querySelector('[href^="tel:"], [class*="phone"]');
          const phone = phoneEl ? (phoneEl.getAttribute('href') || phoneEl.textContent).replace('tel:', '').trim() : '';

          const emailEl = card.querySelector('[href^="mailto:"]');
          const email = emailEl ? emailEl.getAttribute('href').replace('mailto:', '').trim() : '';

          const linkEl = card.querySelector('a');
          const url = linkEl ? linkEl.href : '';

          if (name) {
            items.push({ name, brokerage, phone, email, url });
          }
        } catch (err) {
          // Skip individual card failures
        }
      });

      return items;
    });

    console.log(`[Realtor Directory Scraper] Extracted ${agents.length} agents.`);
    return agents;
  } catch (err) {
    if (targetUrl.includes('realtor.com')) {
      console.warn(`[Realtor Directory Scraper] Realtor.com failed/blocked: ${err.message}. Trying Yellowpages fallback...`);
      try {
        const match = targetUrl.match(/realtor-directory\/([^_]+)_([A-Za-z]{2})/);
        if (match) {
          const city = decodeURIComponent(match[1]);
          const state = match[2].toUpperCase();
          const fallbackUrl = `https://www.yellowpages.com/search?q=realtors&l=${encodeURIComponent(city)}%2C+${encodeURIComponent(state)}`;
          console.log(`[Realtor Directory Scraper] Navigating to fallback Yellowpages URL: ${fallbackUrl}`);
          
          const { scrapeTitleCompanies } = await import('./titleDirectory.js');
          const fallbackResults = await scrapeTitleCompanies(context, fallbackUrl);
          
          const mapped = fallbackResults.map(item => {
            let name = item.contactName || item.companyName;
            let brokerage = item.contactName ? item.companyName : 'Independent / General';
            return {
              name,
              brokerage,
              phone: item.phone,
              email: item.email,
              url: item.url,
              city: item.city || city,
              state: item.state || state
            };
          });
          
          console.log(`[Realtor Directory Scraper] Yellowpages fallback successfully extracted ${mapped.length} realtors.`);
          return mapped;
        }
      } catch (fallbackErr) {
        console.error(`[Realtor Directory Scraper] Yellowpages fallback failed:`, fallbackErr.message);
      }
    }

    console.error(`[Realtor Directory Scraper] Failed: ${err.message}. Returning empty result set.`);
    return [];
  } finally {
    if (page) await page.close().catch(() => {});
  }
}
