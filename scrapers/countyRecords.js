/**
 * County Records Scraper Module
 *
 * Generic extraction from county property/tax record search pages. County
 * sites vary wildly but most serve plain HTML result tables with little or no
 * bot protection, so this does best-effort table/card extraction driven by the
 * URL the user supplies (e.g. a county's property search results page).
 *
 * This is the $0 nationwide path: paste any county property-search URL and the
 * results (owner/address/assessed value) are normalized into the CRM.
 */

function isBlocked(title, bodyText) {
  return (
    /access denied/i.test(title) ||
    /blocked/i.test(title) ||
    /captcha/i.test(title) ||
    /just a moment/i.test(bodyText) ||
    /403/i.test(bodyText)
  );
}

export async function scrapeCountyRecords(context, targetUrl) {
  if (!targetUrl) {
    console.log('[County Records Scraper] No URL supplied; nothing to scrape. Returning empty result set.');
    return [];
  }

  const page = await context.newPage();
  await page.setExtraHTTPHeaders({
    'accept-language': 'en-US,en;q=0.9',
    'sec-ch-ua': '"Not A;Brand";v="99", "Chromium";v="122"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
  });

  const url = targetUrl;
  console.log(`[County Records Scraper] Navigating to: ${url}`);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(4000);

  const title = await page.title();
  const bodyText = await page.evaluate(() => document.body?.innerText || '').catch(() => '');
  if (isBlocked(title, bodyText)) {
    throw new Error(
      'This county records site is currently unavailable. Try a different county URL.'
    );
  }

  const rows = await page.evaluate(() => {
    const ADDRESS_RE = /\b\d{1,6}\s+[A-Za-z0-9.-]+\s+(st|ave|avenue|rd|road|blvd|boulevard|dr|drive|lane|ln|court|ct|way|ter|terrace|cir|circle|pkwy|parkway|hwy|highway|sq|square|pl|place|trail|trl)\b/i;
    const out = [];

    // Collect every <tr> from tables (county sites usually use result tables)
    const rowEls = [];
    document.querySelectorAll('table tr, [role="row"]').forEach((r) => rowEls.push(r));

    rowEls.forEach((r) => {
      try {
        const cells = Array.from(r.querySelectorAll('td, th'))
          .map((c) => c.innerText.trim())
          .filter(Boolean);
        if (cells.length < 2) return;

        const joined = cells.join(' | ');
        const addrCell = cells.find((c) => ADDRESS_RE.test(c));
        const priceCell = cells.find((c) => /\$\s?[\d,]+/.test(c));
        const ownerCell = cells.find((c) => {
          return !ADDRESS_RE.test(c) && !/\$\s?[\d,]+/.test(c) && /\S/.test(c) && !/^\d{4,}$/.test(c);
        });

        // Require at least an address-shaped cell OR an owner + a number to
        // avoid grabbing nav rows / empty table shells.
        if (!addrCell && !(ownerCell && /\d{3,}/.test(joined))) return;

        out.push({
          address: addrCell || (ownerCell ? '' : joined.split(' | ')[0]),
          owner: ownerCell || '',
          price: priceCell || '',
          details: joined.slice(0, 300),
        });
      } catch {
        // Skip individual row failures
      }
    });

    return out;
  });

  // Dedupe by address; fall back to owner+price if no address was detected
  const seen = new Set();
  const items = [];
  for (const row of rows) {
    let address = String(row.address || '').trim();
    const key = address || `${row.owner}|${row.price}`;
    if (!key || seen.has(key.toLowerCase())) continue;
    seen.add(key.toLowerCase());

    if (!address && row.owner) {
      address = `${row.owner} — County Records`;
    }
    if (!address) continue;

    items.push({
      address,
      owner: row.owner || '',
      assessedValue: Number(String(row.price).replace(/[^0-9.]/g, '')) || 0,
      price: Number(String(row.price).replace(/[^0-9.]/g, '')) || 0,
      sourceUrl: url,
      notes: row.details || 'Public data retrieved from County tax/deed records.',
    });
  }

  console.log(`[County Records Scraper] Extracted ${items.length} records.`);
  return items;
}
