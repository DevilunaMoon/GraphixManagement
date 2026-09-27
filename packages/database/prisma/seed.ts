import { prisma } from '../index';

// Pre-computed bcrypt hash (Cost factor 10) for 'AdminPassword123!'
const DEFAULT_PASSWORD_HASH = '$2b$10$VS3q6.0e2LaJY6Fjyiu4Pu.1HOJzN.Pgbf1jUL7vrwvSyKX.emgcy';

async function main() {
  console.log('🌱 Starting GraphixManagement Database Seeding...\n');

  // 1. Seed Branches
  console.log('🏢 Seeding Branches...');
  const branches = [
    {
      name: 'Tagoloan',
      address: 'Poblacion, Tagoloan, Misamis Oriental',
      phone: '0967 123 4567',
      email: 'tagoloan@graphix.com',
      status: 'Active',
      gcashName: 'GRAPHIX MANAGEMENT - TAGOLOAN',
      gcashNumber: '0967 123 4567',
      gcashQrCode: 'https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=09671234567%20GRAPHIX%20TAGOLOAN',
    },
    {
      name: 'Villanueva',
      address: 'Poblacion, Villanueva, Misamis Oriental',
      phone: '0967 234 5678',
      email: 'villanueva@graphix.com',
      status: 'Active',
      gcashName: 'GRAPHIX MANAGEMENT - VILLANUEVA',
      gcashNumber: '0967 234 5678',
      gcashQrCode: 'https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=09672345678%20GRAPHIX%20VILLANUEVA',
    },
    {
      name: 'Jasaan',
      address: 'Lower Jasaan, Misamis Oriental',
      phone: '0967 345 6789',
      email: 'jasaan@graphix.com',
      status: 'Active',
      gcashName: 'GRAPHIX MANAGEMENT - JASAAN',
      gcashNumber: '0967 345 6789',
      gcashQrCode: 'https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=09673456789%20GRAPHIX%20JASAAN',
    },
  ];

  for (const branch of branches) {
    await prisma.branch.upsert({
      where: { name: branch.name },
      update: branch,
      create: branch,
    });
    console.log(`  ✓ Branch: ${branch.name}`);
  }

  // 2. Seed Default Staff & Admin Accounts
  console.log('\n👥 Seeding Core Staff & Admin Accounts...');
  const defaultPassword = DEFAULT_PASSWORD_HASH;

  const staffUsers = [
    {
      email: 'superadmin@graphix.com',
      name: 'Super Administrator',
      phone: '0967 000 0001',
      role: 'SUPER_ADMIN',
      branch: 'Tagoloan',
      status: 'Active',
      password: defaultPassword,
    },
    {
      email: 'admin.tagoloan@graphix.com',
      name: 'Tagoloan Branch Admin',
      phone: '0967 000 0002',
      role: 'ADMIN',
      branch: 'Tagoloan',
      status: 'Active',
      password: defaultPassword,
    },
    {
      email: 'cashier.tagoloan@graphix.com',
      name: 'Tagoloan Cashier',
      phone: '0967 000 0003',
      role: 'CASHIER',
      branch: 'Tagoloan',
      status: 'Active',
      password: defaultPassword,
    },
    {
      email: 'cashier.villanueva@graphix.com',
      name: 'Villanueva Cashier',
      phone: '0967 000 0004',
      role: 'CASHIER',
      branch: 'Villanueva',
      status: 'Active',
      password: defaultPassword,
    },
    {
      email: 'cashier.jasaan@graphix.com',
      name: 'Jasaan Cashier',
      phone: '0967 000 0005',
      role: 'CASHIER',
      branch: 'Jasaan',
      status: 'Active',
      password: defaultPassword,
    },
  ];

  for (const user of staffUsers) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        role: user.role,
        branch: user.branch,
        status: user.status,
      },
      create: user,
    });
    console.log(`  ✓ User: ${user.email} (${user.role} - ${user.branch})`);
  }

  // 3. Seed Default Categories
  console.log('\n📂 Seeding Product Categories...');
  const categories = [
    'Smartphones & Mobile Devices',
    'Laptops & Computers',
    'Tablets & iPads',
    'Accessories & Chargers',
    'Audio & Wearables',
  ];

  for (const catName of categories) {
    const existing = await prisma.category.findFirst({ where: { name: catName } });
    if (!existing) {
      await prisma.category.create({
        data: { name: catName },
      });
      console.log(`  ✓ Category: ${catName}`);
    } else {
      console.log(`  ✓ Category (already exists): ${catName}`);
    }
  }

  // 4. Seed Default System Policies
  console.log('\n📜 Seeding Store Policies...');
  const policies = [
    {
      type: 'terms',
      content: 'Standard terms and conditions for Graphix device sales and repair warranty.',
    },
    {
      type: 'privacy',
      content: 'Privacy policy for customer data handling, accounts, and order transactions.',
    },
    {
      type: 'refund',
      content: '7-day replacement for factory defects and standard 30-day service warranty for repaired units.',
    },
  ];

  for (const policy of policies) {
    await prisma.policy.upsert({
      where: { type: policy.type },
      update: { content: policy.content },
      create: policy,
    });
    console.log(`  ✓ Policy: ${policy.type}`);
  }

  // 5. Seed Default FAQs
  console.log('\n❓ Seeding Initial FAQs...');
  const faqs = [
    {
      question: 'How long do repairs usually take?',
      answer: 'Repair duration depends on the issue and replacement part availability. Our technicians provide an estimated completion date upon inspection.',
      isActive: true,
      createdBy: 'System Super Admin',
    },
    {
      question: 'What payment methods do you accept?',
      answer: 'We accept Cash and GCash payments for products, repair downpayments, and reservations.',
      isActive: true,
      createdBy: 'System Super Admin',
    },
    {
      question: 'Can I check device stock by branch?',
      answer: 'Yes, select your preferred branch (Tagoloan, Villanueva, or Jasaan) on the product page or in your settings to view live stock.',
      isActive: true,
      createdBy: 'System Super Admin',
    },
  ];

  for (const faq of faqs) {
    const existing = await prisma.fAQ.findFirst({ where: { question: faq.question } });
    if (!existing) {
      await prisma.fAQ.create({ data: faq });
      console.log(`  ✓ FAQ: ${faq.question}`);
    }
  }

  // 6. Initialize Question Sequence Tracker for current year
  const currentYear = new Date().getFullYear();
  const branchCodes = ['T', 'V', 'J'];
  for (const code of branchCodes) {
    await prisma.questionSequence.upsert({
      where: {
        branchCode_year: {
          branchCode: code,
          year: currentYear,
        },
      },
      update: {},
      create: {
        branchCode: code,
        year: currentYear,
        lastNumber: 0,
      },
    });
  }
  console.log(`\n🔢 Initialized question sequence trackers for year ${currentYear}.`);

  console.log('\n🎉 Seed process successfully completed! The system is pre-start ready.\n');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
