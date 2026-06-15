import 'dotenv/config';
import { initDb } from '../db.js';
import { seedDatabase } from '../seed.js';

async function main() {
  console.log('🌱 Reseeding database with new sample records...');
  try {
    await initDb();
    const res = await seedDatabase({ force: true });
    console.log(`✅ Success: ${res.message}`);
  } catch (err) {
    console.error('❌ Failed to seed database:', err);
    process.exit(1);
  }
  process.exit(0);
}

main();
