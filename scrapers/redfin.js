/**
 * Redfin Scraper Module
 *
 * Strategy: parse Redfin's embedded `__PRELOADED_STATE__` JSON from the search
 * page (Redfin ships full search results there). Redfin is fronted by a
 * CloudFront WAF that blocks datacenter IPs — in that case this fails fast with
 * a clear error (same pattern as the Zillow scraper). Works from a clean
 * residential IP or via a configured proxy.
 */

const DEFAULT_URL = 'https://www.redfin.com/oh/cleveland';

function isBlocked(title, bodyText) {
  return (
    /could not be satisfied/i.test(title) ||
    /access denied/i.test(title) ||
    /blocked/i.test(title) ||
    /just a moment/i.test(bodyText) ||
    /captcha/i.test(bodyText) ||
    /cf-/i.test(bodyText)
  );
}

function findPreloadedState(doc) {
  const s = doc.querySelector('script[id*="PRELOADED_STATE"]');
  if (!s || !s.textContent) return null;
  try {
    return JSON.parse(s.textContent);
  } catch {
    return null;
  }
}

function extractHomesFromState(state) {
  // Redfin's preloaded state nests results under data.payload.* — search a few
  // known shapes defensively since Redfin restructures occasionally.
  const payload = state?.payload || state?.data?.payload || {};
  const candidates = [
    payload.homeSearchResults?.homes,
    payload.searchResults?.homes,
    payload.homeSearchResults,
    payload.searchResults,
    payload.map?.listings,
    state?.homeSearchResults,
  ];
  const homes = candidates.find((c) => Array.isArray(c)) || [];
  return homes;
}

export async function scrapeRedfin(context, targetUrl) {
  const page = await context.newPage();
  await page.setExtraHTTPHeaders({
    'accept-language': 'en-US,en;q=0.9',
    'sec-ch-ua': '"Not A;Brand";v="99", "Chromium";v="122"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
  });

  const url = targetUrl || DEFAULT_URL;
  console.log(`[Redfin Scraper] Navigating to: ${url}`);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

  // Give the SPA a moment to hydrate the preloaded state
  await page.waitForTimeout(5000);

  const title = await page.title();
  const bodyText = await page.evaluate(() => document.body?.innerText || '').catch(() => '');
  if (isBlocked(title, bodyText)) {
    throw new Error(
      'Redfin blocked this session (CloudFront bot protection). Use a clean/residential IP (set PROXY_SERVER) or run from an approved network.'
    );
  }

  const state = await page.evaluate(findPreloadedState);
  if (!state) {
    console.warn('[Redfin Scraper] No __PRELOADED_STATE__ found. Returning empty result set.');
    return [];
  }

  const homes = extractHomesFromState(state);
  const listings = [];

  for (const h of homes) {
    if (!h) continue;
    const address =
      h.address ||
      (h.addressLine && [h.addressLine, h.city, h.state].filter(Boolean).join(', ')) ||
      '';
    const price =
      h.priceString ||
      h.priceAndHoa?.priceString ||
      (h.price != null ? `$${Number(h.price).toLocaleString()}` : '');
    const beds = h.beds ?? h.bedrooms;
    const baths = h.baths ?? h.bathrooms;
    const sqft = h.sqFt ?? h.squareFeet;
    const details = [beds != null && `${beds} bd`, baths != null && `${baths} ba`, sqft != null && `${sqft} sqft`]
      .filter(Boolean)
      .join(' | ');

    if (address || price) {
      listings.push({
        address: typeof address === 'string' ? address.trim() : '',
        city: h.city || h.addressLine?.split(',')[1]?.trim() || '',
        state: h.state || '',
        zip: h.zip ?? '',
        price,
        details,
        url: h.url || h.permalink || '',
      });
    }
  }

  console.log(`[Redfin Scraper] Extracted ${listings.length} listings.`);
  return listings;
}
