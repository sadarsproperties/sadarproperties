/**
 * Base Scraper Class defining the common scraping interface
 */
export class BaseScraper {
  constructor(sourceName) {
    this.sourceName = sourceName;
    this.browser = null;
    this.context = null;
    this.rateLimitDelay = 1500; // Configurable request delay in ms
  }

  async connect() {
    const { chromium } = await import('playwright');
    this.browser = await chromium.launch({
      headless: true,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--use-fake-device-for-media-stream'
      ]
    });
    this.context = await this.browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
  }

  async disconnect() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.context = null;
    }
  }

  async scrape(filters) {
    throw new Error('scrape() method must be implemented by subclasses.');
  }

  async normalize(rawItem) {
    // Clean and map raw data into standard properties schema format
    let priceVal = null;
    if (rawItem.price) {
      const parsed = parseFloat(String(rawItem.price).replace(/[^0-9.]/g, ''));
      if (!isNaN(parsed)) priceVal = parsed;
    }

    return {
      address: rawItem.address || rawItem.title || 'Unknown Address',
      city: rawItem.city || rawItem.location || '',
      state: rawItem.state || '',
      zip_code: rawItem.zip_code || rawItem.zip || '',
      price: priceVal,
      bedrooms: rawItem.bedrooms ? parseInt(rawItem.bedrooms, 10) : null,
      bathrooms: rawItem.bathrooms ? parseFloat(rawItem.bathrooms) : null,
      square_feet: rawItem.square_feet ? parseInt(String(rawItem.square_feet).replace(/[^0-9]/g, ''), 10) : null,
      status: 'new',
      source_platform: this.sourceName,
      source_url: rawItem.url || '',
    };
  }

  async save(normalizedItem) {
    const { query, properties } = await import('../server/db.js');
    if (!normalizedItem.address || normalizedItem.address === 'Unknown Address') {
      return null;
    }

    // Duplicate detection: match on address + zip_code
    const cleanAddress = normalizedItem.address.trim().toLowerCase();
    const cleanZip = String(normalizedItem.zip_code || '').trim().toLowerCase();

    try {
      const existing = await query(
        'SELECT * FROM properties WHERE LOWER(address) = $1 AND LOWER(COALESCE(zip_code, \'\')) = $2',
        [cleanAddress, cleanZip]
      );

      if (existing && existing.length > 0) {
        console.log(`[BaseScraper - ${this.sourceName}] Duplicate detected for "${normalizedItem.address}". Updating existing record.`);
        const updated = await properties.update(existing[0].id, normalizedItem);
        return updated;
      } else {
        console.log(`[BaseScraper - ${this.sourceName}] Inserting new record for "${normalizedItem.address}".`);
        const inserted = await properties.insert(normalizedItem);
        return inserted;
      }
    } catch (err) {
      console.error(`[BaseScraper - ${this.sourceName}] Error saving record:`, err.message);
      throw err;
    }
  }

  async delay() {
    return new Promise(resolve => setTimeout(resolve, this.rateLimitDelay));
  }
}
