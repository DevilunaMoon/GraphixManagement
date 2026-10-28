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

    // 1. Fetch repairs: Super Admin gets system-wide data for branch supervision; scopedRepairs handles current branch filter
    const allRepairs = await prisma.repairRequest.findMany({
      where: isSuperAdmin ? {} : branchWhere,
      include: {
        user: {
          select: { name: true, email: true, phone: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const scopedRepairs = isSuperAdmin && targetBranch
      ? allRepairs.filter((r) => (r.branch || 'Tagoloan').trim().toLowerCase() === targetBranch.toLowerCase())
      : allRepairs;

    // 2. Compute status counts & time metrics on scopedRepairs
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

    scopedRepairs.forEach((repair: any) => {
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
    const activeRequestsTotal = isMonthView ? monthNewRequestsCount : scopedRepairs.length;
    const activeCompletedCount = isMonthView ? monthCompletedCount : allCompletedCount;
    const activeCancelledCount = isMonthView ? monthCancelledCount : allCancelledCount;
    const activeRevenue = isMonthView ? monthlyRevenue : totalRepairRevenue;

    const chartTotal = isMonthView
      ? (allPendingCount + allAcceptedCount + allInProgressCount + monthCompletedCount + monthCancelledCount)
      : scopedRepairs.length;

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
    const recentRepairs = scopedRepairs.slice(0, 8).map((r) => {
      const { totalCost, downpaymentAmount } = extractRepairCost(r);
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
        downpayment: downpaymentAmount,
        cause: r.cause,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      };
    });

    // 5. Multi-Branch Supervision (Super Admin full control over Tagoloan, Villanueva, Jasaan)
    let branchComparison: any[] = [];
    if (isSuperAdmin) {
      const systemBranches = ['Tagoloan', 'Villanueva', 'Jasaan'];
      const stats: Record<string, {
        branch: string;
        requests: number;
        completed: number;
        completedThisMonth: number;
        inProgress: number;
        diagnostic: number;
        repairing: number;
        pending: number;
        accepted: number;
        needsRepair: number;
        revenue: number;
        monthlyRevenue: number;
        todayRevenue: number;
        allTimeRevenue: number;
        techMap: Record<string, { name: string; activeCount: number; completedCount: number }>;
        activeDevices: any[];
      }> = {};

      systemBranches.forEach((b) => {
        stats[b] = {
          branch: b,
          requests: 0,
          completed: 0,
          completedThisMonth: 0,
          inProgress: 0,
          diagnostic: 0,
          repairing: 0,
          pending: 0,
          accepted: 0,
          needsRepair: 0,
          revenue: 0,
          monthlyRevenue: 0,
          todayRevenue: 0,
          allTimeRevenue: 0,
          techMap: {},
          activeDevices: [],
        };
      });

      allRepairs.forEach((r) => {
        const bName = (r.branch || 'Tagoloan').trim();
        const matchKey = systemBranches.find((s) => s.toLowerCase() === bName.toLowerCase()) || 'Tagoloan';
        if (!stats[matchKey]) {
          stats[matchKey] = {
            branch: matchKey,
            requests: 0,
            completed: 0,
            completedThisMonth: 0,
            inProgress: 0,
            diagnostic: 0,
            repairing: 0,
            pending: 0,
            accepted: 0,
            needsRepair: 0,
            revenue: 0,
            monthlyRevenue: 0,
            todayRevenue: 0,
            allTimeRevenue: 0,
            techMap: {},
            activeDevices: [],
          };
        }

        const normStatus = normalizeRepairStatus(r.status, r.progress);
        const createdAt = new Date(r.createdAt);
        const updatedAt = r.updatedAt ? new Date(r.updatedAt) : createdAt;
        const isCreatedThisMonth = createdAt >= startOfMonth && createdAt <= endOfMonth;
        const isCompletedThisMonth = updatedAt >= startOfMonth && updatedAt <= endOfMonth;
        const { totalCost, downpaymentAmount } = extractRepairCost(r);

        const techName = (r.technician || '').trim() || 'Unassigned Technician';
        if (!stats[matchKey].techMap[techName]) {
          stats[matchKey].techMap[techName] = { name: techName, activeCount: 0, completedCount: 0 };
        }

        if (!isMonthView || isCreatedThisMonth) {
          stats[matchKey].requests += 1;
        }

        const progLower = (r.progress || '').toLowerCase();
        const isDiag = progLower.includes('diag') || progLower === 'accepted';
        const isRep = progLower.includes('repair') || progLower.includes('progress') || progLower.includes('process');

        if (normStatus === 'Completed') {
          stats[matchKey].completed += 1;
          stats[matchKey].allTimeRevenue += totalCost;
          stats[matchKey].techMap[techName].completedCount += 1;

          if (isCompletedThisMonth || isCreatedThisMonth) {
            stats[matchKey].completedThisMonth += 1;
            stats[matchKey].monthlyRevenue += totalCost;
          }
          if (updatedAt >= startOfToday || createdAt >= startOfToday) {
            stats[matchKey].todayRevenue += totalCost;
          }
        } else if (normStatus !== 'Cancelled') {
          // Needs repair (Active workload)
          stats[matchKey].needsRepair += 1;
          stats[matchKey].techMap[techName].activeCount += 1;

          if (isDiag) {
            stats[matchKey].diagnostic += 1;
          } else if (isRep) {
            stats[matchKey].repairing += 1;
          }

          if (normStatus === 'Pending') stats[matchKey].pending += 1;
          else if (normStatus === 'Accepted') stats[matchKey].accepted += 1;
          else if (normStatus === 'In Progress') stats[matchKey].inProgress += 1;

          if (stats[matchKey].activeDevices.length < 20) {
            stats[matchKey].activeDevices.push({
              id: r.id,
              deviceName: r.deviceName,
              ownerName: r.ownerName || r.user?.name || 'Walk-In Customer',
              branch: matchKey,
              technician: techName,
              progress: r.progress || 'Diagnostic',
              status: normStatus,
              cause: r.cause || 'No issue description provided',
              repairCost: totalCost,
              downpayment: downpaymentAmount,
              createdAt: r.createdAt,
              updatedAt: r.updatedAt,
            });
          }
        }
      });

      branchComparison = systemBranches.map((b) => {
        const item = stats[b] || {
          branch: b,
          requests: 0,
          completed: 0,
          completedThisMonth: 0,
          inProgress: 0,
          diagnostic: 0,
          repairing: 0,
          pending: 0,
          accepted: 0,
          needsRepair: 0,
          revenue: 0,
          monthlyRevenue: 0,
          todayRevenue: 0,
          allTimeRevenue: 0,
          techMap: {},
          activeDevices: [],
        };

        const activeRevenueValue = isMonthView ? item.monthlyRevenue : item.allTimeRevenue;
        const totalWork = item.completed + item.needsRepair;
        const completionRate = totalWork > 0 ? Math.round((item.completed / totalWork) * 100) : 0;
        const sortedTechs = Object.values(item.techMap).sort((x, y) => (y.activeCount + y.completedCount) - (x.activeCount + x.completedCount));

        return {
          branch: b,
          requests: item.requests,
          needsRepair: item.needsRepair,
          diagnostic: item.diagnostic,
          repairing: item.repairing,
          pending: item.pending,
          accepted: item.accepted,
          completed: item.completed,
          completedThisMonth: item.completedThisMonth,
          revenue: activeRevenueValue,
          monthlyRevenue: item.monthlyRevenue,
          todayRevenue: item.todayRevenue,
          allTimeRevenue: item.allTimeRevenue,
          completionRate,
          technicians: sortedTechs,
          activeDevices: item.activeDevices,
        };
      });
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
