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

    // Fetch all purchases
    const purchases = await prisma.purchase.findMany({
      include: { device: { select: { price: true } } }
    });

    // Fetch completed repairs
    const repairs = await prisma.repairRequest.findMany({
      where: { status: 'Completed' }
    });

    let todaySales = 0;
    let yesterdaySales = 0;
    let weeklySales = 0;
    let monthlySales = 0;
    let totalRetail = 0;
    let totalRepair = 0;

    let onlineCount = 0;
    let physicalCount = 0;

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
        }
      }
    });

    return NextResponse.json({
      sales: {
        today: todaySales,
        yesterday: yesterdaySales,
        weekly: weeklySales,
        monthly: monthlySales
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
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard analytics' }, { status: 500 });
  }
}
