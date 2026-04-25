const { Client } = require('pg');

async function test(password) {
  const client = new Client("postgresql://postgres:" + password + "@localhost:5432/postgres");
  try {
    await client.connect();
    console.log("SUCCESS with password: " + password);
    await client.end();
  } catch (e) {
    console.log("FAILED with password: " + password + " - Error: " + e.message);
  }
}

async function run() {
  await test("1272004");
  await test("password");
  await test("aniluvvillamor27");
}
run();
