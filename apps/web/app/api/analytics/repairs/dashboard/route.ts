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

    // Strict branch scoping:
    // Super Admin can view a specific branch or all branches.
    // Branch Admin and Cashier are strictly locked to their assigned branch.
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
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

    // 1. Fetch all repairs matching the query scope
    const allRepairs = await prisma.repairRequest.findMany({
      where: branchWhere,
      include: {
        user: {
          select: { name: true, email: true, phone: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 2. Identify paper receipts to include for Tagoloan / All Branches (avoiding duplicate DB repairIds)
    const dbIds = new Set(allRepairs.map((r) => r.id));
    let matchingPaper = STORE_PAPER_RECEIPTS.filter((p) => !dbIds.has(p.repairId));

    if (targetBranch) {
      const tbLower = targetBranch.toLowerCase();
      matchingPaper = matchingPaper.filter((p) => (p.branch || '').toLowerCase().includes(tbLower));
    }

    // 3. Status Categorization & Counts
    let pendingCount = 0;
    let acceptedCount = 0;
    let inProgressCount = 0;
    let completedCount = 0;
    let cancelledCount = 0;

    let totalRepairRevenue = 0;
    let todayRevenue = 0;
    let yesterdayRevenue = 0;
    let weeklyRevenue = 0;
    let monthlyRevenue = 0;

    const monthlyActivity = Array(12).fill(0);
    const monthlyRevenueArray = Array(12).fill(0);

    allRepairs.forEach((repair) => {
      const normStatus = normalizeRepairStatus(repair.status, repair.progress);
      if (normStatus === 'Pending') pendingCount++;
      else if (normStatus === 'Accepted') acceptedCount++;
      else if (normStatus === 'In Progress') inProgressCount++;
      else if (normStatus === 'Completed') completedCount++;
      else if (normStatus === 'Cancelled') cancelledCount++;

      const createdAt = new Date(repair.createdAt);
      if (createdAt.getFullYear() === currentYear) {
        monthlyActivity[createdAt.getMonth()] += 1;
      }

      // Count revenue only for completed repairs
      if (normStatus === 'Completed') {
        const { totalCost } = extractRepairCost(repair);
        if (totalCost > 0) {
          totalRepairRevenue += totalCost;

          if (createdAt >= startOfToday) todayRevenue += totalCost;
          else if (createdAt >= startOfYesterday && createdAt < startOfToday) yesterdayRevenue += totalCost;

          if (createdAt >= startOfWeek) weeklyRevenue += totalCost;
          if (createdAt >= startOfMonth) monthlyRevenue += totalCost;

          if (createdAt.getFullYear() === currentYear) {
            monthlyRevenueArray[createdAt.getMonth()] += totalCost;
          }
        }
      }
    });

    // Incorporate store paper receipts
    matchingPaper.forEach((p) => {
      completedCount++;
      const createdAt = new Date(p.createdAt);
      const amt = p.amount || 0;
      totalRepairRevenue += amt;

      if (createdAt >= startOfToday) todayRevenue += amt;
      else if (createdAt >= startOfYesterday && createdAt < startOfToday) yesterdayRevenue += amt;

      if (createdAt >= startOfWeek) weeklyRevenue += amt;
      if (createdAt >= startOfMonth) monthlyRevenue += amt;

      if (createdAt.getFullYear() === currentYear) {
        monthlyActivity[createdAt.getMonth()] += 1;
        monthlyRevenueArray[createdAt.getMonth()] += amt;
      }
    });

    const totalRequests = allRepairs.length + matchingPaper.length;

    // 4. Status Distribution with percentages
    const statusDistribution = [
      {
        status: 'Pending',
        label: 'Pending Approval',
        count: pendingCount,
        percentage: totalRequests > 0 ? Math.round((pendingCount / totalRequests) * 100) : 0,
        color: '#f59e0b', // Amber
        badgeBg: 'bg-amber-100 text-amber-800 border-amber-200',
      },
      {
        status: 'Accepted',
        label: 'Accepted',
        count: acceptedCount,
        percentage: totalRequests > 0 ? Math.round((acceptedCount / totalRequests) * 100) : 0,
        color: '#8b5cf6', // Purple
        badgeBg: 'bg-purple-100 text-purple-800 border-purple-200',
      },
      {
        status: 'In Progress',
        label: 'In Progress',
        count: inProgressCount,
        percentage: totalRequests > 0 ? Math.round((inProgressCount / totalRequests) * 100) : 0,
        color: '#3b82f6', // Blue
        badgeBg: 'bg-blue-100 text-blue-800 border-blue-200',
      },
      {
        status: 'Completed',
        label: 'Completed',
        count: completedCount,
        percentage: totalRequests > 0 ? Math.round((completedCount / totalRequests) * 100) : 0,
        color: '#10b981', // Green
        badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      },
      {
        status: 'Cancelled',
        label: 'Cancelled',
        count: cancelledCount,
        percentage: totalRequests > 0 ? Math.round((cancelledCount / totalRequests) * 100) : 0,
        color: '#ef4444', // Red
        badgeBg: 'bg-rose-100 text-rose-800 border-rose-200',
      },
    ];

    // 5. Recent Repairs for quick preview list
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

    // 6. Multi-Branch Performance Comparison (for Super Admin system-wide view)
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

        stats[matchKey].requests += 1;
        const normStatus = normalizeRepairStatus(r.status, r.progress);
        if (normStatus === 'Completed') {
          stats[matchKey].completed += 1;
          const { totalCost } = extractRepairCost(r);
          stats[matchKey].revenue += totalCost;
        } else if (normStatus === 'In Progress') {
          stats[matchKey].inProgress += 1;
        }
      });

      matchingPaper.forEach((p) => {
        const bName = p.branch || 'Tagoloan';
        const matchKey = systemBranches.find((s) => s.toLowerCase() === bName.toLowerCase()) || bName;
        if (!stats[matchKey]) {
          stats[matchKey] = { branch: matchKey, requests: 0, completed: 0, inProgress: 0, revenue: 0 };
        }
        stats[matchKey].requests += 1;
        stats[matchKey].completed += 1;
        stats[matchKey].revenue += p.amount || 0;
      });

      branchComparison = systemBranches.map((b) => stats[b] || { branch: b, requests: 0, completed: 0, inProgress: 0, revenue: 0 });
    }

    return NextResponse.json({
      summary: {
        totalRequests,
        pendingRepairs: pendingCount,
        acceptedRepairs: acceptedCount,
        inProgressRepairs: inProgressCount,
        completedRepairs: completedCount,
        cancelledRepairs: cancelledCount,
        repairRevenue: totalRepairRevenue,
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
