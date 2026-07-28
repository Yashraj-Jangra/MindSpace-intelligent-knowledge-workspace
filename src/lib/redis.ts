import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const globalForRedis = global as unknown as { redis: Redis | undefined };

export const redis = globalForRedis.redis ?? new Redis(redisUrl, {
  maxRetriesPerRequest: null, // Critical requirement for BullMQ
  lazyConnect: true,
});

redis.on('error', (err) => {
  console.error('[Redis Client Error]:', err.message);
});

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis;
