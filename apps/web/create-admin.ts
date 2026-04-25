import { prisma } from 'database';
import bcrypt from 'bcryptjs';

async function main() {
  const hashedPassword = await bcrypt.hash('FirstAdminOne', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'FirstAdmin1' },
    update: {
      password: hashedPassword,
      role: 'ADMIN',
      name: 'System Admin'
    },
    create: {
      email: 'FirstAdmin1',
      password: hashedPassword,
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
