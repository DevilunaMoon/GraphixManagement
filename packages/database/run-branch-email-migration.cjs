const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function runEmailMigration() {
  try {
    await client.connect();
    console.log("Connected to database.");

    // Add email column
    await client.query(`
      ALTER TABLE "public"."Branch" 
      ADD COLUMN IF NOT EXISTS "email" TEXT;
    `);
    console.log("Added email column to Branch table.");

    // Update default branch email details if empty
    await client.query(`
      UPDATE "public"."Branch"
      SET "email" = 'tagoloan@graphix.com'
      WHERE LOWER("name") LIKE '%tag%' AND ("email" IS NULL OR "email" = '');

      UPDATE "public"."Branch"
      SET "email" = 'villanueva@graphix.com'
      WHERE LOWER("name") LIKE '%vil%' AND ("email" IS NULL OR "email" = '');

      UPDATE "public"."Branch"
      SET "email" = 'jasaan@graphix.com'
      WHERE LOWER("name") LIKE '%jas%' AND ("email" IS NULL OR "email" = '');
    `);
    console.log("Updated default branch emails.");

    const res = await client.query(`SELECT id, name, "phone", "email", "gcashName", "gcashNumber" FROM "public"."Branch"`);
    console.log("Current branches in DB:", JSON.stringify(res.rows, null, 2));

    console.log("Migration completed successfully!");
  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    await client.end();
  }
}

runEmailMigration();
