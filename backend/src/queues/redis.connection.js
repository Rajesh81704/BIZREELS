const Redis = require('ioredis');
const config = require('../config');
const logger = require('../utils/logger');

let redisClient = null;

function getRedisConnectionOptions() {
  const isSecure = config.redis.tls || (config.redis.url && config.redis.url.startsWith('rediss://'));
  const options = {
    maxRetriesPerRequest: null, // Required by BullMQ
    enableReadyCheck: false,
    connectTimeout: 5000,
    retryStrategy(times) {
      if (times > 5) return null; // Stop reconnecting after 5 attempts
      return Math.min(times * 500, 2000);
    }
  };

  if (isSecure) {
    options.tls = { rejectUnauthorized: false };
  }

  if (config.redis.url) {
    return { url: config.redis.url, options };
  }

  return {
    options: {
      ...options,
      host: config.redis.host || '127.0.0.1',
      port: config.redis.port || 6379,
      password: config.redis.password || undefined,
    }
  };
}

function createRedisClient() {
  try {
    const { url, options } = getRedisConnectionOptions();
    const client = url ? new Redis(url, options) : new Redis(options);

    client.on('error', (err) => {
      logger.warn(`[BullMQ:Redis] Connection warning: ${err.message}`, { service: 'queues' });
    });

    return client;
  } catch (err) {
    logger.warn(`[BullMQ:Redis] Failed to initialize Redis client: ${err.message}`, { service: 'queues' });
    return null;
  }
}

function getRedisConnection() {
  if (!redisClient) {
    redisClient = createRedisClient();
  }
  return redisClient;
}

module.exports = {
  getRedisConnection,
  createRedisClient,
  getRedisConnectionOptions
};
