const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

let parsedPassword = undefined;
if (process.env.DATABASE_URL) {
  try {
    const urlUrl = new URL(process.env.DATABASE_URL);
    if (urlUrl.password) parsedPassword = String(decodeURIComponent(urlUrl.password));
  } catch (e) {}
}

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 1,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 10000,
  ...(parsedPassword ? { password: parsedPassword } : {})
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const devices = await prisma.device.findMany({
    select: {
      id: true,
      name: true,
      price: true,
      downpayment: true,
      downpaymentImage: true
    }
  });
  console.log("DEVICES IN DB:", JSON.stringify(devices, null, 2));
}

main()
  .catch(console.error)
  .finally(() => {
    prisma.$disconnect();
    pool.end();
  });
