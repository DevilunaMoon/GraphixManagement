import { NextResponse } from 'next/server';
import { prisma } from 'database';
import { getSession } from '../../../../../lib/session';
import {
  STORE_PAPER_RECEIPTS,
  extractRepairCost,
  normalizeRepairStatus,
} from '../../../../../lib/repairAnalyticsHelper';

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
    const dateFilter = searchParams.get('dateFilter') || 'year';
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    // Strict branch scoping
    let targetBranch: string | null = null;
    if (isSuperAdmin) {
      if (branchQuery && branchQuery.toLowerCase() !== 'all') {
        targetBranch = branchQuery.trim();
      }
    } else {
      targetBranch = (session.branch || 'Tagoloan').trim();
    }

    const branchWhere: any = isSuperAdmin
      ? targetBranch
        ? { branch: { equals: targetBranch, mode: 'insensitive' as const } }
        : {}
      : { branch: { equals: targetBranch, mode: 'insensitive' as const } };

    const now = new Date();
    const currentYearStart = new Date(now.getFullYear(), 0, 1);
    const lastYearStart = new Date(now.getFullYear() - 1, 0, 1);
    const lastYearEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);

    // Calculate dynamic filter boundaries for period metrics
    let filterStart: Date | null = null;
    let filterEnd: Date | null = null;

    if (dateFilter === 'today') {
      filterStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      filterEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (dateFilter === 'week') {
      const dayOfWeek = now.getDay();
      filterStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek, 0, 0, 0, 0);
      filterEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (6 - dayOfWeek), 23, 59, 59, 999);
    } else if (dateFilter === 'month') {
      filterStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      filterEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (dateFilter === 'year') {
      filterStart = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      filterEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    } else if (dateFilter === 'custom' && startDateParam && endDateParam) {
      const s = new Date(startDateParam);
      s.setHours(0, 0, 0, 0);
      const e = new Date(endDateParam);
      e.setHours(23, 59, 59, 999);
      if (!isNaN(s.getTime()) && !isNaN(e.getTime())) {
        filterStart = s;
        filterEnd = e;
      }
    }

    // 1. Fetch all repairs for all-time stats & year-over-year
    const allRepairs = await prisma.repairRequest.findMany({
      where: branchWhere,
      include: {
        user: { select: { name: true, email: true, phone: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 2. Identify paper receipts
    const dbIds = new Set(allRepairs.map((r) => r.id));
    let matchingPaper = STORE_PAPER_RECEIPTS.filter((p) => !dbIds.has(p.repairId));
    if (targetBranch) {
      const tbLower = targetBranch.toLowerCase();
      matchingPaper = matchingPaper.filter((p) => (p.branch || '').toLowerCase().includes(tbLower));
    }

    // 3. Compute All-Time, This Year, Last Year Repair Revenue
    let allTimeRevenue = 0;
    let thisYearRevenue = 0;
    let lastYearRevenue = 0;

    allRepairs.forEach((r) => {
      const normStatus = normalizeRepairStatus(r.status, r.progress);
      if (normStatus === 'Completed') {
        const { totalCost } = extractRepairCost(r);
        if (totalCost > 0) {
          allTimeRevenue += totalCost;
          const createdAt = new Date(r.createdAt);
          if (createdAt >= currentYearStart) {
            thisYearRevenue += totalCost;
          } else if (createdAt >= lastYearStart && createdAt <= lastYearEnd) {
            lastYearRevenue += totalCost;
          }
        }
      }
    });

    matchingPaper.forEach((p) => {
      const amt = p.amount || 0;
      allTimeRevenue += amt;
      const createdAt = new Date(p.createdAt);
      if (createdAt >= currentYearStart) {
        thisYearRevenue += amt;
      } else if (createdAt >= lastYearStart && createdAt <= lastYearEnd) {
        lastYearRevenue += amt;
      }
    });

    // 4. Filtered Period Metrics
    const isWithinFilter = (d: Date) => {
      if (filterStart && d < filterStart) return false;
      if (filterEnd && d > filterEnd) return false;
      return true;
    };

    let periodRequests = 0;
    let periodPending = 0;
    let periodAccepted = 0;
    let periodInProgress = 0;
    let periodCompleted = 0;
    let periodCancelled = 0;
    let periodRevenue = 0;

    let cashAmount = 0;
    let cashCount = 0;
    let gcashAmount = 0;
    let gcashCount = 0;

    allRepairs.forEach((r) => {
      const createdAt = new Date(r.createdAt);
      if (!isWithinFilter(createdAt)) return;

      periodRequests++;
      const normStatus = normalizeRepairStatus(r.status, r.progress);
      if (normStatus === 'Pending') periodPending++;
      else if (normStatus === 'Accepted') periodAccepted++;
      else if (normStatus === 'In Progress') periodInProgress++;
      else if (normStatus === 'Completed') {
        periodCompleted++;
        const { totalCost, downpaymentAmount } = extractRepairCost(r);
        if (totalCost > 0) {
          periodRevenue += totalCost;
          cashAmount += totalCost;
          cashCount++;
        }
      } else if (normStatus === 'Cancelled') {
        periodCancelled++;
      }
    });

    matchingPaper.forEach((p) => {
      const createdAt = new Date(p.createdAt);
      if (!isWithinFilter(createdAt)) return;

      periodRequests++;
      periodCompleted++;
      const amt = p.amount || 0;
      periodRevenue += amt;

      const pType = (p.paymentType || '').toLowerCase();
      if (pType.includes('gcash')) {
        gcashAmount += amt;
        gcashCount++;
      } else {
        cashAmount += amt;
        cashCount++;
      }
    });

    // 5. Status Distribution for Period
    const statusDistribution = [
      {
        status: 'Pending',
        label: 'Pending Approval',
        count: periodPending,
        percentage: periodRequests > 0 ? Math.round((periodPending / periodRequests) * 100) : 0,
        color: '#f59e0b',
        badgeBg: 'bg-amber-100 text-amber-800 border-amber-200',
      },
      {
        status: 'Accepted',
        label: 'Accepted',
        count: periodAccepted,
        percentage: periodRequests > 0 ? Math.round((periodAccepted / periodRequests) * 100) : 0,
        color: '#8b5cf6',
        badgeBg: 'bg-purple-100 text-purple-800 border-purple-200',
      },
      {
        status: 'In Progress',
        label: 'In Progress',
        count: periodInProgress,
        percentage: periodRequests > 0 ? Math.round((periodInProgress / periodRequests) * 100) : 0,
        color: '#3b82f6',
        badgeBg: 'bg-blue-100 text-blue-800 border-blue-200',
      },
      {
        status: 'Completed',
        label: 'Completed',
        count: periodCompleted,
        percentage: periodRequests > 0 ? Math.round((periodCompleted / periodRequests) * 100) : 0,
        color: '#10b981',
        badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      },
      {
        status: 'Cancelled',
        label: 'Cancelled',
        count: periodCancelled,
        percentage: periodRequests > 0 ? Math.round((periodCancelled / periodRequests) * 100) : 0,
        color: '#ef4444',
        badgeBg: 'bg-rose-100 text-rose-800 border-rose-200',
      },
    ];

    // 6. Branch Performance (for Super Admin & Branch Admin)
    const systemBranches = ['Tagoloan', 'Villanueva', 'Jasaan'];
    let branchPerformance: Array<{ branch: string; revenue: number; requests: number; completed: number }> = [];

    if (isSuperAdmin) {
      if (targetBranch) {
        let bRev = 0;
        let bReq = 0;
        let bComp = 0;

        allRepairs.forEach((r) => {
          if ((r.branch || 'Tagoloan').toLowerCase() !== targetBranch?.toLowerCase()) return;
          if (!isWithinFilter(new Date(r.createdAt))) return;
          bReq++;
          const normStatus = normalizeRepairStatus(r.status, r.progress);
          if (normStatus === 'Completed') {
            bComp++;
            const { totalCost } = extractRepairCost(r);
            bRev += totalCost;
          }
        });

        matchingPaper.forEach((p) => {
          if ((p.branch || 'Tagoloan').toLowerCase() !== targetBranch?.toLowerCase()) return;
          if (!isWithinFilter(new Date(p.createdAt))) return;
          bReq++;
          bComp++;
          bRev += p.amount || 0;
        });

        branchPerformance = [{ branch: targetBranch, revenue: bRev, requests: bReq, completed: bComp }];
      } else {
        branchPerformance = systemBranches.map((bName) => {
          let bRev = 0;
          let bReq = 0;
          let bComp = 0;

          allRepairs.forEach((r) => {
            if ((r.branch || 'Tagoloan').toLowerCase() !== bName.toLowerCase()) return;
            if (!isWithinFilter(new Date(r.createdAt))) return;
            bReq++;
            const normStatus = normalizeRepairStatus(r.status, r.progress);
            if (normStatus === 'Completed') {
              bComp++;
              const { totalCost } = extractRepairCost(r);
              bRev += totalCost;
            }
          });

          matchingPaper.forEach((p) => {
            if ((p.branch || 'Tagoloan').toLowerCase() !== bName.toLowerCase()) return;
            if (!isWithinFilter(new Date(p.createdAt))) return;
            bReq++;
            bComp++;
            bRev += p.amount || 0;
          });

          return { branch: bName, revenue: bRev, requests: bReq, completed: bComp };
        });
      }
    } else {
      const assignedBranch = (session.branch || 'Tagoloan').trim();
      let bRev = 0;
      let bReq = 0;
      let bComp = 0;

      allRepairs.forEach((r) => {
        if ((r.branch || 'Tagoloan').toLowerCase() !== assignedBranch.toLowerCase()) return;
        if (!isWithinFilter(new Date(r.createdAt))) return;
        bReq++;
        const normStatus = normalizeRepairStatus(r.status, r.progress);
        if (normStatus === 'Completed') {
          bComp++;
          const { totalCost } = extractRepairCost(r);
          bRev += totalCost;
        }
      });

      matchingPaper.forEach((p) => {
        if ((p.branch || 'Tagoloan').toLowerCase() !== assignedBranch.toLowerCase()) return;
        if (!isWithinFilter(new Date(p.createdAt))) return;
        bReq++;
        bComp++;
        bRev += p.amount || 0;
      });

      branchPerformance = [{ branch: assignedBranch, revenue: bRev, requests: bReq, completed: bComp }];
    }

    // 7. Year-Over-Year / Monthly Activity for charts
    const monthlyActivity = Array(12).fill(0);
    const monthlyRevenueArray = Array(12).fill(0);
    const currentYear = now.getFullYear();

    allRepairs.forEach((r) => {
      const createdAt = new Date(r.createdAt);
      if (createdAt.getFullYear() === currentYear) {
        monthlyActivity[createdAt.getMonth()] += 1;
        const normStatus = normalizeRepairStatus(r.status, r.progress);
        if (normStatus === 'Completed') {
          const { totalCost } = extractRepairCost(r);
          monthlyRevenueArray[createdAt.getMonth()] += totalCost;
        }
      }
    });

    matchingPaper.forEach((p) => {
      const createdAt = new Date(p.createdAt);
      if (createdAt.getFullYear() === currentYear) {
        monthlyActivity[createdAt.getMonth()] += 1;
        monthlyRevenueArray[createdAt.getMonth()] += p.amount || 0;
      }
    });

    return NextResponse.json({
      revenue: {
        thisYear: thisYearRevenue,
        lastYear: lastYearRevenue,
        allTime: allTimeRevenue,
        periodRevenue,
      },
      summary: {
        totalRequests: periodRequests,
        pendingRepairs: periodPending,
        acceptedRepairs: periodAccepted,
        inProgressRepairs: periodInProgress,
        completedRepairs: periodCompleted,
        cancelledRepairs: periodCancelled,
        repairRevenue: periodRevenue,
      },
      paymentMethods: {
        cash: { totalAmount: cashAmount, transactionCount: cashCount },
        gcash: { totalAmount: gcashAmount, transactionCount: gcashCount },
        totalAmount: cashAmount + gcashAmount,
        totalTransactions: cashCount + gcashCount,
      },
      statusDistribution,
      branchPerformance,
      monthlyActivity,
      monthlyRevenue: monthlyRevenueArray,
      isSuperAdmin,
      assignedBranch: session.branch || 'Tagoloan',
    });
  } catch (error) {
    console.error('Error in repair analytics API:', error);
    return NextResponse.json({ error: 'Failed to fetch repair analytics data' }, { status: 500 });
  }
}
