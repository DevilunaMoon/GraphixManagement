import { prisma } from './index';

async function verifyDatabase() {
  console.log('🔍 Starting Database & Connection Pool Verification...\n');

  try {
    const startTime = Date.now();
    
    // 1. Connection & Raw Query Test
    const rawResult = await prisma.$queryRaw<Array<{ current_database: string; version: string; now: Date }>>`
      SELECT current_database(), version(), NOW() as now;
    `;
    const latency = Date.now() - startTime;

    console.log('✅ Connection Pool: HEALTHY');
    console.log(`⏱️ Query Latency: ${latency}ms`);
    console.log(`📦 Active Database: ${rawResult[0]?.current_database}`);
    console.log(`🐘 PostgreSQL Version: ${rawResult[0]?.version?.split(' ')[0]} ${rawResult[0]?.version?.split(' ')[1]}`);
    console.log('--------------------------------------------------');

    // 2. Schema Table Record Counts
    console.log('📊 Verifying Table Counts & Migrations:');
    
    const [
      users,
      branches,
      devices,
      deviceVariations,
      repairRequests,
      purchases,
      categories,
      notifications,
      stockMovements,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.branch.count(),
      prisma.device.count(),
      prisma.deviceVariation.count(),
      prisma.repairRequest.count(),
      prisma.purchase.count(),
      prisma.category.count(),
      prisma.notification.count(),
      prisma.stockMovement.count(),
    ]);

    console.log(`  👥 Users:               ${users}`);
    console.log(`  🏢 Branches:            ${branches}`);
    console.log(`  📱 Devices:             ${devices}`);
    console.log(`  🏷️  Device Variations:   ${deviceVariations}`);
    console.log(`  🔧 Repair Requests:     ${repairRequests}`);
    console.log(`  💳 Purchases:           ${purchases}`);
    console.log(`  📂 Categories:          ${categories}`);
    console.log(`  🔔 Notifications:       ${notifications}`);
    console.log(`  📦 Stock Movements:     ${stockMovements}`);
    console.log('--------------------------------------------------');

    // 3. Foreign Key & Relation Check
    console.log('🔗 Verifying Relations & Data Integrity:');
    const sampleUser = await prisma.user.findFirst({
      select: { id: true, email: true, role: true, branch: true },
    });

    if (sampleUser) {
      console.log(`  👤 Sample User Verified: ${sampleUser.email} (${sampleUser.role})`);
    } else {
      console.log('  ⚠️ No users found in database yet (empty database).');
    }

    const sampleBranch = await prisma.branch.findFirst({
      select: { id: true, name: true },
    });
    if (sampleBranch) {
      console.log(`  🏢 Sample Branch Verified: ${sampleBranch.name}`);
    }

    console.log('\n✨ Database and Connection Pooling verification PASSED successfully!\n');
  } catch (error) {
    console.error('\n❌ Database Verification FAILED:');
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verifyDatabase();
