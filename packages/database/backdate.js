const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tx = await prisma.purchase.findFirst({
    where: { paymentType: 'Downpayment', status: 'Active' },
    orderBy: { createdAt: 'desc' }
  });
  
  if (tx) {
    const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);
    await prisma.purchase.update({
      where: { id: tx.id },
      data: { createdAt: fourDaysAgo }
    });
    console.log('Successfully backdated transaction:', tx.id);
  } else {
    console.log('No active downpayments found in the database. Please create a downpayment first.');
  }
}

main().finally(() => prisma.$disconnect());
