import { BaseScraper } from './baseScraper.js';
import { scrapeZillow } from './zillow.js';
import { scrapeCraigslist } from './craigslist.js';
import { scrapeFacebook } from './facebook.js';
import { scrapePropStream } from './propstream.js';
import { scrapeBatchLeads } from './batchleads.js';
import { scrapeFSBO } from './fsbo.js';
import { scrapeAuction } from './auction.js';
import { scrapeSubjectTo } from './subjectto.js';
import { scrapeRealtors } from './realtorsDirectory.js';
import { scrapeTitleCompanies } from './titleDirectory.js';
import { scrapeRedfin } from './redfin.js';
import { scrapeRealtor } from './realtor.js';
import { scrapeCountyRecords } from './countyRecords.js';
import { scrapeHUD, HUDAdapter } from './hud.js';
import { FSBOAdapter, AuctionAdapter, SubjectToAdapter, CountyRecordsAdapter } from '../server/sourceAdapters.js';

export class ZillowScraper extends BaseScraper {
  constructor() {
    super('Zillow');
    this.rateLimitDelay = 2000;
  }

  async scrape(filters = {}) {
    await this.connect();
    try {
      const url = filters.url || 'https://www.zillow.com/homes/for_sale/';
      return await scrapeZillow(this.context, url);
    } finally {
      await this.disconnect();
    }
  }
}

export class CraigslistScraper extends BaseScraper {
  constructor() {
    super('Craigslist');
    this.rateLimitDelay = 1000;
  }

  async scrape(filters = {}) {
    await this.connect();
    try {
      const url = filters.url || 'https://cleveland.craigslist.org/search/hhh';
      return await scrapeCraigslist(this.context, url);
    } finally {
      await this.disconnect();
    }
  }
}

export class FacebookScraper extends BaseScraper {
  constructor() {
    super('Facebook Marketplace');
    this.rateLimitDelay = 2500;
  }

  async scrape(filters = {}) {
    await this.connect();
    try {
      const url = filters.url || 'https://www.facebook.com/marketplace/';
      return await scrapeFacebook(this.context, url);
    } finally {
      await this.disconnect();
    }
  }
}

export class PropStreamScraper extends BaseScraper {
  constructor() {
    super('PropStream');
    this.rateLimitDelay = 1500;
  }

  async scrape(filters = {}) {
    await this.connect();
    try {
      const url = filters.url || 'https://app.propstream.com/';
      return await scrapePropStream(this.context, url);
    } finally {
      await this.disconnect();
    }
  }
}

export class BatchLeadsScraper extends BaseScraper {
  constructor() {
    super('BatchLeads');
    this.rateLimitDelay = 1500;
  }

  async scrape(filters = {}) {
    await this.connect();
    try {
      const url = filters.url || 'https://app.batchleads.io/';
      return await scrapeBatchLeads(this.context, url);
    } finally {
      await this.disconnect();
    }
  }
}

export class FSBOScraper extends BaseScraper {
  constructor() {
    super('FSBO');
    this.rateLimitDelay = 1500;
    this.adapter = new FSBOAdapter();
  }

  async normalize(rawItem) {
    return this.adapter.normalize(rawItem);
  }

  async scrape(filters = {}) {
    await this.connect();
    const url = filters.url || 'https://www.forsalebyowner.com/search/list';
    let rawItems = [];
    try {
      rawItems = await scrapeFSBO(this.context, url);
    } finally {
      await this.disconnect();
    }
    return rawItems;
  }
}

export class AuctionScraper extends BaseScraper {
  constructor() {
    super('Auction');
    this.rateLimitDelay = 2000;
    this.adapter = new AuctionAdapter();
  }

  async normalize(rawItem) {
    return this.adapter.normalize(rawItem);
  }

  async scrape(filters = {}) {
    await this.connect();
    const url = filters.url || 'https://www.auction.com/residential/';
    let rawItems = [];
    try {
      rawItems = await scrapeAuction(this.context, url);
    } finally {
      await this.disconnect();
    }
    return rawItems;
  }
}

export class SubjectToScraper extends BaseScraper {
  constructor() {
    super('Subject To');
    this.rateLimitDelay = 1500;
    this.adapter = new SubjectToAdapter();
  }

  async normalize(rawItem) {
    return this.adapter.normalize(rawItem);
  }

  async scrape(filters = {}) {
    await this.connect();
    let rawItems = [];
    try {
      rawItems = await scrapeSubjectTo(this.context, filters.url || 'https://www.subjectto.com/listings');
    } finally {
      await this.disconnect();
    }
    return rawItems;
  }
}

/**
 * DirectoryScraper writes to the realtors / title_companies tables instead of
 * properties. BaseScraper.save() is hard-coded to the properties table + address
 * dup-detection, so it cannot be reused here — normalize() and save() are both
 * overridden. entityType is 'realtor' or 'title'.
 */
export class DirectoryScraper extends BaseScraper {
  constructor(sourceName, entityType) {
    super(sourceName);
    this.entityType = entityType;
    this.rateLimitDelay = 1500;
  }

  async normalize(rawItem) {
    if (this.entityType === 'title') {
      return {
        companyName: rawItem.companyName || rawItem.name || rawItem.title || '',
        contactName: rawItem.contactName || '',
        phone: rawItem.phone || '',
        email: rawItem.email || '',
        address: rawItem.address || rawItem.location || '',
        state: rawItem.state || '',
        countyName: rawItem.countyName || rawItem.county || '',
        source: this.sourceName,
        sourceUrl: rawItem.url || rawItem.sourceUrl || '',
        notes: rawItem.notes || '',
      };
    }
    return {
      name: rawItem.name || rawItem.title || '',
      brokerage: rawItem.brokerage || '',
      phone: rawItem.phone || '',
      email: rawItem.email || '',
      licenseNumber: rawItem.licenseNumber || '',
      state: rawItem.state || '',
      countyName: rawItem.countyName || rawItem.county || '',
      city: rawItem.city || '',
      source: this.sourceName,
      sourceUrl: rawItem.url || rawItem.sourceUrl || '',
      notes: rawItem.notes || '',
    };
  }

  async save(normalizedItem) {
    const { query, realtors, titleCompanies } = await import('../server/db.js');

    if (this.entityType === 'title') {
      const name = (normalizedItem.companyName || '').trim();
      if (!name) return null;
      const county = (normalizedItem.countyName || '').trim().toLowerCase();
      try {
        const existing = await query(
          "SELECT * FROM title_companies WHERE LOWER(company_name) = $1 AND LOWER(COALESCE(county_name, '')) = $2",
          [name.toLowerCase(), county]
        );
        if (existing && existing.length > 0) {
          console.log(`[DirectoryScraper - ${this.sourceName}] Duplicate title company "${name}". Updating.`);
          return await titleCompanies.update(existing[0].id, normalizedItem, this.userId);
        }
        console.log(`[DirectoryScraper - ${this.sourceName}] Inserting title company "${name}".`);
        return await titleCompanies.insert(normalizedItem, this.userId);
      } catch (err) {
        console.error(`[DirectoryScraper - ${this.sourceName}] Error saving title company:`, err.message);
        throw err;
      }
    }

    const name = (normalizedItem.name || '').trim();
    if (!name) return null;
    const county = (normalizedItem.countyName || '').trim().toLowerCase();
    try {
      const existing = await query(
        "SELECT * FROM realtors WHERE LOWER(name) = $1 AND LOWER(COALESCE(county_name, '')) = $2",
        [name.toLowerCase(), county]
      );
      if (existing && existing.length > 0) {
        console.log(`[DirectoryScraper - ${this.sourceName}] Duplicate realtor "${name}". Updating.`);
        return await realtors.update(existing[0].id, normalizedItem, this.userId);
      }
      console.log(`[DirectoryScraper - ${this.sourceName}] Inserting realtor "${name}".`);
      return await realtors.insert(normalizedItem, this.userId);
    } catch (err) {
      console.error(`[DirectoryScraper - ${this.sourceName}] Error saving realtor:`, err.message);
      throw err;
    }
  }
}

export class RealtorDirectoryScraper extends DirectoryScraper {
  constructor() {
    super('Realtor Directory', 'realtor');
  }

  async scrape(filters = {}) {
    await this.connect();
    let rawItems = [];
    try {
      rawItems = await scrapeRealtors(this.context, filters.url || 'https://www.realtor.com/realtor-directory/');
    } finally {
      await this.disconnect();
    }
    return rawItems;
  }
}

export class TitleDirectoryScraper extends DirectoryScraper {
  constructor() {
    super('Title Directory', 'title');
  }

  async scrape(filters = {}) {
    await this.connect();
    let rawItems = [];
    try {
      rawItems = await scrapeTitleCompanies(this.context, filters.url || 'https://www.yellowpages.com/search?q=title+companies');
    } finally {
      await this.disconnect();
    }
    return rawItems;
  }
}

export class RedfinScraper extends BaseScraper {
  constructor() {
    super('Redfin');
    this.rateLimitDelay = 2000;
  }

  async scrape(filters = {}) {
    await this.connect();
    try {
      const url = filters.url || 'https://www.redfin.com/oh/cleveland';
      return await scrapeRedfin(this.context, url);
    } finally {
      await this.disconnect();
    }
  }
}

export class RealtorScraper extends BaseScraper {
  constructor() {
    super('Realtor.com');
    this.rateLimitDelay = 2000;
  }

  async scrape(filters = {}) {
    await this.connect();
    try {
      const url = filters.url || 'https://www.realtor.com/realestateandhomes-search/Cleveland_OH';
      return await scrapeRealtor(this.context, url);
    } finally {
      await this.disconnect();
    }
  }
}

export class CountyRecordsScraper extends BaseScraper {
  constructor() {
    super('County Records');
    this.rateLimitDelay = 1500;
    this.adapter = new CountyRecordsAdapter();
  }

  async scrape(filters = {}) {
    await this.connect();
    try {
      const url = filters.url || '';
      return await scrapeCountyRecords(this.context, url);
    } finally {
      await this.disconnect();
    }
  }
}

export class HudScraper extends BaseScraper {
  constructor() {
    super('HUD');
    this.rateLimitDelay = 2000;
    this.adapter = new HUDAdapter();
  }

  async scrape(filters = {}) {
    await this.connect();
    try {
      const url = filters.url || '';
      const location = filters.state || filters.location || 'OH';
      return await scrapeHUD(this.context, url, location);
    } finally {
      await this.disconnect();
    }
  }
}
