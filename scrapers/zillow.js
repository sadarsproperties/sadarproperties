/**
 * Zillow Scraper Module
 * Two strategies:
 *  1. JSON API (async-create-search-page-state) via plain fetch — fast, no browser.
 *     Only works from clean (residential/mobile) IPs. Zillow's PerimeterX blocks
 *     datacenter IPs outright (403 + "Press & Hold" wall) on HTML *and* all APIs.
 *  2. Playwright browser fallback — runs headed by default so a human can solve
 *     the "Press & Hold" challenge if it triggers.
 */

import { CONFIG } from '../config.js';
import { ProxyAgent } from 'undici';

const PROPERTY_CARD_SELECTOR = '[data-test="property-card"], article[data-test="property-card"]';
const LISTING_WAIT_TIMEOUT = 120000;
const SEARCH_STATE_ENDPOINT = 'https://www.zillow.com/async-create-search-page-state';
const NOMINATIM_ENDPOINT = 'https://nominatim.openstreetmap.org/search';

// Simple in-process geocode cache (Nominatim is rate-limited to ~1 req/s)
const geoCache = new Map();

// Lazily-built undici proxy dispatcher from CONFIG.proxy (PROXY_SERVER env vars).
let proxyDispatcher = null;
function getProxyDispatcher() {
  const p = CONFIG.proxy;
  if (!p || !p.server) return undefined;
  if (proxyDispatcher) return proxyDispatcher;
  try {
    let url = p.server.startsWith('http') ? p.server : `http://${p.server}`;
    if (p.username && p.password) {
      const parsed = new URL(url);
      parsed.username = encodeURIComponent(p.username);
      parsed.password = encodeURIComponent(p.password);
      url = parsed.toString();
    }
    proxyDispatcher = new ProxyAgent(url);
    console.log('[Zillow Scraper] API requests will route through proxy:', p.server);
  } catch (err) {
    console.warn(`[Zillow Scraper] Could not build proxy dispatcher: ${err.message}`);
    proxyDispatcher = null;
  }
  return proxyDispatcher || undefined;
}

function normalizeListing(listing) {
  const info = listing?.hdpData?.homeInfo || {};
  const address =
    listing?.address ||
    [info.streetAddress, info.city, info.state, info.zipcode].filter(Boolean).join(', ');

  const beds = listing?.beds ?? info.bedrooms;
  const baths = listing?.baths ?? info.bathrooms;
  const sqft = listing?.area ?? info.livingArea;
  const details = [beds != null && `${beds} bd`, baths != null && `${baths} ba`, sqft != null && `${sqft} sqft`]
    .filter(Boolean)
    .join(' | ');

  const detailPath = listing?.detailUrl || '';
  const url = detailPath
    ? (detailPath.startsWith('http') ? detailPath : `https://www.zillow.com${detailPath}`)
    : listing?.url || '';

  return {
    address: typeof address === 'string' ? address.trim() : '',
    price: listing?.price || (info.price != null ? `$${info.price.toLocaleString()}` : ''),
    details,
    url
  };
}

/**
 * Derive a human-readable search term (city/state or zip) from a Zillow URL
 * like /homes/for_sale/Cleveland-OH/ , /homes/for_sale/44113/ or /homes/for_sale/17402_rid/.
 */
function searchTermFromUrl(targetUrl) {
  const m = String(targetUrl || '').match(/\/for_sale\/([^/?]+)/i);
  if (!m) return '';
  const seg = m[1].replace(/_(rb|rid|d|zid|b|f|k)$/i, '').replace(/-/g, ' ').trim();
  if (/^\d{5}$/.test(seg)) return seg; // zip code
  return seg; // e.g. "cleveland oh"
}

async function geocodeLocation(searchTerm) {
  const key = searchTerm.toLowerCase().trim();
  if (!key) return null;
  if (geoCache.has(key)) return geoCache.get(key);
  try {
    const url = `${NOMINATIM_ENDPOINT}?q=${encodeURIComponent(key)}&format=json&limit=1`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'SadarProperties/1.0 (property data tool)' },
      dispatcher: getProxyDispatcher(),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const places = await res.json();
    const place = places && places[0];
    if (!place || !place.boundingbox) return null;
    const result = { term: place.display_name, bounds: place.boundingbox };
    geoCache.set(key, result);
    return result;
  } catch {
    return null;
  }
}

async function buildSearchQueryState(targetUrl) {
  const regionIdMatch = String(targetUrl || '').match(/(\d+)_rid/i);
  const term = searchTermFromUrl(targetUrl);
  const state = {
    isMapVisible: true,
    filterState: {
      fsba: { value: false },
      fsbo: { value: false },
      nc: { value: false },
      cmsn: { value: false },
      auc: { value: false },
      fore: { value: false },
      rs: { value: true },
      ah: { value: true },
    },
    isListVisible: true,
    mapZoom: 10,
    pagination: {},
    usersSearchTerm: term || 'United States',
  };

  if (regionIdMatch) {
    state.regionSelection = [{ regionId: Number(regionIdMatch[1]), regionType: 6 }];
  } else if (term) {
    const geo = await geocodeLocation(term);
    if (geo) {
      const [south, north, west, east] = geo.bounds.map(Number);
      state.mapBounds = { west, east, south, north };
    }
  }
  return state;
}

/**
 * Strategy 1 — Zillow's internal search-state JSON API via plain fetch (no browser).
 * Returns { blocked: true } when PerimeterX rejects the request, { listings: [] }
 * when reachable but empty, or { listings } with normalized records.
 */
async function fetchSearchState(targetUrl) {
  const searchQueryState = await buildSearchQueryState(targetUrl);
  const body = JSON.stringify({
    searchQueryState,
    wants: { cat1: ['listResults', 'mapResults'], cat2: ['total'] },
    requestId: 1,
  });

  const headers = {
    'User-Agent': CONFIG.userAgent,
    'Accept': 'application/json, text/plain, */*',
    'Content-Type': 'application/json',
    'Accept-Language': 'en-US,en;q=0.9',
    'sec-ch-ua': '"Not A;Brand";v="99", "Chromium";v="122"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'Origin': 'https://www.zillow.com',
    'Referer': targetUrl,
  };

  const res = await fetch(SEARCH_STATE_ENDPOINT, {
    method: 'POST',
    headers,
    body,
    dispatcher: getProxyDispatcher(),
    signal: AbortSignal.timeout(20000),
  });
  const text = await res.text();

  if (res.status === 403 || /px-captcha|Access to this page has been denied|Press & Hold/i.test(text)) {
    return { blocked: true };
  }

  try {
    const payload = JSON.parse(text);
    const listings = extractListingsFromPayload(payload);
    return { blocked: false, listings };
  } catch {
    return { blocked: false, listings: [] };
  }
}

function isBlocked(page) {
  return page.evaluate(() => {
    const bodyText = document.body?.innerText || '';
    const title = (document.title || '').toLowerCase();

    return (
      title.includes('denied') ||
      title.includes('blocked') ||
      bodyText.includes('Please verify you are a human') ||
      bodyText.includes('Press & Hold') ||
      bodyText.includes('not a bot') ||
      bodyText.includes('Reference ID') ||
      !!document.getElementById('px-captcha')
    );
  });
}

function waitForListings(page) {
  return page.waitForSelector(PROPERTY_CARD_SELECTOR, { timeout: LISTING_WAIT_TIMEOUT }).catch(() => {});
}

async function waitForBlockToClear(page) {
  const deadline = Date.now() + LISTING_WAIT_TIMEOUT;

  while (Date.now() < deadline) {
    if (!(await isBlocked(page))) {
      return true;
    }
    await page.waitForTimeout(2000);
  }

  return false;
}

function extractListingsFromPayload(payload) {
  const searchResults = payload?.cat1?.searchResults || payload?.searchResults || {};
  const listings = [
    ...(searchResults.listResults || []),
    ...(searchResults.mapResults || [])
  ];

  const seen = new Set();
  const normalized = [];

  for (const listing of listings) {
    const key = listing?.zpid || listing?.id || listing?.detailUrl || listing?.address;
    if (!key || seen.has(key)) continue;
    seen.add(key);

    const item = normalizeListing(listing);
    if (item.address || item.price) {
      normalized.push(item);
    }
  }

  return normalized;
}

/**
 * Public entry — API first, browser fallback.
 */
export async function scrapeZillow(context, targetUrl) {
  const url = targetUrl || 'https://www.zillow.com/homes/for_sale/';

  // Strategy 1: JSON API (no browser, fast). Requires a clean IP.
  try {
    const apiResult = await fetchSearchState(url);
    if (apiResult.blocked) {
      console.warn('[Zillow Scraper] JSON API blocked by PerimeterX (datacenter IP?). Falling back to browser strategy.');
    } else if (apiResult.listings && apiResult.listings.length > 0) {
      console.log(`[Zillow Scraper] API strategy found ${apiResult.listings.length} listings (no browser).`);
      return dedupeListings(apiResult.listings);
    } else {
      console.log('[Zillow Scraper] API strategy returned zero listings. Falling back to browser strategy.');
    }
  } catch (err) {
    console.warn(`[Zillow Scraper] API strategy failed: ${err.message}. Falling back to browser strategy.`);
  }

  // Strategy 2: Playwright browser (existing behavior)
  return scrapeZillowBrowser(context, url);
}

/**
 * Strategy 2 — Playwright browser (existing behavior).
 * In headed mode a human can solve the "Press & Hold" challenge; in headless
 * mode the challenge cannot be solved and this throws after the wait window.
 */
async function scrapeZillowBrowser(context, targetUrl) {
  const page = await context.newPage();
  const interceptedListings = [];
  let apiBlocked = false;

  page.on('response', async (response) => {
    const responseUrl = response.url();
    
    // Check if Zillow returned a 403 Forbidden on API endpoints
    if (response.status() === 403 && responseUrl.includes('zillow.com')) {
      console.warn(`[Zillow Scraper] Zillow API returned 403: ${responseUrl}`);
      apiBlocked = true;
    }

    if (
      !responseUrl.includes('async-create-search-page-state') &&
      !responseUrl.includes('GetSearchPageState')
    ) {
      return;
    }

    try {
      const payload = await response.json();
      const listings = extractListingsFromPayload(payload);
      if (listings.length > 0) {
        interceptedListings.push(...listings);
      }
    } catch {
      // Ignore non-JSON or incomplete responses.
    }
  });

  await page.setExtraHTTPHeaders({
    'accept-language': 'en-US,en;q=0.9',
    'sec-ch-ua': '"Not A;Brand";v="99", "Chromium";v="122"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
  });

  const url = targetUrl || 'https://www.zillow.com/homes/for_sale/';
  console.log(`[Zillow Scraper] Navigating to Zillow: ${url}`);

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

  await page.waitForFunction(() => document.body !== null, { timeout: 30000 }).catch(() => {
    console.log('[Zillow Scraper] Page body not ready yet; continuing with caution.');
  });

  // Zillow's PerimeterX challenge often renders after the initial DOM load.
  console.log('[Zillow Scraper] Checking for CAPTCHAs or blocks...');
  let blocked = false;
  for (let attempt = 0; attempt < 6; attempt++) {
    if (await isBlocked(page) || apiBlocked) {
      blocked = true;
      break;
    }
    await page.waitForTimeout(1000);
  }

  if (blocked || apiBlocked) {
    console.warn('[Zillow Scraper] Bot detection triggered!');

    // In headless mode there is no human to solve the challenge — fail fast
    // instead of hanging for the 2-minute manual-verification window.
    if (process.env.SCRAPER_HEADLESS === 'true') {
      throw new Error(
        'Zillow blocked this session (PerimeterX "Press & Hold"). Headless mode cannot solve it — use a clean/residential IP (set PROXY_SERVER) or run from an approved network.'
      );
    }

    // If blocked via API response (403), load the main homepage to force the interactive CAPTCHA page to load
    if (apiBlocked && !(await isBlocked(page))) {
      console.log('[Zillow Scraper] API block detected. Redirecting browser to Zillow homepage to force manual verification challenge...');
      await page.goto('https://www.zillow.com/', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
    }

    console.log('[Zillow Scraper] Please solve the "Press & Hold" CAPTCHA in the browser window.');
    console.log('[Zillow Scraper] Waiting up to 2 minutes for manual verification...');

    const cleared = await waitForBlockToClear(page);
    if (!cleared) {
      throw new Error(
        'Zillow blocked this session. Solve the "Press & Hold" challenge in the browser window, then rerun the scraper.'
      );
    }

    console.log('[Zillow Scraper] Block cleared. Navigating back to search page...');
    apiBlocked = false;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000);
  }

  await waitForListings(page);

  console.log('[Zillow Scraper] Extracting properties...');

  const domProperties = await page.evaluate(() => {
    const cards = document.querySelectorAll('[data-test="property-card"], article[data-test="property-card"]');
    const items = [];

    cards.forEach((card) => {
      try {
        const priceEl = card.querySelector('[data-test="property-card-price"]');
        const price = priceEl ? priceEl.textContent.trim() : '';

        const addrEl = card.querySelector('address[data-test="property-card-addr"]');
        const address = addrEl ? addrEl.textContent.trim() : '';

        const linkEl = card.querySelector('a[data-test="property-card-link"]');
        const url = linkEl ? linkEl.href : '';

        const detailsList = card.querySelectorAll('ul li');
        let details = '';
        if (detailsList.length > 0) {
          details = Array.from(detailsList)
            .map((li) => li.textContent.trim())
            .filter(Boolean)
            .join(' | ');
        } else {
          const detailEl = card.querySelector('.property-card-details, .card-info');
          details = detailEl ? detailEl.textContent.trim() : '';
        }

        if (address || price) {
          items.push({ address, price, details, url });
        }
      } catch {
        // Skip individual card failures.
      }
    });

    if (items.length > 0) {
      return items;
    }

    const nextDataScript = document.querySelector('script#__NEXT_DATA__');
    if (!nextDataScript) return [];

    try {
      const nextData = JSON.parse(nextDataScript.textContent);
      const searchResults =
        nextData?.props?.pageProps?.searchPageState?.cat1?.searchResults ||
        nextData?.props?.pageProps?.searchPageState?.searchResults ||
        {};

      const listings = [
        ...(searchResults.listResults || []),
        ...(searchResults.mapResults || [])
      ];

      return listings
        .map((listing) => {
          const info = listing?.hdpData?.homeInfo || {};
          const address =
            listing?.address ||
            [info.streetAddress, info.city, info.state, info.zipcode].filter(Boolean).join(', ');

          const beds = listing?.beds ?? info.bedrooms;
          const baths = listing?.baths ?? info.bathrooms;
          const sqft = listing?.area ?? info.livingArea;
          const details = [beds != null && `${beds} bd`, baths != null && `${baths} ba`, sqft != null && `${sqft} sqft`]
            .filter(Boolean)
            .join(' | ');

          const detailPath = listing?.detailUrl || '';
          const listingUrl = detailPath
            ? (detailPath.startsWith('http') ? detailPath : `https://www.zillow.com${detailPath}`)
            : '';

          return {
            address: typeof address === 'string' ? address.trim() : '',
            price: listing?.price || (info.price != null ? `$${info.price.toLocaleString()}` : ''),
            details,
            url: listingUrl
          };
        })
        .filter((item) => item.address || item.price);
    } catch {
      return [];
    }
  });

  const properties = domProperties.length > 0 ? domProperties : dedupeListings(interceptedListings);

  if (properties.length === 0 && (await isBlocked(page))) {
    throw new Error(
      'Zillow is still showing a bot challenge. Open the browser window, complete the "Press & Hold" verification, and run the scraper again.'
    );
  }

  if (properties.length === 0) {
    const pageState = await page.evaluate(() => ({
      title: document.title || '',
      bodyText: document.body?.innerText || ''
    }));

    if (/0 Homes For Sale/i.test(pageState.title) || /could not find any matching results/i.test(pageState.bodyText)) {
      console.warn(
        '[Zillow Scraper] Zillow loaded, but this search returned zero listings for the detected location.'
      );
      console.warn(
        '[Zillow Scraper] Try a location-specific URL, e.g. https://www.zillow.com/homes/for_sale/New-York,-NY/'
      );
    }
  }

  console.log(`[Zillow Scraper] Extracted ${properties.length} listings.`);
  return properties;
}

function dedupeListings(listings) {
  const seen = new Set();
  const unique = [];

  for (const listing of listings) {
    const key = `${listing.address}|${listing.price}|${listing.url}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(listing);
  }

  return unique;
}