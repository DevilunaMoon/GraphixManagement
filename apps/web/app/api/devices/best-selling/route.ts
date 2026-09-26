import { NextResponse } from 'next/server';
import { prisma } from 'database';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const branchParam = searchParams.get('branch');
    const isSpecificBranch = branchParam && branchParam.toLowerCase() !== 'all';

    // 1. Fetch purchases with optional branch filter
    let purchaseWhere: any = {};
    if (isSpecificBranch) {
      purchaseWhere.branch = {
        equals: branchParam,
        mode: 'insensitive'
      };
    }

    const purchases = await prisma.purchase.findMany({
      where: purchaseWhere,
      select: {
        deviceId: true,
        quantity: true,
        branch: true
      }
    });

    // 2. Fetch branch stocks to include POS / branch-recorded sold units
    let branchStockWhere: any = {};
    if (isSpecificBranch) {
      branchStockWhere.branch = {
        equals: branchParam,
        mode: 'insensitive'
      };
    }

    const branchStocks = await prisma.branchStock.findMany({
      where: branchStockWhere,
      select: {
        deviceId: true,
        sold: true,
        stock: true,
        branch: true
      }
    });

    // 3. Sum total sales for each deviceId
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
          // Add or ensure sold count from POS terminal records
          salesMap[bs.deviceId] = Math.max(salesMap[bs.deviceId] || 0, bs.sold);
        }
        stockMap[bs.deviceId] = (stockMap[bs.deviceId] || 0) + (bs.stock || 0);
      }
    });

    // 4. Sort by total quantity sold descending
    const sortedSales = Object.entries(salesMap)
      .sort((a, b) => b[1] - a[1]);

    const deviceIds = sortedSales.map(([id]) => id);

    let devices: any[] = [];
    if (deviceIds.length > 0) {
      // Find devices that are the best-sellers
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

      // Maintain the sorted order of best selling!
      devices = dbDevices.sort((a, b) => {
        const aSold = salesMap[a.id] || 0;
        const bSold = salesMap[b.id] || 0;
        return bSold - aSold;
      });
    }

    // 5. If we have fewer than 5 best-selling devices for this branch, fill with other available devices
    if (devices.length < 5) {
      const remainingCount = 5 - devices.length;
      
      let additionalWhere: any = {
        id: { notIn: deviceIds }
      };

      if (isSpecificBranch) {
        // Prefer devices assigned to or stocked in this branch
        additionalWhere.OR = [
          { branch: { equals: branchParam, mode: 'insensitive' } },
          { branchStocks: { some: { branch: { equals: branchParam, mode: 'insensitive' }, stock: { gt: 0 } } } }
        ];
      }

      let additionalDevices = await prisma.device.findMany({
        where: additionalWhere,
        take: remainingCount,
        include: { 
          category: true, 
          variations: true,
          branchStocks: true
        },
        orderBy: { createdAt: 'desc' }
      });

      // If still fewer than 5, grab any remaining newest devices
      if (devices.length + additionalDevices.length < 5) {
        const alreadyFetchedIds = [...deviceIds, ...additionalDevices.map(d => d.id)];
        const fallbackDevices = await prisma.device.findMany({
          where: {
            id: { notIn: alreadyFetchedIds }
          },
          take: 5 - (devices.length + additionalDevices.length),
          include: { 
            category: true, 
            variations: true,
            branchStocks: true
          },
          orderBy: { createdAt: 'desc' }
        });
        additionalDevices = [...additionalDevices, ...fallbackDevices];
      }

      devices = [...devices, ...additionalDevices];
    }

    // Limit to 5 best-sellers for crisp display
    devices = devices.slice(0, 5);

    // 6. Enrich devices with computed branch-specific unitsSold and stock status
    const enrichedDevices = devices.map(device => {
      let branchStockQty = device.stock;
      if (isSpecificBranch && device.branchStocks?.length > 0) {
        const match = device.branchStocks.find((bs: any) => 
          bs.branch?.toLowerCase() === branchParam.toLowerCase()
        );
        if (match) {
          branchStockQty = match.stock;
        }
      }

      return {
        ...device,
        unitsSold: salesMap[device.id] || 0,
        selectedBranch: isSpecificBranch ? branchParam : 'All Branches',
        branchStockQuantity: branchStockQty
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

