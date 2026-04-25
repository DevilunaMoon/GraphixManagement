import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma_new: PrismaClient };

let parsedPassword = undefined;
if (process.env.DATABASE_URL) {
  try {
    const urlUrl = new URL(process.env.DATABASE_URL);
    if (urlUrl.password) parsedPassword = String(decodeURIComponent(urlUrl.password));
  } catch (e) {}
}

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ...(parsedPassword ? { password: parsedPassword } : {})
});

const adapter = new PrismaPg(pool as any);

export const prisma =
  globalForPrisma.prisma_new ||
  new PrismaClient({
    adapter,
    log: ['query'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma_new = prisma;

export * from '@prisma/client';
