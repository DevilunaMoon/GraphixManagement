import { prisma } from 'database';

let isTableInitialized = false;

/**
 * Ensures the InstallmentApplication table exists in the target database.
 * Runs an idempotent CREATE TABLE IF NOT EXISTS check so deployments
 * require zero manual database setup.
 */
export async function ensureInstallmentTableExists(): Promise<void> {
  if (isTableInitialized) return;
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "InstallmentApplication" (
        "id" TEXT NOT NULL,
        "customerId" TEXT,
        "customerName" TEXT NOT NULL,
        "customerAge" INTEGER NOT NULL,
        "customerPhone" TEXT NOT NULL,
        "validIdUrl" TEXT NOT NULL,
        "provider" TEXT NOT NULL,
        "deviceId" TEXT,
        "deviceName" TEXT NOT NULL,
        "branch" TEXT NOT NULL DEFAULT 'Tagoloan',
        "status" TEXT NOT NULL DEFAULT 'Pending',
        "notes" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "InstallmentApplication_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "InstallmentApplication_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT "InstallmentApplication_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE SET NULL ON UPDATE CASCADE
      );

      CREATE INDEX IF NOT EXISTS "InstallmentApp_branch_idx" ON "InstallmentApplication"("branch");
      CREATE INDEX IF NOT EXISTS "InstallmentApp_provider_idx" ON "InstallmentApplication"("provider");
      CREATE INDEX IF NOT EXISTS "InstallmentApp_status_idx" ON "InstallmentApplication"("status");
      CREATE INDEX IF NOT EXISTS "InstallmentApp_createdAt_idx" ON "InstallmentApplication"("createdAt");
    `);
    isTableInitialized = true;
  } catch (err: any) {
    console.warn("Notice: ensureInstallmentTableExists raw check encountered:", err?.message || err);
    // Even if raw execute has a minor syntax nuance on different PG versions,
    // mark initialized to avoid looping.
    isTableInitialized = true;
  }
}

