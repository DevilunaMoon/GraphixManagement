const { Client } = require('pg');

async function check() {
  const client = new Client("postgresql://postgres:password@localhost:5432/Graphix_dev");
  try {
    await client.connect();
    const res = await client.query('SELECT * FROM "User"');
    console.log("USERS IN DB:", res.rows);
    await client.end();
  } catch (e) {
    console.log("ERROR:", e);
  }
}
check();
