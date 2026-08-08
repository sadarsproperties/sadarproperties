import 'dotenv/config';
import pg from 'pg';
import { randomUUID } from 'crypto';

const { Pool } = pg;

const host = process.env.PGHOST || 'localhost';
const port = parseInt(process.env.PGPORT || '5432', 10);
const user = process.env.PGUSER || 'postgres';
const password = process.env.PGPASSWORD || '';
const database = process.env.PGDATABASE || 'sadar';

const connectionString = process.env.DATABASE_URL;
const isSupabase = (connectionString && connectionString.includes('supabase')) || host.includes('supabase') || process.env.PG_SSL === 'true';

const poolConfig = connectionString
  ? {
      connectionString,
      max: parseInt(process.env.PG_POOL_MAX || '20', 10),
      min: parseInt(process.env.PG_POOL_MIN || '2', 10),
      idleTimeoutMillis: parseInt(process.env.PG_IDLE_TIMEOUT || '30000', 10),
      connectionTimeoutMillis: parseInt(process.env.PG_CONNECTION_TIMEOUT || '10000', 10),
      ssl: isSupabase ? { rejectUnauthorized: false } : undefined,
    }
  : {
      host,
      port,
      user,
      password,
      database,
      max: parseInt(process.env.PG_POOL_MAX || '20', 10),
      min: parseInt(process.env.PG_POOL_MIN || '2', 10),
      idleTimeoutMillis: parseInt(process.env.PG_IDLE_TIMEOUT || '30000', 10),
      connectionTimeoutMillis: parseInt(process.env.PG_CONNECTION_TIMEOUT || '10000', 10),
      ssl: isSupabase ? { rejectUnauthorized: false } : undefined,
    };

export const pool = new Pool(poolConfig);

// Graceful shutdown
process.on('SIGINT', () => {
  pool.end().then(() => process.exit(0));
});

// Simple query helper that returns rows
export async function query(text, params = []) {
  const res = await pool.query(text, params);
  return res.rows;
}

// ── Simple key/value settings store (JSONB) ──
export async function getSetting(key, fallback = null) {
  const rows = await query('SELECT value FROM settings WHERE key = $1', [key]);
  return rows.length > 0 ? rows[0].value : fallback;
}

export async function setSetting(key, value) {
  await query(
    `INSERT INTO settings (key, value, updated_at) VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [key, JSON.stringify(value)]
  );
  return value;
}

// ── Scrape run log (per-source status readout) ──
export async function startScrapeRun(source, url = '') {
  const rows = await query(
    `INSERT INTO scrape_runs (source, url, status, started_at) VALUES ($1, $2, 'running', NOW()) RETURNING id`,
    [source, url]
  );
  return rows[0].id;
}

export async function finishScrapeRun(id, recordsSaved = 0) {
  await query(
    `UPDATE scrape_runs SET status = 'completed', records_saved = $2, finished_at = NOW() WHERE id = $1`,
    [id, recordsSaved]
  );
}

export async function failScrapeRun(id, error = '') {
  const msg = String(error || 'Unknown error').slice(0, 500);
  await query(
    `UPDATE scrape_runs SET status = 'failed', error = $2, finished_at = NOW() WHERE id = $1`,
    [id, msg]
  );
}

export async function getScrapeRuns(limit = 50) {
  // Recover runs stuck as 'running' by a crash/hang (e.g. before job timeouts
  // existed) — mark them failed so the readout never shows a dead job spinning.
  await query(
    `UPDATE scrape_runs SET status = 'failed',
       error = COALESCE(NULLIF(error, ''), 'Stale run — process interrupted or hung before finishing'),
       finished_at = NOW()
     WHERE status = 'running' AND started_at < NOW() - INTERVAL '40 minutes'`
  );
  return query(
    `SELECT * FROM scrape_runs ORDER BY started_at DESC LIMIT $1`,
    [Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200)]
  );
}

export async function initDb() {
  // Check if legacy database (with text primary keys) is currently active.
  // If so, drop all tables cascading so we can recreate them with clean UUID schemas.
  const tableCheck = await query(`
    SELECT data_type FROM information_schema.columns 
    WHERE table_name = 'properties' AND column_name = 'id'
  `);
  if (tableCheck.length > 0 && tableCheck[0].data_type === 'text') {
    console.log('🔄 Legacy text-based database detected. Re-building schemas with strict UUID types...');
    await query(`
      DROP TABLE IF EXISTS buyer_matches, crm_activities, crm_notes, properties, sellers, buyers, investors, users, data_sources, export_logs, realtors, title_companies, cities, counties CASCADE;
    `);
  }

  // Also check if buyer_matches exists but is missing matched_criteria column (from previous step schema)
  const matchCheck = await query(`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'buyer_matches' AND column_name = 'matched_criteria'
  `);
  if (matchCheck.length === 0) {
    const tableExists = await query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_name = 'buyer_matches'
    `);
    if (tableExists.length > 0) {
      console.log('🔄 Re-building buyer_matches table to add matched_criteria and score definitions...');
      await query(`DROP TABLE buyer_matches CASCADE;`);
    }
  }

  await query(`
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";

    CREATE TABLE IF NOT EXISTS sellers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      owner_name TEXT NOT NULL,
      phone TEXT DEFAULT '',
      email TEXT DEFAULT '',
      mailing_address TEXT DEFAULT '',
      phone_numbers JSONB DEFAULT '[]',
      email_addresses JSONB DEFAULT '[]',
      ownership_years INTEGER,
      equity_estimate NUMERIC(12,2),
      ownership_type TEXT DEFAULT 'Individual',
      entity_name TEXT DEFAULT '',
      skip_traced BOOLEAN DEFAULT FALSE,
      last_contact_date TIMESTAMPTZ,
      contact_notes TEXT DEFAULT '',
      notes_list JSONB DEFAULT '[]',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS buyers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      full_name TEXT NOT NULL,
      company_name TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      email TEXT DEFAULT '',
      website TEXT DEFAULT '',
      buyer_type TEXT NOT NULL,
      preferred_states JSONB DEFAULT '[]',
      preferred_cities JSONB DEFAULT '[]',
      desired_property_types JSONB DEFAULT '[]',
      max_budget NUMERIC(12,2),
      min_units INTEGER DEFAULT 0,
      max_units INTEGER DEFAULT 0,
      budget_min NUMERIC(12,2) DEFAULT 0,
      budget_max NUMERIC(12,2) DEFAULT 0,
      investment_strategy TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      last_contact TIMESTAMPTZ,
      deals_closed INTEGER DEFAULT 0,
      zillow_url TEXT DEFAULT '',
      redfin_url TEXT DEFAULT '',
      realtor_url TEXT DEFAULT '',
      propstream_url TEXT DEFAULT '',
      batchleads_url TEXT DEFAULT '',
      notes_list JSONB DEFAULT '[]',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS investors (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      investor_name TEXT NOT NULL,
      company_name TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      email TEXT DEFAULT '',
      linkedin_url TEXT DEFAULT '',
      biggerpockets_url TEXT DEFAULT '',
      facebook_url TEXT DEFAULT '',
      twitter_url TEXT DEFAULT '',
      instagram_url TEXT DEFAULT '',
      zillow_url TEXT DEFAULT '',
      redfin_url TEXT DEFAULT '',
      realtor_url TEXT DEFAULT '',
      propstream_url TEXT DEFAULT '',
      batchleads_url TEXT DEFAULT '',
      connected_investors_url TEXT DEFAULT '',
      loopnet_url TEXT DEFAULT '',
      crexi_url TEXT DEFAULT '',
      source_platform TEXT DEFAULT '',
      buy_box_raw TEXT DEFAULT '',
      unit_range_min INTEGER DEFAULT 0,
      unit_range_max INTEGER DEFAULT 0,
      budget_min NUMERIC(12,2) DEFAULT 0,
      budget_max NUMERIC(12,2) DEFAULT 0,
      investment_strategy TEXT DEFAULT '',
      ai_extracted BOOLEAN DEFAULT FALSE,
      preferred_states JSONB DEFAULT '[]',
      preferred_cities JSONB DEFAULT '[]',
      desired_property_types JSONB DEFAULT '[]',
      max_budget NUMERIC(12,2),
      notes_list JSONB DEFAULT '[]',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS properties (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      address TEXT NOT NULL,
      city TEXT NOT NULL,
      state CHAR(2) NOT NULL,
      zip_code VARCHAR(10) NOT NULL,
      asking_price NUMERIC(12,2),
      arv NUMERIC(12,2),
      bedrooms INTEGER,
      bathrooms NUMERIC(4,1),
      sqft INTEGER,
      lot_size NUMERIC(10,2),
      year_built INTEGER,
      property_type TEXT NOT NULL,
      lead_categories TEXT[],
      source TEXT NOT NULL,
      source_url TEXT,
      status TEXT DEFAULT 'active',
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      deal_score DOUBLE PRECISION,
      repair_costs NUMERIC(12,2),
      assignment_fee NUMERIC(12,2) DEFAULT 10000.00,
      seller_id UUID REFERENCES sellers(id) ON DELETE SET NULL,
      top_matches JSONB DEFAULT '[]',
      notes_list JSONB DEFAULT '[]',
      zillow_url TEXT DEFAULT '',
      redfin_url TEXT DEFAULT '',
      realtor_url TEXT DEFAULT '',
      propstream_url TEXT DEFAULT '',
      batchleads_url TEXT DEFAULT '',
      units INTEGER DEFAULT 1,
      follow_up_date TIMESTAMPTZ,
      last_contact_date TIMESTAMPTZ,
      assigned_buyer_id UUID
    );

    -- 1:1 circular link configuration back from seller to property (idempotent)
    ALTER TABLE sellers ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES properties(id) ON DELETE SET NULL;

    CREATE TABLE IF NOT EXISTS buyer_matches (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
      buyer_id UUID,
      buyer_type TEXT, -- 'buyer' or 'investor'
      match_score NUMERIC(5,2),
      matched_criteria JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS crm_notes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      entity_type TEXT NOT NULL,
      entity_id UUID NOT NULL,
      note_text TEXT NOT NULL,
      author_name TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS crm_activities (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
      activity_type TEXT NOT NULL,
      description TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS data_sources (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      source_name TEXT UNIQUE NOT NULL,
      adapter_type TEXT NOT NULL,
      credentials JSONB DEFAULT '{}',
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      name TEXT NOT NULL,
      avatar_url TEXT DEFAULT '',
      google_id TEXT UNIQUE,
      facebook_id TEXT UNIQUE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS export_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      export_type TEXT NOT NULL,
      format TEXT NOT NULL,
      record_count INTEGER DEFAULT 0,
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS counties (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      state CHAR(2) NOT NULL,
      county_name TEXT NOT NULL,
      fips_code TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (state, county_name)
    );

    CREATE TABLE IF NOT EXISTS cities (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      county_id UUID REFERENCES counties(id) ON DELETE CASCADE,
      state CHAR(2) NOT NULL,
      county_name TEXT DEFAULT '',
      city_name TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (county_id, city_name)
    );

    CREATE TABLE IF NOT EXISTS realtors (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      brokerage TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      email TEXT DEFAULT '',
      license_number TEXT DEFAULT '',
      county_id UUID REFERENCES counties(id) ON DELETE SET NULL,
      state CHAR(2) DEFAULT '',
      county_name TEXT DEFAULT '',
      city TEXT DEFAULT '',
      phone_numbers JSONB DEFAULT '[]',
      email_addresses JSONB DEFAULT '[]',
      source TEXT DEFAULT 'Manual',
      source_url TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      notes_list JSONB DEFAULT '[]',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS title_companies (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_name TEXT NOT NULL,
      contact_name TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      email TEXT DEFAULT '',
      address TEXT DEFAULT '',
      county_id UUID REFERENCES counties(id) ON DELETE SET NULL,
      state CHAR(2) DEFAULT '',
      county_name TEXT DEFAULT '',
      source TEXT DEFAULT 'Manual',
      source_url TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      notes_list JSONB DEFAULT '[]',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL DEFAULT '{}',
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS scrape_runs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      source TEXT NOT NULL,
      url TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'running',
      records_saved INTEGER DEFAULT 0,
      error TEXT DEFAULT '',
      started_at TIMESTAMPTZ DEFAULT NOW(),
      finished_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Geographic county tag on properties for per-area rollups (idempotent)
    ALTER TABLE properties ADD COLUMN IF NOT EXISTS county TEXT DEFAULT '';

    -- Indices for performance and scalability
    CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);
    CREATE INDEX IF NOT EXISTS idx_properties_created_at ON properties(created_at);
    CREATE INDEX IF NOT EXISTS idx_properties_address_zip ON properties(address, zip_code);
    CREATE INDEX IF NOT EXISTS idx_properties_state_county ON properties(state, county);
    CREATE INDEX IF NOT EXISTS idx_buyer_matches_property_id ON buyer_matches(property_id);
    CREATE INDEX IF NOT EXISTS idx_buyer_matches_buyer_id ON buyer_matches(buyer_id);
    CREATE INDEX IF NOT EXISTS idx_crm_notes_entity ON crm_notes(entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS idx_crm_activities_property_id ON crm_activities(property_id);
    CREATE INDEX IF NOT EXISTS idx_counties_state ON counties(state);
    CREATE INDEX IF NOT EXISTS idx_cities_county_id ON cities(county_id);
    CREATE INDEX IF NOT EXISTS idx_realtors_county_id ON realtors(county_id);
    CREATE INDEX IF NOT EXISTS idx_title_companies_county_id ON title_companies(county_id);
  `);
}

// ==================== ROW MAPPERS ====================

export function rowToSeller(row) {
  if (!row) return null;
  const phoneNumbers = Array.isArray(row.phone_numbers) ? row.phone_numbers : (row.phone ? [row.phone] : []);
  const emailAddresses = Array.isArray(row.email_addresses) ? row.email_addresses : (row.email ? [row.email] : []);

  return {
    id: row.id,
    ownerName: row.owner_name,
    phone: row.phone || (phoneNumbers[0] || ''),
    email: row.email || (emailAddresses[0] || ''),
    mailingAddress: row.mailing_address || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    propertyId: row.property_id || null,
    phoneNumbers,
    emailAddresses,
    ownershipYears: row.ownership_years != null ? Number(row.ownership_years) : null,
    equityEstimate: row.equity_estimate != null ? Number(row.equity_estimate) : null,
    ownershipType: row.ownership_type || 'Individual',
    entityName: row.entity_name || '',
    skipTraced: !!row.skip_traced,
    lastContactDate: row.last_contact_date || null,
    contactNotes: row.contact_notes || '',
    notesList: row.notes_list || [],
  };
}

export function rowToBuyer(row) {
  return {
    id: row.id,
    fullName: row.full_name,
    companyName: row.company_name,
    phone: row.phone,
    email: row.email,
    website: row.website || '',
    buyerType: row.buyer_type,
    buyBox: {
      preferredStates: row.preferred_states || [],
      preferredCities: row.preferred_cities || [],
      desiredPropertyTypes: row.desired_property_types || [],
      maxBudget: row.max_budget,
    },
    minUnits: row.min_units != null ? Number(row.min_units) : null,
    maxUnits: row.max_units != null ? Number(row.max_units) : null,
    budgetMin: row.budget_min != null ? Number(row.budget_min) : null,
    budgetMax: row.budget_max != null ? Number(row.budget_max) : null,
    investmentStrategy: row.investment_strategy || '',
    notes: row.notes || '',
    lastContact: row.last_contact || null,
    dealsClosed: row.deals_closed != null ? Number(row.deals_closed) : 0,
    zillowUrl: row.zillow_url || '',
    redfinUrl: row.redfin_url || '',
    realtorUrl: row.realtor_url || '',
    propstreamUrl: row.propstream_url || '',
    batchleadsUrl: row.batchleads_url || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    notesList: row.notes_list || [],
  };
}

export function rowToInvestor(row) {
  return {
    id: row.id,
    investorName: row.investor_name,
    companyName: row.company_name,
    phone: row.phone,
    email: row.email,
    linkedInUrl: row.linkedin_url,
    biggerPocketsUrl: row.biggerpockets_url || '',
    facebookUrl: row.facebook_url || '',
    twitterUrl: row.twitter_url || '',
    instagramUrl: row.instagram_url || '',
    zillowUrl: row.zillow_url || '',
    redfinUrl: row.redfin_url || '',
    realtorUrl: row.realtor_url || '',
    propstreamUrl: row.propstream_url || '',
    batchleadsUrl: row.batchleads_url || '',
    connectedInvestorsUrl: row.connected_investors_url || '',
    loopnetUrl: row.loopnet_url || '',
    crexiUrl: row.crexi_url || '',
    sourcePlatform: row.source_platform || '',
    buyBoxRaw: row.buy_box_raw || '',
    unitRangeMin: row.unit_range_min != null ? Number(row.unit_range_min) : null,
    unitRangeMax: row.unit_range_max != null ? Number(row.unit_range_max) : null,
    budgetMin: row.budget_min != null ? Number(row.budget_min) : null,
    budgetMax: row.budget_max != null ? Number(row.budget_max) : null,
    investmentStrategy: row.investment_strategy || '',
    aiExtracted: !!row.ai_extracted,
    buyBox: {
      preferredStates: row.preferred_states || [],
      preferredCities: row.preferred_cities || [],
      desiredPropertyTypes: row.desired_property_types || [],
      maxBudget: row.max_budget,
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    notesList: row.notes_list || [],
  };
}

export function rowToProperty(row) {
  return {
    id: row.id,
    address: row.address,
    city: row.city,
    state: row.state,
    county: row.county || '',
    zip: row.zip || row.zip_code,
    zipCode: row.zip_code || row.zip,
    propertyType: row.property_type,
    leadCategories: row.lead_categories || [],
    price: row.price || row.asking_price || 0,
    askingPrice: row.asking_price || row.price || 0,
    arv: row.arv,
    repairCosts: row.repair_costs,
    assignmentFee: row.assignment_fee,
    sellerId: row.seller_id,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    status: row.status || 'new',
    topMatches: row.top_matches || [],
    dealScore: row.deal_score || null,
    bedrooms: row.bedrooms != null ? Number(row.bedrooms) : null,
    bathrooms: row.bathrooms != null ? Number(row.bathrooms) : null,
    sqft: row.sqft != null ? Number(row.sqft) : null,
    lotSize: row.lot_size != null ? Number(row.lot_size) : null,
    yearBuilt: row.year_built != null ? Number(row.year_built) : null,
    units: row.units != null ? Number(row.units) : 1,
    source: row.source || 'Manual',
    sourceUrl: row.source_url || '',
    zillowUrl: row.zillow_url || '',
    redfinUrl: row.redfin_url || '',
    realtorUrl: row.realtor_url || '',
    propstreamUrl: row.propstream_url || '',
    batchleadsUrl: row.batchleads_url || '',
    lastContactDate: row.last_contact_date || '',
    followUpDate: row.follow_up_date || '',
    notesList: row.notes_list || [],
    assignedBuyerId: row.assigned_buyer_id || null,
    dateAdded: row.created_at,
    lastUpdated: row.updated_at,
  };
}

export function rowToCounty(row) {
  if (!row) return null;
  return {
    id: row.id,
    state: row.state || '',
    countyName: row.county_name || '',
    fipsCode: row.fips_code || '',
    notes: row.notes || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function rowToCity(row) {
  if (!row) return null;
  return {
    id: row.id,
    countyId: row.county_id || null,
    state: row.state || '',
    countyName: row.county_name || '',
    cityName: row.city_name || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function rowToRealtor(row) {
  if (!row) return null;
  const phoneNumbers = Array.isArray(row.phone_numbers) ? row.phone_numbers : (row.phone ? [row.phone] : []);
  const emailAddresses = Array.isArray(row.email_addresses) ? row.email_addresses : (row.email ? [row.email] : []);
  return {
    id: row.id,
    name: row.name || '',
    brokerage: row.brokerage || '',
    phone: row.phone || (phoneNumbers[0] || ''),
    email: row.email || (emailAddresses[0] || ''),
    licenseNumber: row.license_number || '',
    countyId: row.county_id || null,
    state: row.state || '',
    countyName: row.county_name || '',
    city: row.city || '',
    phoneNumbers,
    emailAddresses,
    source: row.source || 'Manual',
    sourceUrl: row.source_url || '',
    notes: row.notes || '',
    notesList: row.notes_list || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function rowToTitleCompany(row) {
  if (!row) return null;
  return {
    id: row.id,
    companyName: row.company_name || '',
    contactName: row.contact_name || '',
    phone: row.phone || '',
    email: row.email || '',
    address: row.address || '',
    countyId: row.county_id || null,
    state: row.state || '',
    countyName: row.county_name || '',
    source: row.source || 'Manual',
    sourceUrl: row.source_url || '',
    notes: row.notes || '',
    notesList: row.notes_list || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function rowToUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    avatarUrl: row.avatar_url || '',
    googleId: row.google_id || null,
    facebookId: row.facebook_id || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ==================== USER HELPERS ====================

export async function getUserById(id) {
  const rows = await query('SELECT * FROM users WHERE id = $1', [id]);
  return rowToUser(rows[0]);
}

export async function getUserByEmail(email) {
  const rows = await query('SELECT * FROM users WHERE email = $1', [email?.toLowerCase()]);
  return rowToUser(rows[0]);
}

export async function getUserByGoogleId(googleId) {
  const rows = await query('SELECT * FROM users WHERE google_id = $1', [googleId]);
  return rowToUser(rows[0]);
}

export async function getUserByFacebookId(facebookId) {
  const rows = await query('SELECT * FROM users WHERE facebook_id = $1', [facebookId]);
  return rowToUser(rows[0]);
}

export async function createUser({ id, email, passwordHash = null, name, avatarUrl = '', googleId = null, facebookId = null }) {
  const now = new Date().toISOString();
  await query(
    `INSERT INTO users (id, email, password_hash, name, avatar_url, google_id, facebook_id, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [id, email.toLowerCase(), passwordHash, name, avatarUrl, googleId, facebookId, now, now]
  );
  return getUserById(id);
}

export async function updateUser(id, updates) {
  const existingRows = await query('SELECT * FROM users WHERE id = $1', [id]);
  const existing = existingRows[0];
  if (!existing) return null;

  const now = new Date().toISOString();
  const sets = [];
  const values = [];
  let idx = 1;

  if (updates.name !== undefined) { sets.push(`name = $${idx++}`); values.push(updates.name); }
  if (updates.avatarUrl !== undefined) { sets.push(`avatar_url = $${idx++}`); values.push(updates.avatarUrl); }
  if (updates.googleId !== undefined) { sets.push(`google_id = $${idx++}`); values.push(updates.googleId); }
  if (updates.facebookId !== undefined) { sets.push(`facebook_id = $${idx++}`); values.push(updates.facebookId); }
  if (updates.passwordHash !== undefined) { sets.push(`password_hash = $${idx++}`); values.push(updates.passwordHash); }

  if (sets.length === 0) return rowToUser(existing);

  sets.push(`updated_at = $${idx++}`);
  values.push(now);
  values.push(id);

  await query(`UPDATE users SET ${sets.join(', ')} WHERE id = $${idx}`, values);
  return getUserById(id);
}

// ==================== GENERIC CRUD ====================

// pg parameterized queries require JSONB values to be JSON strings
function serializeParam(col, value) {
  if (col === 'lead_categories' && Array.isArray(value)) {
    return value; // node-pg handles string arrays natively
  }
  if (Array.isArray(value) || (value !== null && typeof value === 'object' && !(value instanceof Date))) {
    return JSON.stringify(value);
  }
  return value;
}

function createCrud(table, mapRow, mapBodyToDb) {
  return {
    async list() {
      const rows = await query(`SELECT * FROM ${table} ORDER BY created_at DESC`);
      return rows.map(mapRow);
    },
    async get(id) {
      const rows = await query(`SELECT * FROM ${table} WHERE id = $1`, [id]);
      return rows[0] ? mapRow(rows[0]) : null;
    },
    async insert(payload) {
      const id = payload.id || randomUUID();
      const createdAt = payload.createdAt || new Date().toISOString();
      const updatedAt = payload.updatedAt || createdAt;
      const values = mapBodyToDb({ ...payload, id, createdAt, updatedAt });

      const columns = Object.keys(values);
      const placeholders = columns.map((_, i) => `$${i + 1}`);
      const params = columns.map((col) => serializeParam(col, values[col]));

      await query(
        `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`,
        params
      );
      return this.get(id);
    },
    async update(id, payload) {
      const existing = await this.get(id);
      if (!existing) return null;

      const updatedAt = new Date().toISOString();
      const values = mapBodyToDb({ ...existing, ...payload, id, createdAt: existing.createdAt, updatedAt });

      const assignments = Object.keys(values)
        .filter((key) => key !== 'id')
        .map((key, i) => `${key} = $${i + 1}`);

      const params = Object.keys(values)
        .filter((key) => key !== 'id')
        .map((key) => serializeParam(key, values[key]));
      params.push(id);

      await query(`UPDATE ${table} SET ${assignments.join(', ')} WHERE id = $${params.length}`, params);
      return this.get(id);
    },
    async remove(id) {
      const result = await query(`DELETE FROM ${table} WHERE id = $1`, [id]);
      return result.length > 0 || (result.rowCount ?? 0) > 0; // pg returns rowCount on command
    },
  };
}

// Map functions (adjusted for Postgres - JSONB columns accept objects directly)

const sellers = createCrud(
  'sellers',
  rowToSeller,
  ({
    id,
    ownerName,
    phone,
    email,
    mailingAddress,
    createdAt,
    updatedAt,
    propertyId,
    phoneNumbers,
    emailAddresses,
    ownershipYears,
    equityEstimate,
    ownershipType,
    entityName,
    skipTraced,
    lastContactDate,
    contactNotes,
    notesList,
  }) => {
    const pNumbers = Array.isArray(phoneNumbers) ? phoneNumbers : (phone ? [phone] : []);
    const eAddresses = Array.isArray(emailAddresses) ? emailAddresses : (email ? [email] : []);
    return {
      id,
      owner_name: ownerName ?? '',
      phone: phone ?? (pNumbers[0] ?? ''),
      email: email ?? (eAddresses[0] ?? ''),
      mailing_address: mailingAddress ?? '',
      created_at: createdAt,
      updated_at: updatedAt,
      property_id: propertyId ?? null,
      phone_numbers: pNumbers,
      email_addresses: eAddresses,
      ownership_years: ownershipYears != null ? Number(ownershipYears) : null,
      equity_estimate: equityEstimate != null ? Number(equityEstimate) : null,
      ownership_type: ownershipType ?? 'Individual',
      entity_name: entityName ?? '',
      skip_traced: skipTraced === true || skipTraced === 'true',
      last_contact_date: lastContactDate && lastContactDate !== '' ? lastContactDate : null,
      contact_notes: contactNotes ?? '',
      notes_list: notesList ?? [],
    };
  }
);

const buyersBase = createCrud(
  'buyers',
  rowToBuyer,
  ({
    id,
    fullName,
    companyName,
    phone,
    email,
    website,
    buyerType,
    buyBox,
    minUnits,
    maxUnits,
    budgetMin,
    budgetMax,
    investmentStrategy,
    notes,
    lastContact,
    dealsClosed,
    zillowUrl,
    redfinUrl,
    realtorUrl,
    propstreamUrl,
    batchleadsUrl,
    createdAt,
    updatedAt,
    notesList,
  }) => ({
    id,
    full_name: fullName ?? '',
    company_name: companyName ?? '',
    phone: phone ?? '',
    email: email ?? '',
    website: website ?? '',
    buyer_type: buyerType ?? 'Cash Buyer',
    preferred_states: buyBox?.preferredStates ?? [],
    preferred_cities: buyBox?.preferredCities ?? [],
    desired_property_types: buyBox?.desiredPropertyTypes ?? [],
    max_budget: buyBox?.maxBudget ?? null,
    min_units: minUnits ?? null,
    max_units: maxUnits ?? null,
    budget_min: budgetMin ?? null,
    budget_max: budgetMax ?? null,
    investment_strategy: investmentStrategy ?? '',
    notes: notes ?? '',
    last_contact: lastContact && lastContact !== '' ? lastContact : null,
    deals_closed: dealsClosed ?? 0,
    zillow_url: zillowUrl ?? '',
    redfin_url: redfinUrl ?? '',
    realtor_url: realtorUrl ?? '',
    propstream_url: propstreamUrl ?? '',
    batchleads_url: batchleadsUrl ?? '',
    created_at: createdAt,
    updated_at: updatedAt,
    notes_list: notesList ?? [],
  })
);

const buyers = {
  ...buyersBase,
  async insert(payload) {
    const res = await buyersBase.insert(payload);
    import('./queue.js').then(({ addJob }) => addJob('run_matching', {})).catch(err => console.error('Error queuing run_matching job:', err));
    return res;
  },
  async update(id, payload) {
    const res = await buyersBase.update(id, payload);
    import('./queue.js').then(({ addJob }) => addJob('run_matching', {})).catch(err => console.error('Error queuing run_matching job:', err));
    return res;
  }
};

const investorsBase = createCrud(
  'investors',
  rowToInvestor,
  ({
    id, investorName, companyName, phone, email, linkedInUrl, biggerPocketsUrl,
    facebookUrl, twitterUrl, instagramUrl, zillowUrl, redfinUrl, realtorUrl,
    propstreamUrl, batchleadsUrl, connectedInvestorsUrl, loopnetUrl, crexiUrl,
    sourcePlatform, buyBoxRaw, unitRangeMin, unitRangeMax, budgetMin, budgetMax,
    investmentStrategy, aiExtracted, buyBox, createdAt, updatedAt, notesList
  }) => ({
    id,
    investor_name: investorName ?? '',
    company_name: companyName ?? '',
    phone: phone ?? '',
    email: email ?? '',
    linkedin_url: linkedInUrl ?? '',
    biggerpockets_url: biggerPocketsUrl ?? '',
    facebook_url: facebookUrl ?? '',
    twitter_url: twitterUrl ?? '',
    instagram_url: instagramUrl ?? '',
    zillow_url: zillowUrl ?? '',
    redfin_url: redfinUrl ?? '',
    realtor_url: realtorUrl ?? '',
    propstream_url: propstreamUrl ?? '',
    batchleads_url: batchleadsUrl ?? '',
    connected_investors_url: connectedInvestorsUrl ?? '',
    loopnet_url: loopnetUrl ?? '',
    crexi_url: crexiUrl ?? '',
    source_platform: sourcePlatform ?? '',
    buy_box_raw: buyBoxRaw ?? '',
    unit_range_min: unitRangeMin ?? null,
    unit_range_max: unitRangeMax ?? null,
    budget_min: budgetMin ?? null,
    budget_max: budgetMax ?? null,
    investment_strategy: investmentStrategy ?? '',
    ai_extracted: aiExtracted === true || aiExtracted === 'true',
    preferred_states: buyBox?.preferredStates ?? [],
    preferred_cities: buyBox?.preferredCities ?? [],
    desired_property_types: buyBox?.desiredPropertyTypes ?? [],
    max_budget: buyBox?.maxBudget ?? null,
    created_at: createdAt,
    updated_at: updatedAt,
    notes_list: notesList ?? [],
  })
);

const investors = {
  ...investorsBase,
  async insert(payload) {
    const res = await investorsBase.insert(payload);
    import('./queue.js').then(({ addJob }) => addJob('run_matching', {})).catch(err => console.error('Error queuing run_matching job:', err));
    return res;
  },
  async update(id, payload) {
    const res = await investorsBase.update(id, payload);
    import('./queue.js').then(({ addJob }) => addJob('run_matching', {})).catch(err => console.error('Error queuing run_matching job:', err));
    return res;
  }
};

const propertiesBase = createCrud(
  'properties',
  rowToProperty,
  ({
    id, address, city, state, zip, zipCode, propertyType, leadCategories,
    price, askingPrice, arv, repairCosts, assignmentFee, sellerId, notes,
    createdAt, updatedAt, status, topMatches, dealScore,
    bedrooms, bathrooms, sqft, lotSize, yearBuilt, source, sourceUrl,
    zillowUrl, redfinUrl, realtorUrl, propstreamUrl, batchleadsUrl, units,
    lastContactDate, followUpDate, notesList, assignedBuyerId, county
  }) => ({
    id,
    address: address ?? '',
    city: city ?? '',
    state: state ?? '',
    county: county ?? '',
    zip_code: zipCode ?? zip ?? '',
    property_type: propertyType ?? 'Single Family',
    lead_categories: leadCategories ?? [],
    asking_price: Number(askingPrice || price) || 0,
    arv: arv ?? null,
    repair_costs: repairCosts ?? null,
    assignment_fee: assignmentFee ?? 10000,
    seller_id: sellerId ?? null,
    notes: notes ?? '',
    created_at: createdAt,
    updated_at: updatedAt,
    status: status ?? 'new',
    top_matches: topMatches ?? [],
    deal_score: dealScore ?? null,
    bedrooms: bedrooms != null ? Number(bedrooms) : null,
    bathrooms: bathrooms != null ? Number(bathrooms) : null,
    sqft: sqft != null ? Number(sqft) : null,
    lot_size: lotSize != null ? Number(lotSize) : null,
    year_built: yearBuilt != null ? Number(yearBuilt) : null,
    source: source ?? 'Manual',
    source_url: sourceUrl ?? '',
    zillow_url: zillowUrl ?? '',
    redfin_url: redfinUrl ?? '',
    realtor_url: realtorUrl ?? '',
    propstream_url: propstreamUrl ?? '',
    batchleads_url: batchleadsUrl ?? '',
    units: units != null ? Number(units) : 1,
    last_contact_date: lastContactDate && lastContactDate !== '' ? lastContactDate : null,
    follow_up_date: followUpDate && followUpDate !== '' ? followUpDate : null,
    notes_list: notesList ?? [],
    assigned_buyer_id: assignedBuyerId ?? null,
  })
);

const properties = {
  ...propertiesBase,
  async insert(payload) {
    // 1. Compute deal score
    const score = payload.dealScore !== undefined && payload.dealScore !== null
      ? payload.dealScore
      : await computeDealScore(payload);
    
    // 2. Find matches
    const tempProperty = {
      propertyType: payload.propertyType || 'Single Family',
      price: Number(payload.price || payload.askingPrice || 0),
      state: payload.state || '',
      city: payload.city || '',
      units: payload.units != null ? Number(payload.units) : 1,
    };
    const matches = await findMatchesForProperty(tempProperty);

    // 3. Insert into database
    const result = await propertiesBase.insert({
      ...payload,
      dealScore: score,
      topMatches: matches,
      status: payload.status || (matches.length > 0 ? 'matched' : 'new'),
    });
    import('./queue.js').then(({ addJob }) => addJob('run_matching', {})).catch(err => console.error('Error queuing run_matching job:', err));
    return result;
  },
  async update(id, payload) {
    const existing = await this.get(id);
    if (!existing) return null;

    // Merge existing and updates
    const merged = { ...existing, ...payload };

    // Compute deal score
    const score = payload.dealScore !== undefined && payload.dealScore !== null
      ? payload.dealScore
      : await computeDealScore(merged);

    // Re-find matches
    const matches = await findMatchesForProperty(merged);

    const result = await propertiesBase.update(id, {
      ...payload,
      dealScore: score,
      topMatches: matches,
    });
    import('./queue.js').then(({ addJob }) => addJob('run_matching', {})).catch(err => console.error('Error queuing run_matching job:', err));
    return result;
  }
};

// Export the resources so server/index.js can mount them easily
export { sellers, buyers, investors, properties };

const counties = createCrud(
  'counties',
  rowToCounty,
  ({ id, state, countyName, fipsCode, notes, createdAt, updatedAt }) => ({
    id,
    state: (state ?? '').toUpperCase().slice(0, 2),
    county_name: countyName ?? '',
    fips_code: fipsCode ?? '',
    notes: notes ?? '',
    created_at: createdAt,
    updated_at: updatedAt,
  })
);

const cities = createCrud(
  'cities',
  rowToCity,
  ({ id, countyId, state, countyName, cityName, createdAt, updatedAt }) => ({
    id,
    county_id: countyId ?? null,
    state: (state ?? '').toUpperCase().slice(0, 2),
    county_name: countyName ?? '',
    city_name: cityName ?? '',
    created_at: createdAt,
    updated_at: updatedAt,
  })
);

const realtors = createCrud(
  'realtors',
  rowToRealtor,
  ({
    id, name, brokerage, phone, email, licenseNumber, countyId, state,
    countyName, city, phoneNumbers, emailAddresses, source, sourceUrl,
    notes, notesList, createdAt, updatedAt
  }) => {
    const pNumbers = Array.isArray(phoneNumbers) ? phoneNumbers : (phone ? [phone] : []);
    const eAddresses = Array.isArray(emailAddresses) ? emailAddresses : (email ? [email] : []);
    return {
      id,
      name: name ?? '',
      brokerage: brokerage ?? '',
      phone: phone ?? (pNumbers[0] ?? ''),
      email: email ?? (eAddresses[0] ?? ''),
      license_number: licenseNumber ?? '',
      county_id: countyId ?? null,
      state: (state ?? '').toUpperCase().slice(0, 2),
      county_name: countyName ?? '',
      city: city ?? '',
      phone_numbers: pNumbers,
      email_addresses: eAddresses,
      source: source ?? 'Manual',
      source_url: sourceUrl ?? '',
      notes: notes ?? '',
      notes_list: notesList ?? [],
      created_at: createdAt,
      updated_at: updatedAt,
    };
  }
);

const titleCompanies = createCrud(
  'title_companies',
  rowToTitleCompany,
  ({
    id, companyName, contactName, phone, email, address, countyId, state,
    countyName, source, sourceUrl, notes, notesList, createdAt, updatedAt
  }) => ({
    id,
    company_name: companyName ?? '',
    contact_name: contactName ?? '',
    phone: phone ?? '',
    email: email ?? '',
    address: address ?? '',
    county_id: countyId ?? null,
    state: (state ?? '').toUpperCase().slice(0, 2),
    county_name: countyName ?? '',
    source: source ?? 'Manual',
    source_url: sourceUrl ?? '',
    notes: notes ?? '',
    notes_list: notesList ?? [],
    created_at: createdAt,
    updated_at: updatedAt,
  })
);

export { counties, cities, realtors, titleCompanies };

// Clear all data from tables (respects FK order via TRUNCATE CASCADE)
export async function clearAllData() {
  await query('TRUNCATE TABLE buyer_matches, crm_activities, crm_notes, properties, sellers, buyers, investors, data_sources, export_logs, realtors, title_companies, cities, counties CASCADE');
  return { cleared: true };
}

// Legacy / convenience functions (still async now)
export async function getAllData() {
  const [sellersData, buyersData, investorsData, propertiesData] = await Promise.all([
    sellers.list(),
    buyers.list(),
    investors.list(),
    properties.list(),
  ]);
  return {
    sellers: sellersData,
    buyers: buyersData,
    investors: investorsData,
    properties: propertiesData,
  };
}

function serverCalculateMatchScore(property, buyerOrInvestor) {
  const buyBox = buyerOrInvestor.buyBox || {};
  const preferredStates = buyBox.preferredStates || [];
  const propertyState = (property.state || '').trim().toUpperCase();

  // 1. State Filter (25% Weight) - Hard Filter
  if (preferredStates.length > 0) {
    const isStateMatched = preferredStates.some(s => s.trim().toUpperCase() === propertyState);
    if (!isStateMatched) {
      return { matched: false, score: 0, breakdown: { state: false, propertyType: false, budget: false, city: false, units: false } };
    }
  }

  // 2. Property Type Filter (25% Weight) - Hard Filter
  const desiredPropertyTypes = buyBox.desiredPropertyTypes || [];
  const propertyType = (property.propertyType || '').trim();

  if (desiredPropertyTypes.length > 0) {
    const isTypeMatched = desiredPropertyTypes.some(t => {
      const cleanT = t.toLowerCase();
      const cleanPT = propertyType.toLowerCase();
      return cleanT.includes(cleanPT) || cleanPT.includes(cleanT) ||
             (cleanT.includes('sfr') && cleanPT.includes('sfr')) ||
             (cleanT.includes('multi') && cleanPT.includes('multi'));
    });
    if (!isTypeMatched) {
      return { matched: false, score: 0, breakdown: { state: preferredStates.length > 0, propertyType: false, budget: false, city: false, units: false } };
    }
  }

  let score = 0;
  const breakdown = {
    state: true,
    propertyType: true,
    budget: false,
    city: false,
    units: false
  };

  score += 25; // Passed state filter
  score += 25; // Passed property type filter

  // 3. Budget Range (25% Weight)
  const price = property.askingPrice || property.price || 0;
  const bMin = buyerOrInvestor.budgetMin || 0;
  const bMax = buyerOrInvestor.budgetMax || buyBox.maxBudget || 0;

  let budgetMatches = false;
  if (bMin === 0 && bMax === 0) {
    budgetMatches = true;
  } else if (bMin > 0 && bMax > 0) {
    budgetMatches = price >= bMin && price <= bMax;
  } else if (bMax > 0) {
    budgetMatches = price <= bMax;
  } else if (bMin > 0) {
    budgetMatches = price >= bMin;
  }

  if (budgetMatches) {
    score += 25;
    breakdown.budget = true;
  }

  // 4. City (10% Weight, optional) - Bonus
  const preferredCities = buyBox.preferredCities || [];
  const propertyCity = (property.city || '').trim().toLowerCase();

  let cityMatches = false;
  if (preferredCities.length === 0) {
    cityMatches = true;
  } else {
    cityMatches = preferredCities.some(c => c.trim().toLowerCase() === propertyCity);
  }

  if (cityMatches) {
    score += 10;
    breakdown.city = true;
  }

  // 5. Unit Count (15% Weight, MF only)
  const isMultifamily = /multi|duplex|triplex|quad|apartment/i.test(propertyType);
  const uMin = buyerOrInvestor.unitRangeMin || buyerOrInvestor.minUnits || 0;
  const uMax = buyerOrInvestor.unitRangeMax || buyerOrInvestor.maxUnits || 0;

  let unitCountMatches = true;
  if (isMultifamily) {
    const propUnits = property.units || 0;
    if (uMin > 0 || uMax > 0) {
      if (propUnits > 0) {
        if (uMin > 0 && uMax > 0) {
          unitCountMatches = propUnits >= uMin && propUnits <= uMax;
        } else if (uMax > 0) {
          unitCountMatches = propUnits <= uMax;
        } else if (uMin > 0) {
          unitCountMatches = propUnits >= uMin;
        }
      } else {
        unitCountMatches = false;
      }
    }
  }

  if (unitCountMatches) {
    score += 15;
    breakdown.units = true;
  }

  return {
    matched: true,
    score: Math.round(score),
    breakdown
  };
}

export async function findMatchesForProperty(property) {
  const [allBuyers, allInvestors] = await Promise.all([buyers.list(), investors.list()]);
  const matches = [];

  for (const b of allBuyers) {
    const res = serverCalculateMatchScore(property, b);
    if (res.matched) {
      matches.push({
        id: b.id,
        name: b.fullName,
        companyName: b.companyName,
        phone: b.phone,
        email: b.email,
        type: 'Buyer',
        buyerType: b.buyerType,
        score: res.score,
        breakdown: res.breakdown
      });
    }
  }
  for (const i of allInvestors) {
    const res = serverCalculateMatchScore(property, i);
    if (res.matched) {
      matches.push({
        id: i.id,
        name: i.investorName,
        companyName: i.companyName,
        phone: i.phone,
        email: i.email,
        type: 'Investor',
        linkedInUrl: i.linkedInUrl,
        score: res.score,
        breakdown: res.breakdown
      });
    }
  }

  // Sort matches by score descending, name ascending
  matches.sort((a, b) => {
    const scoreDiff = (b.score || 0) - (a.score || 0);
    if (scoreDiff !== 0) return scoreDiff;
    return a.name.localeCompare(b.name);
  });

  return matches.slice(0, 15); // top 15 matches
}

export async function autoMatchProperty(propertyId) {
  const prop = await properties.get(propertyId);
  if (!prop) return null;

  const matches = await findMatchesForProperty(prop);

  // Real-time deal score based on 5.4 requirements
  const dealScore = await computeDealScore(prop);

  const updated = await properties.update(propertyId, {
    topMatches: matches,
    dealScore,
    status: prop.status === 'new' ? 'matched' : prop.status,
  });

  return { property: updated, matches, dealScore };
}

export async function reRunMatchingForAllProperties() {
  const allProperties = await propertiesBase.list();
  for (const prop of allProperties) {
    const matches = await findMatchesForProperty(prop);
    const score = prop.dealScore !== undefined && prop.dealScore !== null
      ? prop.dealScore
      : await computeDealScore(prop);
    await propertiesBase.update(prop.id, {
      topMatches: matches,
      dealScore: score,
      status: prop.status === 'new' && matches.length > 0 ? 'matched' : prop.status
    });
  }
}

// Helper to compute score (can be called from routes)
export async function computeDealScore(property) {
  const { arv, repairCosts, price, askingPrice, leadCategories, createdAt } = property;
  if (!arv || arv <= 0) return null;

  const priceVal = Number(askingPrice || price || 0);

  // 1. Equity (ARV vs Price/Asking Price) - 35% weight
  let equityScore = 0;
  if (priceVal > 0) {
    const equityPct = (arv - priceVal) / arv;
    if (equityPct >= 0.40) {
      equityScore = 100;
    } else if (equityPct <= 0.10) {
      equityScore = 0;
    } else {
      equityScore = ((equityPct - 0.10) / (0.40 - 0.10)) * 100;
    }
  }

  // 2. Lead Category Quality - 20% weight
  let categoryScore = 30; // default low
  const categories = Array.isArray(leadCategories)
    ? leadCategories
    : (typeof leadCategories === 'string' ? JSON.parse(leadCategories || '[]') : []);

  const highQuality = ['foreclosure', 'vacant', 'tax delinquent', 'distressed', 'tired landlord', 'probate', 'expired'];
  const medQuality = ['pre-foreclosure', 'absentee owner', 'rental property', 'divorce', 'bankruptcy'];

  if (categories && categories.length > 0) {
    const cats = categories.map(c => String(c).trim().toLowerCase());
    const hasHigh = cats.some(c => highQuality.includes(c));
    const hasMed = cats.some(c => medQuality.includes(c));
    if (hasHigh) {
      categoryScore = 100;
    } else if (hasMed) {
      categoryScore = 70;
    }
  }

  // 3. Days on Market - 15% weight
  let domScore = 60; // default medium
  if (createdAt) {
    const days = (Date.now() - new Date(createdAt).getTime()) / (1000 * 3600 * 24);
    if (days >= 90) domScore = 100;
    else if (days >= 60) domScore = 80;
    else if (days >= 30) domScore = 60;
    else if (days >= 15) domScore = 40;
    else domScore = 20;
  }

  // 4. Estimated Repair Cost vs ARV - 15% weight
  let repairScore = 100;
  if (repairCosts > 0) {
    const repairPct = repairCosts / arv;
    if (repairPct <= 0.10) {
      repairScore = 100;
    } else if (repairPct >= 0.50) {
      repairScore = 20;
    } else {
      repairScore = 100 - ((repairPct - 0.10) / (0.50 - 0.10)) * 80;
    }
  }

  // 5. Price Range Desirability - 15% weight
  let priceDesirabilityScore = 100;
  try {
    const buyers = await query('SELECT max_budget FROM buyers WHERE max_budget IS NOT NULL AND max_budget > 0');
    if (buyers && buyers.length > 0) {
      const matchingBuyers = buyers.filter(b => Number(b.max_budget) >= priceVal);
      priceDesirabilityScore = (matchingBuyers.length / buyers.length) * 100;
    } else {
      // Fallback
      if (priceVal >= 50000 && priceVal <= 250000) priceDesirabilityScore = 100;
      else if (priceVal > 250000 && priceVal <= 400000) priceDesirabilityScore = 75;
      else if (priceVal < 50000) priceDesirabilityScore = 60;
      else priceDesirabilityScore = 30;
    }
  } catch (e) {
    if (priceVal >= 50000 && priceVal <= 250000) priceDesirabilityScore = 100;
    else if (priceVal > 250000 && priceVal <= 400000) priceDesirabilityScore = 75;
    else if (priceVal < 50000) priceDesirabilityScore = 60;
    else priceDesirabilityScore = 30;
  }

  const finalScore = Math.round(
    (equityScore * 0.35) +
    (categoryScore * 0.20) +
    (domScore * 0.15) +
    (repairScore * 0.15) +
    (priceDesirabilityScore * 0.15)
  );

  return Math.max(0, Math.min(100, finalScore));
}

export async function countAll() {
  const [sellersCount, buyersCount, investorsCount, propertiesCount] = await Promise.all([
    query('SELECT COUNT(*)::int AS count FROM sellers').then(r => r[0]?.count ?? 0),
    query('SELECT COUNT(*)::int AS count FROM buyers').then(r => r[0]?.count ?? 0),
    query('SELECT COUNT(*)::int AS count FROM investors').then(r => r[0]?.count ?? 0),
    query('SELECT COUNT(*)::int AS count FROM properties').then(r => r[0]?.count ?? 0),
  ]);
  return {
    sellers: sellersCount,
    buyers: buyersCount,
    investors: investorsCount,
    properties: propertiesCount,
  };
}

// Per-county rollups powering "number of sellers and buyers per area".
// Uses SQL sub-selects/GROUP BY (not per-row JS) for scale. Buyers/investors are
// counted demand-side: their buy-box (preferred_states / preferred_cities JSONB)
// targets the area. Sellers are tied to an area via the property they own.
export async function getAreaStats() {
  const rows = await query(`
    SELECT
      c.id,
      c.state,
      c.county_name,
      (SELECT COUNT(*)::int FROM properties p
         WHERE UPPER(p.state) = UPPER(c.state)
           AND LOWER(COALESCE(p.county, '')) = LOWER(c.county_name)) AS properties,
      (SELECT COUNT(DISTINCT p.seller_id)::int FROM properties p
         WHERE p.seller_id IS NOT NULL
           AND UPPER(p.state) = UPPER(c.state)
           AND LOWER(COALESCE(p.county, '')) = LOWER(c.county_name)) AS sellers,
      (SELECT COUNT(*)::int FROM buyers b
         WHERE b.preferred_states @> to_jsonb(ARRAY[UPPER(c.state)])
            OR EXISTS (
              SELECT 1 FROM jsonb_array_elements_text(b.preferred_cities) pc
              JOIN cities ci ON ci.county_id = c.id
              WHERE LOWER(pc) = LOWER(ci.city_name)
            )) AS buyers,
      (SELECT COUNT(*)::int FROM investors i
         WHERE i.preferred_states @> to_jsonb(ARRAY[UPPER(c.state)])
            OR EXISTS (
              SELECT 1 FROM jsonb_array_elements_text(i.preferred_cities) pc
              JOIN cities ci ON ci.county_id = c.id
              WHERE LOWER(pc) = LOWER(ci.city_name)
            )) AS investors,
      (SELECT COUNT(*)::int FROM realtors r WHERE r.county_id = c.id) AS realtors,
      (SELECT COUNT(*)::int FROM title_companies t WHERE t.county_id = c.id) AS title_companies
    FROM counties c
    ORDER BY c.state, c.county_name
  `);
  return rows.map(r => ({
    id: r.id,
    state: r.state,
    countyName: r.county_name,
    properties: r.properties ?? 0,
    sellers: r.sellers ?? 0,
    buyers: r.buyers ?? 0,
    investors: r.investors ?? 0,
    realtors: r.realtors ?? 0,
    titleCompanies: r.title_companies ?? 0,
  }));
}
