/**
 * Zillow Scraper Module
 * Note: Zillow utilizes aggressive anti-bot protection (PerimeterX/PX).
 * This script runs in headed mode by default to let the user solve CAPTCHAs if they trigger.
 */

const PROPERTY_CARD_SELECTOR = '[data-test="property-card"], article[data-test="property-card"]';
const LISTING_WAIT_TIMEOUT = 120000;

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

async function isBlocked(page) {
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

async function waitForListings(page) {
  await page.waitForSelector(PROPERTY_CARD_SELECTOR, { timeout: LISTING_WAIT_TIMEOUT }).catch(() => {});
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

export async function scrapeZillow(context, targetUrl) {
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