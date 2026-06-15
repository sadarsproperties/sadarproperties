import { query } from '../db.js';

async function check() {
  try {
    const rows = await query('SELECT * FROM sellers');
    console.log('Sellers table contents:');
    console.log(JSON.stringify(rows, null, 2));
  } catch (err) {
    console.error('Error querying sellers:', err);
  }
}

check();
