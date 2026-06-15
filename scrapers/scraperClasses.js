import { BaseScraper } from './baseScraper.js';
import { scrapeZillow } from './zillow.js';
import { scrapeCraigslist } from './craigslist.js';
import { scrapeFacebook } from './facebook.js';
import { scrapePropStream } from './propstream.js';
import { scrapeBatchLeads } from './batchleads.js';

export class ZillowScraper extends BaseScraper {
  constructor() {
    super('Zillow');
    this.rateLimitDelay = 2000;
  }

  async scrape(filters = {}) {
    await this.connect();
    const url = filters.url || 'https://www.zillow.com/homes/for_sale/';
    const rawItems = await scrapeZillow(this.context, url);
    await this.disconnect();
    return rawItems;
  }
}

export class CraigslistScraper extends BaseScraper {
  constructor() {
    super('Craigslist');
    this.rateLimitDelay = 1000;
  }

  async scrape(filters = {}) {
    await this.connect();
    const url = filters.url || 'https://newyork.craigslist.org/search/apt';
    const rawItems = await scrapeCraigslist(this.context, url);
    await this.disconnect();
    return rawItems;
  }
}

export class FacebookScraper extends BaseScraper {
  constructor() {
    super('Facebook Marketplace');
    this.rateLimitDelay = 2500;
  }

  async scrape(filters = {}) {
    await this.connect();
    const url = filters.url || 'https://www.facebook.com/marketplace/nyc/propertyrentals';
    const rawItems = await scrapeFacebook(this.context, url);
    await this.disconnect();
    return rawItems;
  }
}

export class PropStreamScraper extends BaseScraper {
  constructor() {
    super('PropStream');
    this.rateLimitDelay = 1500;
  }

  async scrape(filters = {}) {
    await this.connect();
    const url = filters.url || 'https://www.propstream.com/listings';
    const rawItems = await scrapePropStream(this.context, url);
    await this.disconnect();
    return rawItems;
  }
}

export class BatchLeadsScraper extends BaseScraper {
  constructor() {
    super('BatchLeads');
    this.rateLimitDelay = 1500;
  }

  async scrape(filters = {}) {
    await this.connect();
    const url = filters.url || 'https://www.batchleads.io/properties';
    const rawItems = await scrapeBatchLeads(this.context, url);
    await this.disconnect();
    return rawItems;
  }
}
