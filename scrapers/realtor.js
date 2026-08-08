/**
 * Realtor.com Listings Scraper Module
 *
 * Parses search-result listing cards from realtor.com search pages. Realtor.com
 * uses its own anti-bot protection which often blocks datacenter IPs — in that
 * case this fails fast with a clear error (same pattern as Zillow/Redfin).
 * Works from a clean residential IP or via a configured proxy.
 */

const DEFAULT_URL = 'https://www.realtor.com/realestateandhomes-search/Cleveland_OH';

function isBlocked(title, bodyText) {
  return (
    /access denied/i.test(title) ||
    /blocked/i.test(title) ||
    /just a moment/i.test(bodyText) ||
    /captcha/i.test(bodyText) ||
    /cloudflare/i.test(bodyText) ||
    /403/i.test(bodyText)
  );
}

export async function scrapeRealtor(context, targetUrl) {
  const page = await context.newPage();
  await page.setExtraHTTPHeaders({
    'accept-language': 'en-US,en;q=0.9',
    'sec-ch-ua': '"Not A;Brand";v="99", "Chromium";v="122"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
  });

  const url = targetUrl || DEFAULT_URL;
  console.log(`[Realtor Scraper] Navigating to: ${url}`);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(5000);

  const title = await page.title();
  const bodyText = await page.evaluate(() => document.body?.innerText || '').catch(() => '');
  if (isBlocked(title, bodyText)) {
    throw new Error(
      'Realtor.com blocked this session (anti-bot protection). Use a clean/residential IP (set PROXY_SERVER) or run from an approved network.'
    );
  }

  const listings = await page.evaluate(() => {
    const cards = document.querySelectorAll(
      'div[data-testid="card"], article[data-testid="card"], div[data-testid="search-result"], .BasePropertyCard_propertyCard'
    );
    const items = [];
    cards.forEach((card) => {
      try {
        const addressEl =
          card.querySelector('[data-testid="card-address"]') ||
          card.querySelector('.card-address');
        const priceEl =
          card.querySelector('[data-testid="card-price"]') ||
          card.querySelector('.card-price, .price');
        const linkEl = card.querySelector('a[href*="/realestateandhomes-detail/"]');
        const bedsEl = card.querySelector('[data-testid="card-meta-beds"], .meta-beds');
        const bathsEl = card.querySelector('[data-testid="card-meta-baths"], .meta-baths');
        const sqftEl = card.querySelector('[data-testid="card-meta-sqft"], .meta-sqft');

        const address = addressEl ? addressEl.textContent.trim() : '';
        const price = priceEl ? priceEl.textContent.trim() : '';
        const details = [
          bedsEl ? `${bedsEl.textContent.trim()} bd` : '',
          bathsEl ? `${bathsEl.textContent.trim()} ba` : '',
          sqftEl ? `${sqftEl.textContent.trim()} sqft` : '',
        ].filter(Boolean).join(' | ');

        if (address || price) {
          items.push({
            address,
            price,
            details,
            url: linkEl ? linkEl.href : '',
          });
        }
      } catch {
        // Skip individual card failures
      }
    });
    return items;
  });

  console.log(`[Realtor Scraper] Extracted ${listings.length} listings.`);
  return listings;
}
