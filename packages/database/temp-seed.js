const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: 'Graphix-admin1' },
    update: {
      password: '$2b$10$AGBORv6vEAJYoC27afvSX.Z8/CpX00lN1u2JZcN.qa.wdVrSXkNee',
      role: 'ADMIN',
      name: 'System Admin'
    },
    create: {
      email: 'Graphix-admin1',
      password: '$2b$10$AGBORv6vEAJYoC27afvSX.Z8/CpX00lN1u2JZcN.qa.wdVrSXkNee',
      role: 'ADMIN',
      name: 'System Admin'
    }
  });

  console.log('Admin user created successfully:', admin.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
