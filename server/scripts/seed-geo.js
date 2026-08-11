import { query, listUsers } from '../db.js';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('Starting geography seeding...');

  try {
    // 1. Fix the UNIQUE constraint on counties table
    console.log('Fixing counties UNIQUE constraint...');
    await query('ALTER TABLE counties DROP CONSTRAINT IF EXISTS counties_state_county_name_key');
    await query('ALTER TABLE counties ADD CONSTRAINT counties_state_county_name_user_id_key UNIQUE (state, county_name, user_id)');
    console.log('UNIQUE constraint updated to (state, county_name, user_id) successfully.');
  } catch (err) {
    console.warn('Could not update UNIQUE constraint (it might already be fixed):', err.message);
  }

  // 2. Clean up Chris Rood entries (since he is not a user or buyer/investor in this database)
  try {
    await query('DELETE FROM buyers WHERE email = $1 OR LOWER(full_name) = $2', ['chrisrood@gmail.com', 'chris rood']);
    await query('DELETE FROM users WHERE email = $1 OR LOWER(name) = $2', ['chrisrood@gmail.com', 'chris rood']);
    console.log('Chris Rood cleanup completed successfully.');
  } catch (err) {
    console.error('Failed to clean up Chris Rood entries:', err.message);
  }

  // Fetch all users
  const users = await listUsers();
  console.log(`Found ${users.length} users to seed for.`);

  // 3. Load counties list from local file us_counties.json
  console.log('Loading counties list from local file...');
  let countiesList = [];
  try {
    const countiesPath = path.join(process.cwd(), 'server', 'us_counties.json');
    if (fs.existsSync(countiesPath)) {
      countiesList = JSON.parse(fs.readFileSync(countiesPath, 'utf8'));
      console.log(`Loaded ${countiesList.length} counties from local file.`);
    }
  } catch (err) {
    console.error('Failed to load counties list from local file:', err.message);
    process.exit(1);
  }

  // For each user, seed the counties and the cities
  for (const user of users) {
    console.log(`Seeding counties for user: ${user.email}...`);

    // Bulk seed counties in a single query to prevent network latency issues (N+1 query problem)
    const values = [];
    const valuePlaceholders = [];
    let paramIndex = 1;

    for (const c of countiesList) {
      values.push(randomUUID(), c.state, c.name, user.id);
      valuePlaceholders.push(`($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, NOW(), NOW())`);
    }

    if (values.length > 0) {
      try {
        await query(
          `INSERT INTO counties (id, state, county_name, user_id, created_at, updated_at)
           VALUES ${valuePlaceholders.join(', ')}
           ON CONFLICT (state, county_name, user_id) DO NOTHING`,
          values
        );
      } catch (err) {
        console.error(`Failed to bulk insert counties for ${user.email}:`, err.message);
      }
    }

    // Seed Cleveland city under Cuyahoga, OH
    try {
      const cuyahogaCounty = await query(
        'SELECT id FROM counties WHERE user_id = $1 AND state = $2 AND LOWER(county_name) = $3',
        [user.id, 'OH', 'cuyahoga']
      );
      if (cuyahogaCounty.length > 0) {
        await query(
          `INSERT INTO cities (id, county_id, state, county_name, city_name, user_id, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
           ON CONFLICT (county_id, city_name) DO NOTHING`,
          [randomUUID(), cuyahogaCounty[0].id, 'OH', 'Cuyahoga', 'Cleveland', user.id]
        );
      }
    } catch (err) {
      console.warn(`Failed to seed Cleveland city for ${user.email}:`, err.message);
    }
  }

  console.log('Geography seeding completed successfully!');
  process.exit(0);
}

main().catch((err) => {
  console.error('Seeding crashed:', err);
  process.exit(1);
});
