const { Pool } = require('pg');
require('dotenv').config({ path: '../../.env' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

pool.query('SELECT id, name FROM "Device"', (err, res) => {
  if (err) {
    console.error(err);
  } else {
    console.log(res.rows);
  }
  pool.end();
});
