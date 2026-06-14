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

export async function initDb() {
  await query(`
    CREATE TABLE IF NOT EXISTS sellers (
      id TEXT PRIMARY KEY,
      owner_name TEXT NOT NULL,
      phone TEXT DEFAULT '',
      email TEXT DEFAULT '',
      mailing_address TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS buyers (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      company_name TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      email TEXT DEFAULT '',
      buyer_type TEXT NOT NULL,
      preferred_states JSONB DEFAULT '[]',
      preferred_cities JSONB DEFAULT '[]',
      desired_property_types JSONB DEFAULT '[]',
      max_budget DOUBLE PRECISION,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS investors (
      id TEXT PRIMARY KEY,
      investor_name TEXT NOT NULL,
      company_name TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      email TEXT DEFAULT '',
      linkedin_url TEXT DEFAULT '',
      preferred_states JSONB DEFAULT '[]',
      preferred_cities JSONB DEFAULT '[]',
      desired_property_types JSONB DEFAULT '[]',
      max_budget DOUBLE PRECISION,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS properties (
      id TEXT PRIMARY KEY,
      address TEXT NOT NULL,
      city TEXT DEFAULT '',
      state TEXT DEFAULT '',
      zip TEXT DEFAULT '',
      property_type TEXT NOT NULL,
      lead_categories JSONB DEFAULT '[]',
      price DOUBLE PRECISION NOT NULL DEFAULT 0,
      arv DOUBLE PRECISION,
      repair_costs DOUBLE PRECISION,
      assignment_fee DOUBLE PRECISION NOT NULL DEFAULT 10000,
      seller_id TEXT REFERENCES sellers(id) ON DELETE SET NULL,
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      status TEXT DEFAULT 'new',
      top_matches JSONB DEFAULT '[]',
      deal_score DOUBLE PRECISION
    );

    -- Add columns for existing databases (idempotent)
    ALTER TABLE properties ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'new';
    ALTER TABLE properties ADD COLUMN IF NOT EXISTS top_matches JSONB DEFAULT '[]';
    ALTER TABLE properties ADD COLUMN IF NOT EXISTS deal_score DOUBLE PRECISION;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      name TEXT NOT NULL,
      avatar_url TEXT DEFAULT '',
      google_id TEXT UNIQUE,
      facebook_id TEXT UNIQUE,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
}

// ==================== ROW MAPPERS ====================

export function rowToSeller(row) {
  return {
    id: row.id,
    ownerName: row.owner_name,
    phone: row.phone,
    email: row.email,
    mailingAddress: row.mailing_address,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function rowToBuyer(row) {
  return {
    id: row.id,
    fullName: row.full_name,
    companyName: row.company_name,
    phone: row.phone,
    email: row.email,
    buyerType: row.buyer_type,
    buyBox: {
      preferredStates: row.preferred_states || [],
      preferredCities: row.preferred_cities || [],
      desiredPropertyTypes: row.desired_property_types || [],
      maxBudget: row.max_budget,
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
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
    buyBox: {
      preferredStates: row.preferred_states || [],
      preferredCities: row.preferred_cities || [],
      desiredPropertyTypes: row.desired_property_types || [],
      maxBudget: row.max_budget,
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function rowToProperty(row) {
  return {
    id: row.id,
    address: row.address,
    city: row.city,
    state: row.state,
    zip: row.zip,
    propertyType: row.property_type,
    leadCategories: row.lead_categories || [],
    price: row.price,
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
function serializeParam(value) {
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
      const params = columns.map((col) => serializeParam(values[col]));

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
      const values = mapBodyToDb({ ...payload, id, createdAt: existing.createdAt, updatedAt });

      const assignments = Object.keys(values)
        .filter((key) => key !== 'id')
        .map((key, i) => `${key} = $${i + 1}`);

      const params = Object.keys(values)
        .filter((key) => key !== 'id')
        .map((key) => serializeParam(values[key]));
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
  ({ id, ownerName, phone, email, mailingAddress, createdAt, updatedAt }) => ({
    id,
    owner_name: ownerName ?? '',
    phone: phone ?? '',
    email: email ?? '',
    mailing_address: mailingAddress ?? '',
    created_at: createdAt,
    updated_at: updatedAt,
  })
);

const buyers = createCrud(
  'buyers',
  rowToBuyer,
  ({ id, fullName, companyName, phone, email, buyerType, buyBox, createdAt, updatedAt }) => ({
    id,
    full_name: fullName ?? '',
    company_name: companyName ?? '',
    phone: phone ?? '',
    email: email ?? '',
    buyer_type: buyerType ?? 'Cash Buyer',
    preferred_states: buyBox?.preferredStates ?? [],
    preferred_cities: buyBox?.preferredCities ?? [],
    desired_property_types: buyBox?.desiredPropertyTypes ?? [],
    max_budget: buyBox?.maxBudget ?? null,
    created_at: createdAt,
    updated_at: updatedAt,
  })
);

const investors = createCrud(
  'investors',
  rowToInvestor,
  ({ id, investorName, companyName, phone, email, linkedInUrl, buyBox, createdAt, updatedAt }) => ({
    id,
    investor_name: investorName ?? '',
    company_name: companyName ?? '',
    phone: phone ?? '',
    email: email ?? '',
    linkedin_url: linkedInUrl ?? '',
    preferred_states: buyBox?.preferredStates ?? [],
    preferred_cities: buyBox?.preferredCities ?? [],
    desired_property_types: buyBox?.desiredPropertyTypes ?? [],
    max_budget: buyBox?.maxBudget ?? null,
    created_at: createdAt,
    updated_at: updatedAt,
  })
);

const properties = createCrud(
  'properties',
  rowToProperty,
  ({ id, address, city, state, zip, propertyType, leadCategories, price, arv, repairCosts, assignmentFee, sellerId, notes, createdAt, updatedAt, status, topMatches, dealScore }) => ({
    id,
    address: address ?? '',
    city: city ?? '',
    state: state ?? '',
    zip: zip ?? '',
    property_type: propertyType ?? 'Single Family',
    lead_categories: leadCategories ?? [],
    price: Number(price) || 0,
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
  })
);

// Export the resources so server/index.js can mount them easily
export { sellers, buyers, investors, properties };

// Clear all data from tables (respects FK order)
export async function clearAllData() {
  await query('DELETE FROM properties');
  await query('DELETE FROM sellers');
  await query('DELETE FROM buyers');
  await query('DELETE FROM investors');
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

// ==================== SERVER-SIDE MATCHING & SCORING ====================

function serverMatchesBuyBox(property, buyBox) {
  if (buyBox.maxBudget != null && property.price > buyBox.maxBudget) return false;
  if (buyBox.preferredStates?.length && !buyBox.preferredStates.some(s => s.toLowerCase() === (property.state || '').toLowerCase())) return false;
  if (buyBox.preferredCities?.length && !buyBox.preferredCities.some(c => c.toLowerCase() === (property.city || '').toLowerCase())) return false;
  if (buyBox.desiredPropertyTypes?.length && !buyBox.desiredPropertyTypes.includes(property.propertyType)) return false;
  return true;
}

export async function findMatchesForProperty(property) {
  const [allBuyers, allInvestors] = await Promise.all([buyers.list(), investors.list()]);
  const matches = [];

  for (const b of allBuyers) {
    if (serverMatchesBuyBox(property, b.buyBox)) {
      matches.push({
        id: b.id,
        name: b.fullName,
        companyName: b.companyName,
        phone: b.phone,
        email: b.email,
        type: 'Buyer',
        buyerType: b.buyerType,
      });
    }
  }
  for (const i of allInvestors) {
    if (serverMatchesBuyBox(property, i.buyBox)) {
      matches.push({
        id: i.id,
        name: i.investorName,
        companyName: i.companyName,
        phone: i.phone,
        email: i.email,
        type: 'Investor',
        linkedInUrl: i.linkedInUrl,
      });
    }
  }
  return matches.slice(0, 8); // top matches
}

export async function autoMatchProperty(propertyId) {
  const prop = await properties.get(propertyId);
  if (!prop) return null;

  const matches = await findMatchesForProperty(prop);

  // Simple real-time score (mirrors frontend)
  let dealScore = null;
  if (prop.arv && prop.repairCosts && prop.arv > 0) {
    const mao = prop.arv * 0.7 - (prop.repairCosts || 0) - (prop.assignmentFee || 10000);
    if (mao > 0) {
      const profitRatio = (prop.assignmentFee || 10000) / mao;
      const marginScore = Math.min(profitRatio * 200, 60);
      const spreadScore = Math.min(((prop.arv - prop.price) / prop.arv) * 40, 40);
      dealScore = Math.max(1, Math.min(100, Math.round(marginScore + spreadScore)));
    } else {
      dealScore = 1;
    }
  }

  const updated = await properties.update(propertyId, {
    topMatches: matches,
    dealScore,
    status: prop.status === 'new' ? 'matched' : prop.status,
  });

  return { property: updated, matches, dealScore };
}

// Helper to compute score (can be called from routes)
export function computeDealScore(property) {
  if (!property.arv || !property.repairCosts || property.arv <= 0) return null;
  const mao = property.arv * 0.7 - property.repairCosts - (property.assignmentFee || 10000);
  if (mao <= 0) return 1;
  const profitRatio = (property.assignmentFee || 10000) / mao;
  const marginScore = Math.min(profitRatio * 200, 60);
  const spreadScore = Math.min(((property.arv - property.price) / property.arv) * 40, 40);
  return Math.max(1, Math.min(100, Math.round(marginScore + spreadScore)));
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
