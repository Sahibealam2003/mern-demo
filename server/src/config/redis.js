import Redis from 'ioredis';
import logger from '../utils/logger.js';

let redisClient = null;

/**
 * Connect to Redis
 * Redis is treated as optional:
 * - If REDIS_ENABLED=true OR REDIS_URL is explicitly provided, we try connecting
 * - Otherwise we skip Redis entirely (prevents noisy ECONNREFUSED spam)
 */
export const connectToRedis = async () => {
  try {
    const redisEnabled = String(process.env.REDIS_ENABLED || '').toLowerCase() === 'true';
    const redisUrlFromEnv = process.env.REDIS_URL;

    if (!redisEnabled && !redisUrlFromEnv) {
      logger.warn('Redis disabled — skipping Redis connection');
      return null;
    }

    const REDIS_URL = redisUrlFromEnv || 'redis://localhost:6379';

    redisClient = new Redis(REDIS_URL, {
      // BullMQ requires maxRetriesPerRequest to be null when using ioredis options.
      maxRetriesPerRequest: null,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      reconnectOnError: (err) => {
        // Keep reconnect logs minimal; avoid flooding on ECONNREFUSED
        logger.warn('Redis reconnect on error');
        return true;
      },
    });

    redisClient.on('connect', () => {
      logger.info('Redis connected successfully');
    });

    redisClient.on('error', (error) => {
      logger.error('Redis connection error:', error);
    });

    redisClient.on('ready', () => {
      logger.info('Redis is ready');
    });

    redisClient.on('close', () => {
      logger.warn('Redis connection closed');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      if (redisClient) {
        await redisClient.quit();
        logger.info('Redis connection closed due to app termination');
      }
    });

    return redisClient;
  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
    // Redis is optional - continue without it
    return null;
  }
};

/**
 * Get Redis client instance
 */
export const getRedisClient = () => {
  if (!redisClient) {
    logger.warn('Redis client is not initialized');
  }
  return redisClient;
};

/**
 * Check Redis connection status
 */
export const getRedisStatus = () => {
  if (!redisClient) {
    return { connected: false, status: 'not_initialized' };
  }

  return {
    connected: redisClient.status === 'ready',
    status: redisClient.status,
  };
};

/**
 * Set cache value with expiration
 */
export const setCache = async (key, value, expiresIn = 3600) => {
  if (!redisClient) return false;
  
  try {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    await redisClient.setex(key, expiresIn, stringValue);
    return true;
  } catch (error) {
    logger.error('Redis set error:', error);
    return false;
  }
};

/**
 * Get cache value
 */
export const getCache = async (key) => {
  if (!redisClient) return null;
  
  try {
    const value = await redisClient.get(key);
    if (!value) return null;
    
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  } catch (error) {
    logger.error('Redis get error:', error);
    return null;
  }
};

/**
 * Delete cache value
 */
export const deleteCache = async (key) => {
  if (!redisClient) return false;
  
  try {
    await redisClient.del(key);
    return true;
  } catch (error) {
    logger.error('Redis delete error:', error);
    return false;
  }
};

/**
 * Delete cache values by pattern
 */
export const deleteCachePattern = async (pattern) => {
  if (!redisClient) return false;
  
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(...keys);
    }
    return true;
  } catch (error) {
    logger.error('Redis delete pattern error:', error);
    return false;
  }
};

/**
 * Clear all cache
 */
export const clearCache = async () => {
  if (!redisClient) return false;
  
  try {
    await redisClient.flushdb();
    return true;
  } catch (error) {
    logger.error('Redis clear error:', error);
    return false;
  }
};

export default {
  connectToRedis,
  getRedisClient,
  getRedisStatus,
  setCache,
  getCache,
  deleteCache,
  deleteCachePattern,
  clearCache,
};