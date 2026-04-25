const { Client } = require('pg');

async function test(port, password) {
  const client = new Client(`postgresql://postgres:${password}@localhost:${port}/Graphix_dev`);
  try {
    await client.connect();
    console.log(`SUCCESS on port ${port} with password: ${password}`);
    await client.end();
  } catch (e) {
    console.log(`FAILED on port ${port} with password: ${password} - Error: ${e.message}`);
  }
}

async function run() {
  await test(5432, "1272004");
  await test(5433, "1272004");
  await test(5434, "1272004");
}
run();
