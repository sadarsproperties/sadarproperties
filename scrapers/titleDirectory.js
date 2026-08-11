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
    if ((resp && resp.status() === 403) || /access denied|blocked|forbidden|captcha|just a moment/i.test(__title)) {
      throw new Error('Title company directory is currently unavailable from this network (the site blocks automated access). Please try again later.');
    }

    await page.waitForSelector('[class*="member"], [class*="company"], [class*="listing"], [class*="result"], table tr', { timeout: 15000 }).catch(() => {
      console.log('[Title Directory Scraper] Company selector not found. Parsing body directly.');
    });

    const companies = await page.evaluate(() => {
      const items = [];
      const cards = Array.from(document.querySelectorAll('.result, [id^="lid-"], .info, [class*="member-card"], [class*="company-card"], [class*="listing"], [class*="result-item"], [class*="directory-item"]'));

      cards.forEach((card) => {
        try {
          const nameEl = card.querySelector('.business-name, [class*="name"], [class*="company"], [class*="title"], h2, h3, a');
          const companyName = nameEl ? nameEl.textContent.trim() : '';

          const contactEl = card.querySelector('[class*="contact"], [class*="agent"]');
          const contactName = contactEl ? contactEl.textContent.trim() : '';

          const phoneEl = card.querySelector('[href^="tel:"], .phone, [class*="phone"]');
          const phone = phoneEl ? (phoneEl.getAttribute('href') || phoneEl.textContent).replace('tel:', '').trim() : '';

          const emailEl = card.querySelector('[href^="mailto:"]');
          const email = emailEl ? emailEl.getAttribute('href').replace('mailto:', '').trim() : '';

          const addressEl = card.querySelector('.adr, .street-address, [class*="address"], [class*="location"]');
          const address = addressEl ? addressEl.textContent.trim().replace(/\s+/g, ' ') : '';

          const linkEl = card.querySelector('.business-name, a');
          const url = linkEl ? linkEl.href : '';

          if (companyName && companyName !== 'Learn More' && companyName !== 'Website') {
            items.push({ companyName, contactName, phone, email, address, url });
          }
        } catch (err) {
          // Skip individual card failures
        }
      });

      return items;
    });

    let city = '';
    let state = '';
    try {
      const urlObj = new URL(targetUrl);
      const loc = urlObj.searchParams.get('l');
      if (loc) {
        const parts = loc.split(',');
        if (parts.length === 2) {
          city = parts[0].trim();
          state = parts[1].trim().toUpperCase().slice(0, 2);
        } else {
          city = loc.trim();
        }
      }
    } catch (e) {}

    const processedCompanies = companies.map(c => ({
      ...c,
      city: c.city || city,
      state: c.state || state
    }));

    console.log(`[Title Directory Scraper] Extracted ${processedCompanies.length} companies.`);
    return processedCompanies;
  } catch (err) {
    if (err && err.message && err.message.includes('unavailable')) throw err;
    console.error(`[Title Directory Scraper] Failed: ${err.message}. Returning empty result set.`);
    return [];
  } finally {
    if (page) await page.close().catch(() => {});
  }
}
