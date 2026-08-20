const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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
  .finally(() => prisma.$disconnect());
