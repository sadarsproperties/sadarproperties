/**
 * HUD Home Store Scraper Module
 *
 * HUD (U.S. Dept. of Housing and Urban Development) sells government-owned REO
 * homes — free to browse, no login, and (unlike the big portals) generally
 * reachable from a datacenter IP.
 *
 * The listing search is JS-driven: we load /searchresult, drive the location
 * input, and parse the result cards. If the search UI can't be driven (some
 * setups render it differently), this fails fast with a clear message rather
 * than silently saving 0.
 */

const DEFAULT_URL = 'https://www.hudhomestore.gov/searchresult';

export class HUDAdapter {
  normalize(raw) {
    const priceVal = Number(String(raw.price || '').replace(/[^0-9.]/g, '')) || 0;
    return {
      address: raw.address || 'Unknown Address',
      city: raw.city || '',
      state: raw.state || 'OH',
      zipCode: raw.zipCode || '',
      askingPrice: priceVal,
      price: priceVal,
      arv: raw.arv || (priceVal ? priceVal * 1.3 : 0),
      bedrooms: raw.bedrooms || null,
      bathrooms: raw.bathrooms || null,
      propertyType: 'Single Family',
      leadCategories: ['REO', 'HUD Home'],
      source: 'HUD',
      sourceUrl: raw.url || '',
      status: 'new',
      notes: 'Government-owned HUD home listed for purchase.',
    };
  }
}

export async function scrapeHUD(context, targetUrl, location = 'OH') {
  const page = await context.newPage();
  await page.setExtraHTTPHeaders({
    'accept-language': 'en-US,en;q=0.9',
    'sec-ch-ua': '"Not A;Brand";v="99", "Chromium";v="122"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
  });

  const url = targetUrl || DEFAULT_URL;
  console.log(`[HUD Scraper] Navigating to: ${url}`);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(4000);

  const title = await page.title();
  const bodyText = await page.evaluate(() => document.body?.innerText || '').catch(() => '');
  if (/access denied|blocked|captcha|just a moment|403/i.test(title + ' ' + bodyText)) {
    throw new Error('HUD Home Store blocked this session (bot protection).');
  }

  // Drive the location search (HUD results require an explicit search)
  try {
    const input = page.locator('#searchNames, input[name*="search" i], input[placeholder*="State" i], input[placeholder*="City" i]').first();
    await input.waitFor({ timeout: 8000 });
    await input.fill(location);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(9000);
  } catch (err) {
    throw new Error(
      'HUD Home Store search could not be driven automatically. Try a direct listing URL instead, or run once manually to confirm the search box renders.'
    );
  }

  // Parse listing cards
  const listings = await page.evaluate(() => {
    const ADDRESS_RE = /\b\d{1,6}\s+[A-Za-z0-9.-]+\s+(st|ave|avenue|rd|road|blvd|boulevard|dr|drive|lane|ln|court|ct|way|ter|terrace|cir|circle|pkwy|parkway|hwy|highway|sq|square|pl|place)\b/i;
    const items = [];
    const containers = document.querySelectorAll('[class*="listing"], [class*="property"], [class*="card"]');
    containers.forEach((c) => {
      try {
        const text = (c.innerText || '').trim();
        if (!text || text.length > 600) return;
        const addressEl = c.querySelector('[class*="address"], [class*="Address"], h4, h5');
        const priceEl = c.querySelector('[class*="price"], [class*="Price"]');
        const linkEl = c.querySelector('a[href*="PropertyDetails"], a[href*="propertydetail"], a[href*="detail"]');
        let address = (addressEl ? addressEl.innerText.trim() : '');
        if (!ADDRESS_RE.test(address)) {
          const m = text.match(/^([^\n]{5,90})/);
          if (m && ADDRESS_RE.test(m[1])) address = m[1];
        }
        if (!address) return;
        const price = priceEl ? priceEl.innerText.trim() : '';
        items.push({
          address,
          price,
          beds: (text.match(/(\d+)\s*bed/i) || [])[1] || null,
          baths: (text.match(/(\d+)\s*bath/i) || [])[1] || null,
          url: linkEl ? linkEl.href : '',
        });
      } catch {
        // skip
      }
    });
    return items;
  });

  // Dedupe
  const seen = new Set();
  const unique = [];
  for (const l of listings) {
    const key = l.address.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(l);
  }

  console.log(`[HUD Scraper] Extracted ${unique.length} HUD listings.`);
  return unique;
}
