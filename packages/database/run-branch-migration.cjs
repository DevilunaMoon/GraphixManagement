const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function runBranchMigration() {
  try {
    await client.connect();
    console.log("Connected to database.");

    // Add GCash columns
    await client.query(`
      ALTER TABLE "public"."Branch" 
      ADD COLUMN IF NOT EXISTS "gcashName" TEXT DEFAULT 'GRAPHIX MANAGEMENT',
      ADD COLUMN IF NOT EXISTS "gcashNumber" TEXT DEFAULT '0967 123 4567',
      ADD COLUMN IF NOT EXISTS "gcashQrCode" TEXT;
    `);
    console.log("Added gcashName, gcashNumber, gcashQrCode columns to Branch table.");

    // Update default branch GCash details if not yet customized
    await client.query(`
      UPDATE "public"."Branch"
      SET 
        "gcashName" = COALESCE(NULLIF("gcashName", 'GRAPHIX MANAGEMENT'), 'GRAPHIX MANAGEMENT - TAGOLOAN'),
        "gcashNumber" = COALESCE("gcashNumber", '0967 123 4567')
      WHERE "name" = 'Tagoloan';

      UPDATE "public"."Branch"
      SET 
        "gcashName" = COALESCE(NULLIF("gcashName", 'GRAPHIX MANAGEMENT'), 'GRAPHIX MANAGEMENT - VILLANUEVA'),
        "gcashNumber" = COALESCE("gcashNumber", '0967 123 4568')
      WHERE "name" = 'Villanueva';

      UPDATE "public"."Branch"
      SET 
        "gcashName" = COALESCE(NULLIF("gcashName", 'GRAPHIX MANAGEMENT'), 'GRAPHIX MANAGEMENT - JASAAN'),
        "gcashNumber" = COALESCE("gcashNumber", '0967 123 4569')
      WHERE "name" = 'Jasaan';
    `);
    console.log("Updated default branch GCash details.");

    const res = await client.query(`SELECT id, name, "gcashName", "gcashNumber", "gcashQrCode" FROM "public"."Branch"`);
    console.log("Current branches in DB:", JSON.stringify(res.rows, null, 2));

    console.log("Migration completed successfully!");
  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    await client.end();
  }
}

runBranchMigration();
