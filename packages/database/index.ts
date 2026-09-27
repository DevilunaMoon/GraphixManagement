import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Robustly load .env across monorepo locations
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

const globalForPrisma = global as unknown as { prisma_new: PrismaClient };

let parsedPassword = undefined;
if (process.env.DATABASE_URL) {
  try {
    const urlUrl = new URL(process.env.DATABASE_URL);
    if (urlUrl.password) parsedPassword = String(decodeURIComponent(urlUrl.password));
  } catch (e) {}
}

console.log("DEBUG: DATABASE_URL is", process.env.DATABASE_URL);

const poolMax = process.env.DB_POOL_MAX 
  ? parseInt(process.env.DB_POOL_MAX, 10) 
  : (process.env.NODE_ENV === 'production' ? 10 : 5);

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: poolMax,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
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
