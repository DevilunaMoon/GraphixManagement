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

    // Fetch all purchases with selective columns
    const purchases = await prisma.purchase.findMany({
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

    // Fetch completed repairs (only cost and date needed)
    const repairs = await prisma.repairRequest.findMany({
      where: { status: 'Completed' },
      select: {
        repairCost: true,
        createdAt: true
      }
    });

    // Fetch active repairs for workload (only technician field needed)
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
    let totalRetail = 0;
    let totalRepair = 0;

    let onlineCount = 0;
    let physicalCount = 0;

    const currentYear = now.getFullYear();
    const monthlyData = Array(12).fill(0);

    // Process Purchases (Retail)
    purchases.forEach(p => {
      const amt = p.amount > 0 ? p.amount : (p.device?.price || 0);
      totalRetail += amt;
      
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

    // Process Repairs (Services)
    repairs.forEach(r => {
      if (r.repairCost) {
        // Extract numbers from "₱1,500" or similar strings
        const num = parseFloat(r.repairCost.replace(/[^0-9.]/g, ''));
        if (!isNaN(num)) {
          totalRepair += num;
          
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

    // Calculate Top 5 Products for the CURRENT MONTH
    const currentMonthPurchases = purchases.filter(p => new Date(p.createdAt) >= startOfMonth);
    const productSalesMap: Record<string, { name: string, sold: number }> = {};

    currentMonthPurchases.forEach(p => {
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
