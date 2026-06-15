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
    
    const headless = process.env.SCRAPER_HEADLESS !== 'false';
    const launchOptions = {
      headless,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--use-fake-device-for-media-stream',
        '--disable-web-security',
        '--allow-running-insecure-content'
      ]
    };

    // Integrate proxy rotation credentials if configured
    const proxyServer = process.env.SCRAPER_PROXY_SERVER;
    if (proxyServer) {
      console.log(`[BaseScraper] Launching browser context using proxy: ${proxyServer}`);
      launchOptions.proxy = {
        server: proxyServer
      };
      
      const proxyUser = process.env.SCRAPER_PROXY_USERNAME;
      const proxyPass = process.env.SCRAPER_PROXY_PASSWORD;
      if (proxyUser && proxyPass) {
        launchOptions.proxy.username = proxyUser;
        launchOptions.proxy.password = proxyPass;
      }
    }

    this.browser = await chromium.launch(launchOptions);
    
    // Rotate User Agents to avoid static signature flagging
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0'
    ];
    const randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];

    this.context = await this.browser.newContext({
      userAgent: randomUserAgent,
      viewport: { width: 1280, height: 720 },
      deviceScaleFactor: 1,
      hasTouch: false,
      isMobile: false
    });

    // Mask the automation navigator flag
    await this.context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined
      });
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
