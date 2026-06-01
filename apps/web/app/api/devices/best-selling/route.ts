import { NextResponse } from 'next/server';
import { prisma } from 'database';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Fetch purchases to group device counts
    const purchases = await prisma.purchase.findMany({
      select: {
        deviceId: true,
        quantity: true,
      }
    });

    // 2. Sum the quantities for each deviceId
    const salesMap: Record<string, number> = {};
    purchases.forEach(p => {
      if (p.deviceId) {
        salesMap[p.deviceId] = (salesMap[p.deviceId] || 0) + (p.quantity || 1);
      }
    });

    // 3. Sort by total quantity sold descending
    const sortedSales = Object.entries(salesMap)
      .sort((a, b) => b[1] - a[1]);

    // 4. Fetch the devices matching these IDs
    const deviceIds = sortedSales.map(([id]) => id);

    let devices: any[] = [];
    if (deviceIds.length > 0) {
      // Find devices that are the best-sellers
      const dbDevices = await prisma.device.findMany({
        where: {
          id: { in: deviceIds }
        },
        include: { category: true, variations: true }
      });

      // Maintain the sorted order of best selling!
      devices = dbDevices.sort((a, b) => {
        const aSold = salesMap[a.id] || 0;
        const bSold = salesMap[b.id] || 0;
        return bSold - aSold;
      });
    }

    // If we have fewer than 5 best-selling devices, fill the remaining slots with the newest devices
    if (devices.length < 5) {
      const remainingCount = 5 - devices.length;
      const additionalDevices = await prisma.device.findMany({
        where: {
          id: { notIn: deviceIds }
        },
        take: remainingCount,
        include: { category: true, variations: true },
        orderBy: { createdAt: 'desc' }
      });
      devices = [...devices, ...additionalDevices];
    }

    // Limit to 5 best-sellers
    devices = devices.slice(0, 5);

    return NextResponse.json(devices, {
      headers: {
        'Cache-Control': 'no-store, must-revalidate'
      }
    });
  } catch (error) {
    console.error('Error fetching best selling devices:', error);
    return NextResponse.json({ error: 'Failed to fetch best selling devices' }, { status: 500 });
  }
}
