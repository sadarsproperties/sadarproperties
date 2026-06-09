import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { createObjectCsvWriter } from 'csv-writer';
import { CONFIG } from './config.js';

// Import scrapers
import { scrapeCraigslist } from './scrapers/craigslist.js';
import { scrapeZillow } from './scrapers/zillow.js';
import { scrapeFacebook } from './scrapers/facebook.js';
import { scrapePropStream } from './scrapers/propstream.js';
import { scrapeBatchLeads } from './scrapers/batchleads.js';

const scrapers = {
  craigslist: scrapeCraigslist,
  zillow: scrapeZillow,
  facebook: scrapeFacebook,
  propstream: scrapePropStream,
  batchleads: scrapeBatchLeads
};

async function main() {
  // Parse command line arguments
  // Usage: npm run scrape -- [engine] [target_url_or_query]
  const args = process.argv.slice(2);
  const engine = args[0]?.toLowerCase();
  const target = args[1];

  if (!engine || !scrapers[engine]) {
    console.error(`Error: Invalid or missing scraper engine.`);
    console.log(`Available engines: ${Object.keys(scrapers).join(', ')}`);
    console.log(`Usage: npm run scrape -- <engine> "<target_url_or_query>"`);
    process.exit(1);
  }

  console.log(`[Scraper] Starting ${engine} scraper...`);
  console.log(`[Scraper] Target: ${target || 'Default target'}`);

  // Create necessary directories
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }
  const sessionsDir = path.join(path.dirname(CONFIG.facebook.cookiesPath));
  if (!fs.existsSync(sessionsDir)) {
    fs.mkdirSync(sessionsDir, { recursive: true });
  }

  // Launch Playwright Browser
  const browser = await chromium.launch({
    headless: CONFIG.headless,
    slowMo: CONFIG.slowMo,
    args: [
      '--disable-blink-features=AutomationControlled', // help bypass simple bot detection
      '--use-fake-device-for-media-stream',
      '--use-fake-ui-for-media-stream'
    ]
  });

  // Create browser context with customized user agent
  const context = await browser.newContext({
    userAgent: CONFIG.userAgent,
    viewport: { width: 1280, height: 800 },
    proxy: CONFIG.proxy
  });

  try {
    // Execute specific scraper
    const results = await scrapers[engine](context, target);
    
    if (results && results.length > 0) {
      await saveResults(engine, results);
    } else {
      console.log('[Scraper] No data returned or extraction yielded empty results.');
    }
  } catch (error) {
    console.error('[Scraper Error] Extraction failed:', error);
  } finally {
    await browser.close();
    console.log('[Scraper] Browser closed. Process finished.');
  }
}

async function saveResults(engine, data) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${engine}_data_${timestamp}`;
  
  if (CONFIG.outputFormat === 'csv') {
    const filePath = path.join(CONFIG.outputDir, `${filename}.csv`);
    const headers = Object.keys(data[0]).map(key => ({ id: key, title: key }));
    
    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: headers
    });
    
    await csvWriter.writeRecords(data);
    console.log(`[Scraper] Data successfully saved to CSV: ${filePath}`);
  } else {
    const filePath = path.join(CONFIG.outputDir, `${filename}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`[Scraper] Data successfully saved to JSON: ${filePath}`);
  }
}

main().catch(err => {
  console.error('[Fatal Error]', err);
  process.exit(1);
});
