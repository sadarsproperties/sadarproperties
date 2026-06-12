import 'dotenv/config';
import { clearAllData, query } from '../db.js';

async function main() {
  console.log('⚠️ Preparing to delete all database records (properties, sellers, buyers, investors)...');
  try {
    const res = await clearAllData();
    if (res.cleared) {
      console.log('✅ Success: All properties, sellers, buyers, and investors deleted from PostgreSQL.');
    }
  } catch (err) {
    console.error('❌ Failed to clear database:', err);
    process.exit(1);
  }
  process.exit(0);
}

main();
