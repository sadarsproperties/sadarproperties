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
    
    let address = raw.address || 'Unknown Address';
    let city = raw.city || '';
    let state = raw.state || 'OH';
    let zipCode = raw.zipCode || '';

    if (address && address !== 'Unknown Address') {
      const parts = address.split(',').map(p => p.trim());
      if (parts.length >= 3) {
        // Last part is state + zip, e.g. "OH 44101"
        const stateZipPart = parts[parts.length - 1];
        const stateZipMatch = stateZipPart.match(/^([A-Z]{2})\s*(\d{5})?/i);
        if (stateZipMatch) {
          state = stateZipMatch[1].toUpperCase();
          if (stateZipMatch[2]) zipCode = stateZipMatch[2];
        }
        // Second to last part is city
        city = parts[parts.length - 2];
      }
    }

    return {
      address: address,
      city: city,
      state: state,
      zipCode: zipCode,
      askingPrice: priceVal,
      price: priceVal,
      arv: raw.arv || (priceVal ? priceVal * 1.3 : 0),
      bedrooms: raw.bedrooms || raw.beds || null,
      bathrooms: raw.bathrooms || raw.baths || null,
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
    throw new Error('HUD Home Store is currently unavailable from this network.');
  }

  // Drive the location search (HUD results require an explicit search)
  try {
    const input = page
      .locator('#cityStateZip, #searchNames, input[placeholder*="State" i], input[placeholder*="City" i], input[type="search"], input[aria-label*="search" i]')
      .first();
    await input.waitFor({ state: 'visible', timeout: 8000 });
    await input.click();
    await input.type(location, { delay: 60 });
    await page.waitForTimeout(1500);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(3000);

    // Wait for the property list to render
    await page.waitForSelector('.property-box', { timeout: 10000 }).catch(() => {
      console.warn('[HUD Scraper] Timed out waiting for .property-box');
    });

    // Scroll down to load/render lazy-loaded cards
    for (let i = 0; i < 6; i++) {
      await page.evaluate(() => window.scrollBy(0, 800));
      await page.waitForTimeout(1500);
    }
  } catch (err) {
    throw new Error(
      'HUD Home Store search could not be driven automatically. Try a direct listing URL instead, or run once manually to confirm the search box renders.'
    );
  }

  // Parse listing cards
  const listings = await page.evaluate(() => {
    const ADDRESS_RE = /\b\d{1,6}\s+[A-Za-z0-9.-]+\s+(st|ave|avenue|rd|road|blvd|boulevard|dr|drive|lane|ln|court|ct|way|ter|terrace|cir|circle|pkwy|parkway|hwy|highway|sq|square|pl|place)\b/i;
    const items = [];
    const containers = document.querySelectorAll('.property-box, [class*="listing"], [class*="property"], [class*="card"]');
    containers.forEach((c) => {
      try {
        const text = (c.innerText || '').trim();
        if (!text || text.length > 800) return;

        // Exact selectors for HUD's new layout
        const addressLinkEl = c.querySelector('.property-address a');
        const addressDivEl = c.querySelector('.property-address div');
        const priceRangeEl = c.querySelector('.price-range');

        // Generic fallbacks
        const addressEl = addressLinkEl || c.querySelector('[class*="address"], [class*="Address"], h4, h5');
        const priceEl = priceRangeEl || c.querySelector('[class*="price"], [class*="Price"]');
        const linkEl = addressLinkEl || c.querySelector('a[href*="PropertyDetails"], a[href*="propertydetail"], a[href*="detail"], a[href*="checkPropertyInStep6"]');

        let streetAddress = addressEl ? addressEl.innerText.trim() : '';
        let cityStateZip = addressDivEl ? addressDivEl.innerText.trim() : '';

        // Combine street address and cityStateZip if both found
        let fullAddress = streetAddress;
        if (cityStateZip && !fullAddress.includes(cityStateZip)) {
          fullAddress = `${streetAddress}, ${cityStateZip}`.replace(/\s+/g, ' ').trim();
        }

        if (!ADDRESS_RE.test(fullAddress)) {
          const m = text.match(/^([^\n]{5,90})/);
          if (m && ADDRESS_RE.test(m[1])) fullAddress = m[1];
        }
        if (!fullAddress) return;

        const price = priceEl ? priceEl.innerText.trim() : '';
        const bedsMatch = text.match(/(\d+)\s*(?:bed|bd|bedroom)/i);
        const bathsMatch = text.match(/(\d+)(?:\.\d+)?\s*(?:bath|ba|bathroom)/i);

        items.push({
          address: fullAddress,
          price,
          beds: bedsMatch ? bedsMatch[1] : null,
          baths: bathsMatch ? bathsMatch[1] : null,
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
