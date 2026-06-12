import { query } from './server/db.js';

async function run() {
  try {
    const rows = await query('SELECT * FROM buyers');
    console.log(JSON.stringify(rows, null, 2));
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}

run();
