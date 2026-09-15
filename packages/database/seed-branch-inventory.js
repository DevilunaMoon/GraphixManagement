const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function generateProductId(modelName, variantName) {
  const cleanModel = (modelName || 'DEVICE')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  
  const cleanVariant = (variantName || 'STD')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return `${cleanModel}-${cleanVariant}`;
}

async function main() {
  console.log('--- Initializing Multi-Branch Inventory & Variant Product IDs ---');

  const branches = ['Tagoloan', 'Villanueva', 'Jasaan'];

  // Fetch all devices
  const devices = await prisma.device.findMany({
    include: {
      variations: true
    }
  });

  console.log(`Found ${devices.length} devices in inventory.`);

  for (const device of devices) {
    let currentVariations = device.variations || [];

    if (currentVariations.length === 0) {
      const isPhone = (device.type || '').toLowerCase().includes('phone') || 
                      (device.type || '').toLowerCase().includes('smartphone') ||
                      (device.name || '').toLowerCase().includes('vivo') ||
                      (device.name || '').toLowerCase().includes('iphone') ||
                      (device.name || '').toLowerCase().includes('samsung') ||
                      (device.name || '').toLowerCase().includes('oppo') ||
                      (device.name || '').toLowerCase().includes('xiaomi') ||
                      (device.name || '').toLowerCase().includes('realme');

      if (isPhone) {
        const defaultCapacities = [
          { name: '32 GB', price: device.price, cost: device.cost, stock: 5, tagoloan: 5, villanueva: 2, jasaan: 0 },
          { name: '64 GB', price: device.price + 1000, cost: device.cost + 800, stock: 7, tagoloan: 3, villanueva: 0, jasaan: 4 },
          { name: '128 GB', price: device.price + 2500, cost: device.cost + 2000, stock: 8, tagoloan: 0, villanueva: 6, jasaan: 2 },
          { name: '256 GB', price: device.price + 4500, cost: device.cost + 3500, stock: 3, tagoloan: 2, villanueva: 1, jasaan: 0 }
        ];

        for (const cap of defaultCapacities) {
          const prodId = generateProductId(device.name, cap.name);
          const createdVar = await prisma.deviceVariation.create({
            data: {
              deviceId: device.id,
              type: 'Storage',
              name: cap.name,
              price: cap.price,
              cost: cap.cost,
              stock: cap.stock,
              productId: prodId
            }
          });

          // Branch stocks: Tagoloan, Villanueva, Jasaan
          const branchMap = {
            Tagoloan: cap.tagoloan,
            Villanueva: cap.villanueva,
            Jasaan: cap.jasaan
          };

          for (const b of branches) {
            const bStock = branchMap[b] ?? 2;
            await prisma.branchStock.create({
              data: {
                deviceId: device.id,
                variationId: createdVar.id,
                branch: b,
                productId: prodId,
                stock: bStock,
                sold: 0
              }
            });
          }
        }
      } else {
        // Non-phone item: Create Standard variation
        const prodId = generateProductId(device.name, 'STD');
        const createdVar = await prisma.deviceVariation.create({
          data: {
            deviceId: device.id,
            type: 'Model',
            name: 'Standard',
            price: device.price,
            cost: device.cost,
            stock: device.stock,
            productId: prodId
          }
        });

        for (let bIndex = 0; bIndex < branches.length; bIndex++) {
          const b = branches[bIndex];
          const bStock = bIndex === 0 ? device.stock : Math.max(0, Math.floor(device.stock / 2));
          await prisma.branchStock.create({
            data: {
              deviceId: device.id,
              variationId: createdVar.id,
              branch: b,
              productId: prodId,
              stock: bStock,
              sold: 0
            }
          });
        }
      }
    } else {
      // Variations already exist; update their productId and ensure BranchStock rows exist
      for (const variation of currentVariations) {
        const prodId = variation.productId || generateProductId(device.name, variation.name);
        
        await prisma.deviceVariation.update({
          where: { id: variation.id },
          data: { productId: prodId }
        });

        for (let bIndex = 0; bIndex < branches.length; bIndex++) {
          const b = branches[bIndex];
          const baseStock = variation.stock || 5;
          const bStock = bIndex === 0 ? baseStock : (bIndex === 1 ? Math.max(0, baseStock - 1) : Math.max(0, baseStock - 2));

          const existingBs = await prisma.branchStock.findFirst({
            where: {
              deviceId: device.id,
              variationId: variation.id,
              branch: b
            }
          });

          if (existingBs) {
            await prisma.branchStock.update({
              where: { id: existingBs.id },
              data: { productId: prodId }
            });
          } else {
            await prisma.branchStock.create({
              data: {
                deviceId: device.id,
                variationId: variation.id,
                branch: b,
                productId: prodId,
                stock: bStock,
                sold: 0
              }
            });
          }
        }
      }
    }
  }

  // Ensure Vivo Y11 specifically exists with the user's exact demo variant structure:
  const vivoY11 = await prisma.device.findFirst({
    where: { name: { contains: 'Vivo Y11', mode: 'insensitive' } },
    include: { variations: true }
  });

  if (!vivoY11) {
    const createdVivo = await prisma.device.create({
      data: {
        name: 'Vivo Y11',
        price: 5999,
        cost: 4500,
        stock: 8,
        specs: '6.35-inch HD+ Halo FullView Display, AI Dual Camera, 5000mAh Battery',
        type: 'Smartphone',
        branch: 'Tagoloan'
      }
    });

    const vivoVariants = [
      { name: '32 GB', prodId: 'VIVO-Y11-32', price: 5999, cost: 4500, tagoloan: 5, villanueva: 2, jasaan: 0 },
      { name: '64 GB', prodId: 'VIVO-Y11-64', price: 6999, cost: 5300, tagoloan: 3, villanueva: 0, jasaan: 4 },
      { name: '128 GB', prodId: 'VIVO-Y11-128', price: 7999, cost: 6200, tagoloan: 0, villanueva: 6, jasaan: 2 },
      { name: '256 GB', prodId: 'VIVO-Y11-256', price: 8999, cost: 7100, tagoloan: 0, villanueva: 0, jasaan: 0 }
    ];

    for (const v of vivoVariants) {
      const createdVar = await prisma.deviceVariation.create({
        data: {
          deviceId: createdVivo.id,
          type: 'Storage',
          name: v.name,
          productId: v.prodId,
          price: v.price,
          cost: v.cost,
          stock: v.tagoloan + v.villanueva + v.jasaan
        }
      });

      for (const b of branches) {
        const stockVal = b === 'Tagoloan' ? v.tagoloan : (b === 'Villanueva' ? v.villanueva : v.jasaan);
        await prisma.branchStock.create({
          data: {
            deviceId: createdVivo.id,
            variationId: createdVar.id,
            branch: b,
            productId: v.prodId,
            stock: stockVal,
            sold: 0
          }
        });
      }
    }
  }

  console.log('✅ Successfully seeded Multi-Branch Inventory & Variant Product IDs!');
}

main()
  .catch((e) => {
    console.error('Error seeding inventory:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
