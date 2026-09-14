import { redis } from "./redis";

interface RateLimitOptions {
  identifier: string;
  limit?: number;
  windowSeconds?: number;
}

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
}

// In-memory fallback sliding window cache
const memoryRateLimitCache = new Map<string, number[]>();

export async function checkRateLimit({
  identifier,
  limit = 60,
  windowSeconds = 60,
}: RateLimitOptions): Promise<RateLimitResult> {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const key = `ratelimit:${identifier}`;

  try {
    if (redis.status === "ready" || redis.status === "connect") {
      const pipeline = redis.pipeline();
      pipeline.zremrangebyscore(key, 0, now - windowMs);
      pipeline.zadd(key, now, `${now}-${Math.random()}`);
      pipeline.zcard(key);
      pipeline.expire(key, windowSeconds);

      const results = await pipeline.exec();
      const count = (results?.[2]?.[1] as number) || 1;

      return {
        success: count <= limit,
        limit,
        remaining: Math.max(0, limit - count),
        resetSeconds: windowSeconds,
      };
    }
  } catch (redisErr) {
    console.warn(
      "[Rate Limit Redis Warning]: Falling back to in-memory limiter:",
      (redisErr as Error).message,
    );
  }

  // Local in-memory sliding window fallback
  let timestamps = memoryRateLimitCache.get(identifier) || [];
  timestamps = timestamps.filter((t) => t > now - windowMs);
  timestamps.push(now);
  memoryRateLimitCache.set(identifier, timestamps);

  // Periodic memory cleanup
  if (memoryRateLimitCache.size > 2000) {
    for (const [k, ts] of memoryRateLimitCache.entries()) {
      const active = ts.filter((t) => t > now - windowMs);
      if (active.length === 0) memoryRateLimitCache.delete(k);
      else memoryRateLimitCache.set(k, active);
    }
  }

  const count = timestamps.length;
  return {
    success: count <= limit,
    limit,
    remaining: Math.max(0, limit - count),
    resetSeconds: windowSeconds,
  };
}
