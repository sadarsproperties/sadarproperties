import { randomUUID } from 'crypto';
import net from 'net';
import { getSetting } from './db.js';

// ── Scrape configuration defaults (mirrors dashboard Settings > Data Sources) ──
export const SCRAPE_SOURCES_DEFAULT = [
  { name: 'Zillow', active: true, url: '' },
  { name: 'Craigslist', active: true, url: '' },
  { name: 'Facebook', active: false, url: '' },
  { name: 'PropStream', active: true, url: '' },
  { name: 'BatchLeads', active: false, url: '' },
  { name: 'FSBO', active: false, url: '' },
  { name: 'Auction', active: false, url: '' },
  { name: 'Subject To', active: false, url: '' },
  { name: 'Realtors', active: false, url: '' },
  { name: 'Title Companies', active: false, url: '' },
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

// In-memory scrape timers keyed by source name (used when Redis is unavailable)
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
    await rescheduleScrapers({ runNow: true });
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

    await bullQueue.client;
    useRedis = true;
    console.log('🚀 Task Queue initialized successfully using BullMQ + Redis.');
  } catch (err) {
    console.warn('⚠️ BullMQ/Redis initialization failed. Falling back to robust in-memory Task Queue.', err.message);
    useRedis = false;
  }

  setupWorkers();
  setupMaintenanceJobs();
  await rescheduleScrapers({ runNow: true });
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
    bullWorker.on('completed', (job) => {
      console.log(`[Queue] Job completed: ${job.id}`);
    });
    bullWorker.on('failed', (job, err) => {
      console.error(`[Queue] Job failed: ${job ? job.id : 'unknown'}`, err);
    });
  } else {
    memoryQueue.registerProcessor('*', processor);
  }
}

async function setupMaintenanceJobs() {
  if (useRedis && bullQueue) {
    try {
      // 1. Daily export cleanup (midnight)
      await bullQueue.add('cleanup_exports', {}, {
        repeat: { cron: '0 0 * * *' }
      });
      // 2. Daily database backup (1:00 AM)
      await bullQueue.add('backup_db', {}, {
        repeat: { cron: '0 1 * * *' }
      });
      console.log('[Queue] Repeatable maintenance cron jobs registered in Redis.');
    } catch (err) {
      console.error('[Queue] Failed to register maintenance cron jobs in Redis:', err.message);
    }
  } else {
    console.log('[Queue] Scheduling in-memory maintenance runners (24 hour cycles).');
    // Trigger cleanup and backups on boot
    setTimeout(() => addJob('cleanup_exports', {}), 5000);
    setTimeout(() => addJob('backup_db', {}), 10000);
    // Set recurring 24 hour intervals
    setInterval(() => addJob('cleanup_exports', {}), 24 * 60 * 60 * 1000);
    setInterval(() => addJob('backup_db', {}), 24 * 60 * 60 * 1000);
  }
}

/**
 * Load the saved scrape configuration, merged against defaults so new sources
 * always appear even if the stored config is older.
 */
export async function loadScrapeConfig() {
  const saved = await getSetting(SCRAPE_SETTINGS_KEY, null);
  if (!saved || !Array.isArray(saved.sources)) {
    return { sources: SCRAPE_SOURCES_DEFAULT.map(s => ({ ...s })), refreshInterval: '24h' };
  }
  const sources = SCRAPE_SOURCES_DEFAULT.map(def => {
    const found = saved.sources.find(s => s && s.name === def.name);
    return found ? { name: def.name, active: !!found.active, url: typeof found.url === 'string' ? found.url : '' } : { ...def };
  });
  const refreshInterval = REFRESH_INTERVALS_MS[saved.refreshInterval] ? saved.refreshInterval : '24h';
  return { sources, refreshInterval };
}

function scrapeJobData(source) {
  return { source: source.name, url: (source.url || '').trim() };
}

/**
 * (Re)build the background scrape schedule from the saved settings.
 * - Redis mode: repeatable BullMQ jobs keyed by jobId (re-adding replaces).
 * - In-memory mode: per-source setInterval timers.
 * When runNow is true, fires an initial staggered run for each active source.
 */
export async function rescheduleScrapers({ runNow = false } = {}) {
  const config = await loadScrapeConfig();
  const intervalMs = REFRESH_INTERVALS_MS[config.refreshInterval] || REFRESH_INTERVALS_MS['24h'];
  const active = config.sources.filter(s => s.active);

  if (useRedis && bullQueue) {
    try {
      // Remove repeatable jobs for sources that are no longer active
      const repeatables = await bullQueue.getRepeatableJobs();
      for (const rj of repeatables) {
        const srcName = rj.id && rj.id.startsWith('scrape-') ? rj.id.slice('scrape-'.length) : null;
        if (srcName && !active.some(s => s.name.toLowerCase().replace(/\s+/g, '-') === srcName)) {
          await bullQueue.removeRepeatableByKey(rj.key);
        }
      }
      for (const src of active) {
        const jobId = `scrape-${src.name.toLowerCase().replace(/\s+/g, '-')}`;
        await bullQueue.add('scrape_source', scrapeJobData(src), {
          jobId,
          repeat: { every: intervalMs },
          removeOnComplete: 100,
          removeOnFail: 100,
        });
      }
      console.log(`[Queue] Scrape schedule updated (Redis): ${active.map(s => s.name).join(', ') || 'none'} every ${config.refreshInterval}.`);
    } catch (err) {
      console.error('[Queue] Failed to update Redis scrape schedule:', err.message);
    }
  } else {
    // Clear existing in-memory timers
    for (const [, timer] of scrapeTimers) clearInterval(timer);
    scrapeTimers.clear();
    for (const src of active) {
      const timer = setInterval(() => addJob('scrape_source', scrapeJobData(src)), intervalMs);
      scrapeTimers.set(src.name, timer);
    }
    console.log(`[Queue] Scrape schedule updated (in-memory): ${active.map(s => s.name).join(', ') || 'none'} every ${config.refreshInterval}.`);
  }

  // Optional immediate staggered run (boot) so pages populate right away
  if (runNow) {
    active.forEach((src, idx) => {
      setTimeout(() => addJob('scrape_source', scrapeJobData(src)), 15000 + idx * 5000);
    });
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
