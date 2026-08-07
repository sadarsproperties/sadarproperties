import 'dotenv/config';
import fs from 'fs';
import path from 'path';

try {
  const srcPath = '/home/user/.cache/sadar_properties_app_icon_transparent.png';
  const destPath = path.join(process.cwd(), 'sadar_properties_app_icon_transparent.png');
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
    console.log('[Startup] Successfully copied transparent app icon to workspace!');
  }
} catch (err) {
  console.error('[Startup] Failed to copy transparent app icon:', err.message);
}

import cors from 'cors';
import express from 'express';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import {
  getAllData,
  getUserByEmail,
  getUserByFacebookId,
  getUserByGoogleId,
  getUserById,
  initDb,
  createUser,
  updateUser,
  rowToUser,
  sellers,
  buyers,
  investors,
  properties,
  query,
  autoMatchProperty,
} from './db.js';
import { sendEmail, buildDealEmailHtml, buildDealEmailText, sendWelcomeEmail, sendActivityNotification } from './resend.js';
import { CONFIG } from '../config.js';
import { initQueue, addJob, registerJobProcessor } from './queue.js';
import { generateServerExport, exportJobs } from './exportService.js';

// Scrapers
import { scrapeCraigslist } from '../scrapers/craigslist.js';
import { scrapeZillow } from '../scrapers/zillow.js';
import { scrapeFacebook } from '../scrapers/facebook.js';
import { scrapePropStream } from '../scrapers/propstream.js';
import { scrapeBatchLeads } from '../scrapers/batchleads.js';

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-insecure-secret-change-in-production';
const JWT_COOKIE_NAME = 'wiq_token';
const isProd = process.env.NODE_ENV === 'production';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_CALLBACK = process.env.GOOGLE_CALLBACK_URL || `http://localhost:${PORT}/api/auth/google/callback`;

const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID || '';
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET || '';
const FACEBOOK_CALLBACK = process.env.FACEBOOK_CALLBACK_URL || `http://localhost:${PORT}/api/auth/facebook/callback`;

app.use(cors({
  origin: [FRONTEND_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
}));
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

const nowIso = () => new Date().toISOString();

// ==================== AUTH HELPERS ====================

function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function setAuthCookie(res, token) {
  res.cookie(JWT_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: isProd ? 'none' : 'lax',
    secure: isProd,
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
}

function clearAuthCookie(res) {
  res.clearCookie(JWT_COOKIE_NAME, { path: '/' });
}

async function getUserFromReq(req) {
  // Support both cookie and Authorization header (Bearer token)
  let token = req.cookies?.[JWT_COOKIE_NAME];
  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    }
  }
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return await getUserById(payload.sub);
  } catch {
    return null;
  }
}

async function requireAuth(req, res, next) {
  try {
    const user = await getUserFromReq(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

// ==================== OAUTH HELPERS (manual, no extra deps) ====================

function buildGoogleAuthUrl(state) {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_CALLBACK,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

async function exchangeGoogleCode(code) {
  const body = new URLSearchParams({
    code,
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    redirect_uri: GOOGLE_CALLBACK,
    grant_type: 'authorization_code',
  });

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!tokenRes.ok) throw new Error('Google token exchange failed');
  const tokenData = await tokenRes.json();

  const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  if (!profileRes.ok) throw new Error('Failed to fetch Google profile');
  const profile = await profileRes.json();
  return { profile, tokens: tokenData };
}

function buildFacebookAuthUrl(state) {
  const params = new URLSearchParams({
    client_id: FACEBOOK_APP_ID,
    redirect_uri: FACEBOOK_CALLBACK,
    response_type: 'code',
    scope: 'email,public_profile',
    state,
  });
  return `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`;
}

// ==================== AI BUY BOX EXTRACTION (DeepSeek + Gemini + OpenAI + Playwright) ====================

async function playwrightScrape(url) {
  // Advanced scraping using Playwright (synchronized with CLI scraper configuration)
  try {
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({
      headless: CONFIG.headless, // Respect config.js setting (allows solving CAPTCHAs in headed mode)
      args: [
        '--disable-blink-features=AutomationControlled', // Bypass basic automation detection
        '--use-fake-device-for-media-stream',
        '--use-fake-ui-for-media-stream'
      ]
    });
    
    // Create page with configured custom User-Agent and proxy from config.js
    const context = await browser.newContext({
      userAgent: CONFIG.userAgent,
      viewport: { width: 1280, height: 800 },
      proxy: CONFIG.proxy
    });

    // Inject stealth init scripts to bypass automated browser signatures (PerimeterX, Cloudflare)
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      window.chrome = { runtime: {} };
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
      
      // Align platform and userAgentData to match the chosen User-Agent and prevent CAPTCHA loops
      const ua = navigator.userAgent;
      let platformVal = 'Linux x86_64';
      if (ua.includes('Windows')) platformVal = 'Win32';
      else if (ua.includes('Macintosh')) platformVal = 'MacIntel';
      Object.defineProperty(navigator, 'platform', { get: () => platformVal });

      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters) =>
        parameters.name === 'notifications'
          ? Promise.resolve({ state: Notification.permission })
          : originalQuery(parameters);
    });
    
    // Detect special platforms and utilize the dedicated scraper engines
    let scraperResults = null;
    const lowerUrl = url.toLowerCase();
    try {
      if (lowerUrl.includes('zillow.com')) {
        console.log('[Server Scraper] Running dedicated Zillow Scraper...');
        scraperResults = await scrapeZillow(context, url);
      } else if (lowerUrl.includes('craigslist.org') || lowerUrl.includes('craigslist.com')) {
        console.log('[Server Scraper] Running dedicated Craigslist Scraper...');
        scraperResults = await scrapeCraigslist(context, url);
      } else if (lowerUrl.includes('facebook.com')) {
        console.log('[Server Scraper] Running dedicated Facebook Scraper...');
        scraperResults = await scrapeFacebook(context, url);
      } else if (lowerUrl.includes('propstream.com')) {
        console.log('[Server Scraper] Running dedicated PropStream Scraper...');
        scraperResults = await scrapePropStream(context, url);
      } else if (lowerUrl.includes('batchleads.io') || lowerUrl.includes('batchleads.com')) {
        console.log('[Server Scraper] Running dedicated BatchLeads Scraper...');
        scraperResults = await scrapeBatchLeads(context, url);
      }
    } catch (scraperErr) {
      console.warn(`[Server Scraper] Dedicated scraper execution failed: ${scraperErr.message}. Falling back to standard DOM scraping.`);
    }

    if (scraperResults && scraperResults.length > 0) {
      console.log(`[Server Scraper] Scraper engine successfully extracted ${scraperResults.length} records.`);
      await browser.close();
      return JSON.stringify(scraperResults, null, 2);
    }

    // Default Fallback: Open page and parse using Cheerio for server-side extraction
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    
    // Scroll slightly to trigger load events for dynamic/lazy-loaded text
    await page.evaluate(() => window.scrollBy(0, 500));
    await page.waitForTimeout(1000);

    const html = await page.content();
    await browser.close();

    let text = '';
    try {
      const cheerio = await import('cheerio');
      const $ = cheerio.load(html);
      $('script, style, iframe, noscript').remove();
      const desc = $('meta[name="description"]').attr('content') || '';
      const bodyText = $('main, article, .profile, body').first().text() || $('body').text();
      text = (desc + ' ' + bodyText).replace(/\s+/g, ' ').slice(0, 8000);
    } catch (cheerioErr) {
      console.warn('[Server Scraper] Cheerio extraction failed, parsing using simple tags regex:', cheerioErr.message);
      text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 8000);
    }
    return text;
  } catch (e) {
    console.warn('[Server Scraper] Playwright scrape failed, falling back to basic fetch:', e.message);
    const resp = await fetch(url, { headers: { 'User-Agent': CONFIG.userAgent || 'Mozilla/5.0' } });
    let html = await resp.text();
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 8000);
  }
}

async function callDeepSeek(prompt, content) {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) throw new Error('No DeepSeek key');

  // DeepSeek V4 model fallback: fast flash first, then full pro
  const models = ['deepseek-v4-flash', 'deepseek-v4-pro'];
  let lastError = null;

  for (const model of models) {
    try {
      console.log(`[DeepSeek] Attempting extraction with model: ${model}...`);
      const resp = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: prompt },
            { role: 'user', content: content.slice(0, 6000) }
          ],
          temperature: 0.1,
          response_format: { type: 'json_object' }
        })
      });

      if (!resp.ok) {
        const errText = await resp.text();
        console.warn(`[DeepSeek] Model ${model} failed with status ${resp.status}: ${errText}`);
        lastError = new Error(`DeepSeek API error ${resp.status}: ${errText}`);
        continue; // Try next model
      }

      const data = await resp.json();
      const text = data.choices?.[0]?.message?.content || '{}';
      console.log(`[DeepSeek] Successfully extracted with model: ${model}`);
      return JSON.parse(text);
    } catch (e) {
      console.warn(`[DeepSeek] Call to ${model} threw error: ${e.message}`);
      lastError = e;
    }
  }

  throw lastError || new Error('All DeepSeek models failed');
}

async function callGemini(prompt, content) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('No Gemini key');

  // Multi-model fallback sequence matching YouExtractor's driver configuration
  const models = ['gemini-flash-latest', 'gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-pro-latest'];
  let lastError = null;

  for (const model of models) {
    try {
      console.log(`[Gemini] Attempting extraction with model: ${model}...`);
      const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt + '\n\n' + content.slice(0, 6000) }] }],
          generationConfig: { temperature: 0.1, responseMimeType: 'application/json' }
        })
      });

      if (!resp.ok) {
        const errText = await resp.text();
        console.warn(`[Gemini] Model ${model} failed with status ${resp.status}: ${errText}`);
        lastError = new Error(`Gemini API error ${resp.status}: ${errText}`);
        continue; // Try next model
      }

      const data = await resp.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      return JSON.parse(text);
    } catch (e) {
      console.warn(`[Gemini] Call to ${model} threw error: ${e.message}`);
      lastError = e;
    }
  }

  throw lastError || new Error('All Gemini models failed');
}

async function extractBuyBox(contentOrUrl, isUrl = false) {
  let content = contentOrUrl;
  let inferred = null;

  if (isUrl) {
    content = await playwrightScrape(contentOrUrl);  // Deeper scrape with Playwright
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        let maxPrice = 0;
        const inferredStates = new Set();
        const inferredCities = new Set();
        const inferredTypes = new Set();

        for (const item of parsed) {
          if (item.price) {
            const cleanPrice = String(item.price).replace(/[^0-9]/g, '');
            const p = parseInt(cleanPrice, 10);
            if (p && p > maxPrice) maxPrice = p;
          }
          const locStr = item.address || item.location;
          if (locStr) {
            const parts = locStr.split(',');
            if (parts.length >= 2) {
              const stateZip = parts[parts.length - 1].trim();
              const stateMatch = stateZip.match(/^([A-Z]{2})/i);
              if (stateMatch) inferredStates.add(stateMatch[1].toUpperCase());
              
              const city = parts[parts.length - 2].trim();
              if (city) inferredCities.add(city);
            } else {
              const cleanLoc = locStr.trim();
              const stateMatch = cleanLoc.match(/\b([A-Z]{2})\b/i);
              if (stateMatch) inferredStates.add(stateMatch[1].toUpperCase());
              
              const cityMatch = cleanLoc.match(/\b(Houston|Atlanta|Dallas|Austin|San Antonio|Charlotte|Raleigh|Orlando|Tampa|Miami|Columbus|Cleveland|Indianapolis|Detroit|Memphis|Nashville|Kansas City|St\.? Louis|Chicago)\b/i);
              if (cityMatch) inferredCities.add(cityMatch[1]);
            }
          }
          const detailsStr = (item.details || '') + ' ' + (item.title || '');
          if (detailsStr.trim()) {
            const lowerDet = detailsStr.toLowerCase();
            if (lowerDet.includes('sfr') || lowerDet.includes('single') || lowerDet.includes('house') || lowerDet.includes('bd') || lowerDet.includes('home')) {
              inferredTypes.add('Single Family');
            }
            if (lowerDet.includes('multi') || lowerDet.includes('duplex') || lowerDet.includes('triplex') || lowerDet.includes('quad') || lowerDet.includes('apartment')) {
              inferredTypes.add('Multifamily');
            }
          }
        }

        inferred = {
          states: Array.from(inferredStates),
          cities: Array.from(inferredCities).slice(0, 5),
          types: Array.from(inferredTypes),
          budget: maxPrice > 0 ? maxPrice : null
        };
      }
    } catch (e) {
      // Not a JSON array, treat as regular page text
    }
  }

  let systemPrompt = `You are an expert real estate wholesaling assistant. Extract contact info and structured "buy box" criteria from the provided text (investor or buyer preferences from website, LinkedIn, email, etc.).

Return ONLY valid JSON with this exact shape:
{
  "fullName": string | null,
  "companyName": string | null,
  "phone": string | null,
  "email": string | null,
  "preferredStates": string[],
  "preferredCities": string[],
  "desiredPropertyTypes": string[],
  "maxBudget": number | null,
  "budgetMin": number | null,
  "budgetMax": number | null,
  "unitRangeMin": number | null,
  "unitRangeMax": number | null,
  "investmentStrategy": string | null,
  "exclusions": string | null,
  "notes": string
}

Be accurate and conservative. Set fields to null if they cannot be determined. In the "notes" field, include any exclusions, markets they avoid, and other qualitative context.`;

  if (inferred) {
    systemPrompt += `\n\nNote: The input content is a JSON list of scraped properties. Focus on these extracted baselines:
- preferredStates: ${JSON.stringify(inferred.states)}
- preferredCities: ${JSON.stringify(inferred.cities)}
- desiredPropertyTypes: ${JSON.stringify(inferred.types.length ? inferred.types : ['Single Family'])}
- maxBudget: ${inferred.budget || 'null'}`;
  }

  // Try DeepSeek V4 first (default)
  if (process.env.DEEPSEEK_API_KEY) {
    try {
      return normalizeBuyBox(await callDeepSeek(systemPrompt, content), inferred);
    } catch (e) { console.warn('DeepSeek failed, falling back to Gemini:', e.message); }
  }

  // Fallback to Gemini
  if (process.env.GEMINI_API_KEY) {
    try {
      return normalizeBuyBox(await callGemini(systemPrompt, content), inferred);
    } catch (e) { console.warn('Gemini failed, falling back to OpenAI/Grok:', e.message); }
  }

  const apiKey = process.env.OPENAI_API_KEY || process.env.GROK_API_KEY || process.env.XAI_API_KEY;

  if (!apiKey) {
    return ruleBasedBuyBoxExtraction(content, inferred);
  }

  try {
    let apiUrl = 'https://api.openai.com/v1/chat/completions';
    let modelName = 'gpt-4o-mini';

    // Route to x.ai Grok if key matches
    if (apiKey === process.env.GROK_API_KEY || apiKey === process.env.XAI_API_KEY) {
      apiUrl = 'https://api.x.ai/v1/chat/completions';
      modelName = 'grok-beta';
    }

    const resp = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: content.slice(0, 8000) }
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' }
      })
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error('[Primary LLM API Failure]:', resp.status, errText);
      throw new Error(`LLM API error ${resp.status}: ${errText}`);
    }

    const data = await resp.json();
    return normalizeBuyBox(JSON.parse(data.choices?.[0]?.message?.content || '{}'), inferred);
  } catch (err) {
    console.warn('[Server Scraper] Primary LLM failed:', err.message);
    return ruleBasedBuyBoxExtraction(content, inferred);
  }
}

function normalizeBuyBox(raw, inferred = null) {
  const allowedTypes = [
    'Single Family Residence (SFR)',
    'Multifamily (General — 5+ units)',
    'Duplex (2 units)',
    'Triplex (3 units)',
    'Quadplex (4 units)',
    'Apartment Complex',
    'Commercial'
  ];
  const rawTypes = Array.isArray(raw.desiredPropertyTypes) ? raw.desiredPropertyTypes : (inferred?.types || []);
  const desiredPropertyTypes = [];

  for (const t of rawTypes) {
    if (!t) continue;
    const clean = String(t).trim().toLowerCase();
    if (clean.includes('single') || clean === 'sfr' || clean === 'house' || clean === 'residential') {
      if (!desiredPropertyTypes.includes('Single Family Residence (SFR)')) desiredPropertyTypes.push('Single Family Residence (SFR)');
    } else if (clean.includes('apartment') || clean === 'apartments' || clean.includes('complex')) {
      if (!desiredPropertyTypes.includes('Apartment Complex')) desiredPropertyTypes.push('Apartment Complex');
    } else if (clean.includes('multi') || clean === 'multifamily') {
      if (!desiredPropertyTypes.includes('Multifamily (General — 5+ units)')) desiredPropertyTypes.push('Multifamily (General — 5+ units)');
    } else if (clean.includes('duplex')) {
      if (!desiredPropertyTypes.includes('Duplex (2 units)')) desiredPropertyTypes.push('Duplex (2 units)');
    } else if (clean.includes('triplex')) {
      if (!desiredPropertyTypes.includes('Triplex (3 units)')) desiredPropertyTypes.push('Triplex (3 units)');
    } else if (clean.includes('quad')) {
      if (!desiredPropertyTypes.includes('Quadplex (4 units)')) desiredPropertyTypes.push('Quadplex (4 units)');
    } else if (clean.includes('commercial') || clean === 'retail' || clean === 'office' || clean === 'industrial') {
      if (!desiredPropertyTypes.includes('Commercial')) desiredPropertyTypes.push('Commercial');
    } else {
      // Find case-insensitive match from allowedTypes
      const matched = allowedTypes.find(at => at.toLowerCase().includes(clean) || clean.includes(at.toLowerCase()));
      if (matched && !desiredPropertyTypes.includes(matched)) {
        desiredPropertyTypes.push(matched);
      }
    }
  }

  // Fallback to Single Family if still empty but we have raw input or inferred input
  if (desiredPropertyTypes.length === 0 && (rawTypes.length > 0 || inferred?.types?.length > 0)) {
    desiredPropertyTypes.push('Single Family Residence (SFR)');
  }

  // Combine raw exclusions or notes if any
  let notes = String(raw.notes || '').slice(0, 300);
  if (raw.exclusions) {
    notes = `Exclusions: ${raw.exclusions}. ${notes}`.slice(0, 400);
  }

  return {
    fullName: raw.fullName || raw.name || null,
    companyName: raw.companyName || raw.company || null,
    phone: raw.phone || null,
    email: raw.email || null,
    preferredStates: Array.isArray(raw.preferredStates) && raw.preferredStates.length ? raw.preferredStates.filter(Boolean).map(s => String(s).toUpperCase().slice(0,3)) : (inferred?.states || []),
    preferredCities: Array.isArray(raw.preferredCities) && raw.preferredCities.length ? raw.preferredCities.filter(Boolean).map(String) : (inferred?.cities || []),
    desiredPropertyTypes,
    maxBudget: raw.maxBudget ? Math.round(Number(raw.maxBudget)) : (inferred?.budget || null),
    budgetMin: raw.budgetMin != null ? Math.round(Number(raw.budgetMin)) : null,
    budgetMax: raw.budgetMax != null ? Math.round(Number(raw.budgetMax)) : null,
    unitRangeMin: raw.unitRangeMin != null ? Math.round(Number(raw.unitRangeMin)) : null,
    unitRangeMax: raw.unitRangeMax != null ? Math.round(Number(raw.unitRangeMax)) : null,
    investmentStrategy: raw.investmentStrategy || null,
    notes,
  };
}

function ruleBasedBuyBoxExtraction(text, inferred = null) {
  const lower = text.toLowerCase();
  
  const states = inferred?.states || [];
  if (states.length === 0) {
    const stateRegex = /\b(TX|GA|FL|CA|NC|SC|OH|MO|IL|IN|MI|TN|AL|MS|AR|LA|OK|KS|NE|IA|WI|MN|AZ|NV|UT|CO|NM|WA|OR|ID)\b/g;
    let match;
    while ((match = stateRegex.exec(text)) !== null) {
      if (!states.includes(match[1])) states.push(match[1]);
    }
  }

  const cities = inferred?.cities || [];
  if (cities.length === 0) {
    const cityMatches = text.match(/\b(Houston|Atlanta|Dallas|Austin|San Antonio|Charlotte|Raleigh|Orlando|Tampa|Miami|Columbus|Cleveland|Indianapolis|Detroit|Memphis|Nashville|Kansas City|St\.? Louis|Chicago)\b/gi);
    if (cityMatches) cityMatches.forEach(c => { const clean = c.replace(/\./g,''); if (!cities.includes(clean)) cities.push(clean); });
  }

  const types = inferred?.types || [];
  if (types.length === 0) {
    if (/\bsfr|single family|single-family\b/.test(lower)) types.push('Single Family');
    if (/\bmulti|multifamily|multi-family|duplex|triplex|quad|4-plex\b/.test(lower)) types.push('Multifamily');
  }

  let maxBudget = inferred?.budget || null;
  if (!maxBudget) {
    const budgetMatch = lower.match(/\$?\s*(\d{2,3}(?:,\d{3})*|\d{5,6})\s*(k|000)?\s*(?:max|maximum|under|below|budget|cap)/i);
    if (budgetMatch) {
      let num = parseInt(budgetMatch[1].replace(/,/g,''), 10);
      if (budgetMatch[2]) num *= 1000;
      maxBudget = num;
    }
  }

  let email = null;
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) email = emailMatch[0];

  let phone = null;
  const phoneMatch = text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
  if (phoneMatch) phone = phoneMatch[0];

  let fullName = null;
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length > 0 && lines[0].split(' ').length <= 4 && !lines[0].includes('http') && !lines[0].includes('@')) {
    fullName = lines[0];
  }

  let notes = '';
  if (/\bfix and flip|flipping|rehab|value add\b/.test(lower)) notes += 'Fix & Flip / value-add. ';
  if (/\bbuy and hold|rental|cashflow|hold\b/.test(lower)) notes += 'Buy & Hold / rental. ';

  return normalizeBuyBox({ fullName, companyName: null, phone, email, preferredStates: states, preferredCities: cities.slice(0,5), desiredPropertyTypes: types, maxBudget, notes: notes.trim() }, inferred);
}

async function exchangeFacebookCode(code) {
  const tokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${FACEBOOK_APP_ID}&client_secret=${FACEBOOK_APP_SECRET}&redirect_uri=${encodeURIComponent(FACEBOOK_CALLBACK)}&code=${code}`;
  const tokenRes = await fetch(tokenUrl);
  if (!tokenRes.ok) throw new Error('Facebook token exchange failed');
  const tokenData = await tokenRes.json();

  const profileUrl = `https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token=${tokenData.access_token}`;
  const profileRes = await fetch(profileUrl);
  if (!profileRes.ok) throw new Error('Failed to fetch Facebook profile');
  const profile = await profileRes.json();
  return { profile, tokens: tokenData };
}

app.get('/api/health', async (_req, res) => {
  const start = Date.now();
  let dbStatus = { connected: false, latencyMs: null, error: null };

  try {
    await query('SELECT 1');
    dbStatus = {
      connected: true,
      latencyMs: Date.now() - start,
    };
  } catch (err) {
    dbStatus = {
      connected: false,
      error: err.message,
    };
  }

  const isHealthy = dbStatus.connected;
  res.status(isHealthy ? 200 : 503).json({
    ok: isHealthy,
    service: 'sadarproperties-api',
    db: dbStatus,
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/data', requireAuth, async (_req, res) => {
  res.json(await getAllData());
});

app.post('/api/support', async (req, res) => {
  const { name, email, subject, message } = req.body || {};
  if (!name || !email || !subject || !message) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const to = process.env.SUPPORT_TO_EMAIL || 'Propertiesbysardar@gmail.com';
    const html = `
      <h2>New Support Ticket Recieved</h2>
      <p><strong>From:</strong> ${name} (&lt;${email}&gt;)</p>
      <p><strong>Subject:</strong> ${subject}</p>
      <p><strong>Message:</strong></p>
      <div style="background:#F9F6F1; padding:16px; border-radius:8px; white-space:pre-wrap;">${message}</div>
    `;

    await sendEmail({
      to,
      subject: `[Support Ticket] ${subject}`,
      html,
      replyTo: email,
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('Support ticket email failed:', err);
    // Even if email delivery configuration is missing, log it and return success for better UX
    res.json({ ok: true, warning: 'Email not sent' });
  }
});


async function handleResourceNotification(user, path, action, data) {
  const resourceSingular = path.replace(/s$/, '').replace(/ies$/, 'y'); // e.g. sellers -> seller, properties -> property
  const resourceName = resourceSingular.charAt(0).toUpperCase() + resourceSingular.slice(1);
  const actionName = action.charAt(0).toUpperCase() + action.slice(1);

  let detailsHtml = '';
  let detailsText = '';

  if (action === 'deleted') {
    detailsHtml = `<p>The following ${resourceSingular} was deleted from your system:</p>
                   <p><strong>ID:</strong> ${data.id || 'N/A'}</p>`;
    detailsText = `The following ${resourceSingular} was deleted:\nID: ${data.id || 'N/A'}`;
  } else if (action === 'bulk_imported') {
    const count = Array.isArray(data) ? data.length : 0;
    detailsHtml = `<p>Bulk imported <strong>${count}</strong> ${path}.</p>`;
    detailsText = `Bulk imported ${count} ${path}.`;
  } else {
    // added or updated
    detailsHtml = `<p>A ${resourceSingular} has been ${action}:</p>
                   <table width="100%" cellpadding="6" cellspacing="0" style="border-collapse: collapse; font-size: 14px;">`;
    detailsText = `A ${resourceSingular} has been ${action}:\n`;

    const keysToExclude = ['id', 'createdAt', 'updatedAt', 'sellerId', 'topMatches'];
    for (const [key, val] of Object.entries(data)) {
      if (keysToExclude.includes(key)) continue;
      
      let displayVal = val;
      if (typeof val === 'object' && val !== null) {
        displayVal = JSON.stringify(val);
      }
      
      const cleanKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      
      detailsHtml += `<tr style="border-bottom: 1px solid #E5E7EB;">
                        <td style="font-weight: bold; width: 140px; color: #4B5563; padding: 6px 0;">${cleanKey}</td>
                        <td style="color: #111827; padding: 6px 0;">${displayVal !== null && displayVal !== undefined ? displayVal : 'N/A'}</td>
                      </tr>`;
      detailsText += `- ${cleanKey}: ${displayVal !== null && displayVal !== undefined ? displayVal : 'N/A'}\n`;
    }
    detailsHtml += `</table>`;
  }

  const activityName = `${actionName} ${resourceName}`;
  await sendActivityNotification({
    userEmail: user.email,
    userName: user.name,
    activityName,
    detailsHtml,
    detailsText
  });
}


// ==================== LOCAL AUTH ====================

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body || {};
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password and name are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    const existing = await getUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await createUser({
      id: randomUUID(),
      email,
      passwordHash,
      name: name.trim(),
    });

    // Send Welcome Email
    try {
      await sendWelcomeEmail(user.email, user.name);
    } catch (err) {
      console.error('Welcome email failed:', err);
    }

    const token = signToken(user);
    setAuthCookie(res, token);
    res.status(201).json({ user, token });
  } catch (e) {
    console.error('Register error:', e);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const userRows = await query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    const userRow = userRows[0];

    if (!userRow || !userRow.password_hash) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const ok = await bcrypt.compare(password, userRow.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = rowToUser(userRow);
    const token = signToken(user);
    setAuthCookie(res, token);
    res.json({ user, token });
  } catch (e) {
    console.error('Login error:', e);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

app.get('/api/auth/me', async (req, res) => {
  const user = await getUserFromReq(req);
  if (!user) return res.status(401).json({ error: 'Not logged in' });
  res.json({ user });
});

// ==================== SOCIAL / OAUTH ====================

app.get('/api/auth/google', (req, res) => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return res.status(503).json({ error: 'Google login is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env' });
  }
  const state = randomUUID();
  // In production you should store state in session/redis and validate
  res.redirect(buildGoogleAuthUrl(state));
});

app.get('/api/auth/google/callback', async (req, res) => {
  try {
    const { code, error } = req.query;
    if (error || !code) {
      console.warn('Google callback error param:', error);
      return res.redirect(`${FRONTEND_URL}/login?error=google_cancelled`);
    }

    const { profile } = await exchangeGoogleCode(code);

    let user = await getUserByGoogleId(profile.sub);
    if (!user && profile.email) {
      user = await getUserByEmail(profile.email);
    }

    if (user) {
      // Link Google if not linked
      if (!user.googleId) {
        user = await updateUser(user.id, { googleId: profile.sub, avatarUrl: profile.picture || user.avatarUrl });
      }
    } else {
      user = await createUser({
        id: randomUUID(),
        email: profile.email,
        name: profile.name || profile.email.split('@')[0],
        avatarUrl: profile.picture || '',
        googleId: profile.sub,
      });
      // Send Welcome Email
      try {
        await sendWelcomeEmail(user.email, user.name);
      } catch (err) {
        console.error('Google OAuth Welcome email failed:', err);
      }
    }

    const token = signToken(user);
    setAuthCookie(res, token);
    res.redirect(`${FRONTEND_URL}/dashboard?token=${encodeURIComponent(token)}`);
  } catch (e) {
    console.error('Google callback error:', e);
    res.redirect(`${FRONTEND_URL}/login?error=google_failed`);
  }
});

app.get('/api/auth/facebook', (req, res) => {
  if (!FACEBOOK_APP_ID || !FACEBOOK_APP_SECRET) {
    return res.status(503).json({ error: 'Facebook login is not configured. Add FACEBOOK_APP_ID and FACEBOOK_APP_SECRET to .env' });
  }
  const state = randomUUID();
  res.redirect(buildFacebookAuthUrl(state));
});

app.get('/api/auth/facebook/callback', async (req, res) => {
  try {
    const { code, error } = req.query;
    if (error || !code) {
      return res.redirect(`${FRONTEND_URL}/login?error=facebook_cancelled`);
    }

    const { profile } = await exchangeFacebookCode(code);

    let user = await getUserByFacebookId(profile.id);
    if (!user && profile.email) {
      user = await getUserByEmail(profile.email);
    }

    const avatar = profile.picture?.data?.url || '';

    if (user) {
      if (!user.facebookId) {
        user = await updateUser(user.id, { facebookId: profile.id, avatarUrl: avatar || user.avatarUrl });
      }
    } else {
      user = await createUser({
        id: randomUUID(),
        email: profile.email || `${profile.id}@facebook.local`,
        name: profile.name || 'Facebook User',
        avatarUrl: avatar,
        facebookId: profile.id,
      });
      // Send Welcome Email
      try {
        await sendWelcomeEmail(user.email, user.name);
      } catch (err) {
        console.error('Facebook OAuth Welcome email failed:', err);
      }
    }

    const token = signToken(user);
    setAuthCookie(res, token);
    res.redirect(`${FRONTEND_URL}/dashboard?token=${encodeURIComponent(token)}`);
  } catch (e) {
    console.error('Facebook callback error:', e);
    res.redirect(`${FRONTEND_URL}/login?error=facebook_failed`);
  }
});

// Use the async Postgres-backed resources from db.js
function mountResource(path, resource) {
  app.get(`/api/${path}`, requireAuth, async (req, res) => {
    let list = await resource.list();
    if (path === 'sellers') {
      const {
        ownerName,
        phone,
        email,
        zip,
        state,
        ownershipType,
        equityMin,
        equityMax,
        yearsMin,
        yearsMax
      } = req.query;

      if (ownerName) {
        const q = String(ownerName).toLowerCase();
        list = list.filter(s => s.ownerName?.toLowerCase().includes(q));
      }
      if (phone) {
        const q = String(phone).replace(/\D/g, '');
        list = list.filter(s => {
          const numbers = Array.isArray(s.phoneNumbers) ? s.phoneNumbers : [];
          if (s.phone && s.phone.replace(/\D/g, '').includes(q)) return true;
          return numbers.some(n => String(n).replace(/\D/g, '').includes(q));
        });
      }
      if (email) {
        const q = String(email).toLowerCase();
        list = list.filter(s => {
          const addresses = Array.isArray(s.emailAddresses) ? s.emailAddresses : [];
          if (s.email && s.email.toLowerCase().includes(q)) return true;
          return addresses.some(e => String(e).toLowerCase().includes(q));
        });
      }
      if (zip) {
        const q = String(zip).trim();
        list = list.filter(s => s.mailingAddress?.includes(q));
      }
      if (state) {
        const q = String(state).trim().toLowerCase();
        list = list.filter(s => s.mailingAddress?.toLowerCase().includes(q));
      }
      if (ownershipType) {
        const q = String(ownershipType).toLowerCase();
        list = list.filter(s => s.ownershipType?.toLowerCase() === q);
      }
      if (equityMin != null && equityMin !== '') {
        const min = Number(equityMin);
        list = list.filter(s => s.equityEstimate != null && s.equityEstimate >= min);
      }
      if (equityMax != null && equityMax !== '') {
        const max = Number(equityMax);
        list = list.filter(s => s.equityEstimate != null && s.equityEstimate <= max);
      }
      if (yearsMin != null && yearsMin !== '') {
        const min = Number(yearsMin);
        list = list.filter(s => s.ownershipYears != null && s.ownershipYears >= min);
      }
      if (yearsMax != null && yearsMax !== '') {
        const max = Number(yearsMax);
        list = list.filter(s => s.ownershipYears != null && s.ownershipYears <= max);
      }
    }
    res.json(list);
  });
  app.post(`/api/${path}`, requireAuth, async (req, res) => {
    const inserted = await resource.insert(req.body);
    try {
      await handleResourceNotification(req.user, path, 'added', inserted);
    } catch (err) {
      console.error(`[Notification Error] Failed for POST /api/${path}:`, err.message);
    }
    res.status(201).json(inserted);
  });
  app.post(`/api/${path}/bulk`, requireAuth, async (req, res) => {
    const items = Array.isArray(req.body) ? req.body : [];
    const created = [];
    for (const item of items) {
      created.push(await resource.insert(item));
    }
    try {
      await handleResourceNotification(req.user, path, 'bulk_imported', created);
    } catch (err) {
      console.error(`[Notification Error] Failed for POST /api/${path}/bulk:`, err.message);
    }
    res.status(201).json(created);
  });
  app.put(`/api/${path}/:id`, requireAuth, async (req, res) => {
    const updated = await resource.update(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Not found' });
    try {
      await handleResourceNotification(req.user, path, 'updated', updated);
    } catch (err) {
      console.error(`[Notification Error] Failed for PUT /api/${path}/${req.params.id}:`, err.message);
    }
    res.json(updated);
  });
  app.delete(`/api/${path}/:id`, requireAuth, async (req, res) => {
    const ok = await resource.remove(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Not found' });
    try {
      await handleResourceNotification(req.user, path, 'deleted', { id: req.params.id });
    } catch (err) {
      console.error(`[Notification Error] Failed for DELETE /api/${path}/${req.params.id}:`, err.message);
    }
    res.json({ ok: true });
  });
}

mountResource('sellers', sellers);
mountResource('buyers', buyers);
mountResource('investors', investors);
mountResource('properties', properties);

// ==================== AUTOMATED MATCHING & AI ====================

app.post('/api/properties/:id/auto-match', requireAuth, async (req, res) => {
  const result = await autoMatchProperty(req.params.id);
  if (!result) return res.status(404).json({ error: 'Property not found' });

  // Notify activity
  try {
    const { property, matches, dealScore } = result;
    const matchNames = matches.map(m => `${m.name} (${m.type})`).join(', ');
    const detailsHtml = `
      <p>Automated matching was executed for property:</p>
      <p><strong>Address:</strong> ${property.address}</p>
      <p><strong>Deal Score:</strong> ${dealScore ?? 'N/A'}/100</p>
      <p><strong>Matches Found:</strong> ${matches.length}</p>
      ${matches.length > 0 ? `<p><strong>Matched Contacts:</strong> ${matchNames}</p>` : ''}
    `;
    const detailsText = `Automated matching was executed for property:\nAddress: ${property.address}\nDeal Score: ${dealScore ?? 'N/A'}/100\nMatches Found: ${matches.length}${matches.length > 0 ? `\nMatched Contacts: ${matchNames}` : ''}`;
    
    await sendActivityNotification({
      userEmail: req.user.email,
      userName: req.user.name,
      activityName: 'Property Auto-Match Run',
      detailsHtml,
      detailsText
    });
  } catch (err) {
    console.error('[Notification Error] Failed for property auto-match:', err.message);
  }

  res.json(result);
});

// Email notifications via Resend
app.post('/api/properties/:id/notify', requireAuth, async (req, res) => {
  try {
    const prop = await properties.get(req.params.id);
    if (!prop) return res.status(404).json({ error: 'Property not found' });

    const matches = req.body.matches || prop?.topMatches || [];
    if (!matches.length) return res.json({ sent: 0, message: 'No matches to notify' });

    const now = new Date().toISOString();
    const log = [];
    const errors = [];

    for (const m of matches) {
      if (!m.email) {
        errors.push({ name: m.name, reason: 'No email address' });
        continue;
      }

      try {
        const html = buildDealEmailHtml({ recipientName: m.name, property: prop });
        const text = buildDealEmailText({ recipientName: m.name, property: prop });

        const result = await sendEmail({
          to: m.email,
          subject: `New Wholesale Deal — ${prop.address}, ${prop.city || ''}`,
          html,
          text,
        });

        log.push({ to: m.name, email: m.email, emailId: result.id, at: now });
      } catch (emailErr) {
        console.error(`[Resend] Failed to email ${m.name} (${m.email}):`, emailErr.message);
        errors.push({ name: m.name, email: m.email, reason: emailErr.message });
      }
    }

    // Update property status and audit trail
    const sentNames = log.map(l => l.to).join(', ');
    const note = `\n[EMAILS ${now}] Sent to ${log.length} contacts via Resend: ${sentNames}`;
    await properties.update(req.params.id, {
      notes: (prop?.notes || '') + note,
      status: prop?.status === 'matched' ? 'offer_sent' : prop?.status,
    });

    // Notify activity
    try {
      const campaignHtml = `
        <p>A wholesale deal outreach campaign was completed for property:</p>
        <p><strong>Property:</strong> ${prop.address}</p>
        <p><strong>Successfully Emailed:</strong> ${log.length} contact(s)</p>
        ${log.length > 0 ? `
          <ul>
            ${log.map(l => `<li><strong>${l.to}</strong> (${l.email}) at ${l.at}</li>`).join('')}
          </ul>
        ` : ''}
        ${errors.length > 0 ? `
          <p style="color: #EF4444;"><strong>Failed Deliveries (${errors.length}):</strong></p>
          <ul>
            ${errors.map(e => `<li><strong>${e.name}</strong> (${e.email || 'no email'}): ${e.reason}</li>`).join('')}
          </ul>
        ` : ''}
      `;
      const campaignText = `Wholesale deal outreach campaign completed for property:\nProperty: ${prop.address}\nSuccessfully Emailed: ${log.length} contacts\n${log.length > 0 ? log.map(l => `- ${l.to} (${l.email})`).join('\n') : ''}\n${errors.length > 0 ? `Errors:\n` + errors.map(e => `- ${e.name}: ${e.reason}`).join('\n') : ''}`;

      await sendActivityNotification({
        userEmail: req.user.email,
        userName: req.user.name,
        activityName: 'Wholesale Deal Campaign Sent',
        detailsHtml: campaignHtml,
        detailsText: campaignText
      });
    } catch (err) {
      console.error('[Notification Error] Failed for campaign notification:', err.message);
    }

    res.json({ sent: log.length, log, errors: errors.length ? errors : undefined });
  } catch (e) {
    console.error('[Notify] Error:', e);
    res.status(500).json({ error: 'Failed to send notifications: ' + e.message });
  }
});

app.post('/api/admin/clear-db', requireAuth, async (req, res) => {
  try {
    await query('DELETE FROM properties');
    await query('DELETE FROM sellers');
    await query('DELETE FROM buyers');
    await query('DELETE FROM investors');
    res.json({ ok: true });
  } catch (err) {
    console.error('[Admin] Clear DB error:', err);
    res.status(500).json({ error: 'Failed to clear database: ' + err.message });
  }
});

app.post('/api/ai/extract-buybox', requireAuth, async (req, res) => {
  try {
    const { text, url } = req.body || {};

    let result;
    if (url) {
      // Direct integration with Playwright scrape and LLM/rules extraction
      result = await extractBuyBox(url, true);
    } else {
      if (!text) {
        return res.status(400).json({ error: 'Provide text or url' });
      }
      result = await extractBuyBox(text, false);
    }

    // Notify activity
    try {
      const extractHtml = `
        <p>AI extraction completed successfully from ${url ? `URL: <a href="${url}">${url}</a>` : 'provided text'}.</p>
        <h3 style="color:#1A3C34; border-bottom:1px solid #E5E7EB; padding-bottom:4px; margin-top:16px;">Extracted Lead Information:</h3>
        <table width="100%" cellpadding="6" cellspacing="0" style="border-collapse: collapse; font-size: 14px;">
          <tr style="border-bottom: 1px solid #E5E7EB;">
            <td style="font-weight: bold; width: 160px; color: #4B5563;">Full Name</td>
            <td style="color: #111827;">${result.fullName || 'N/A'}</td>
          </tr>
          <tr style="border-bottom: 1px solid #E5E7EB;">
            <td style="font-weight: bold; color: #4B5563;">Company Name</td>
            <td style="color: #111827;">${result.companyName || 'N/A'}</td>
          </tr>
          <tr style="border-bottom: 1px solid #E5E7EB;">
            <td style="font-weight: bold; color: #4B5563;">Phone</td>
            <td style="color: #111827;">${result.phone || 'N/A'}</td>
          </tr>
          <tr style="border-bottom: 1px solid #E5E7EB;">
            <td style="font-weight: bold; color: #4B5563;">Email</td>
            <td style="color: #111827;">${result.email || 'N/A'}</td>
          </tr>
          <tr style="border-bottom: 1px solid #E5E7EB;">
            <td style="font-weight: bold; color: #4B5563;">Preferred States</td>
            <td style="color: #111827;">${Array.isArray(result.preferredStates) ? result.preferredStates.join(', ') : 'N/A'}</td>
          </tr>
          <tr style="border-bottom: 1px solid #E5E7EB;">
            <td style="font-weight: bold; color: #4B5563;">Preferred Cities</td>
            <td style="color: #111827;">${Array.isArray(result.preferredCities) ? result.preferredCities.join(', ') : 'N/A'}</td>
          </tr>
          <tr style="border-bottom: 1px solid #E5E7EB;">
            <td style="font-weight: bold; color: #4B5563;">Property Types</td>
            <td style="color: #111827;">${Array.isArray(result.desiredPropertyTypes) ? result.desiredPropertyTypes.join(', ') : 'N/A'}</td>
          </tr>
          <tr style="border-bottom: 1px solid #E5E7EB;">
            <td style="font-weight: bold; color: #4B5563;">Max Budget</td>
            <td style="color: #111827;">${result.maxBudget ? '$' + Number(result.maxBudget).toLocaleString() : 'N/A'}</td>
          </tr>
          <tr style="border-bottom: 1px solid #E5E7EB;">
            <td style="font-weight: bold; color: #4B5563;">Notes</td>
            <td style="color: #111827;">${result.notes || 'N/A'}</td>
          </tr>
        </table>
      `;
      const extractText = `AI extraction completed successfully.
Extracted Lead Information:
- Full Name: ${result.fullName || 'N/A'}
- Company Name: ${result.companyName || 'N/A'}
- Phone: ${result.phone || 'N/A'}
- Email: ${result.email || 'N/A'}
- Preferred States: ${Array.isArray(result.preferredStates) ? result.preferredStates.join(', ') : 'N/A'}
- Preferred Cities: ${Array.isArray(result.preferredCities) ? result.preferredCities.join(', ') : 'N/A'}
- Property Types: ${Array.isArray(result.desiredPropertyTypes) ? result.desiredPropertyTypes.join(', ') : 'N/A'}
- Max Budget: ${result.maxBudget ? '$' + Number(result.maxBudget).toLocaleString() : 'N/A'}
- Notes: ${result.notes || 'N/A'}`;

      await sendActivityNotification({
        userEmail: req.user.email,
        userName: req.user.name,
        activityName: 'AI Lead Buy Box Extraction',
        detailsHtml: extractHtml,
        detailsText: extractText
      });
    } catch (err) {
      console.error('[Notification Error] Failed for AI extraction notification:', err.message);
    }

    res.json(result);
  } catch (e) {
    console.error('AI extract error:', e);
    res.status(500).json({ error: 'Extraction failed: ' + e.message });
  }
});

app.get('/api/export', requireAuth, async (req, res) => {
  const { type, format } = req.query || {};
  if (!type || !format) {
    return res.status(400).json({ error: 'Missing type or format parameter' });
  }

  if (format !== 'csv' && format !== 'xlsx') {
    return res.status(400).json({ error: 'Unsupported format (only csv and xlsx are supported)' });
  }

  try {
    const buffer = await generateServerExport({ exportType: type, format });
    const filename = `${type}-${new Date().toISOString().slice(0, 10)}.${format}`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err) {
    console.error('[Export Route Error]', err);
    res.status(500).json({ error: 'Export failed: ' + err.message });
  }
});

// ==================== RESTFUL API GROUP ADDITIONS ====================

// GET /api/properties/:id/matches — Get buyer matches for a property
app.get('/api/properties/:id/matches', requireAuth, async (req, res) => {
  try {
    const prop = await properties.get(req.params.id);
    if (!prop) return res.status(404).json({ error: 'Property not found' });
    const matches = prop.topMatches || [];
    res.json(matches);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/matching/run — Trigger full matching pass
app.post('/api/matching/run', requireAuth, async (req, res) => {
  try {
    await addJob('run_matching', {});
    res.json({ success: true, message: 'Full matching pass queued successfully in background' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/crm/:tab — CRM tab data
app.get('/api/crm/:tab', requireAuth, async (req, res) => {
  const { tab } = req.params;
  try {
    if (tab === 'new' || tab === 'new-leads') {
      const list = await properties.list();
      res.json(list.filter(p => p.status === 'new'));
    } else if (tab === 'contacted') {
      const list = await properties.list();
      res.json(list.filter(p => p.status === 'contacted'));
    } else if (tab === 'followup' || tab === 'follow-up') {
      const list = await properties.list();
      res.json(list.filter(p => p.followUpDate));
    } else if (tab === 'sellers') {
      const list = await sellers.list();
      res.json(list);
    } else if (tab === 'buyers') {
      const list = await buyers.list();
      res.json(list);
    } else if (tab === 'investors') {
      const list = await investors.list();
      res.json(list);
    } else {
      res.status(400).json({ error: `Unknown CRM tab: ${tab}` });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/export — Trigger export job, returns download URL
app.post('/api/export', requireAuth, async (req, res) => {
  const { type, format } = req.body || {};
  if (!type || !format) {
    return res.status(400).json({ error: 'Missing type or format parameter' });
  }

  if (format !== 'csv' && format !== 'xlsx') {
    return res.status(400).json({ error: 'Unsupported format (only csv and xlsx are supported)' });
  }

  try {
    const jobId = randomUUID();
    exportJobs.set(jobId, { status: 'waiting', progress: 0 });
    
    await addJob('generate_export', { jobId, exportType: type, format });
    
    const downloadUrl = `${req.protocol}://${req.get('host')}/api/export/download/${jobId}`;
    res.json({
      success: true,
      jobId,
      downloadUrl
    });
  } catch (err) {
    console.error('[Export Trigger Error]', err);
    res.status(500).json({ error: 'Export trigger failed: ' + err.message });
  }
});

// GET /api/export/download/:id — Serves the generated file download
app.get('/api/export/download/:id', async (req, res) => {
  const { id } = req.params;
  const job = exportJobs.get(id);
  if (!job) {
    return res.status(404).json({ error: 'Export job not found or expired' });
  }

  if (job.status === 'processing' || job.status === 'waiting') {
    return res.status(202).json({ status: 'processing', progress: job.progress });
  }

  if (job.status === 'failed') {
    return res.status(500).json({ error: 'Export failed: ' + job.error });
  }

  res.download(job.filePath, job.fileName);
});

// GET /api/search?q= — Universal search across all entities
app.get('/api/search', requireAuth, async (req, res) => {
  const queryText = String(req.query.q || '').trim().toLowerCase();
  if (!queryText) {
    return res.json({ properties: [], sellers: [], buyers: [], investors: [] });
  }

  try {
    const [allProps, allSellers, allBuyers, allInvestors] = await Promise.all([
      properties.list(),
      sellers.list(),
      buyers.list(),
      investors.list()
    ]);

    const matchedProps = allProps.filter(p =>
      p.address?.toLowerCase().includes(queryText) ||
      p.city?.toLowerCase().includes(queryText) ||
      p.state?.toLowerCase().includes(queryText) ||
      p.zip?.toLowerCase().includes(queryText) ||
      p.zipCode?.toLowerCase().includes(queryText)
    );

    const matchedSellers = allSellers.filter(s =>
      s.ownerName?.toLowerCase().includes(queryText) ||
      s.email?.toLowerCase().includes(queryText) ||
      s.phone?.toLowerCase().includes(queryText) ||
      (Array.isArray(s.phoneNumbers) && s.phoneNumbers.some(n => String(n).includes(queryText))) ||
      (Array.isArray(s.emailAddresses) && s.emailAddresses.some(e => e.toLowerCase().includes(queryText)))
    );

    const matchedBuyers = allBuyers.filter(b =>
      b.fullName?.toLowerCase().includes(queryText) ||
      b.companyName?.toLowerCase().includes(queryText) ||
      b.email?.toLowerCase().includes(queryText) ||
      b.phone?.toLowerCase().includes(queryText)
    );

    const matchedInvestors = allInvestors.filter(i =>
      i.investorName?.toLowerCase().includes(queryText) ||
      i.companyName?.toLowerCase().includes(queryText) ||
      i.email?.toLowerCase().includes(queryText) ||
      i.phone?.toLowerCase().includes(queryText)
    );

    res.json({
      properties: matchedProps,
      sellers: matchedSellers,
      buyers: matchedBuyers,
      investors: matchedInvestors
    });
  } catch (err) {
    console.error('Universal search error:', err);
    res.status(500).json({ error: 'Search failed: ' + err.message });
  }
});

// Initialize Postgres schema then start server
initDb()
  .then(async () => {
    // Register background job processors matching Module 10 requirements
    registerJobProcessor('scrape_source', async (data) => {
      const { runScrapeTask } = await import('./sourceAdapters.js');
      await runScrapeTask(data);
    });

    registerJobProcessor('run_matching', async (data) => {
      const { reRunMatchingForAllProperties } = await import('./db.js');
      await reRunMatchingForAllProperties();
    });

    registerJobProcessor('ai_extract_buybox', async (data) => {
      const { text, url, entityId, entityType } = data || {};
      const result = await extractBuyBox(text || url, !!url);
      const { buyers, investors } = await import('./db.js');
      if (entityType === 'buyer' && entityId) {
        await buyers.update(entityId, { buyBox: result });
      } else if (entityType === 'investor' && entityId) {
        await investors.update(entityId, { buyBox: result });
      }
    });

    registerJobProcessor('generate_export', async (data) => {
      const { generateServerExport } = await import('./exportService.js');
      await generateServerExport(data);
    });

    registerJobProcessor('cleanup_exports', async () => {
      console.log('[Cleanup Job] Deleting export files older than 24 hours...');
      const fs = await import('fs');
      const path = await import('path');
      const outputDir = path.join(process.cwd(), 'output');
      if (!fs.existsSync(outputDir)) return;

      const files = fs.readdirSync(outputDir);
      const now = Date.now();
      const twentyFourHoursMs = 24 * 60 * 60 * 1000;
      let count = 0;
      for (const file of files) {
        const filePath = path.join(outputDir, file);
        try {
          const stats = fs.statSync(filePath);
          if (now - stats.mtimeMs > twentyFourHoursMs) {
            fs.unlinkSync(filePath);
            count++;
          }
        } catch (e) {
          console.error('[Cleanup Job] Error processing file:', file, e.message);
        }
      }
      console.log(`[Cleanup Job] Done. Deleted ${count} files.`);
    });

    registerJobProcessor('backup_db', async () => {
      const { runDatabaseBackup } = await import('./backupService.js');
      await runDatabaseBackup();
    });

    await initQueue().catch(err => console.error('Failed to initialize Task Queue:', err));

    if (isProd) {
      const distPath = path.join(process.cwd(), 'dashboard/dist');
      app.use(express.static(distPath));
      app.get('/(.*)', (req, res) => {
        if (!req.path.startsWith('/api')) {
          res.sendFile(path.join(distPath, 'index.html'));
        }
      });
    }

    const server = app.listen(PORT);

    server.on('listening', () => {
      console.log(`[Sadar API] Running at http://localhost:${PORT}`);
      console.log(`[Sadar API] Using PostgreSQL`);
    });

    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`[Sadar API] Port ${PORT} is already in use.`);
        console.error('[Sadar API] Run: npm start   (it will free ports automatically)');
        console.error('[Sadar API] Or manually: Get-NetTCPConnection -LocalPort 3001 | Stop-Process -Id {OwningProcess} -Force');
      } else {
        console.error('[Sadar API] Failed to start:', error.message);
      }
      process.exit(1);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize PostgreSQL database:', err);
    process.exit(1);
  });

// Server error handling is inside the initDb().then() block above.