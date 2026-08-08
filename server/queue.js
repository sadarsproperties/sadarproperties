import { randomUUID } from 'crypto';
import net from 'net';
import { getSetting } from './db.js';

// ── Scrape configuration defaults (mirrors dashboard Settings > Data Sources) ──
export const SCRAPE_SOURCES_DEFAULT = [
  { name: 'Zillow', active: true, url: 'https://www.zillow.com/homes/for_sale/' },
  { name: 'Craigslist', active: true, url: 'https://cleveland.craigslist.org/search/hhh' },
  { name: 'Facebook', active: false, url: 'https://www.facebook.com/marketplace/' },
  { name: 'PropStream', active: true, url: 'https://app.propstream.com/' },
  { name: 'BatchLeads', active: false, url: 'https://app.batchleads.io/' },
  { name: 'FSBO', active: false, url: 'https://www.forsalebyowner.com/search/list' },
  { name: 'Auction', active: false, url: 'https://www.auction.com/residential/' },
  { name: 'Subject To', active: false, url: 'https://www.subjectto.com/listings' },
  { name: 'Redfin', active: false, url: 'https://www.redfin.com/oh/cleveland' },
  { name: 'Realtor.com', active: false, url: 'https://www.realtor.com/realestateandhomes-search/Cleveland_OH' },
  // County Records needs a per-county results URL — no universal default
  { name: 'County Records', active: false, url: '' },
  { name: 'HUD', active: false, url: 'https://www.hudhomestore.gov/searchresult' },
  { name: 'Realtors', active: false, url: 'https://www.realtor.com/realtor-directory/' },
  { name: 'Title Companies', active: false, url: 'https://www.yellowpages.com/search?q=title+companies' },
];

export const REFRESH_INTERVALS_MS = {
  '12h': 12 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '48h': 48 * 60 * 60 * 1000,
};

const SCRAPE_SETTINGS_KEY = 'scrape_config';

let QueueClass, WorkerClass;
let useRedis = false;
let bullQueue = null;
let bullWorker = null;
let bullMaintenanceQueue = null;
let bullMaintenanceWorker = null;

// In-memory scrape timers keyed by userId:source (used when Redis is unavailable)
const scrapeTimers = new Map();

// Registry of external job processors
const externalProcessors = new Map();

export function registerJobProcessor(name, processor) {
  externalProcessors.set(name, processor);
  console.log(`[Queue] Registered external processor for job: ${name}`);
}

class InMemoryQueue {
  constructor(name) {
    this.name = name;
    this.jobs = [];
    this.processors = new Map();
    this.running = false;
  }

  async add(jobName, data) {
    const job = {
      id: randomUUID(),
      name: jobName,
      data,
      status: 'waiting',
      created_at: new Date().toISOString()
    };
    this.jobs.push(job);
    console.log(`[InMemoryQueue] Job added: ${jobName} (ID: ${job.id})`);
    this.processNext();
    return job;
  }

  on(event, handler) {}

  registerProcessor(jobName, processor) {
    this.processors.set(jobName, processor);
  }

  async processNext() {
    if (this.running) return;
    const nextJob = this.jobs.find(j => j.status === 'waiting');
    if (!nextJob) return;

    this.running = true;
    nextJob.status = 'active';
    console.log(`[InMemoryQueue] Processing job: ${nextJob.name} (${nextJob.id})`);
    
    try {
      const processor = this.processors.get(nextJob.name) || this.processors.get('*');
      if (processor) {
        await processor(nextJob);
      } else {
        console.warn(`[InMemoryQueue] No processor registered for job: ${nextJob.name}`);
      }
      nextJob.status = 'completed';
      console.log(`[InMemoryQueue] Job completed: ${nextJob.name} (${nextJob.id})`);
      this.running = false;
      setTimeout(() => this.processNext(), 100);
    } catch (err) {
      const attemptsMade = nextJob.attemptsMade || 1;
      const maxAttempts = nextJob.data?.attempts || 1;
      if (attemptsMade < maxAttempts) {
        nextJob.status = 'retrying';
        nextJob.attemptsMade = attemptsMade + 1;
        const delay = Math.pow(2, attemptsMade) * 1000;
        console.log(`[InMemoryQueue] Retrying job ${nextJob.name} (${nextJob.id}) in ${delay}ms... (Attempt ${attemptsMade + 1}/${maxAttempts})`);
        
        setTimeout(() => {
          nextJob.status = 'waiting';
          this.processNext();
        }, delay);
      } else {
        nextJob.status = 'failed';
        nextJob.error = err.message;
        console.error(`[InMemoryQueue] Job failed permanently: ${nextJob.name} (${nextJob.id})`, err);
      }
      this.running = false;
      setTimeout(() => this.processNext(), 100);
    }
  }
}

const memoryQueue = new InMemoryQueue('rewip-tasks');
// Maintenance jobs (cleanup/backup) run on their own queue so they can never
// block scrapes, matching, exports, etc.
const maintenanceQueue = new InMemoryQueue('rewip-maintenance');

function checkRedisConnection(redisUrl) {
  return new Promise((resolve) => {
    try {
      const cleanUrl = redisUrl.replace('redis://', '');
      const withoutCreds = cleanUrl.split('@').pop() || '';
      const [hostPart, portPart] = withoutCreds.split(':');
      const host = hostPart || '127.0.0.1';
      const port = parseInt(portPart || '6379', 10);

      const socket = new net.Socket();
      socket.setTimeout(800);

      socket.once('connect', () => {
        socket.destroy();
        resolve(true);
      });

      socket.once('error', () => {
        socket.destroy();
        resolve(false);
      });

      socket.once('timeout', () => {
        socket.destroy();
        resolve(false);
      });

      socket.connect(port, host);
    } catch (e) {
      resolve(false);
    }
  });
}

export async function initQueue() {
  const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
  const isRedisOpen = await checkRedisConnection(redisUrl);

  if (!isRedisOpen) {
    console.warn('⚠️ Redis port is not listening. Falling back to robust in-memory Task Queue immediately.');
    useRedis = false;
    setupWorkers();
    setupMaintenanceJobs();
    await rescheduleAllUsers();
    return;
  }

  try {
    const bullmq = await import('bullmq');
    QueueClass = bullmq.Queue;
    WorkerClass = bullmq.Worker;
    
    console.log(`[Queue] Connecting to Redis at: ${redisUrl}`);
    
    bullQueue = new QueueClass('rewip-tasks', {
      connection: {
        url: redisUrl
      }
    });
    // Maintenance (cleanup/backup) runs on its own queue so a slow job there
    // can never stall scrapes, matching, exports, etc.
    bullMaintenanceQueue = new QueueClass('rewip-maintenance', {
      connection: {
        url: redisUrl
      }
    });

    await bullQueue.client;
    useRedis = true;
    console.log('🚀 Task Queue initialized successfully using BullMQ + Redis.');
  } catch (err) {
    console.warn('⚠️ BullMQ/Redis initialization failed. Falling back to robust in-memory Task Queue.', err.message);
    useRedis = false;
  }

  setupWorkers();
  setupMaintenanceJobs();
  await rescheduleAllUsers();
}

async function setupWorkers() {
  const processor = async (job) => {
    const { name, data } = job;
    console.log(`[Worker] Executing background job: ${name}`);
    const extProcessor = externalProcessors.get(name);
    if (extProcessor) {
      await extProcessor(data);
    } else {
      console.warn(`[Worker] No external processor registered for job: ${name}`);
    }
  };

  if (useRedis && WorkerClass) {
    const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
    bullWorker = new WorkerClass('rewip-tasks', processor, {
      connection: {
        url: redisUrl
      }
    });
    bullMaintenanceWorker = new WorkerClass('rewip-maintenance', processor, {
      connection: {
        url: redisUrl
      }
    });
    bullWorker.on('completed', (job) => {
      console.log(`[Queue] Job completed: ${job.id}`);
    });
    bullWorker.on('failed', (job, err) => {
      console.error(`[Queue] Job failed: ${job ? job.id : 'unknown'}`, err);
    });
  } else {
    memoryQueue.registerProcessor('*', processor);
    maintenanceQueue.registerProcessor('*', processor);
  }
}

async function setupMaintenanceJobs() {
  if (useRedis && bullMaintenanceQueue) {
    try {
      // Daily export cleanup (midnight)
      await bullMaintenanceQueue.add('cleanup_exports', {}, {
        repeat: { cron: '0 0 * * *' }
      });
      console.log('[Queue] Repeatable maintenance cron job registered in Redis (separate queue).');
    } catch (err) {
      console.error('[Queue] Failed to register maintenance cron job in Redis:', err.message);
    }
  } else {
    console.log('[Queue] Scheduling in-memory maintenance runner (24 hour cycle, separate queue).');
    // Trigger cleanup on boot
    setTimeout(() => addMaintenanceJob('cleanup_exports', {}), 5000);
    // Set recurring 24 hour interval
    setInterval(() => addMaintenanceJob('cleanup_exports', {}), 24 * 60 * 60 * 1000);
  }
}

/**
 * Load the saved scrape configuration for a user, merged against defaults so new
 * sources always appear even if the stored config is older.
 */
export async function loadScrapeConfig(userId) {
  const saved = await getSetting(userId, SCRAPE_SETTINGS_KEY, null);
  if (!saved || !Array.isArray(saved.sources)) {
    return { sources: SCRAPE_SOURCES_DEFAULT.map(s => ({ ...s })), refreshInterval: '24h' };
  }
  const sources = SCRAPE_SOURCES_DEFAULT.map(def => {
    const found = saved.sources.find(s => s && s.name === def.name);
    return found ? { name: def.name, active: !!found.active, url: typeof found.url === 'string' && found.url.trim() ? found.url : def.url } : { ...def };
  });
  const refreshInterval = REFRESH_INTERVALS_MS[saved.refreshInterval] ? saved.refreshInterval : '24h';
  return { sources, refreshInterval };
}

function scrapeJobData(source, userId) {
  return { source: source.name, url: (source.url || '').trim(), userId };
}

function scrapeJobIdFor(userId, sourceName) {
  return `scrape-${userId}-${sourceName.toLowerCase().replace(/\s+/g, '-')}`;
}

/**
 * (Re)build the background scrape schedule for ONE user from their saved settings.
 * - Redis mode: repeatable BullMQ jobs keyed by jobId (re-adding replaces).
 * - In-memory mode: per-user/per-source setInterval timers.
 * When runNow is true, fires an initial staggered run for each active source.
 */
export async function rescheduleScrapers({ userId, runNow = false } = {}) {
  if (!userId) return;
  const config = await loadScrapeConfig(userId);
  const intervalMs = REFRESH_INTERVALS_MS[config.refreshInterval] || REFRESH_INTERVALS_MS['24h'];
  const active = config.sources.filter(s => s.active);

  if (useRedis && bullQueue) {
    try {
      const prefix = `scrape-${userId}-`;
      // BullMQ v5 renamed repeatable jobs → job schedulers. Support both.
      const hasV5Api = typeof bullQueue.getJobSchedulers === 'function';
      if (hasV5Api) {
        const schedulers = await bullQueue.getJobSchedulers();
        for (const s of schedulers || []) {
          if (s.id && s.id.startsWith(prefix)) {
            const srcName = s.id.slice(prefix.length);
            if (!active.some(sr => sr.name.toLowerCase().replace(/\s+/g, '-') === srcName)) {
              await bullQueue.removeJobScheduler(s.id);
            }
          }
        }
      } else {
        const repeatables = await bullQueue.getRepeatableJobs();
        for (const rj of repeatables || []) {
          if (rj.id && rj.id.startsWith(prefix)) {
            const srcName = rj.id.slice(prefix.length);
            if (!active.some(sr => sr.name.toLowerCase().replace(/\s+/g, '-') === srcName)) {
              await bullQueue.removeRepeatableByKey(rj.key);
            }
          }
        }
      }
      for (const src of active) {
        await bullQueue.add('scrape_source', scrapeJobData(src, userId), {
          jobId: scrapeJobIdFor(userId, src.name),
          repeat: { every: intervalMs },
          removeOnComplete: 100,
          removeOnFail: 100,
        });
      }
      console.log(`[Queue] User ${userId} scrape schedule (Redis): ${active.map(s => s.name).join(', ') || 'none'} every ${config.refreshInterval}.`);
    } catch (err) {
      console.error(`[Queue] Failed to update Redis scrape schedule for user ${userId}:`, err.message);
    }
  } else {
    // Remove only this user's timers (other users' timers stay intact)
    const stale = [];
    for (const [key, timer] of scrapeTimers) {
      if (key.startsWith(`${userId}:`)) {
        clearInterval(timer);
        stale.push(key);
      }
    }
    for (const key of stale) scrapeTimers.delete(key);

    for (const src of active) {
      const key = `${userId}:${src.name}`;
      const timer = setInterval(() => addJob('scrape_source', scrapeJobData(src, userId)), intervalMs);
      scrapeTimers.set(key, timer);
    }
    console.log(`[Queue] User ${userId} scrape schedule (in-memory): ${active.map(s => s.name).join(', ') || 'none'} every ${config.refreshInterval}.`);
  }

  // Optional immediate staggered run (boot) so pages populate right away
  if (runNow) {
    active.forEach((src, idx) => {
      setTimeout(() => addJob('scrape_source', scrapeJobData(src, userId)), 15000 + idx * 5000);
    });
  }
}

/**
 * Rebuild schedules for every registered user (called on boot) so each user's
 * own settings drive their own background scraping. Users who have never saved
 * a scrape config are NOT scheduled — nothing scrapes for them until they
 * explicitly save their settings (opt-in), which also avoids a boot-time
 * scrape storm across all accounts.
 */
export async function rescheduleAllUsers() {
  const { listUsers } = await import('./db.js');
  const users = await listUsers();
  for (const u of users) {
    const saved = await getSetting(u.id, SCRAPE_SETTINGS_KEY, null);
    if (!saved) {
      console.log(`[Queue] User ${u.id} has no saved scrape config — no background schedule.`);
      continue;
    }
    await rescheduleScrapers({ userId: u.id, runNow: true });
  }
}

export async function addJob(name, data, options = {}) {
  if (useRedis && bullQueue) {
    return await bullQueue.add(name, data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      },
      ...options
    });
  } else {
    return await memoryQueue.add(name, {
      attempts: 3,
      ...data
    });
  }
}

/**
 * Maintenance jobs (cleanup_exports) use a separate queue so a slow
 * or hanging maintenance job can never block scrapes/matching/exports.
 */
export async function addMaintenanceJob(name, data = {}) {
  if (useRedis && bullMaintenanceQueue) {
    return await bullMaintenanceQueue.add(name, data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    });
  }
  return await maintenanceQueue.add(name, {
    attempts: 3,
    ...data
  });
}
