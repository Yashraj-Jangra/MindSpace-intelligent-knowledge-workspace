import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  isDbAvailable: boolean | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

let dbDisabled = globalForPrisma.isDbAvailable === false || process.env.ENABLE_POSTGRES === 'false';

export function isDbDisabled(): boolean {
  if (process.env.ENABLE_POSTGRES === 'true') {
    return false;
  }
  return dbDisabled;
}

export function disableDbCircuitBreaker() {
  dbDisabled = true;
  globalForPrisma.isDbAvailable = false;
}

export function resetDbCircuitBreaker() {
  dbDisabled = false;
  globalForPrisma.isDbAvailable = true;
}
