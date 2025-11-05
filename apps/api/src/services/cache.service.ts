import type { Redis } from 'ioredis';

import { getRedisClient } from '../config/redis';

const redis: Redis | undefined = getRedisClient();

const serialize = (value: unknown): string => JSON.stringify(value);
const deserialize = <T>(value: string | null): T | null => (value ? (JSON.parse(value) as T) : null);

export const cacheService = {
  async get<T>(key: string): Promise<T | null> {
    if (!redis) {
      return null;
    }

    const raw = await redis.get(key);
    return deserialize<T>(raw);
  },

  async set<T>(key: string, value: T, ttlSeconds = 900): Promise<void> {
    if (!redis) {
      return;
    }

    await redis.set(key, serialize(value), 'EX', ttlSeconds);
  },

  async invalidate(key: string): Promise<void> {
    if (!redis) {
      return;
    }

    await redis.del(key);
  }
};

export default cacheService;
