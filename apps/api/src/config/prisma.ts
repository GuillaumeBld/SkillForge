import { PrismaClient } from '@prisma/client';

const prismaLogLevel = (process.env.PRISMA_LOG_LEVEL ?? 'warn,info,error')
  .split(',')
  .map((level) => level.trim())
  .filter((level): level is 'info' | 'query' | 'warn' | 'error' =>
    ['info', 'query', 'warn', 'error'].includes(level)
  );

declare global {
  // eslint-disable-next-line no-var
  var __prismaClient: PrismaClient | undefined;
}

const createPrismaClient = () =>
  new PrismaClient({
    log: prismaLogLevel
  });

export const prisma: PrismaClient =
  global.__prismaClient ?? (global.__prismaClient = createPrismaClient());

export default prisma;
