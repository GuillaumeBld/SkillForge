import { Queue, QueueEvents, Worker, type JobsOptions, type Processor } from 'bullmq';
import type { Redis } from 'ioredis';

import { getRedisClient } from './redis';

export interface QueueComponents<T = unknown> {
  queue?: Queue<T>;
  worker?: Worker<T>;
  events?: QueueEvents;
}

const createConnection = (): Redis | undefined => {
  const redis = getRedisClient();

  if (!redis) {
    return undefined;
  }

  return redis.duplicate({ lazyConnect: true });
};

export const registerQueue = <T = unknown>(
  name: string,
  processor?: Processor<T, unknown, string>,
  defaultJobOptions?: JobsOptions
): QueueComponents<T> => {
  const connection = createConnection();

  if (!connection) {
    console.warn(`Queue "${name}" not initialized because Redis is unavailable.`);
    return {};
  }

  connection.on('error', (error) => {
    console.error(`Redis connection error for queue ${name}`, error);
  });

  const queue = new Queue<T>(name, {
    connection,
    defaultJobOptions
  });

  const events = new QueueEvents(name, { connection });

  let worker: Worker<T> | undefined;

  if (processor) {
    worker = new Worker<T>(name, processor, { connection });
  }

  const connect = async () => {
    if (connection.status !== 'ready') {
      await connection.connect();
    }
  };

  if (process.env.NODE_ENV !== 'test') {
    void connect().catch((error) => {
      console.error(`Failed to connect BullMQ queue for ${name}`, error);
    });
  }

  return { queue, worker, events };
};

export default registerQueue;
