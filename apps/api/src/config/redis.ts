import Redis, { type RedisOptions } from 'ioredis';

export type RedisClient = Redis | undefined;

let cachedRedis: RedisClient;

const createRedisClient = (): RedisClient => {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    if (process.env.NODE_ENV !== 'test') {
      console.warn('Redis URL not provided. Caching and queueing features are disabled.');
    }

    return undefined;
  }

  const options: RedisOptions = {
    lazyConnect: true,
    maxRetriesPerRequest: null
  };

  const client = new Redis(redisUrl, options);

  client.on('error', (error) => {
    console.error('Redis error', error);
  });

  client.on('connect', () => {
    console.info('Connected to Redis');
  });

  if (process.env.NODE_ENV !== 'test') {
    client.connect().catch((error) => {
      console.error('Failed to connect to Redis', error);
    });
  }

  return client;
};

export const getRedisClient = (): RedisClient => {
  if (cachedRedis === undefined) {
    cachedRedis = createRedisClient();
  }

  return cachedRedis;
};

export default getRedisClient;
