import { randomUUID } from 'crypto';
import net from 'net';

let QueueClass, WorkerClass;
let useRedis = false;
let bullQueue = null;
let bullWorker = null;

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
    setupCronJobs();
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
  setupCronJobs();
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

async function setupCronJobs() {
  const dataSources = ['Zillow', 'Craigslist', 'Facebook', 'PropStream', 'BatchLeads', 'FSBO', 'Auction', 'Subject To'];

  if (useRedis && bullQueue) {
    try {
      // 1. Daily export cleanup
      await bullQueue.add('cleanup_exports', {}, {
        repeat: { cron: '0 0 * * *' } // Midnight daily
      });
      // 2. Daily database backup
      await bullQueue.add('backup_db', {}, {
        repeat: { cron: '0 1 * * *' } // 1:00 AM daily
      });
      // 3. Daily data source scraping
      for (const src of dataSources) {
        await bullQueue.add('scrape_source', { source: src }, {
          repeat: { cron: '0 2 * * *' } // 2:00 AM daily
        });
      }
      console.log('[Queue] Repeatable cron jobs successfully registered in Redis.');
    } catch (err) {
      console.error('[Queue] Failed to register repeatable cron jobs in Redis:', err.message);
    }
  } else {
    console.log('[Queue] Scheduling in-memory fallback cron runners (24 hour cycles).');
    
    // Trigger cleanup and backups on boot
    setTimeout(() => addJob('cleanup_exports', {}), 5000);
    setTimeout(() => addJob('backup_db', {}), 10000);

    // Set recurring 24 hour intervals
    setInterval(() => addJob('cleanup_exports', {}), 24 * 60 * 60 * 1000);
    setInterval(() => addJob('backup_db', {}), 24 * 60 * 60 * 1000);

    // Stagger scraper triggers on boot, then run every 24 hours
    dataSources.forEach((src, idx) => {
      setTimeout(() => addJob('scrape_source', { source: src }), 15000 + idx * 5000);
      setInterval(() => addJob('scrape_source', { source: src }), 24 * 60 * 60 * 1000);
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
