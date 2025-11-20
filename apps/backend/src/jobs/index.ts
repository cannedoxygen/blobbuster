import cron from 'node-cron';
import Bull from 'bull';
import { logger } from '../utils/logger';
import { expireContentJob } from './expireContent.job';

// Bull queues
export let transcodingQueue: Bull.Queue;
export let revenueQueue: Bull.Queue;

/**
 * Initialize background jobs
 * - Content expiration cron (daily at 3 AM)
 * - Video transcoding queue
 * - Revenue distribution cron
 * - Analytics aggregation
 */
export function initializeJobs() {
  logger.info('Initializing background jobs...');

  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

  try {
    // 1. Set up Bull queues for video transcoding
    transcodingQueue = new Bull('video-transcoding', redisUrl, {
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    });

    transcodingQueue.on('error', (error) => {
      logger.error('Transcoding queue error:', error);
    });

    transcodingQueue.on('completed', (job) => {
      logger.info(`Transcoding job ${job.id} completed`);
    });

    transcodingQueue.on('failed', (job, err) => {
      logger.error(`Transcoding job ${job.id} failed:`, err);
    });

    logger.info('✓ Video transcoding queue initialized');

    // 2. Set up revenue distribution queue
    revenueQueue = new Bull('revenue-distribution', redisUrl, {
      defaultJobOptions: {
        attempts: 2,
        backoff: {
          type: 'fixed',
          delay: 5000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    });

    revenueQueue.on('error', (error) => {
      logger.error('Revenue queue error:', error);
    });

    revenueQueue.on('completed', (job) => {
      logger.info(`Revenue distribution job ${job.id} completed`);
    });

    revenueQueue.on('failed', (job, err) => {
      logger.error(`Revenue distribution job ${job.id} failed:`, err);
    });

    logger.info('✓ Revenue distribution queue initialized');

    // 3. Set up content expiration cron (daily at 3:00 AM)
    cron.schedule('0 3 * * *', async () => {
      logger.info('Running scheduled content expiration job...');
      try {
        await expireContentJob();
      } catch (error) {
        logger.error('Scheduled content expiration job failed:', error);
      }
    }, {
      timezone: 'UTC',
    });

    logger.info('✓ Content expiration cron scheduled (daily at 3:00 AM UTC)');

    // 4. Set up revenue distribution cron (weekly on Sunday at 2:00 AM UTC)
    cron.schedule('0 2 * * 0', async () => {
      logger.info('Running scheduled weekly revenue distribution...');
      try {
        // TODO: Implement revenue distribution job
        await revenueQueue.add('weekly-distribution', {
          timestamp: new Date(),
        });
      } catch (error) {
        logger.error('Scheduled revenue distribution failed:', error);
      }
    }, {
      timezone: 'UTC',
    });

    logger.info('✓ Revenue distribution cron scheduled (Sundays at 2:00 AM UTC)');

    logger.info('✅ All background jobs initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize background jobs:', error);
    logger.warn('⚠️  Background jobs may not be functioning correctly');
  }
}

/**
 * Graceful shutdown of queues
 */
export async function shutdownJobs() {
  logger.info('Shutting down background jobs...');

  if (transcodingQueue) {
    await transcodingQueue.close();
  }

  if (revenueQueue) {
    await revenueQueue.close();
  }

  logger.info('Background jobs shut down');
}
