import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load the root .env file so Next.js can read the DATABASE_URL
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

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 1, // Limit each serverless instance to 1 connection to prevent hitting pool_size: 15
  idleTimeoutMillis: 10000,
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
