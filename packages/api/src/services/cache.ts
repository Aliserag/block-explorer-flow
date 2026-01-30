import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

let redis: Redis | null = null;

export function getRedis(): Redis | null {
  if (!redis) {
    try {
      redis = new Redis(REDIS_URL, {
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      });

      redis.on("error", (err) => {
        console.warn("Redis connection error:", err.message);
        redis = null;
      });
    } catch {
      console.warn("Redis not available, caching disabled");
      return null;
    }
  }
  return redis;
}

const DEFAULT_TTL = 60; // 1 minute
const BLOCK_TTL = 3600; // 1 hour for confirmed blocks

export async function getCached<T>(key: string): Promise<T | null> {
  const client = getRedis();
  if (!client) return null;

  try {
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export async function setCache(
  key: string,
  value: unknown,
  ttl: number = DEFAULT_TTL
): Promise<void> {
  const client = getRedis();
  if (!client) return;

  try {
    await client.setex(key, ttl, JSON.stringify(value, (_, v) =>
      typeof v === "bigint" ? v.toString() : v
    ));
  } catch {
    // Silently fail on cache errors
  }
}

// Cache key builders
export const cacheKeys = {
  block: (network: string, id: string | number) => `block:${network}:${id}`,
  transaction: (network: string, hash: string) => `tx:${network}:${hash}`,
  account: (network: string, address: string) => `account:${network}:${address}`,
  latestBlock: (network: string) => `latest:${network}`,
};

export { BLOCK_TTL, DEFAULT_TTL };
