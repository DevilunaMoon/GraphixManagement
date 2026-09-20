import { NextResponse } from 'next/server';
import { prisma } from 'database';
import { getSession } from '../../../../lib/session';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'SUPER_ADMIN' && session.role !== 'ADMIN' && session.role !== 'CASHIER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isSuperAdmin = session.role === 'SUPER_ADMIN';

    const { searchParams } = new URL(req.url);
    const branchQuery = searchParams.get('branch');

    // Strict branch scoping:
    // Super Admin can view specific branch or all branches.
    // Branch Admin / Cashier are strictly locked to their assigned branch.
    let targetBranch: string | null = null;
    if (isSuperAdmin) {
      if (branchQuery && branchQuery !== 'all') {
        targetBranch = branchQuery.trim();
      }
    } else {
      targetBranch = (session.branch || 'Tagoloan').trim();
    }

    const branchWhere: any = targetBranch ? { branch: { equals: targetBranch, mode: 'insensitive' as const } } : {};

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentYear = now.getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);

    // Only count completed/successful/paid transactions (exclude cancelled/voided/unpaid)
    const validPurchasesWhere: any = {
      ...branchWhere,
      status: { notIn: ['Cancelled', 'Voided', 'Failed', 'Unpaid', 'Pending Pickup'] }
    };

    // 1. Fetch all valid purchases for the branch/system
    const allPurchases = await prisma.purchase.findMany({
      where: validPurchasesWhere,
      select: {
        id: true,
        amount: true,
        createdAt: true,
        source: true,
        deviceId: true,
        quantity: true,
        branch: true,
        status: true,
        device: {
          select: {
            name: true,
            price: true
          }
        }
      }
    });

    // 2. Fetch all completed repairs
    const allTimeRepairs = await prisma.repairRequest.findMany({
      where: { 
        ...branchWhere, 
        status: { equals: 'Completed', mode: 'insensitive' } 
      },
      select: { 
        id: true,
        repairCost: true, 
        createdAt: true,
        branch: true 
      }
    });

    // 3. Active repairs for workload stats
    const activeRepairs = await prisma.repairRequest.findMany({
      where: { 
        ...branchWhere, 
        status: { notIn: ['Completed', 'completed', 'Cancelled', 'cancelled'] } 
      },
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
    let totalRetail = 0;
    let totalRepair = 0;

    let onlineCount = 0;
    let physicalCount = 0;

    const monthlyData = Array(12).fill(0);

    allPurchases.forEach(p => {
      const amt = p.amount || 0;
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

      const src = (p.source || '').toLowerCase();
      if (src.includes('in-store') || src.includes('pos')) {
        physicalCount++;
      } else {
        onlineCount++;
      }
    });

    allTimeRepairs.forEach(r => {
      if (r.repairCost) {
        const num = parseFloat(r.repairCost.replace(/[^0-9.]/g, ''));
        if (!isNaN(num)) {
          totalRepair += num;
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

    // Yearly Best Sellers (Top 5 Products based on completed purchases for current year, or all time)
    const currentYearPurchases = allPurchases.filter(p => new Date(p.createdAt) >= startOfYear);
    const targetPurchases = currentYearPurchases.length > 0 ? currentYearPurchases : allPurchases;

    const productSalesMap: Record<string, { name: string, sold: number }> = {};
    targetPurchases.forEach(p => {
      const id = p.deviceId;
      if (!productSalesMap[id]) {
        productSalesMap[id] = { name: p.device?.name || 'Unknown Device', sold: 0 };
      }
      productSalesMap[id].sold += (p.quantity || 1);
    });

    const topProducts = Object.values(productSalesMap)
      .sort((a, b) => b.sold - a.sold)
      .slice(0, 5);

    // Centralized Inventory & Units Statistics
    const totalUnitsSold = allPurchases.reduce((sum, p) => sum + (p.quantity || 1), 0);
    const totalOrders = allPurchases.length;

    const inventoryWhere: any = targetBranch ? { branch: { equals: targetBranch, mode: 'insensitive' as const } } : {};
    const [inventoryAggregate, lowStockCount, activeUsers] = await Promise.all([
      prisma.branchStock.aggregate({
        where: inventoryWhere,
        _sum: { stock: true }
      }),
      prisma.branchStock.count({
        where: {
          ...inventoryWhere,
          stock: { gt: 0, lt: 5 }
        }
      }),
      prisma.user.count({
        where: {
          status: { notIn: ['Inactive', 'Suspended'] },
          ...(targetBranch ? { OR: [{ branch: { equals: targetBranch, mode: 'insensitive' as const } }, { role: 'CUSTOMER' }] } : {})
        }
      })
    ]);

    const totalInventory = inventoryAggregate._sum.stock || 0;

    // Multi-branch comparison if Super Admin and viewing all branches
    let branchComparison: any[] = [];
    if (isSuperAdmin && (!targetBranch || targetBranch === 'all')) {
      const systemBranches = ['Tagoloan', 'Villanueva', 'Jasaan'];
      const branchStats: Record<string, { branch: string, revenue: number, unitsSold: number, transactions: number }> = {};
      
      systemBranches.forEach(b => {
        branchStats[b] = { branch: b, revenue: 0, unitsSold: 0, transactions: 0 };
      });

      allPurchases.forEach(p => {
        const bName = p.branch || 'Tagoloan';
        const matchKey = systemBranches.find(s => s.toLowerCase() === bName.toLowerCase()) || bName;
        if (!branchStats[matchKey]) {
          branchStats[matchKey] = { branch: matchKey, revenue: 0, unitsSold: 0, transactions: 0 };
        }
        const amt = p.amount || 0;
        branchStats[matchKey].revenue += amt;
        branchStats[matchKey].unitsSold += (p.quantity || 1);
        branchStats[matchKey].transactions += 1;
      });

      allTimeRepairs.forEach(r => {
        const bName = r.branch || 'Tagoloan';
        const matchKey = systemBranches.find(s => s.toLowerCase() === bName.toLowerCase()) || bName;
        if (!branchStats[matchKey]) {
          branchStats[matchKey] = { branch: matchKey, revenue: 0, unitsSold: 0, transactions: 0 };
        }
        if (r.repairCost) {
          const num = parseFloat(r.repairCost.replace(/[^0-9.]/g, ''));
          if (!isNaN(num)) {
            branchStats[matchKey].revenue += num;
            branchStats[matchKey].transactions += 1;
          }
        }
      });

      branchComparison = systemBranches.map(b => branchStats[b] || { branch: b, revenue: 0, unitsSold: 0, transactions: 0 });
    }

    return NextResponse.json({
      summary: {
        totalSales: totalRetail + totalRepair,
        totalUnitsSold,
        totalOrders,
        totalInventory,
        lowStockProducts: lowStockCount,
        activeUsers
      },
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
        total: totalOrders
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
      branchComparison,
      isSuperAdmin,
      assignedBranch: session.branch || 'Tagoloan'
    });
  } catch (error) {
    console.error('Error fetching dashboard analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard analytics' }, { status: 500 });
  }
}
