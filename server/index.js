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
import { seedDatabase } from './seed.js';

import 'dotenv/config';

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

function getUserFromReq(req) {
  const token = req.cookies?.[JWT_COOKIE_NAME];
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return getUserById(payload.sub);
  } catch {
    return null;
  }
}

function requireAuth(req, res, next) {
  const user = getUserFromReq(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  req.user = user;
  next();
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

// ==================== AI BUY BOX EXTRACTION (OpenAI + Gemini + Playwright) ====================

async function playwrightScrape(url: string): Promise<string> {
  // Deeper scraping using Playwright (already in root deps)
  // Note: LinkedIn often requires login for full profiles. Public pages or company sites work best.
  // For production, run with stealth plugins or use proxies.
  try {
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    // Get main content + meta description
    const text = await page.evaluate(() => {
      const main = document.querySelector('main, article, .profile, body')?.innerText || document.body.innerText;
      const desc = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
      return (desc + ' ' + main).replace(/\s+/g, ' ').slice(0, 8000);
    });
    await browser.close();
    return text;
  } catch (e) {
    console.warn('Playwright scrape failed, falling back to fetch:', e.message);
    const resp = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SadarBot/1.0)' } });
    let html = await resp.text();
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 8000);
  }
}

async function callGemini(prompt: string, content: string) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('No Gemini key');
  const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt + '\n\n' + content.slice(0, 6000) }] }],
      generationConfig: { temperature: 0.1, responseMimeType: 'application/json' }
    })
  });
  if (!resp.ok) throw new Error('Gemini API error');
  const data = await resp.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  return JSON.parse(text);
}

async function extractBuyBox(contentOrUrl: string, isUrl = false) {
  let content = contentOrUrl;
  if (isUrl) {
    content = await playwrightScrape(contentOrUrl);  // Deeper scrape with Playwright
  }

  const systemPrompt = `You are an expert real estate wholesaling assistant. Extract structured "buy box" criteria from the provided text (investor or buyer preferences from website, LinkedIn, email, etc.).

Return ONLY valid JSON with this exact shape:
{
  "preferredStates": string[],
  "preferredCities": string[],
  "desiredPropertyTypes": string[],
  "maxBudget": number | null,
  "notes": string
}

Be accurate and conservative.`;

  // Try Gemini first (new)
  if (process.env.GEMINI_API_KEY) {
    try {
      return normalizeBuyBox(await callGemini(systemPrompt, content));
    } catch (e) { console.warn('Gemini failed:', e.message); }
  }

  const apiKey = process.env.OPENAI_API_KEY || process.env.GROK_API_KEY;

  if (!apiKey) {
    return ruleBasedBuyBoxExtraction(content);
  }

  try {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: content.slice(0, 8000) }
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' }
      })
    });
    if (!resp.ok) throw new Error('LLM failed');
    const data = await resp.json();
    return normalizeBuyBox(JSON.parse(data.choices?.[0]?.message?.content || '{}'));
  } catch (err) {
    console.warn('Primary LLM failed, rules fallback');
    return ruleBasedBuyBoxExtraction(content);
  }
}
  const apiKey = process.env.OPENAI_API_KEY || process.env.GROK_API_KEY;

  const systemPrompt = `You are an expert real estate wholesaling assistant. Extract structured "buy box" criteria from the provided text (investor or buyer preferences from website, LinkedIn, email, etc.).

Return ONLY valid JSON with this exact shape:
{
  "preferredStates": string[],      // e.g. ["TX", "GA", "FL"]
  "preferredCities": string[],      // e.g. ["Houston", "Atlanta"]
  "desiredPropertyTypes": string[], // from: Single Family, Multifamily, Duplex, Triplex, Quadplex, Apartment, Commercial
  "maxBudget": number | null,       // maximum purchase price in USD
  "notes": string                   // any other criteria, motivation, or comments (max 300 chars)
}

If nothing relevant is found, return empty arrays and null for budget. Be conservative and accurate.`;

  if (!apiKey) {
    // Smart rule-based fallback (no API key needed)
    return ruleBasedBuyBoxExtraction(content);
  }

  try {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: content.slice(0, 8000) }
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' }
      })
    });

    if (!resp.ok) throw new Error('LLM request failed');
    const data = await resp.json();
    const parsed = JSON.parse(data.choices?.[0]?.message?.content || '{}');
    return normalizeBuyBox(parsed);
  } catch (err) {
    console.warn('LLM extraction failed, falling back to rules:', err.message);
    return ruleBasedBuyBoxExtraction(content);
  }
}

function normalizeBuyBox(raw) {
  const allowedTypes = ['Single Family', 'Multifamily', 'Duplex', 'Triplex', 'Quadplex', 'Apartment', 'Commercial'];
  return {
    preferredStates: Array.isArray(raw.preferredStates) ? raw.preferredStates.filter(Boolean).map(s => String(s).toUpperCase().slice(0,3)) : [],
    preferredCities: Array.isArray(raw.preferredCities) ? raw.preferredCities.filter(Boolean).map(String) : [],
    desiredPropertyTypes: Array.isArray(raw.desiredPropertyTypes) ? raw.desiredPropertyTypes.filter(t => allowedTypes.includes(t)) : [],
    maxBudget: raw.maxBudget ? Math.round(Number(raw.maxBudget)) : null,
    notes: String(raw.notes || '').slice(0, 300),
  };
}

function ruleBasedBuyBoxExtraction(text) {
  const lower = text.toLowerCase();
  const states = [];
  const stateRegex = /\b(TX|GA|FL|CA|NC|SC|OH|MO|IL|IN|MI|TN|AL|MS|AR|LA|OK|KS|NE|IA|WI|MN|AZ|NV|UT|CO|NM|WA|OR|ID)\b/g;
  let match;
  while ((match = stateRegex.exec(text)) !== null) {
    if (!states.includes(match[1])) states.push(match[1]);
  }

  const cities = [];
  const cityMatches = text.match(/\b(Houston|Atlanta|Dallas|Austin|San Antonio|Charlotte|Raleigh|Orlando|Tampa|Miami|Columbus|Cleveland|Indianapolis|Detroit|Memphis|Nashville|Kansas City|St\.? Louis|Chicago)\b/gi);
  if (cityMatches) cityMatches.forEach(c => { const clean = c.replace(/\./g,''); if (!cities.includes(clean)) cities.push(clean); });

  const types = [];
  if (/\bsfr|single family|single-family\b/.test(lower)) types.push('Single Family');
  if (/\bmulti|multifamily|multi-family|duplex|triplex|quad|4-plex\b/.test(lower)) types.push('Multifamily');

  let maxBudget = null;
  const budgetMatch = lower.match(/\$?\s*(\d{2,3}(?:,\d{3})*|\d{5,6})\s*(k|000)?\s*(?:max|maximum|under|below|budget|cap)/i);
  if (budgetMatch) {
    let num = parseInt(budgetMatch[1].replace(/,/g,''), 10);
    if (budgetMatch[2]) num *= 1000;
    maxBudget = num;
  }

  let notes = '';
  if (/\bfix and flip|flipping|rehab|value add\b/.test(lower)) notes += 'Fix & Flip / value-add. ';
  if (/\bbuy and hold|rental|cashflow|hold\b/.test(lower)) notes += 'Buy & Hold / rental. ';

  return normalizeBuyBox({ preferredStates: states, preferredCities: cities.slice(0,5), desiredPropertyTypes: types, maxBudget, notes: notes.trim() });
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

app.post('/api/seed', requireAuth, async (req, res) => {
  const result = await seedDatabase({ force: Boolean(req.body?.force) });
  const data = await getAllData();
  res.json({ ...result, data });
});

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
    const existing = getUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = createUser({
      id: randomUUID(),
      email,
      passwordHash,
      name: name.trim(),
    });

    const token = signToken(user);
    setAuthCookie(res, token);
    res.status(201).json({ user });
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
    res.json({ user });
  } catch (e) {
    console.error('Login error:', e);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

app.get('/api/auth/me', (req, res) => {
  const user = getUserFromReq(req);
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
    }

    const token = signToken(user);
    setAuthCookie(res, token);
    res.redirect(`${FRONTEND_URL}/dashboard?loggedIn=true`);
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
    }

    const token = signToken(user);
    setAuthCookie(res, token);
    res.redirect(`${FRONTEND_URL}/dashboard?loggedIn=true`);
  } catch (e) {
    console.error('Facebook callback error:', e);
    res.redirect(`${FRONTEND_URL}/login?error=facebook_failed`);
  }
});

// Use the async Postgres-backed resources from db.js
function mountResource(path, resource) {
  app.get(`/api/${path}`, requireAuth, async (_req, res) => {
    res.json(await resource.list());
  });
  app.post(`/api/${path}`, requireAuth, async (req, res) => {
    res.status(201).json(await resource.insert(req.body));
  });
  app.post(`/api/${path}/bulk`, requireAuth, async (req, res) => {
    const items = Array.isArray(req.body) ? req.body : [];
    const created = [];
    for (const item of items) {
      created.push(await resource.insert(item));
    }
    res.status(201).json(created);
  });
  app.put(`/api/${path}/:id`, requireAuth, async (req, res) => {
    const updated = await resource.update(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Not found' });
    res.json(updated);
  });
  app.delete(`/api/${path}/:id`, requireAuth, async (req, res) => {
    const ok = await resource.remove(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Not found' });
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
  res.json(result);
});

// Email/SMS notification simulation on matches
// In production: integrate Twilio for SMS + SendGrid / Postmark for email
app.post('/api/properties/:id/notify', requireAuth, async (req, res) => {
  const prop = await properties.get(req.params.id); // note: properties resource from db
  const matches = req.body.matches || prop?.topMatches || [];
  if (!matches.length) return res.json({ sent: 0, message: 'No matches' });

  const now = new Date().toISOString();
  const log = [];

  for (const m of matches) {
    // Simulated Email
    console.log(`[EMAIL NOTIFY] To: ${m.email} | Subject: New Wholesale Deal - ${prop?.address}`);
    console.log(`  Body: Hi ${m.name}, we have a new ${prop?.propertyType} at ${prop?.address} priced at $${prop?.price}. ARV $${prop?.arv}. Score ${prop?.dealScore}. Reply to discuss.`);

    // Simulated SMS
    console.log(`[SMS NOTIFY] To: ${m.phone} | "New deal: ${prop?.address} - ${prop?.city} $${prop?.price}. ARV $${prop?.arv}. Score ${prop?.dealScore}. Details in email."`);

    log.push({ to: m.name, email: m.email, phone: m.phone, at: now });
  }

  // Log to property notes for audit trail
  const note = `\n[NOTIFICATIONS ${now}] Sent to ${matches.length} contacts: ${matches.map(m => m.name).join(', ')}`;
  await properties.update(req.params.id, { notes: (prop?.notes || '') + note, status: prop?.status === 'matched' ? 'offer_sent' : prop?.status });

  res.json({ sent: matches.length, log, simulated: true });
});

// AI-powered buy box extraction (text or URL)
// Uses OpenAI if OPENAI_API_KEY is set, otherwise smart rule-based fallback
app.post('/api/ai/extract-buybox', requireAuth, async (req, res) => {
  try {
    const { text, url } = req.body || {};
    let content = text || '';

    if (url && !content) {
      try {
        const resp = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        let html = await resp.text();
        // Very basic text extraction
        content = html
          .replace(/<script[\s\S]*?<\/script>/gi, ' ')
          .replace(/<style[\s\S]*?<\/style>/gi, ' ')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .slice(0, 12000);
      } catch (fetchErr) {
        content = text || '';
      }
    }

    if (!content) return res.status(400).json({ error: 'Provide text or url' });

    const result = await extractBuyBox(content);
    res.json(result);
  } catch (e) {
    console.error('AI extract error', e);
    res.status(500).json({ error: 'Extraction failed' });
  }
});

// Initialize Postgres schema then start server
initDb()
  .then(() => {
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