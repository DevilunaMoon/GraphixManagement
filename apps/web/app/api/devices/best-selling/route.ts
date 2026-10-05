import { NextResponse } from 'next/server';
import { prisma } from 'database';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const branchParam = searchParams.get('branch');
    const isSpecificBranch = !!(branchParam && branchParam.toLowerCase() !== 'all');

    // -------------------------------------------------------------
    // SPECIFIC BRANCH VIEW (e.g. Tagoloan, Villanueva, Jasaan)
    // -------------------------------------------------------------
    if (isSpecificBranch) {
      // 1. Fetch purchases for this specific branch
      const purchases = await prisma.purchase.findMany({
        where: {
          branch: { equals: branchParam, mode: 'insensitive' }
        },
        select: {
          deviceId: true,
          quantity: true,
          branch: true
        }
      });

      // 2. Fetch branch stocks for this specific branch
      const branchStocks = await prisma.branchStock.findMany({
        where: {
          branch: { equals: branchParam, mode: 'insensitive' }
        },
        select: {
          deviceId: true,
          sold: true,
          stock: true,
          branch: true
        }
      });

      const salesMap: Record<string, number> = {};
      const stockMap: Record<string, number> = {};

      purchases.forEach(p => {
        if (p.deviceId) {
          salesMap[p.deviceId] = (salesMap[p.deviceId] || 0) + (p.quantity || 1);
        }
      });

      branchStocks.forEach(bs => {
        if (bs.deviceId) {
          if (bs.sold > 0) {
            salesMap[bs.deviceId] = Math.max(salesMap[bs.deviceId] || 0, bs.sold);
          }
          stockMap[bs.deviceId] = (stockMap[bs.deviceId] || 0) + (bs.stock || 0);
        }
      });

      // Find devices that have recorded sales strictly in this branch
      const soldDeviceIds = Object.entries(salesMap)
        .filter(([_, count]) => count > 0)
        .sort((a, b) => b[1] - a[1])
        .map(([id]) => id);

      let devices: any[] = [];
      if (soldDeviceIds.length > 0) {
        const dbDevices = await prisma.device.findMany({
          where: {
            id: { in: soldDeviceIds }
          },
          include: { 
            category: true, 
            variations: true,
            branchStocks: {
              where: { branch: { equals: branchParam, mode: 'insensitive' } }
            }
          }
        });

        devices = dbDevices.sort((a, b) => (salesMap[b.id] || 0) - (salesMap[a.id] || 0));
      }

      // If fewer than 5, ONLY fill with devices strictly assigned to or stocked in THIS branch
      if (devices.length < 5) {
        const remainingCount = 5 - devices.length;
        const alreadyFetchedIds = devices.map(d => d.id);

        const branchSpecificDevices = await prisma.device.findMany({
          where: {
            id: { notIn: alreadyFetchedIds },
            OR: [
              { branch: { equals: branchParam, mode: 'insensitive' } },
              { branchStocks: { some: { branch: { equals: branchParam, mode: 'insensitive' }, stock: { gt: 0 } } } }
            ]
          },
          take: remainingCount,
          include: { 
            category: true, 
            variations: true,
            branchStocks: {
              where: { branch: { equals: branchParam, mode: 'insensitive' } }
            }
          },
          orderBy: { createdAt: 'desc' }
        });

        devices = [...devices, ...branchSpecificDevices];
      }

      // STRICT ISOLATION: Do NOT fallback to other branches. If this branch has no items/sales, return []
      devices = devices.slice(0, 5);

      const enrichedDevices = devices.map((device, index) => {
        let branchStockQty = 0;
        if (device.branchStocks && device.branchStocks.length > 0) {
          branchStockQty = device.branchStocks[0].stock ?? 0;
        } else if (device.branch?.toLowerCase() === branchParam.toLowerCase()) {
          branchStockQty = device.stock;
        }

        return {
          ...device,
          rank: index + 1,
          unitsSold: salesMap[device.id] || 0,
          selectedBranch: branchParam,
          topBranch: branchParam,
          branch: branchParam,
          branchStockQuantity: branchStockQty
        };
      });

      return NextResponse.json(enrichedDevices, {
        headers: {
          'Cache-Control': 'no-store, must-revalidate'
        }
      });
    }

    // -------------------------------------------------------------
    // ALL BRANCHES VIEW (Ranked overall with primary branch attribution)
    // -------------------------------------------------------------
    const purchases = await prisma.purchase.findMany({
      select: {
        deviceId: true,
        quantity: true,
        branch: true
      }
    });

    const branchStocks = await prisma.branchStock.findMany({
      select: {
        deviceId: true,
        sold: true,
        stock: true,
        branch: true
      }
    });

    const totalSalesMap: Record<string, number> = {};
    const branchSalesMap: Record<string, Record<string, number>> = {};

    purchases.forEach(p => {
      if (p.deviceId) {
        const qty = p.quantity || 1;
        totalSalesMap[p.deviceId] = (totalSalesMap[p.deviceId] || 0) + qty;
        const b = p.branch || 'Tagoloan';
        if (!branchSalesMap[p.deviceId]) {
          branchSalesMap[p.deviceId] = {};
        }
        const bMap = branchSalesMap[p.deviceId]!;
        bMap[b] = (bMap[b] || 0) + qty;
      }
    });

    branchStocks.forEach(bs => {
      if (bs.deviceId) {
        if (bs.sold > 0) {
          totalSalesMap[bs.deviceId] = Math.max(totalSalesMap[bs.deviceId] || 0, bs.sold);
          const b = bs.branch || 'Tagoloan';
          if (!branchSalesMap[bs.deviceId]) {
            branchSalesMap[bs.deviceId] = {};
          }
          const bMap = branchSalesMap[bs.deviceId]!;
          bMap[b] = Math.max(bMap[b] || 0, bs.sold);
        }
      }
    });

    const sortedSales = Object.entries(totalSalesMap)
      .sort((a, b) => b[1] - a[1]);

    const deviceIds = sortedSales.map(([id]) => id);

    let devices: any[] = [];
    if (deviceIds.length > 0) {
      const dbDevices = await prisma.device.findMany({
        where: {
          id: { in: deviceIds }
        },
        include: { 
          category: true, 
          variations: true,
          branchStocks: true
        }
      });

      devices = dbDevices.sort((a, b) => {
        const aSold = totalSalesMap[a.id] || 0;
        const bSold = totalSalesMap[b.id] || 0;
        return bSold - aSold;
      });
    }

    if (devices.length < 5) {
      const remainingCount = 5 - devices.length;
      const alreadyFetchedIds = devices.map(d => d.id);
      const additionalDevices = await prisma.device.findMany({
        where: {
          id: { notIn: alreadyFetchedIds }
        },
        take: remainingCount,
        include: { 
          category: true, 
          variations: true,
          branchStocks: true
        },
        orderBy: { createdAt: 'desc' }
      });
      devices = [...devices, ...additionalDevices];
    }

    devices = devices.slice(0, 5);

    const enrichedDevices = devices.map((device, index) => {
      // Find which branch sold the most of this device or where it belongs
      const breakdown = branchSalesMap[device.id] || {};
      const topBranchEntry = Object.entries(breakdown).sort((a, b) => b[1] - a[1])[0];
      
      let primaryBranch = topBranchEntry?.[0] || device.branch;
      if (!primaryBranch && device.branchStocks && device.branchStocks.length > 0) {
        const stockMatch = device.branchStocks.find((bs: any) => (bs.stock || 0) > 0);
        primaryBranch = stockMatch?.branch || device.branchStocks[0].branch;
      }
      if (!primaryBranch) primaryBranch = 'Tagoloan';

      const totalStock = device.branchStocks && device.branchStocks.length > 0
        ? device.branchStocks.reduce((sum: number, bs: any) => sum + (bs.stock || 0), 0)
        : device.stock;

      return {
        ...device,
        rank: index + 1,
        unitsSold: totalSalesMap[device.id] || 0,
        selectedBranch: 'All Branches',
        topBranch: primaryBranch,
        branch: primaryBranch,
        branchStockQuantity: totalStock
      };
    });

    return NextResponse.json(enrichedDevices, {
      headers: {
        'Cache-Control': 'no-store, must-revalidate'
      }
    });
  } catch (error) {
    console.error('Error fetching best selling devices:', error);
    return NextResponse.json({ error: 'Failed to fetch best selling devices' }, { status: 500 });
  }
}


