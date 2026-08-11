import { query } from '../server/db.js';

async function main() {
  const userId = 'd2f89ee8-e9c5-44b2-b6a9-d796b8472ff6';
  const state = 'OH';
  const city = 'cleveland';
  
  const res = await query(
    `SELECT c.id AS county_id, c.county_name
     FROM cities ci
     JOIN counties c ON ci.county_id = c.id
     WHERE ci.user_id = $1 AND ci.state = $2 AND LOWER(ci.city_name) = $3`,
    [userId, state, city]
  );
  console.log('Query result:', res);
  
  const allCounties = await query('SELECT id, county_name FROM counties WHERE user_id = $1', [userId]);
  console.log('All counties for user:', allCounties.length);
  
  const allCities = await query('SELECT id, city_name, county_name FROM cities WHERE user_id = $1', [userId]);
  console.log('All cities for user:', allCities);
}

main().catch(console.error);
