import { NextResponse } from 'next/server';
import { prisma } from 'database';

export async function GET() {
  try {
    const now = new Date();
    
    // Time period start boundaries
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);
    
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Sunday as start
    
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // 1. Calculate Total Retail of All Time using SQL aggregate (0 row load in server memory!)
    const totalRetailAggregate = await prisma.purchase.aggregate({
      _sum: {
        amount: true
      }
    });
    const totalRetailAllTime = totalRetailAggregate._sum.amount || 0;

    // 2. Fetch only current year's purchases to process daily/weekly/monthly statistics and top products
    const currentYear = now.getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);

    const purchases = await prisma.purchase.findMany({
      where: {
        createdAt: { gte: startOfYear }
      },
      select: {
        amount: true,
        createdAt: true,
        source: true,
        deviceId: true,
        quantity: true,
        device: {
          select: {
            name: true,
            price: true
          }
        }
      }
    });

    // 3. Fetch completed repairs for the current year
    const repairs = await prisma.repairRequest.findMany({
      where: { 
        status: 'Completed',
        createdAt: { gte: startOfYear }
      },
      select: {
        repairCost: true,
        createdAt: true
      }
    });

    // 4. Fetch all-time completed repairs selecting ONLY the cost to sum all-time without loading heavy data
    const allTimeRepairs = await prisma.repairRequest.findMany({
      where: { status: 'Completed' },
      select: {
        repairCost: true
      }
    });

    // 5. Fetch active repairs (only technician is needed)
    const activeRepairs = await prisma.repairRequest.findMany({
      where: { status: { not: 'Completed' } },
      select: {
        technician: true
      }
    });

    const pendingRepairs = activeRepairs.length;
    const activeTechnicians = new Set(
      activeRepairs
        .map(r => r.technician)
        .filter(t => t && t.trim() !== '')
    ).size;

    let todaySales = 0;
    let yesterdaySales = 0;
    let weeklySales = 0;
    let monthlySales = 0;
    let totalRetail = totalRetailAllTime;
    let totalRepair = 0;

    let onlineCount = 0;
    let physicalCount = 0;

    const monthlyData = Array(12).fill(0);

    // Process Purchases (Retail)
    purchases.forEach(p => {
      const amt = p.amount > 0 ? p.amount : (p.device?.price || 0);
      
      const createdAt = new Date(p.createdAt);

      if (createdAt >= startOfToday) {
        todaySales += amt;
      } else if (createdAt >= startOfYesterday) {
        yesterdaySales += amt;
      }

      if (createdAt >= startOfWeek) weeklySales += amt;
      if (createdAt >= startOfMonth) monthlySales += amt;

      if (createdAt.getFullYear() === currentYear) {
        monthlyData[createdAt.getMonth()] += amt;
      }

      // Type checking source (default 'Online' from schema)
      if ((p as any).source === 'In-Store') {
        physicalCount++;
      } else {
        onlineCount++;
      }
    });

    // Calculate all-time repair sales
    allTimeRepairs.forEach(r => {
      if (r.repairCost) {
        const num = parseFloat(r.repairCost.replace(/[^0-9.]/g, ''));
        if (!isNaN(num)) {
          totalRepair += num;
        }
      }
    });

    // Process current year Repairs for daily/weekly/monthly trends and charts
    repairs.forEach(r => {
      if (r.repairCost) {
        // Extract numbers from "₱1,500" or similar strings
        const num = parseFloat(r.repairCost.replace(/[^0-9.]/g, ''));
        if (!isNaN(num)) {
          const createdAt = new Date(r.createdAt);

          if (createdAt >= startOfToday) {
            todaySales += num;
          } else if (createdAt >= startOfYesterday) {
            yesterdaySales += num;
          }

          if (createdAt >= startOfWeek) weeklySales += num;
          if (createdAt >= startOfMonth) monthlySales += num;

          if (createdAt.getFullYear() === currentYear) {
            monthlyData[createdAt.getMonth()] += num;
          }
        }
      }
    });

    // Calculate Top 5 Products for the CURRENT MONTH (with fallback to current year)
    let targetPurchases = purchases.filter(p => new Date(p.createdAt) >= startOfMonth);
    if (targetPurchases.length === 0) {
      targetPurchases = purchases; // Fallback to current year purchases
    }
    const productSalesMap: Record<string, { name: string, sold: number }> = {};

    targetPurchases.forEach(p => {
      const id = p.deviceId;
      if (!productSalesMap[id]) {
        productSalesMap[id] = { name: p.device?.name || 'Unknown Device', sold: 0 };
      }
      productSalesMap[id].sold += p.quantity;
    });

    const topProducts = Object.values(productSalesMap)
      .sort((a, b) => b.sold - a.sold)
      .slice(0, 5);

    return NextResponse.json({
      sales: {
        today: todaySales,
        yesterday: yesterdaySales,
        weekly: weeklySales,
        monthly: monthlySales
      },
      salesGrowth: monthlyData,
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
      topProducts
    });
  } catch (error) {
    console.error('Error fetching dashboard analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard analytics' }, { status: 500 });
  }
}
