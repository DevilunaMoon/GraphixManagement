const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from the root .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

console.log("DATABASE_URL from env:", process.env.DATABASE_URL);

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

const REPAIRS_DATA = [
  {
    id: "0193672",
    deviceName: "Repair Labor Service",
    ownerName: "Pixter Andrew Gabatan",
    progress: "100%",
    cause: "Repair Payment Labor",
    technician: "Lead Tech",
    repairCost: "500",
    status: "Completed",
    createdAt: new Date("2026-08-01T04:00:00Z"),
  },
  {
    id: "0193697",
    deviceName: "iPhone 11",
    ownerName: "Mumaril, Vincent A.",
    progress: "100%",
    cause: "Repair Payment LCD (iPhone 11, 3 Days Warranty)",
    technician: "Lead Tech",
    repairCost: "3000",
    status: "Completed",
    createdAt: new Date("2026-08-01T05:00:00Z"),
  },
  {
    id: "0193673",
    deviceName: "iPhone 11",
    ownerName: "Ocero, April Maiza Dhaine G.",
    progress: "100%",
    cause: "iPhone 11 LCD",
    technician: "Lead Tech",
    repairCost: "2800",
    status: "Completed",
    createdAt: new Date("2026-08-02T02:00:00Z"),
  },
  {
    id: "0036002",
    deviceName: "iPhone XR",
    ownerName: "Juana Mae Mahusay",
    progress: "100%",
    cause: "iPhone XR LCD",
    technician: "Lead Tech",
    repairCost: "2900",
    status: "Completed",
    createdAt: new Date("2026-08-01T06:00:00Z"),
  },
  {
    id: "0193671",
    deviceName: "iPhone XR",
    ownerName: "Joram Pacana",
    progress: "100%",
    cause: "iPhone XR Battery",
    technician: "Lead Tech",
    repairCost: "2000",
    status: "Completed",
    createdAt: new Date("2026-08-02T03:00:00Z"),
  }
];

async function main() {
  console.log("Starting to seed completed repair receipts into database...");
  for (const item of REPAIRS_DATA) {
    const repair = await prisma.repairRequest.upsert({
      where: { id: item.id },
      update: {
        deviceName: item.deviceName,
        ownerName: item.ownerName,
        progress: item.progress,
        cause: item.cause,
        technician: item.technician,
        repairCost: item.repairCost,
        status: item.status,
        createdAt: item.createdAt,
      },
      create: {
        id: item.id,
        deviceName: item.deviceName,
        ownerName: item.ownerName,
        progress: item.progress,
        cause: item.cause,
        technician: item.technician,
        repairCost: item.repairCost,
        status: item.status,
        createdAt: item.createdAt,
      }
    });
    console.log(`Seeded repair ID ${repair.id} for ${repair.ownerName}`);
  }
  console.log("All completed repair receipts seeded successfully!");
}

main()
  .catch((e) => {
    console.error("Error seeding repairs:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
