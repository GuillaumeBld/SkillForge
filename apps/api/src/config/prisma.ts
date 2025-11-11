import { PrismaClient } from '@prisma/client';

const prismaLogLevel = (process.env.PRISMA_LOG_LEVEL ?? 'warn,info,error')
  .split(',')
  .map((level) => level.trim())
  .filter((level): level is 'info' | 'query' | 'warn' | 'error' =>
    ['info', 'query', 'warn', 'error'].includes(level)
  );

const resolveDatabaseUrl = () => {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  return undefined;
};

declare global {
  // eslint-disable-next-line no-var
  var __prismaClient: PrismaClient | undefined;
}

const createPrismaClient = () => {
  const databaseUrl = resolveDatabaseUrl();

  if (!databaseUrl) {
    if (process.env.NODE_ENV === 'test') {
      return {
        $disconnect: async () => undefined,
        $connect: async () => undefined
      } as unknown as PrismaClient;
    }

    throw new Error('DATABASE_URL must be configured for Prisma client instantiation.');
  }

  const client = new PrismaClient({
    log: prismaLogLevel,
    datasources: {
      db: {
        url: databaseUrl
      }
    }
  });

  return client;
};

export const prisma: PrismaClient =
  global.__prismaClient ?? (global.__prismaClient = createPrismaClient());

export default prisma;
