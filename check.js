const { PrismaClient } = require("./packages/database/node_modules/@prisma/client/index.js");
const prisma = new PrismaClient();

async function check() {
  try {
    const users = await prisma.user.findMany();
    console.log("Users in DB:", users);
  } catch(e) {
    console.log("Error querying Users:", e);
  } finally {
    await prisma.$disconnect();
  }
}
check();
