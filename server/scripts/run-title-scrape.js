import { runScrapeTask } from '../sourceAdapters.js';

async function main() {
  const userId = 'd2f89ee8-e9c5-44b2-b6a9-d796b8472ff6'; // omogopeter48@gmail.com
  console.log(`Manually triggering Title Companies scrape task for user ID: ${userId}`);
  
  try {
    await runScrapeTask({
      source: 'title companies',
      userId
    });
    console.log('Manually triggered Title Companies scrape completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Trigger failed:', err);
    process.exit(1);
  }
}

main();
