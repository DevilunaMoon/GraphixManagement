import { NextResponse } from 'next/server';
import { prisma } from 'database';
import { getSession } from '../../../../lib/session';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = await getSession();
    const isSuperAdmin = session?.role === 'SUPER_ADMIN';

    const { searchParams } = new URL(req.url);
    const branchQuery = searchParams.get('branch');

    // Branch scoping
    let targetBranch: string | null = null;
    if (isSuperAdmin) {
      if (branchQuery && branchQuery !== 'all') {
        targetBranch = branchQuery;
      }
    } else {
      targetBranch = session?.branch || 'Tagoloan';
    }

    const branchWhere = targetBranch ? { branch: targetBranch } : {};

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentYear = now.getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);

    // 1. Total Retail of All Time
    const totalRetailAggregate = await prisma.purchase.aggregate({
      where: branchWhere,
      _sum: { amount: true }
    });
    const totalRetailAllTime = totalRetailAggregate._sum.amount || 0;

    // 2. Fetch purchases
    const purchases = await prisma.purchase.findMany({
      where: {
        ...branchWhere,
        createdAt: { gte: startOfYear }
      },
      select: {
        amount: true,
        createdAt: true,
        source: true,
        deviceId: true,
        quantity: true,
        branch: true,
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
        ...branchWhere,
        status: 'Completed',
        createdAt: { gte: startOfYear }
      },
      select: {
        repairCost: true,
        createdAt: true,
        branch: true
      }
    });

    // 4. All-time completed repairs
    const allTimeRepairs = await prisma.repairRequest.findMany({
      where: { ...branchWhere, status: 'Completed' },
      select: { repairCost: true, branch: true }
    });

    // 5. Active repairs
    const activeRepairs = await prisma.repairRequest.findMany({
      where: { ...branchWhere, status: { not: 'Completed' } },
      select: { technician: true }
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

      if ((p as any).source === 'In-Store') {
        physicalCount++;
      } else {
        onlineCount++;
      }
    });

    allTimeRepairs.forEach(r => {
      if (r.repairCost) {
        const num = parseFloat(r.repairCost.replace(/[^0-9.]/g, ''));
        if (!isNaN(num)) totalRepair += num;
      }
    });

    repairs.forEach(r => {
      if (r.repairCost) {
        const num = parseFloat(r.repairCost.replace(/[^0-9.]/g, ''));
        if (!isNaN(num)) {
          const createdAt = new Date(r.createdAt);
          if (createdAt >= startOfToday) todaySales += num;
          else if (createdAt >= startOfYesterday) yesterdaySales += num;

          if (createdAt >= startOfWeek) weeklySales += num;
          if (createdAt >= startOfMonth) monthlySales += num;

          if (createdAt.getFullYear() === currentYear) {
            monthlyData[createdAt.getMonth()] += num;
          }
        }
      }
    });

    // Top 5 Products
    let targetPurchases = purchases.filter(p => new Date(p.createdAt) >= startOfMonth);
    if (targetPurchases.length === 0) {
      targetPurchases = purchases;
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

    // Multi-branch comparison if Super Admin and viewing all branches
    let branchComparison: any[] = [];
    if (isSuperAdmin && (!targetBranch || targetBranch === 'all')) {
      const allBranches = await prisma.branch.findMany({ select: { name: true } });
      const branchStats: Record<string, { branch: string, revenue: number, unitsSold: number, transactions: number }> = {};
      
      allBranches.forEach(b => {
        branchStats[b.name] = { branch: b.name, revenue: 0, unitsSold: 0, transactions: 0 };
      });

      purchases.forEach(p => {
        const bName = p.branch || 'Tagoloan';
        if (!branchStats[bName]) {
          branchStats[bName] = { branch: bName, revenue: 0, unitsSold: 0, transactions: 0 };
        }
        const amt = p.amount > 0 ? p.amount : (p.device?.price || 0);
        branchStats[bName].revenue += amt;
        branchStats[bName].unitsSold += p.quantity;
        branchStats[bName].transactions += 1;
      });

      branchComparison = Object.values(branchStats);
    }

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
      topProducts,
      branchComparison
    });
  } catch (error) {
    console.error('Error fetching dashboard analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard analytics' }, { status: 500 });
  }
}
