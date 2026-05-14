import { NextResponse } from 'next/server';
import { prisma } from 'database';

export async function GET() {
  try {
    const now = new Date();
    
    // Time period start boundaries
    const currentYearStart = new Date(now.getFullYear(), 0, 1);
    const lastYearStart = new Date(now.getFullYear() - 1, 0, 1);
    const lastYearEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);

    // Fetch all purchases
    const purchases = await prisma.purchase.findMany({
      include: { device: { select: { name: true, price: true } } }
    });

    // Fetch completed repairs
    const repairs = await prisma.repairRequest.findMany({
      where: { status: 'Completed' }
    });

    // Fetch active repairs for workload
    const activeRepairs = await prisma.repairRequest.findMany({
      where: { status: { not: 'Completed' } }
    });

    const pendingRepairs = activeRepairs.length;
    const activeTechnicians = new Set(
      activeRepairs
        .map(r => r.technician)
        .filter(t => t && t.trim() !== '')
    ).size;

    let thisYearSales = 0;
    let lastYearSales = 0;
    let allTimeSales = 0;
    let totalRetail = 0;
    let totalRepair = 0;

    let onlineCount = 0;
    let physicalCount = 0;

    // Process Purchases (Retail)
    purchases.forEach(p => {
      const amt = p.amount > 0 ? p.amount : (p.device?.price || 0);
      totalRetail += amt;
      allTimeSales += amt;
      
      const createdAt = new Date(p.createdAt);

      if (createdAt >= currentYearStart) {
        thisYearSales += amt;
      } else if (createdAt >= lastYearStart && createdAt <= lastYearEnd) {
        lastYearSales += amt;
      }

      // Type checking source (default 'Online' from schema)
      if ((p as any).source === 'In-Store') {
        physicalCount++;
      } else {
        onlineCount++;
      }
    });

    // Process Repairs (Services)
    repairs.forEach(r => {
      if (r.repairCost) {
        const num = parseFloat(r.repairCost.replace(/[^0-9.]/g, ''));
        if (!isNaN(num)) {
          totalRepair += num;
          allTimeSales += num;
          
          const createdAt = new Date(r.createdAt);

          if (createdAt >= currentYearStart) {
            thisYearSales += num;
          } else if (createdAt >= lastYearStart && createdAt <= lastYearEnd) {
            lastYearSales += num;
          }
        }
      }
    });

    // Calculate Top 5 Products for THIS YEAR
    const thisYearPurchases = purchases.filter(p => new Date(p.createdAt) >= currentYearStart);
    const productSalesMap: Record<string, { name: string, sold: number }> = {};

    thisYearPurchases.forEach(p => {
      const id = p.deviceId;
      if (!productSalesMap[id]) {
        productSalesMap[id] = { name: p.device?.name || 'Unknown Device', sold: 0 };
      }
      productSalesMap[id].sold += p.quantity;
    });

    const topProductsThisYear = Object.values(productSalesMap)
      .sort((a, b) => b.sold - a.sold)
      .slice(0, 5);

    return NextResponse.json({
      sales: {
        thisYear: thisYearSales,
        lastYear: lastYearSales,
        allTime: allTimeSales
      },
      transactions: {
        online: onlineCount,
        physical: physicalCount,
        total: onlineCount + physicalCount
      },
      breakdown: {
        retail: totalRetail,
        repair: totalRepair,
        total: totalRetail + totalRepair
      },
      workload: {
        pendingRepairs,
        activeTechnicians
      },
      topProductsThisYear
    });
  } catch (error) {
    console.error('Error fetching all-time analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch all-time analytics' }, { status: 500 });
  }
}
