const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function runInventoryMigration() {
  try {
    await client.connect();
    console.log("Connected to database.");

    // 1. Add productId to DeviceVariation
    await client.query(`
      ALTER TABLE "public"."DeviceVariation" 
      ADD COLUMN IF NOT EXISTS "productId" TEXT;
      
      CREATE INDEX IF NOT EXISTS "DeviceVariation_productId_idx" ON "public"."DeviceVariation"("productId");
    `);
    console.log("Added productId to DeviceVariation.");

    // 2. Create BranchStock table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "public"."BranchStock" (
        "id" TEXT PRIMARY KEY,
        "branch" TEXT NOT NULL,
        "stock" INTEGER NOT NULL DEFAULT 0,
        "sold" INTEGER NOT NULL DEFAULT 0,
        "deviceId" TEXT NOT NULL REFERENCES "public"."Device"("id") ON DELETE CASCADE,
        "variationId" TEXT REFERENCES "public"."DeviceVariation"("id") ON DELETE CASCADE,
        "productId" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE UNIQUE INDEX IF NOT EXISTS "BranchStock_deviceId_variationId_branch_key" 
      ON "public"."BranchStock"("deviceId", "variationId", "branch");

      CREATE INDEX IF NOT EXISTS "BranchStock_branch_idx" ON "public"."BranchStock"("branch");
      CREATE INDEX IF NOT EXISTS "BranchStock_productId_idx" ON "public"."BranchStock"("productId");
      CREATE INDEX IF NOT EXISTS "BranchStock_deviceId_idx" ON "public"."BranchStock"("deviceId");
      CREATE INDEX IF NOT EXISTS "BranchStock_variationId_idx" ON "public"."BranchStock"("variationId");
    `);
    console.log("Created BranchStock table and indexes.");

    // 3. Create StockMovement table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "public"."StockMovement" (
        "id" TEXT PRIMARY KEY,
        "type" TEXT NOT NULL,
        "deviceId" TEXT REFERENCES "public"."Device"("id") ON DELETE SET NULL,
        "variationId" TEXT REFERENCES "public"."DeviceVariation"("id") ON DELETE SET NULL,
        "productId" TEXT,
        "productName" TEXT NOT NULL,
        "fromBranch" TEXT,
        "toBranch" TEXT,
        "branch" TEXT NOT NULL,
        "quantity" INTEGER NOT NULL,
        "previousStock" INTEGER NOT NULL DEFAULT 0,
        "newStock" INTEGER NOT NULL DEFAULT 0,
        "notes" TEXT,
        "performedBy" TEXT,
        "userRole" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS "StockMovement_branch_idx" ON "public"."StockMovement"("branch");
      CREATE INDEX IF NOT EXISTS "StockMovement_type_idx" ON "public"."StockMovement"("type");
      CREATE INDEX IF NOT EXISTS "StockMovement_createdAt_idx" ON "public"."StockMovement"("createdAt");
      CREATE INDEX IF NOT EXISTS "StockMovement_productId_idx" ON "public"."StockMovement"("productId");
    `);
    console.log("Created StockMovement table and indexes.");

    // 4. Create DeviceUnit table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "public"."DeviceUnit" (
        "id" TEXT PRIMARY KEY,
        "imei" TEXT UNIQUE NOT NULL,
        "deviceId" TEXT NOT NULL REFERENCES "public"."Device"("id") ON DELETE CASCADE,
        "variationId" TEXT REFERENCES "public"."DeviceVariation"("id") ON DELETE SET NULL,
        "productId" TEXT,
        "branch" TEXT NOT NULL DEFAULT 'Tagoloan',
        "status" TEXT NOT NULL DEFAULT 'Available',
        "purchaseId" TEXT,
        "notes" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS "DeviceUnit_branch_idx" ON "public"."DeviceUnit"("branch");
      CREATE INDEX IF NOT EXISTS "DeviceUnit_status_idx" ON "public"."DeviceUnit"("status");
      CREATE INDEX IF NOT EXISTS "DeviceUnit_deviceId_idx" ON "public"."DeviceUnit"("deviceId");
      CREATE INDEX IF NOT EXISTS "DeviceUnit_variationId_idx" ON "public"."DeviceUnit"("variationId");
      CREATE INDEX IF NOT EXISTS "DeviceUnit_productId_idx" ON "public"."DeviceUnit"("productId");
    `);
    console.log("Created DeviceUnit table and indexes.");

    console.log("Inventory migration completed successfully!");
  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    await client.end();
  }
}

runInventoryMigration();
