/**
 * Title Company Directory Scraper Module
 *
 * Best-effort extraction from ALTA / county title-company directories. These
 * pages vary widely and often block automation, so this returns [] rather than
 * throwing — CSV import is the reliable population path for title companies.
 */
export async function scrapeTitleCompanies(context, targetUrl) {
  if (!targetUrl) {
    console.log('[Title Directory Scraper] No URL supplied; nothing to scrape. Returning empty result set.');
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

    console.log(`[Title Directory Scraper] Navigating to: ${targetUrl}`);
    const resp = await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(2500);

    // Detect anti-bot blocks so the readout reports WHY instead of "0 saved"
    const __title = await page.title();
    const __body = await page.evaluate(() => document.body?.innerText || '').catch(() => '');
    if ((resp && resp.status() === 403) || /access denied|blocked|captcha|just a moment|403/i.test(__title + ' ' + __body)) {
      throw new Error('Title company directory is currently unavailable from this network (the site blocks automated access). Please try again later.');
    }

    await page.waitForSelector('[class*="member"], [class*="company"], [class*="listing"], [class*="result"], table tr', { timeout: 15000 }).catch(() => {
      console.log('[Title Directory Scraper] Company selector not found. Parsing body directly.');
    });

    const companies = await page.evaluate(() => {
      const items = [];
      const cards = Array.from(document.querySelectorAll('[class*="member-card"], [class*="company-card"], [class*="listing"], [class*="result-item"], [class*="directory-item"]'));

      cards.forEach((card) => {
        try {
          const nameEl = card.querySelector('[class*="name"], [class*="company"], [class*="title"], h2, h3, a');
          const companyName = nameEl ? nameEl.textContent.trim() : '';

          const contactEl = card.querySelector('[class*="contact"], [class*="agent"]');
          const contactName = contactEl ? contactEl.textContent.trim() : '';

          const phoneEl = card.querySelector('[href^="tel:"], [class*="phone"]');
          const phone = phoneEl ? (phoneEl.getAttribute('href') || phoneEl.textContent).replace('tel:', '').trim() : '';

          const emailEl = card.querySelector('[href^="mailto:"]');
          const email = emailEl ? emailEl.getAttribute('href').replace('mailto:', '').trim() : '';

          const addressEl = card.querySelector('[class*="address"], [class*="location"]');
          const address = addressEl ? addressEl.textContent.trim() : '';

          const linkEl = card.querySelector('a');
          const url = linkEl ? linkEl.href : '';

          if (companyName) {
            items.push({ companyName, contactName, phone, email, address, url });
          }
        } catch (err) {
          // Skip individual card failures
        }
      });

      return items;
    });

    console.log(`[Title Directory Scraper] Extracted ${companies.length} companies.`);
    return companies;
  } catch (err) {
    if (err && err.message && err.message.includes('unavailable')) throw err;
    console.error(`[Title Directory Scraper] Failed: ${err.message}. Returning empty result set.`);
    return [];
  } finally {
    if (page) await page.close().catch(() => {});
  }
}
