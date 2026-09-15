const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const client = new Client({ connectionString: process.env.DATABASE_URL });

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

function cuid() {
  return 'c' + Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
}

async function main() {
  await client.connect();
  console.log('Connected to DB.');

  const branches = ['Tagoloan', 'Villanueva', 'Jasaan'];

  const devRes = await client.query(`SELECT id, name, price, cost, stock, type FROM "public"."Device"`);
  const devices = devRes.rows;
  console.log(`Found ${devices.length} devices.`);

  for (const device of devices) {
    const varRes = await client.query(`SELECT id, name, price, cost, stock, "productId", type FROM "public"."DeviceVariation" WHERE "deviceId" = $1`, [device.id]);
    let vars = varRes.rows;

    if (vars.length === 0) {
      const isPhone = (device.type || '').toLowerCase().includes('phone') || 
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
          const varId = cuid();
          await client.query(`
            INSERT INTO "public"."DeviceVariation" ("id", "deviceId", "type", "name", "price", "cost", "stock", "productId")
            VALUES ($1, $2, 'Storage', $3, $4, $5, $6, $7)
          `, [varId, device.id, cap.name, cap.price, cap.cost, cap.stock, prodId]);

          const branchStockMap = { Tagoloan: cap.tagoloan, Villanueva: cap.villanueva, Jasaan: cap.jasaan };
          for (const b of branches) {
            const bsId = cuid();
            await client.query(`
              INSERT INTO "public"."BranchStock" ("id", "deviceId", "variationId", "branch", "productId", "stock", "sold")
              VALUES ($1, $2, $3, $4, $5, $6, 0)
              ON CONFLICT ("deviceId", "variationId", "branch") DO UPDATE SET "productId" = EXCLUDED."productId", "stock" = EXCLUDED."stock"
            `, [bsId, device.id, varId, b, prodId, branchStockMap[b] ?? 2]);
          }
        }
      } else {
        const prodId = generateProductId(device.name, 'STD');
        const varId = cuid();
        await client.query(`
          INSERT INTO "public"."DeviceVariation" ("id", "deviceId", "type", "name", "price", "cost", "stock", "productId")
          VALUES ($1, $2, 'Model', 'Standard', $3, $4, $5, $6)
        `, [varId, device.id, device.price, device.cost, device.stock, prodId]);

        for (let bIndex = 0; bIndex < branches.length; bIndex++) {
          const b = branches[bIndex];
          const bStock = bIndex === 0 ? device.stock : Math.max(0, Math.floor(device.stock / 2));
          const bsId = cuid();
          await client.query(`
            INSERT INTO "public"."BranchStock" ("id", "deviceId", "variationId", "branch", "productId", "stock", "sold")
            VALUES ($1, $2, $3, $4, $5, $6, 0)
            ON CONFLICT ("deviceId", "variationId", "branch") DO UPDATE SET "productId" = EXCLUDED."productId", "stock" = EXCLUDED."stock"
          `, [bsId, device.id, varId, b, prodId, bStock]);
        }
      }
    } else {
      for (const v of vars) {
        const prodId = v.productId || generateProductId(device.name, v.name);
        await client.query(`UPDATE "public"."DeviceVariation" SET "productId" = $1 WHERE "id" = $2`, [prodId, v.id]);

        for (let bIndex = 0; bIndex < branches.length; bIndex++) {
          const b = branches[bIndex];
          const bStock = bIndex === 0 ? (v.stock || 5) : (bIndex === 1 ? Math.max(0, (v.stock || 5) - 1) : Math.max(0, (v.stock || 5) - 2));
          const bsId = cuid();
          await client.query(`
            INSERT INTO "public"."BranchStock" ("id", "deviceId", "variationId", "branch", "productId", "stock", "sold")
            VALUES ($1, $2, $3, $4, $5, $6, 0)
            ON CONFLICT ("deviceId", "variationId", "branch") DO UPDATE SET "productId" = EXCLUDED."productId"
          `, [bsId, device.id, v.id, b, prodId, bStock]);
        }
      }
    }
  }

  // Ensure Vivo Y11 is present with exact requested variants
  const vivoRes = await client.query(`SELECT id FROM "public"."Device" WHERE "name" ILIKE '%Vivo Y11%'`);
  let vivoId;
  if (vivoRes.rows.length === 0) {
    vivoId = cuid();
    await client.query(`
      INSERT INTO "public"."Device" ("id", "name", "price", "cost", "stock", "type", "specs", "branch", "updatedAt")
      VALUES ($1, 'Vivo Y11', 5999, 4500, 8, 'Smartphone', '6.35-inch HD+ Halo FullView Display, AI Dual Camera, 5000mAh Battery', 'Tagoloan', NOW())
    `, [vivoId]);
  } else {
    vivoId = vivoRes.rows[0].id;
  }

  const vivoVariants = [
    { name: '32 GB', prodId: 'VIVO-Y11-32', price: 5999, cost: 4500, tagoloan: 5, villanueva: 2, jasaan: 0 },
    { name: '64 GB', prodId: 'VIVO-Y11-64', price: 6999, cost: 5300, tagoloan: 3, villanueva: 0, jasaan: 4 },
    { name: '128 GB', prodId: 'VIVO-Y11-128', price: 7999, cost: 6200, tagoloan: 0, villanueva: 6, jasaan: 2 },
    { name: '256 GB', prodId: 'VIVO-Y11-256', price: 8999, cost: 7100, tagoloan: 0, villanueva: 0, jasaan: 0 }
  ];

  for (const v of vivoVariants) {
    const existingVar = await client.query(`SELECT id FROM "public"."DeviceVariation" WHERE "deviceId" = $1 AND ("name" = $2 OR "productId" = $3)`, [vivoId, v.name, v.prodId]);
    let varId;
    if (existingVar.rows.length === 0) {
      varId = cuid();
      await client.query(`
        INSERT INTO "public"."DeviceVariation" ("id", "deviceId", "type", "name", "price", "cost", "stock", "productId")
        VALUES ($1, $2, 'Storage', $3, $4, $5, $6, $7)
      `, [varId, vivoId, v.name, v.price, v.cost, v.tagoloan + v.villanueva + v.jasaan, v.prodId]);
    } else {
      varId = existingVar.rows[0].id;
      await client.query(`UPDATE "public"."DeviceVariation" SET "productId" = $1, "price" = $2, "cost" = $3 WHERE "id" = $4`, [v.prodId, v.price, v.cost, varId]);
    }

    const branchStocks = { Tagoloan: v.tagoloan, Villanueva: v.villanueva, Jasaan: v.jasaan };
    for (const b of branches) {
      const bsId = cuid();
      await client.query(`
        INSERT INTO "public"."BranchStock" ("id", "deviceId", "variationId", "branch", "productId", "stock", "sold")
        VALUES ($1, $2, $3, $4, $5, $6, 0)
        ON CONFLICT ("deviceId", "variationId", "branch") DO UPDATE SET "productId" = EXCLUDED."productId", "stock" = EXCLUDED."stock"
      `, [bsId, vivoId, varId, b, v.prodId, branchStocks[b]]);
    }
  }

  // Create some initial sample device units (IMEIs) for physical units demo
  const sampleUnits = [
    { imei: '861234567890121', deviceId: vivoId, productId: 'VIVO-Y11-32', branch: 'Tagoloan', status: 'Available' },
    { imei: '861234567890122', deviceId: vivoId, productId: 'VIVO-Y11-32', branch: 'Tagoloan', status: 'Available' },
    { imei: '861234567890123', deviceId: vivoId, productId: 'VIVO-Y11-64', branch: 'Tagoloan', status: 'Available' },
    { imei: '861234567890124', deviceId: vivoId, productId: 'VIVO-Y11-32', branch: 'Villanueva', status: 'Available' },
    { imei: '861234567890125', deviceId: vivoId, productId: 'VIVO-Y11-128', branch: 'Villanueva', status: 'Available' },
    { imei: '861234567890126', deviceId: vivoId, productId: 'VIVO-Y11-64', branch: 'Jasaan', status: 'Available' },
    { imei: '861234567890127', deviceId: vivoId, productId: 'VIVO-Y11-128', branch: 'Jasaan', status: 'Available' }
  ];

  for (const u of sampleUnits) {
    const uId = cuid();
    await client.query(`
      INSERT INTO "public"."DeviceUnit" ("id", "imei", "deviceId", "productId", "branch", "status")
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT ("imei") DO NOTHING
    `, [uId, u.imei, u.deviceId, u.productId, u.branch, u.status]);
  }

  console.log('✅ Multi-Branch Inventory successfully seeded!');
  await client.end();
}

main().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
