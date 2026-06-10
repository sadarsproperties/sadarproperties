#!/usr/bin/env node
/**
 * Simple one-time migration script: SQLite -> PostgreSQL
 *
 * Usage:
 *   node server/scripts/migrate-from-sqlite.js
 *   node server/scripts/migrate-from-sqlite.js --force   # clear target tables first
 *
 * Requirements:
 *   - .env must have DATABASE_URL (or PG* vars) pointing to your Postgres (e.g. Supabase)
 *   - Old SQLite file must exist at server/data/sadar.db
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';
import { pool, query, initDb, sellers, buyers, investors, properties, rowToSeller, rowToBuyer, rowToInvestor, rowToProperty } from '../db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlitePath = path.join(__dirname, '..', 'data', 'sadar.db');

const force = process.argv.includes('--force') || process.argv.includes('-f');

async function main() {
  console.log('=== SQLite → PostgreSQL Migration ===');

  // 1. Ensure Postgres schema exists
  console.log('Initializing Postgres schema...');
  await initDb();

  // 2. Open old SQLite
  let sqlite;
  try {
    sqlite = new Database(sqlitePath, { readonly: true });
    console.log(`Opened SQLite: ${sqlitePath}`);
  } catch (e) {
    console.error('Could not open old SQLite DB at', sqlitePath);
    console.error('Make sure the file exists (it was the previous database).');
    process.exit(1);
  }

  // 3. Optional force clear
  if (force) {
    console.log('Force mode: clearing target tables...');
    await query('DELETE FROM properties');
    await query('DELETE FROM sellers');
    await query('DELETE FROM buyers');
    await query('DELETE FROM investors');
    await query('DELETE FROM users'); // careful: this removes auth users too
  }

  // 4. Migrate users (if table exists)
  try {
    const sqliteUsers = sqlite.prepare('SELECT * FROM users').all();
    if (sqliteUsers.length > 0) {
      console.log(`Migrating ${sqliteUsers.length} users...`);
      for (const u of sqliteUsers) {
        await query(
          `INSERT INTO users (id, email, password_hash, name, avatar_url, google_id, facebook_id, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
           ON CONFLICT (id) DO NOTHING`,
          [u.id, u.email, u.password_hash, u.name, u.avatar_url || '', u.google_id, u.facebook_id, u.created_at, u.updated_at]
        );
      }
    }
  } catch (e) {
    console.log('No users table in SQLite or already migrated (skipping).');
  }

  // Ensure query is available (imported at top)

  // 5. Migrate core tables using the same mappers as runtime
  const migrateTable = async (tableName, insertFn, mapRow) => {
    let rows;
    try {
      rows = sqlite.prepare(`SELECT * FROM ${tableName}`).all();
    } catch (e) {
      console.log(`Table ${tableName} not found in SQLite, skipping.`);
      return;
    }
    if (!rows.length) return;

    console.log(`Migrating ${rows.length} ${tableName}...`);
    for (const row of rows) {
      const mapped = mapRow(row);
      // Convert the mapped shape back to what insert expects (it handles the mapping)
      // We use the raw resource.insert which does the column mapping
      try {
        await insertFn(mapped);
      } catch (err) {
        if (err.code === '23505') {
          // duplicate key, skip
          continue;
        }
        console.warn(`  Skipped ${tableName} ${row.id}:`, err.message);
      }
    }
  };

  // Note: the insert functions expect the *camelCase* shape (same as API)
  await migrateTable('sellers', (item) => sellers.insert(item), rowToSeller);
  await migrateTable('buyers', (item) => buyers.insert(item), rowToBuyer);
  await migrateTable('investors', (item) => investors.insert(item), rowToInvestor);
  await migrateTable('properties', (item) => properties.insert(item), rowToProperty);

  // 6. Close
  sqlite.close();
  await pool.end();

  console.log('✅ Migration complete!');
  console.log('You can now run the app with Postgres and use "Load Sample Data" if needed.');
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});