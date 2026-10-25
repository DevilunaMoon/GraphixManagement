import { NextResponse } from 'next/server';
import { prisma } from 'database';
import { getSession } from '../../../../../lib/session';
import {
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
    const timeframe = (searchParams.get('timeframe') || 'month').toLowerCase(); // 'month' or 'all'

    // Strict branch scoping:
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
    const currentYear = now.getFullYear();
    const currentMonthName = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    const currentMonthShort = now.toLocaleString('en-US', { month: 'short' });

    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // 1. Fetch all repairs matching branch scope
    const allRepairs = await prisma.repairRequest.findMany({
      where: branchWhere,
      include: {
        user: {
          select: { name: true, email: true, phone: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 2. Compute status counts & time metrics
    let allPendingCount = 0;
    let allAcceptedCount = 0;
    let allInProgressCount = 0;
    let allCompletedCount = 0;
    let allCancelledCount = 0;

    let monthNewRequestsCount = 0;
    let monthCompletedCount = 0;
    let monthCancelledCount = 0;
    let monthCarriedOverActiveCount = 0;

    let totalRepairRevenue = 0;
    let todayRevenue = 0;
    let yesterdayRevenue = 0;
    let weeklyRevenue = 0;
    let monthlyRevenue = 0;

    const monthlyActivity = Array(12).fill(0);
    const monthlyRevenueArray = Array(12).fill(0);

    allRepairs.forEach((repair: any) => {
      const normStatus = normalizeRepairStatus(repair.status, repair.progress);
      const createdAt = new Date(repair.createdAt);
      const updatedAt = repair.updatedAt ? new Date(repair.updatedAt) : createdAt;

      const isCreatedThisMonth = createdAt >= startOfMonth && createdAt <= endOfMonth;
      const isCompletedThisMonth = updatedAt >= startOfMonth && updatedAt <= endOfMonth;

      // Active repairs carry over continuously until marked completed
      if (normStatus === 'Pending') {
        allPendingCount++;
        if (createdAt < startOfMonth) monthCarriedOverActiveCount++;
      } else if (normStatus === 'Accepted') {
        allAcceptedCount++;
        if (createdAt < startOfMonth) monthCarriedOverActiveCount++;
      } else if (normStatus === 'In Progress') {
        allInProgressCount++;
        if (createdAt < startOfMonth) monthCarriedOverActiveCount++;
      } else if (normStatus === 'Completed') {
        allCompletedCount++;
        if (isCompletedThisMonth || isCreatedThisMonth) {
          monthCompletedCount++;
        }
      } else if (normStatus === 'Cancelled') {
        allCancelledCount++;
        if (isCreatedThisMonth) {
          monthCancelledCount++;
        }
      }

      if (isCreatedThisMonth) {
        monthNewRequestsCount++;
      }

      if (createdAt.getFullYear() === currentYear) {
        monthlyActivity[createdAt.getMonth()] += 1;
      }

      // Count revenue only for completed repairs
      if (normStatus === 'Completed') {
        const { totalCost } = extractRepairCost(repair);
        if (totalCost > 0) {
          totalRepairRevenue += totalCost;

          if (updatedAt >= startOfToday || createdAt >= startOfToday) todayRevenue += totalCost;
          else if ((updatedAt >= startOfYesterday && updatedAt < startOfToday) || (createdAt >= startOfYesterday && createdAt < startOfToday)) {
            yesterdayRevenue += totalCost;
          }

          if (updatedAt >= startOfWeek || createdAt >= startOfWeek) weeklyRevenue += totalCost;
          if (updatedAt >= startOfMonth || createdAt >= startOfMonth) monthlyRevenue += totalCost;

          const revDate = isCompletedThisMonth ? updatedAt : createdAt;
          if (revDate.getFullYear() === currentYear) {
            monthlyRevenueArray[revDate.getMonth()] += totalCost;
          }
        }
      }
    });

    const isMonthView = timeframe === 'month';
    const activeRequestsTotal = isMonthView ? monthNewRequestsCount : allRepairs.length;
    const activeCompletedCount = isMonthView ? monthCompletedCount : allCompletedCount;
    const activeCancelledCount = isMonthView ? monthCancelledCount : allCancelledCount;
    const activeRevenue = isMonthView ? monthlyRevenue : totalRepairRevenue;

    const chartTotal = isMonthView
      ? (allPendingCount + allAcceptedCount + allInProgressCount + monthCompletedCount + monthCancelledCount)
      : allRepairs.length;

    // 3. Status Distribution with percentages
    const statusDistribution = [
      {
        status: 'Pending',
        label: 'Pending Approval',
        count: allPendingCount,
        percentage: chartTotal > 0 ? Math.round((allPendingCount / chartTotal) * 100) : 0,
        color: '#f59e0b', // Amber
        badgeBg: 'bg-amber-100 text-amber-800 border-amber-200',
      },
      {
        status: 'Accepted',
        label: 'Accepted',
        count: allAcceptedCount,
        percentage: chartTotal > 0 ? Math.round((allAcceptedCount / chartTotal) * 100) : 0,
        color: '#8b5cf6', // Purple
        badgeBg: 'bg-purple-100 text-purple-800 border-purple-200',
      },
      {
        status: 'In Progress',
        label: 'In Progress',
        count: allInProgressCount,
        percentage: chartTotal > 0 ? Math.round((allInProgressCount / chartTotal) * 100) : 0,
        color: '#3b82f6', // Blue
        badgeBg: 'bg-blue-100 text-blue-800 border-blue-200',
      },
      {
        status: 'Completed',
        label: 'Completed',
        count: activeCompletedCount,
        percentage: chartTotal > 0 ? Math.round((activeCompletedCount / chartTotal) * 100) : 0,
        color: '#10b981', // Green
        badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      },
      {
        status: 'Cancelled',
        label: 'Cancelled',
        count: activeCancelledCount,
        percentage: chartTotal > 0 ? Math.round((activeCancelledCount / chartTotal) * 100) : 0,
        color: '#ef4444', // Red
        badgeBg: 'bg-rose-100 text-rose-800 border-rose-200',
      },
    ];

    // 4. Recent Repairs for quick preview list
    const recentRepairs = allRepairs.slice(0, 8).map((r) => {
      const { totalCost } = extractRepairCost(r);
      const normStatus = normalizeRepairStatus(r.status, r.progress);
      return {
        id: r.id,
        deviceName: r.deviceName,
        ownerName: r.ownerName || r.user?.name || 'Walk-In Customer',
        branch: r.branch || 'Tagoloan',
        technician: r.technician || 'Lead Technician',
        progress: r.progress || 'Pending',
        status: normStatus,
        repairCost: totalCost,
        createdAt: r.createdAt,
      };
    });

    // 5. Multi-Branch Performance Comparison (for Super Admin system-wide view)
    let branchComparison: any[] = [];
    if (isSuperAdmin && (!targetBranch || targetBranch === 'all')) {
      const systemBranches = ['Tagoloan', 'Villanueva', 'Jasaan'];
      const stats: Record<string, { branch: string; requests: number; completed: number; inProgress: number; revenue: number }> = {};

      systemBranches.forEach((b) => {
        stats[b] = { branch: b, requests: 0, completed: 0, inProgress: 0, revenue: 0 };
      });

      allRepairs.forEach((r) => {
        const bName = r.branch || 'Tagoloan';
        const matchKey = systemBranches.find((s) => s.toLowerCase() === bName.toLowerCase()) || bName;
        if (!stats[matchKey]) {
          stats[matchKey] = { branch: matchKey, requests: 0, completed: 0, inProgress: 0, revenue: 0 };
        }

        const normStatus = normalizeRepairStatus(r.status, r.progress);
        const createdAt = new Date(r.createdAt);
        const isThisMonth = createdAt >= startOfMonth && createdAt <= endOfMonth;

        if (!isMonthView || isThisMonth) {
          stats[matchKey].requests += 1;
        }

        if (normStatus === 'Completed') {
          if (!isMonthView || isThisMonth) {
            stats[matchKey].completed += 1;
            const { totalCost } = extractRepairCost(r);
            stats[matchKey].revenue += totalCost;
          }
        } else if (normStatus === 'In Progress') {
          stats[matchKey].inProgress += 1;
        }
      });

      branchComparison = systemBranches.map((b) => stats[b] || { branch: b, requests: 0, completed: 0, inProgress: 0, revenue: 0 });
    }

    return NextResponse.json({
      timeframe,
      currentMonthName,
      currentMonthShort,
      summary: {
        totalRequests: activeRequestsTotal,
        pendingRepairs: allPendingCount,
        acceptedRepairs: allAcceptedCount,
        inProgressRepairs: allInProgressCount,
        completedRepairs: activeCompletedCount,
        cancelledRepairs: activeCancelledCount,
        repairRevenue: activeRevenue,
        carriedOverCount: monthCarriedOverActiveCount,
        thisMonthRequestsCount: monthNewRequestsCount,
        thisMonthCompletedCount: monthCompletedCount,
        thisMonthRevenue: monthlyRevenue,
        allTimeRequestsCount: allRepairs.length,
        allTimeCompletedCount: allCompletedCount,
        allTimeRevenue: totalRepairRevenue,
      },
      revenue: {
        today: todayRevenue,
        yesterday: yesterdayRevenue,
        weekly: weeklyRevenue,
        monthly: monthlyRevenue,
        total: totalRepairRevenue,
      },
      monthlyActivity,
      monthlyRevenue: monthlyRevenueArray,
      statusDistribution,
      recentRepairs,
      branchComparison,
      isSuperAdmin,
      assignedBranch: session.branch || 'Tagoloan',
    });
  } catch (error) {
    console.error('Error in repair dashboard API:', error);
    return NextResponse.json({ error: 'Failed to fetch repair dashboard data' }, { status: 500 });
  }
}
