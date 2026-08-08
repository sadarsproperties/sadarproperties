import { randomUUID } from 'crypto';

export class BaseSourceAdapter {
  constructor(name, type, dataCategory, integrationMethod) {
    this.name = name;
    this.type = type;
    this.dataCategory = dataCategory;
    this.integrationMethod = integrationMethod;
  }

  getHeaders() {
    return {
      'Content-Type': 'application/json',
      'User-Agent': 'SadarProperties-Ingest/1.0',
    };
  }

  async waitRateLimit() {
    // Basic rate limit: 500ms delay to prevent blocking
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  normalize(raw) {
    throw new Error('normalize() must be implemented');
  }

  async fetch(context, targetUrlOrQuery) {
    console.log(`[Source Adapter - ${this.name}] Ingesting from: ${targetUrlOrQuery}`);
    await this.waitRateLimit();
    return [];
  }
}

// 1. Zillow Adapter
export class ZillowAdapter extends BaseSourceAdapter {
  constructor() {
    super('Zillow', 'Public Listings Portal', 'Active listings, Zestimates', 'API / Web scrape');
  }

  normalize(raw) {
    // Parse beds/baths/sqft from details string if present (e.g. "3 bd | 2 ba | 1,500 sqft")
    let beds = null, baths = null, sqft = null;
    if (raw.details) {
      const parts = raw.details.split('|').map(p => p.trim());
      for (const p of parts) {
        if (p.includes('bd')) beds = parseInt(p) || null;
        if (p.includes('ba')) baths = parseFloat(p) || null;
        if (p.includes('sqft')) sqft = parseInt(p.replace(/,/g, '')) || null;
      }
    }

    const priceVal = typeof raw.price === 'string' 
      ? parseFloat(raw.price.replace(/[^0-9.]/g, '')) || 0
      : Number(raw.price) || 0;

    return {
      id: raw.id || randomUUID(),
      address: raw.address || 'Unknown Address',
      city: raw.city || '',
      state: raw.state || '',
      zipCode: raw.zipCode || raw.zip || '',
      askingPrice: priceVal,
      price: priceVal,
      arv: raw.arv || priceVal * 1.1, // Zestimate rough proxy
      bedrooms: raw.bedrooms != null ? raw.bedrooms : beds,
      bathrooms: raw.bathrooms != null ? raw.bathrooms : baths,
      sqft: raw.sqft != null ? raw.sqft : sqft,
      lotSize: raw.lotSize || null,
      yearBuilt: raw.yearBuilt || null,
      propertyType: this.normalizePropertyType(raw.propertyType || raw.details),
      leadCategories: raw.leadCategories || ['Vacant'], // default tag for portal scrapes
      source: this.name,
      sourceUrl: raw.url || raw.sourceUrl || '',
      status: 'new',
      notes: raw.notes || 'Aggregated from Zillow portal listings.'
    };
  }

  normalizePropertyType(str = '') {
    const s = String(str).toLowerCase();
    if (s.includes('duplex')) return 'Duplex';
    if (s.includes('triplex')) return 'Triplex';
    if (s.includes('quadplex') || s.includes('4-plex')) return 'Quadplex';
    if (s.includes('multifamily') || s.includes('multi-family')) return 'Multifamily';
    if (s.includes('apartment') || s.includes('complex')) return 'Apartment Complex';
    if (s.includes('commercial') || s.includes('retail') || s.includes('office')) return 'Commercial';
    return 'Single Family';
  }
}

// 2. Redfin Adapter
export class RedfinAdapter extends BaseSourceAdapter {
  constructor() {
    super('Redfin', 'Public Listings Portal', 'Active & sold listings', 'API / Web scrape');
  }

  normalize(raw) {
    const priceVal = Number(raw.price || raw.askingPrice) || 0;
    return {
      id: raw.id || randomUUID(),
      address: raw.address || 'Unknown Address',
      city: raw.city || '',
      state: raw.state || '',
      zipCode: raw.zipCode || '',
      askingPrice: priceVal,
      price: priceVal,
      arv: raw.arv || priceVal,
      bedrooms: raw.bedrooms || null,
      bathrooms: raw.bathrooms || null,
      sqft: raw.sqft || null,
      lotSize: raw.lotSize || null,
      yearBuilt: raw.yearBuilt || null,
      propertyType: raw.propertyType || 'Single Family',
      leadCategories: raw.leadCategories || ['Absentee Owner'],
      source: this.name,
      sourceUrl: raw.sourceUrl || '',
      status: 'new',
      notes: raw.notes || 'Aggregated from Redfin listings.'
    };
  }
}

// 3. Realtor.com Adapter
export class RealtorAdapter extends BaseSourceAdapter {
  constructor() {
    super('Realtor.com', 'Public Listings Portal', 'Active listings', 'API / Web scrape');
  }

  normalize(raw) {
    const priceVal = Number(raw.price || raw.askingPrice) || 0;
    return {
      id: raw.id || randomUUID(),
      address: raw.address || 'Unknown Address',
      city: raw.city || '',
      state: raw.state || '',
      zipCode: raw.zipCode || '',
      askingPrice: priceVal,
      price: priceVal,
      arv: raw.arv || priceVal,
      bedrooms: raw.bedrooms || null,
      bathrooms: raw.bathrooms || null,
      sqft: raw.sqft || null,
      lotSize: raw.lotSize || null,
      yearBuilt: raw.yearBuilt || null,
      propertyType: raw.propertyType || 'Single Family',
      leadCategories: raw.leadCategories || ['Vacant'],
      source: this.name,
      sourceUrl: raw.sourceUrl || '',
      status: 'new',
      notes: raw.notes || 'Aggregated from Realtor.com listings.'
    };
  }
}

// 4. PropStream Adapter
export class PropStreamAdapter extends BaseSourceAdapter {
  constructor() {
    super('PropStream', 'Investor Data Platform', 'Distressed, skip trace', 'API');
  }

  normalize(raw) {
    const priceVal = Number(raw.price || raw.askingPrice || raw.estimatedValue) || 0;
    return {
      id: raw.id || randomUUID(),
      address: raw.address || 'Unknown Address',
      city: raw.city || '',
      state: raw.state || '',
      zipCode: raw.zipCode || raw.zip || '',
      askingPrice: priceVal,
      price: priceVal,
      arv: raw.arv || raw.estimatedValue || priceVal * 1.25,
      bedrooms: raw.bedrooms || null,
      bathrooms: raw.bathrooms || null,
      sqft: raw.sqft || null,
      lotSize: raw.lotSize || null,
      yearBuilt: raw.yearBuilt || null,
      propertyType: raw.propertyType || 'Single Family',
      leadCategories: raw.leadCategories || ['Distressed', 'Absentee Owner'],
      source: this.name,
      sourceUrl: raw.sourceUrl || '',
      status: 'new',
      notes: raw.notes || 'Imported via PropStream investor platform.'
    };
  }
}

// 5. BatchLeads Adapter
export class BatchLeadsAdapter extends BaseSourceAdapter {
  constructor() {
    super('BatchLeads', 'Investor Data Platform', 'Seller data, phone, email', 'API');
  }

  normalize(raw) {
    const priceVal = Number(raw.price || raw.askingPrice) || 0;
    return {
      id: raw.id || randomUUID(),
      address: raw.address || 'Unknown Address',
      city: raw.city || '',
      state: raw.state || '',
      zipCode: raw.zipCode || '',
      askingPrice: priceVal,
      price: priceVal,
      arv: raw.arv || priceVal * 1.2,
      bedrooms: raw.bedrooms || null,
      bathrooms: raw.bathrooms || null,
      sqft: raw.sqft || null,
      lotSize: raw.lotSize || null,
      yearBuilt: raw.yearBuilt || null,
      propertyType: raw.propertyType || 'Single Family',
      leadCategories: raw.leadCategories || ['Tired Landlord', 'Absentee Owner'],
      source: this.name,
      sourceUrl: raw.sourceUrl || '',
      status: 'new',
      notes: raw.notes || 'Ingested from BatchLeads.'
    };
  }
}

// 6. DealMachine Adapter
export class DealMachineAdapter extends BaseSourceAdapter {
  constructor() {
    super('DealMachine', 'Driving for Dollars App', 'Vacant, absentee', 'API / CSV import');
  }

  normalize(raw) {
    const priceVal = Number(raw.price || raw.askingPrice) || 0;
    return {
      id: raw.id || randomUUID(),
      address: raw.address || 'Unknown Address',
      city: raw.city || '',
      state: raw.state || '',
      zipCode: raw.zipCode || '',
      askingPrice: priceVal,
      price: priceVal,
      arv: raw.arv || priceVal,
      bedrooms: raw.bedrooms || null,
      bathrooms: raw.bathrooms || null,
      sqft: raw.sqft || null,
      lotSize: raw.lotSize || null,
      yearBuilt: raw.yearBuilt || null,
      propertyType: raw.propertyType || 'Single Family',
      leadCategories: raw.leadCategories || ['Vacant', 'Absentee Owner'],
      source: this.name,
      sourceUrl: raw.sourceUrl || '',
      status: 'new',
      notes: raw.notes || 'Captured via DealMachine (Driving for Dollars).'
    };
  }
}

// 7. LoopNet Adapter
export class LoopNetAdapter extends BaseSourceAdapter {
  constructor() {
    super('LoopNet', 'Commercial Listings', 'Commercial properties', 'API / Web scrape');
  }

  normalize(raw) {
    const priceVal = Number(raw.price || raw.askingPrice) || 0;
    return {
      id: raw.id || randomUUID(),
      address: raw.address || 'Unknown Address',
      city: raw.city || '',
      state: raw.state || '',
      zipCode: raw.zipCode || '',
      askingPrice: priceVal,
      price: priceVal,
      arv: raw.arv || priceVal,
      bedrooms: null,
      bathrooms: null,
      sqft: raw.sqft || null,
      lotSize: raw.lotSize || null,
      yearBuilt: raw.yearBuilt || null,
      propertyType: 'Commercial',
      leadCategories: raw.leadCategories || ['Rental Property'],
      source: this.name,
      sourceUrl: raw.sourceUrl || '',
      status: 'new',
      notes: raw.notes || 'Commercial property listing from LoopNet.'
    };
  }
}

// 8. Crexi Adapter
export class CrexiAdapter extends BaseSourceAdapter {
  constructor() {
    super('Crexi', 'Commercial Listings', 'Commercial + multifamily', 'API / Web scrape');
  }

  normalize(raw) {
    const priceVal = Number(raw.price || raw.askingPrice) || 0;
    return {
      id: raw.id || randomUUID(),
      address: raw.address || 'Unknown Address',
      city: raw.city || '',
      state: raw.state || '',
      zipCode: raw.zipCode || '',
      askingPrice: priceVal,
      price: priceVal,
      arv: raw.arv || priceVal,
      bedrooms: null,
      bathrooms: null,
      sqft: raw.sqft || null,
      lotSize: raw.lotSize || null,
      yearBuilt: raw.yearBuilt || null,
      propertyType: raw.propertyType || 'Multifamily',
      leadCategories: raw.leadCategories || ['Rental Property'],
      source: this.name,
      sourceUrl: raw.sourceUrl || '',
      status: 'new',
      notes: raw.notes || 'Commercial/Multifamily listing from Crexi.'
    };
  }
}

// 9. County Records Adapter
export class CountyRecordsAdapter extends BaseSourceAdapter {
  constructor() {
    super('County Records', 'Public Records', 'Ownership, tax data', 'Web scrape / bulk import');
  }

  normalize(raw) {
    const priceVal = Number(raw.price || raw.askingPrice || raw.assessedValue) || 0;
    return {
      id: raw.id || randomUUID(),
      address: raw.address || 'Unknown Address',
      city: raw.city || '',
      state: raw.state || '',
      zipCode: raw.zipCode || '',
      askingPrice: priceVal,
      price: priceVal,
      arv: raw.arv || priceVal * 1.3,
      bedrooms: raw.bedrooms || null,
      bathrooms: raw.bathrooms || null,
      sqft: raw.sqft || null,
      lotSize: raw.lotSize || null,
      yearBuilt: raw.yearBuilt || null,
      propertyType: raw.propertyType || 'Single Family',
      leadCategories: raw.leadCategories || ['Absentee Owner', 'Tax Delinquent'],
      source: this.name,
      sourceUrl: raw.sourceUrl || '',
      status: 'new',
      notes: raw.notes || 'Public data retrieved from County tax/deed records.'
    };
  }
}

// 10. Foreclosure Lists Adapter
export class ForeclosureListsAdapter extends BaseSourceAdapter {
  constructor() {
    super('Foreclosure Lists', 'Court/Gov Data', 'Pre-foreclosure, REO', 'CSV import / scrape');
  }

  normalize(raw) {
    const priceVal = Number(raw.price || raw.askingPrice) || 0;
    return {
      id: raw.id || randomUUID(),
      address: raw.address || 'Unknown Address',
      city: raw.city || '',
      state: raw.state || '',
      zipCode: raw.zipCode || '',
      askingPrice: priceVal,
      price: priceVal,
      arv: raw.arv || priceVal * 1.4,
      bedrooms: raw.bedrooms || null,
      bathrooms: raw.bathrooms || null,
      sqft: raw.sqft || null,
      lotSize: raw.lotSize || null,
      yearBuilt: raw.yearBuilt || null,
      propertyType: raw.propertyType || 'Single Family',
      leadCategories: raw.leadCategories || ['Pre-Foreclosure', 'Distressed'],
      source: this.name,
      sourceUrl: raw.sourceUrl || '',
      status: 'new',
      notes: raw.notes || 'Identified in active pre-foreclosure listings.'
    };
  }
}

// 11. Tax Delinquent Lists Adapter
export class TaxDelinquentListsAdapter extends BaseSourceAdapter {
  constructor() {
    super('Tax Delinquent Lists', 'Gov Data', 'Tax delinquent owners', 'CSV import');
  }

  normalize(raw) {
    const priceVal = Number(raw.price || raw.askingPrice) || 0;
    return {
      id: raw.id || randomUUID(),
      address: raw.address || 'Unknown Address',
      city: raw.city || '',
      state: raw.state || '',
      zipCode: raw.zipCode || '',
      askingPrice: priceVal,
      price: priceVal,
      arv: raw.arv || priceVal * 1.5,
      bedrooms: raw.bedrooms || null,
      bathrooms: raw.bathrooms || null,
      sqft: raw.sqft || null,
      lotSize: raw.lotSize || null,
      yearBuilt: raw.yearBuilt || null,
      propertyType: raw.propertyType || 'Single Family',
      leadCategories: raw.leadCategories || ['Tax Delinquent', 'Absentee Owner'],
      source: this.name,
      sourceUrl: raw.sourceUrl || '',
      status: 'new',
      notes: raw.notes || `Tax delinquent owner lists. Tax balance: ${raw.taxBalance || 'N/A'}`
    };
  }
}

// 12. FSBO (For Sale By Owner) Adapter
export class FSBOAdapter extends BaseSourceAdapter {
  constructor() {
    super('FSBO', 'For Sale By Owner', 'Owner-listed properties', 'Web scrape');
  }

  normalize(raw) {
    const priceVal = Number(raw.price || raw.askingPrice) || 0;
    return {
      id: raw.id || randomUUID(),
      address: raw.address || 'Unknown Address',
      city: raw.city || '',
      county: raw.county || '',
      state: raw.state || '',
      zipCode: raw.zipCode || raw.zip || '',
      askingPrice: priceVal,
      price: priceVal,
      arv: raw.arv || priceVal,
      bedrooms: raw.bedrooms || null,
      bathrooms: raw.bathrooms || null,
      sqft: raw.sqft || null,
      lotSize: raw.lotSize || null,
      yearBuilt: raw.yearBuilt || null,
      propertyType: raw.propertyType || 'Single Family',
      leadCategories: raw.leadCategories || ['FSBO'],
      source: this.name,
      sourceUrl: raw.url || raw.sourceUrl || '',
      status: 'new',
      notes: raw.notes || 'For Sale By Owner listing.'
    };
  }
}

// 13. Auction Adapter
export class AuctionAdapter extends BaseSourceAdapter {
  constructor() {
    super('Auction', 'Auction Marketplace', 'Auction & bank-owned properties', 'Web scrape');
  }

  normalize(raw) {
    const priceVal = Number(raw.price || raw.askingPrice || raw.startingBid) || 0;
    return {
      id: raw.id || randomUUID(),
      address: raw.address || 'Unknown Address',
      city: raw.city || '',
      county: raw.county || '',
      state: raw.state || '',
      zipCode: raw.zipCode || raw.zip || '',
      askingPrice: priceVal,
      price: priceVal,
      arv: raw.arv || priceVal * 1.3,
      bedrooms: raw.bedrooms || null,
      bathrooms: raw.bathrooms || null,
      sqft: raw.sqft || null,
      lotSize: raw.lotSize || null,
      yearBuilt: raw.yearBuilt || null,
      propertyType: raw.propertyType || 'Single Family',
      leadCategories: raw.leadCategories || ['Auction'],
      source: this.name,
      sourceUrl: raw.url || raw.sourceUrl || '',
      status: 'new',
      notes: raw.notes || 'Auction listing.'
    };
  }
}

// 14. Subject-To Adapter
export class SubjectToAdapter extends BaseSourceAdapter {
  constructor() {
    super('Subject To', 'Creative Finance', 'Subject-to / seller-finance leads', 'Web scrape / manual');
  }

  normalize(raw) {
    const priceVal = Number(raw.price || raw.askingPrice) || 0;
    return {
      id: raw.id || randomUUID(),
      address: raw.address || 'Unknown Address',
      city: raw.city || '',
      county: raw.county || '',
      state: raw.state || '',
      zipCode: raw.zipCode || raw.zip || '',
      askingPrice: priceVal,
      price: priceVal,
      arv: raw.arv || priceVal,
      bedrooms: raw.bedrooms || null,
      bathrooms: raw.bathrooms || null,
      sqft: raw.sqft || null,
      lotSize: raw.lotSize || null,
      yearBuilt: raw.yearBuilt || null,
      propertyType: raw.propertyType || 'Single Family',
      leadCategories: raw.leadCategories || ['Subject To'],
      source: this.name,
      sourceUrl: raw.url || raw.sourceUrl || '',
      status: 'new',
      notes: raw.notes || 'Subject-To / creative finance lead.'
    };
  }
}

class AdapterRegistry {
  constructor() {
    this.adapters = new Map();
    this.register(new ZillowAdapter());
    this.register(new RedfinAdapter());
    this.register(new RealtorAdapter());
    this.register(new PropStreamAdapter());
    this.register(new BatchLeadsAdapter());
    this.register(new DealMachineAdapter());
    this.register(new LoopNetAdapter());
    this.register(new CrexiAdapter());
    this.register(new CountyRecordsAdapter());
    this.register(new ForeclosureListsAdapter());
    this.register(new TaxDelinquentListsAdapter());
    this.register(new FSBOAdapter());
    this.register(new AuctionAdapter());
    this.register(new SubjectToAdapter());
  }

  register(adapter) {
    this.adapters.set(adapter.name.toLowerCase(), adapter);
  }

  get(name) {
    return this.adapters.get(name.toLowerCase());
  }

  getAll() {
    return Array.from(this.adapters.values());
  }

  detectFromUrl(url) {
    const lower = url.toLowerCase();
    if (lower.includes('zillow.com')) return this.get('zillow');
    if (lower.includes('redfin.com')) return this.get('redfin');
    if (lower.includes('realtor.com')) return this.get('realtor.com');
    if (lower.includes('propstream.com')) return this.get('propstream');
    if (lower.includes('batchleads.io') || lower.includes('batchleads.com')) return this.get('batchleads');
    if (lower.includes('dealmachine.com')) return this.get('dealmachine');
    if (lower.includes('loopnet.com')) return this.get('loopnet');
    if (lower.includes('crexi.com')) return this.get('crexi');
    if (lower.includes('county') || lower.includes('.gov')) return this.get('county records');
    if (lower.includes('foreclosure')) return this.get('foreclosure lists');
    if (lower.includes('tax') || lower.includes('delinquent')) return this.get('tax delinquent lists');
    if (lower.includes('auction.com') || lower.includes('hubzu') || lower.includes('xome') || lower.includes('auction')) return this.get('auction');
    if (lower.includes('subject-to') || lower.includes('subjectto') || lower.includes('subject_to')) return this.get('subject to');
    if (lower.includes('forsalebyowner') || lower.includes('fsbo')) return this.get('fsbo');
    return null;
  }
}

export const registry = new AdapterRegistry();

/**
 * Build the list of search URLs to scrape for a source.
 * - An explicit URL wins.
 * - Otherwise, for sources with derivable location URLs (Zillow, Craigslist),
 *   build one per saved city area so the configured markets feed the scraper.
 * - Returns [] when the source has no usable areas → caller falls back to the
 *   scraper's built-in default URL.
 */
export function buildSearchUrls(source, url, areas = []) {
  const trimmed = typeof url === 'string' ? url.trim() : '';
  if (trimmed) return [trimmed];

  const lower = String(source || '').toLowerCase();
  const usable = (areas || []).filter(a => a && (a.city || a.countyName) && a.state);
  if (!usable.length) return [];

  if (lower === 'zillow') {
    const slugify = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const urls = [];
    for (const a of usable) {
      const loc = slugify(a.city) || slugify(a.countyName);
      const st = slugify(a.state).slice(0, 2);
      if (loc && st) urls.push(`https://www.zillow.com/homes/for_sale/${loc}-${st}_rb/`);
    }
    return urls;
  }

  if (lower === 'craigslist') {
    const urls = [];
    for (const a of usable) {
      const slug = craigslistSubdomain(a.city);
      if (slug) urls.push(`https://${slug}.craigslist.org/search/hhh`);
    }
    return urls;
  }

  return [];
}

// Craigslist city subdomains don't always match the city name, so map the common
// ones and fall back to a stripped slug for the rest.
const CRAIGSLIST_SUBDOMAIN_MAP = {
  'st louis': 'stlouis',
  'st. louis': 'stlouis',
  'kansas city': 'kansascity',
  'san antonio': 'sanantonio',
  'san diego': 'sandiego',
  'los angeles': 'losangeles',
  'las vegas': 'lasvegas',
  'new york': 'newyork',
  'new york city': 'newyork',
  'new orleans': 'neworleans',
  'salt lake city': 'saltlakecity',
  'fort worth': 'dallas', // Craigslist routes Fort Worth through Dallas
};

function craigslistSubdomain(city) {
  const key = String(city || '').toLowerCase().trim();
  if (CRAIGSLIST_SUBDOMAIN_MAP[key]) return CRAIGSLIST_SUBDOMAIN_MAP[key];
  const slug = key.replace(/[^a-z0-9]/g, '');
  return slug || null;
}

export async function runScrapeTask(data) {
  const { source, url, filters } = data || {};
  if (!source) {
    throw new Error('runScrapeTask: Missing source parameter');
  }

  console.log(`[runScrapeTask] Running background scrape task for source: ${source}`);
  
  // Dynamically load scraper classes to prevent circular dependency
  const scraperClasses = await import('../scrapers/scraperClasses.js');
  let scraper;

  const lowerSource = source.toLowerCase();
  if (lowerSource === 'zillow') {
    scraper = new scraperClasses.ZillowScraper();
  } else if (lowerSource === 'craigslist') {
    scraper = new scraperClasses.CraigslistScraper();
  } else if (lowerSource === 'facebook' || lowerSource === 'facebook marketplace') {
    scraper = new scraperClasses.FacebookScraper();
  } else if (lowerSource === 'propstream') {
    scraper = new scraperClasses.PropStreamScraper();
  } else if (lowerSource === 'batchleads') {
    scraper = new scraperClasses.BatchLeadsScraper();
  } else if (lowerSource === 'fsbo') {
    scraper = new scraperClasses.FSBOScraper();
  } else if (lowerSource === 'auction') {
    scraper = new scraperClasses.AuctionScraper();
  } else if (lowerSource === 'subject to' || lowerSource === 'subject-to' || lowerSource === 'subjectto') {
    scraper = new scraperClasses.SubjectToScraper();
  } else if (lowerSource === 'realtors' || lowerSource === 'realtor directory' || lowerSource === 'realtor') {
    scraper = new scraperClasses.RealtorDirectoryScraper();
  } else if (lowerSource === 'title companies' || lowerSource === 'title directory' || lowerSource === 'title' || lowerSource === 'title-companies') {
    scraper = new scraperClasses.TitleDirectoryScraper();
  } else {
    throw new Error(`runScrapeTask: No scraper class registered for source "${source}"`);
  }

  // Load saved areas (cities/counties) so the configured markets drive the scrape
  let areas = data.areas;
  if (!areas || !areas.length) {
    try {
      const { cities } = await import('./db.js');
      const cityRows = await cities.list();
      areas = cityRows.map(c => ({ city: c.cityName, state: c.state, countyName: c.countyName }));
    } catch (err) {
      console.warn(`[runScrapeTask] Could not load saved areas: ${err.message}`);
      areas = [];
    }
  }

  const urls = buildSearchUrls(source, url, areas);
  const targets = urls.length ? urls : [null]; // null → scraper default URL
  let count = 0;

  // Log this run for the Settings status readout (URL used, records, errors)
  let runId = null;
  try {
    const { startScrapeRun } = await import('./db.js');
    const urlLabel = (targets.filter(Boolean).join(' | ') || (url || '').trim() || '(default URL)').slice(0, 500);
    runId = await startScrapeRun(source, urlLabel);
  } catch (err) {
    console.warn(`[runScrapeTask] Could not log scrape run start: ${err.message}`);
  }

  // Hard safety limits so a stuck site can never hold the queue forever:
  // - SCRAPE_MAX_RUN_MS: whole job aborts after this (default 15 min)
  // - SCRAPE_MAX_ITEMS: stop saving after this many records (default 300)
  const MAX_RUN_MS = parseInt(process.env.SCRAPE_MAX_RUN_MS || String(15 * 60 * 1000), 10);
  const MAX_ITEMS = parseInt(process.env.SCRAPE_MAX_ITEMS || '300', 10);
  const runMins = Math.round(MAX_RUN_MS / 60000);
  const runLabel = runMins >= 1 ? `${runMins} min` : `${Math.round(MAX_RUN_MS / 1000)}s`;
  const timeoutMsg = `Scrape ${source} timed out after ${runLabel} (safety limit)`;
  let timedOut = false;
  const timeoutTimer = setTimeout(() => {
    timedOut = true;
    scraper.disconnect().catch(() => {}); // force-close the browser to unblock in-flight calls
  }, MAX_RUN_MS);

  try {
    for (const target of targets) {
      if (timedOut) throw new Error(timeoutMsg);

      // 1. Scrape raw items for this target URL
      let rawItems;
      try {
        rawItems = await scraper.scrape(target ? { url: target, ...filters } : { ...filters });
      } catch (err) {
        if (timedOut) throw new Error(timeoutMsg);
        throw err;
      }
      console.log(`[runScrapeTask] Scraped ${rawItems.length} raw items from ${source}${target ? ` (${target})` : ' (default URL)'}`);

      // 2. Normalize and save items with rate limiting delay
      for (const item of rawItems) {
        if (timedOut) throw new Error(timeoutMsg);
        if (count >= MAX_ITEMS) {
          console.warn(`[runScrapeTask] Reached ${MAX_ITEMS}-record cap for ${source}; stopping.`);
          break;
        }
        // Rate limit delay between requests/processes
        await scraper.delay();

        const normalized = await scraper.normalize(item);
        const saved = await scraper.save(normalized);
        if (saved) {
          count++;
        }
      }
      if (count >= MAX_ITEMS) break;
    }

    if (timedOut) throw new Error(timeoutMsg);

    if (runId) {
      const { finishScrapeRun } = await import('./db.js');
      await finishScrapeRun(runId, count).catch(() => {});
    }
  } catch (err) {
    // Always release the browser so we never leak processes on failure/timeout
    try { await scraper.disconnect(); } catch { /* ignore */ }
    if (runId) {
      const { failScrapeRun } = await import('./db.js');
      await failScrapeRun(runId, err.message).catch(() => {});
    }
    throw err;
  } finally {
    clearTimeout(timeoutTimer);
  }

  console.log(`[runScrapeTask] Completed scraping task for ${source}. Saved/updated ${count} records.`);
  return { success: true, count };
}
