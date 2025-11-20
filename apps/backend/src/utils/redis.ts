import Redis from 'ioredis';
import { logger } from './logger';

let redisClient: Redis;

export async function connectRedis(): Promise<Redis | null> {
  // Check if Redis is enabled
  const redisEnabled = process.env.REDIS_ENABLED !== 'false';

  if (!redisEnabled) {
    logger.info('Redis is disabled, skipping connection');
    return null;
  }

  if (redisClient) {
    return redisClient;
  }

  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

  redisClient = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  });

  redisClient.on('connect', () => {
    logger.info('Redis client connected');
  });

  redisClient.on('error', (err) => {
    logger.error('Redis client error:', err);
  });

  redisClient.on('close', () => {
    logger.warn('Redis client connection closed');
  });

  return redisClient;
}

export function getRedisClient(): Redis {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call connectRedis() first.');
  }
  return redisClient;
}

// Cache helper functions

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    logger.error(`Cache get error for key ${key}:`, error);
    return null;
  }
}

export async function cacheSet(
  key: string,
  value: any,
  expirySeconds: number = 3600
): Promise<void> {
  try {
    await redisClient.setex(key, expirySeconds, JSON.stringify(value));
  } catch (error) {
    logger.error(`Cache set error for key ${key}:`, error);
  }
}

export async function cacheDelete(key: string): Promise<void> {
  try {
    await redisClient.del(key);
  } catch (error) {
    logger.error(`Cache delete error for key ${key}:`, error);
  }
}

export async function cacheDeletePattern(pattern: string): Promise<void> {
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(...keys);
    }
  } catch (error) {
    logger.error(`Cache delete pattern error for ${pattern}:`, error);
  }
}
