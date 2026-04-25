const { Pool } = require('pg');

const pool = new Pool({
  connectionString: "postgresql://postgres:1272004@localhost:5433/Graphix_dev?schema=public"
});

async function main() {
  const hash = '$2b$10$o3ny9996c8L0gjaozeQm/eDB1iw744GqXavBjmAmJGf/g.DcBbkIO';
  const query = `
    INSERT INTO "User" ("id", "email", "password", "role", "name", "updatedAt")
    VALUES (gen_random_uuid()::text, 'FirstAdmin1', $1, 'ADMIN', 'System Admin', NOW())
    ON CONFLICT ("email") DO UPDATE SET "password" = $1, "role" = 'ADMIN';
  `;

  try {
    const res = await pool.query(query, [hash]);
    console.log('Admin inserted via raw PG query successfully');
  } catch (err) {
    console.error('Error inserting admin:', err);
  } finally {
    await pool.end();
  }
}

main();
