import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const CONFIG = {
  // Output options
  outputDir: path.join(__dirname, 'output'),
  outputFormat: process.env.OUTPUT_FORMAT || 'csv', // 'csv' or 'json'

  // Browser options
  headless: process.env.HEADLESS === 'true' || false, // default to false (headed) to observe and avoid easy bot-detection
  slowMo: parseInt(process.env.SLOW_MO || '100', 10), // delay in ms between actions
  userAgent: process.env.USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',

  // Proxy settings (Optional but recommended for Zillow/Facebook)
  proxy: process.env.PROXY_SERVER ? {
    server: process.env.PROXY_SERVER,
    username: process.env.PROXY_USERNAME,
    password: process.env.PROXY_PASSWORD,
  } : undefined,

  // Credentials (Use dotenv to populate these securely)
  facebook: {
    email: process.env.FACEBOOK_EMAIL || '',
    password: process.env.FACEBOOK_PASSWORD || '',
    cookiesPath: path.join(__dirname, 'sessions', 'facebook_cookies.json')
  },
  propStream: {
    email: process.env.PROPSTREAM_EMAIL || '',
    password: process.env.PROPSTREAM_PASSWORD || '',
    cookiesPath: path.join(__dirname, 'sessions', 'propstream_cookies.json')
  },
  batchLeads: {
    email: process.env.BATCHLEADS_EMAIL || '',
    password: process.env.BATCHLEADS_PASSWORD || '',
    cookiesPath: path.join(__dirname, 'sessions', 'batchleads_cookies.json')
  }
};
