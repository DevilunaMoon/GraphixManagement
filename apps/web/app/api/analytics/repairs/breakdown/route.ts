import { NextResponse } from 'next/server';
import { prisma } from 'database';
import { getSession } from '../../../../../lib/session';
import { computeAnalyticsDateRanges } from '../../../../../lib/analyticsDateRange';
import {
  STORE_PAPER_RECEIPTS,
  extractRepairCost,
  normalizeRepairStatus,
  NormalizedRepairStatus,
} from '../../../../../lib/repairAnalyticsHelper';
import { formatRepairReceiptId, getRepairBranchCode } from '../../../../../lib/invoice';

export const dynamic = 'force-dynamic';

const DEFAULT_BRANCHES = ['Tagoloan', 'Villanueva', 'Jasaan'];

interface UnifiedRepairRecord {
  id: string;
  referenceId: string;
  createdAt: string;
  monthKey: string;
  monthLabel: string;
  deviceName: string;
  cause: string;
  technician: string;
  customerName: string;
  customerEmail: string | null;
  branch: string;
  branchAddress: string;
  status: NormalizedRepairStatus;
  paymentMethod: 'Cash' | 'GCash';
  amount: number;
  downpayment: number;
  isPaperReceipt: boolean;
}

export async function GET(req: Request): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (
      !session ||
      (session.role !== 'SUPER_ADMIN' && session.role !== 'ADMIN' && session.role !== 'CASHIER')
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isSuperAdmin = session.role === 'SUPER_ADMIN';
    const assignedBranch = (session.branch || 'Tagoloan').trim();

    const { searchParams } = new URL(req.url);
    const scope = (searchParams.get('scope') || 'period_revenue') as
      | 'period_revenue'
      | 'completed'
      | 'all_requests'
      | 'all_time';
    const dateFilter = searchParams.get('dateFilter') || 'year';
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const branchQuery = searchParams.get('branch');

    // Optional record-level filters
    const search = (searchParams.get('search') || '').trim().toLowerCase();
    const statusFilter = (searchParams.get('status') || 'all').toLowerCase();
    const paymentMethodFilter = (searchParams.get('paymentMethod') || 'all').toLowerCase();
    const monthFilter = (searchParams.get('month') || 'all').trim();
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(100, Math.max(10, parseInt(searchParams.get('limit') || '25', 10) || 25));

    // Strict server-side RBAC branch scoping
    let targetBranch: string | null = null;
    if (isSuperAdmin) {
      if (branchQuery && branchQuery.toLowerCase() !== 'all' && branchQuery !== 'All Branches') {
        targetBranch = branchQuery.trim();
      }
    } else {
      targetBranch = assignedBranch;
    }

    // Branch directory for location metadata
    const dbBranches = await prisma.branch.findMany({
      select: { name: true, address: true, status: true },
      orderBy: { name: 'asc' },
    });

    const branchAddressMap: Record<string, string> = {};
    const knownBranchNames: string[] = [];
    dbBranches.forEach((b) => {
      branchAddressMap[b.name.toLowerCase()] = b.address || `${b.name} Branch`;
      knownBranchNames.push(b.name);
    });
    DEFAULT_BRANCHES.forEach((b) => {
      if (!knownBranchNames.some((k) => k.toLowerCase() === b.toLowerCase())) {
        knownBranchNames.push(b);
      }
      if (!branchAddressMap[b.toLowerCase()]) {
        branchAddressMap[b.toLowerCase()] = `${b} Branch`;
      }
    });

    const canonicalBranchName = (raw?: string | null): string => {
      const cleaned = (raw || 'Tagoloan').trim();
      const matched = knownBranchNames.find((b) => b.toLowerCase() === cleaned.toLowerCase());
      return matched || cleaned;
    };

    const now = new Date();
    const ranges = computeAnalyticsDateRanges(dateFilter, startDateParam, endDateParam, now);

    const isAllTime = scope === 'all_time';
    const scopeStart = isAllTime ? null : ranges.filterStart;
    const scopeEnd = isAllTime ? null : ranges.filterEnd;
    const dateRangeLabel = isAllTime ? 'All-Time Repair Records' : ranges.currentRangeLabel;

    const branchWhere: any = targetBranch
      ? { branch: { equals: targetBranch, mode: 'insensitive' as const } }
      : {};

    const dateWhere: any =
      scopeStart && scopeEnd
        ? { createdAt: { gte: scopeStart, lte: scopeEnd } }
        : {};

    const [dbRepairs, allBranchRepairsAsc] = await Promise.all([
      prisma.repairRequest.findMany({
        where: {
          ...branchWhere,
          ...dateWhere,
        },
        include: {
          user: { select: { name: true, email: true, phone: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.repairRequest.findMany({
        select: { id: true, branch: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    // Build official branch-sequential Receipt IDs (#GRPX-TAG-A1, #GRPX-VIL-A1, #GRPX-JAS-A1)
    const repairBranchCounters: Record<string, number> = {};
    const repairReceiptMap = new Map<string, string>();
    for (const item of allBranchRepairsAsc) {
      const code = getRepairBranchCode(item.branch);
      const count = (repairBranchCounters[code] || 0) + 1;
      repairBranchCounters[code] = count;
      repairReceiptMap.set(item.id, formatRepairReceiptId(item.branch, count));
    }
    STORE_PAPER_RECEIPTS.forEach((p) => {
      const code = getRepairBranchCode(p.branch);
      const count = (repairBranchCounters[code] || 0) + 1;
      repairBranchCounters[code] = count;
      const key = p.id || p.repairId;
      if (key) {
        repairReceiptMap.set(key, formatRepairReceiptId(p.branch, count));
      }
    });

    const dbIds = new Set(dbRepairs.map((r) => r.id));
    let matchingPaper = STORE_PAPER_RECEIPTS.filter((p) => !dbIds.has(p.repairId));
    if (targetBranch) {
      const tbLower = targetBranch.toLowerCase();
      matchingPaper = matchingPaper.filter((p) => (p.branch || '').toLowerCase().includes(tbLower));
    }
    if (scopeStart && scopeEnd) {
      matchingPaper = matchingPaper.filter((p) => {
        const dt = new Date(p.createdAt);
        return dt >= scopeStart && dt <= scopeEnd;
      });
    }

    const completedOnlyScope = scope === 'period_revenue' || scope === 'completed' || scope === 'all_time';

    const allRecords: UnifiedRepairRecord[] = [];

    for (const r of dbRepairs) {
      const normStatus = normalizeRepairStatus(r.status, r.progress);
      if (completedOnlyScope && normStatus !== 'Completed') continue;

      const { totalCost, downpaymentAmount } = extractRepairCost(r);
      const dt = new Date(r.createdAt);
      const branchName = canonicalBranchName(r.branch);
      const monthKey = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = dt.toLocaleDateString('en-PH', { month: 'short', year: 'numeric' });

      allRecords.push({
        id: r.id,
        referenceId: repairReceiptMap.get(r.id) || formatRepairReceiptId(r.branch, 1),
        createdAt: dt.toISOString(),
        monthKey,
        monthLabel,
        deviceName: (r.deviceName || 'Unnamed Device').trim(),
        cause: (r.cause || r.progress || 'General Repair').trim(),
        technician: (r.technician || 'Unassigned').trim(),
        customerName: (r.ownerName || r.user?.name || r.user?.email || 'Walk-in Customer').trim(),
        customerEmail: r.user?.email || null,
        branch: branchName,
        branchAddress: branchAddressMap[branchName.toLowerCase()] || `${branchName} Branch`,
        status: normStatus,
        paymentMethod: 'Cash',
        amount: normStatus === 'Completed' ? totalCost : 0,
        downpayment: downpaymentAmount,
        isPaperReceipt: false,
      });
    }

    for (const p of matchingPaper) {
      const dt = new Date(p.createdAt);
      const branchName = canonicalBranchName(p.branch);
      const monthKey = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = dt.toLocaleDateString('en-PH', { month: 'short', year: 'numeric' });
      const pType = (p.paymentType || '').toLowerCase();
      const paymentMethod: 'Cash' | 'GCash' = pType.includes('gcash') ? 'GCash' : 'Cash';
      const amt = p.amount || 0;

      allRecords.push({
        id: p.repairId || `paper-${dt.getTime()}`,
        referenceId:
          repairReceiptMap.get(p.id || p.repairId) ||
          p.referenceId ||
          formatRepairReceiptId(p.branch, 1),
        createdAt: dt.toISOString(),
        monthKey,
        monthLabel,
        deviceName: (p.deviceName || 'Repair Service').trim(),
        cause: (p.cause || 'Store Receipt Repair').trim(),
        technician: (p.technician || 'Store Technician').trim(),
        customerName: (p.customerName || 'Walk-in Customer').trim(),
        customerEmail: null,
        branch: branchName,
        branchAddress: branchAddressMap[branchName.toLowerCase()] || `${branchName} Branch`,
        status: 'Completed',
        paymentMethod,
        amount: amt,
        downpayment: 0,
        isPaperReceipt: true,
      });
    }

    allRecords.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // 1. Aggregate KPIs
    let totalRevenue = 0;
    let completedCount = 0;
    let activeCount = 0;
    let cancelledCount = 0;
    let cashRevenue = 0;
    let cashCount = 0;
    let gcashRevenue = 0;
    let gcashCount = 0;

    // 2. Aggregate Devices Repaired
    const deviceMap: Record<
      string,
      {
        deviceName: string;
        jobCount: number;
        completedCount: number;
        totalRevenue: number;
        branches: Record<string, { branch: string; jobs: number; revenue: number }>;
      }
    > = {};

    // 3. Aggregate Branch Breakdown
    const branchListToSeed = isSuperAdmin
      ? targetBranch
        ? [canonicalBranchName(targetBranch)]
        : knownBranchNames
      : [canonicalBranchName(assignedBranch)];

    const branchMap: Record<
      string,
      {
        branch: string;
        address: string;
        revenue: number;
        requests: number;
        completed: number;
        cashRevenue: number;
        gcashRevenue: number;
      }
    > = {};

    branchListToSeed.forEach((bName) => {
      branchMap[bName] = {
        branch: bName,
        address: branchAddressMap[bName.toLowerCase()] || `${bName} Branch`,
        revenue: 0,
        requests: 0,
        completed: 0,
        cashRevenue: 0,
        gcashRevenue: 0,
      };
    });

    // 4. Aggregate Monthly Analytics
    const monthMap: Record<
      string,
      {
        monthKey: string;
        monthLabel: string;
        revenue: number;
        requests: number;
        completed: number;
        branchSplits: Record<string, { branch: string; revenue: number; requests: number; completed: number }>;
        deviceCounts: Record<string, { name: string; count: number }>;
      }
    > = {};

    for (const rec of allRecords) {
      totalRevenue += rec.amount;
      if (rec.status === 'Completed') {
        completedCount += 1;
        if (rec.amount > 0) {
          if (rec.paymentMethod === 'GCash') {
            gcashRevenue += rec.amount;
            gcashCount += 1;
          } else {
            cashRevenue += rec.amount;
            cashCount += 1;
          }
        }
      } else if (rec.status === 'Cancelled') {
        cancelledCount += 1;
      } else {
        activeCount += 1;
      }

      // Device aggregation
      const devKey = rec.deviceName.toLowerCase();
      if (!deviceMap[devKey]) {
        deviceMap[devKey] = {
          deviceName: rec.deviceName,
          jobCount: 0,
          completedCount: 0,
          totalRevenue: 0,
          branches: {},
        };
      }
      const dEntry = deviceMap[devKey]!;
      dEntry.jobCount += 1;
      if (rec.status === 'Completed') dEntry.completedCount += 1;
      dEntry.totalRevenue += rec.amount;
      if (!dEntry.branches[rec.branch]) {
        dEntry.branches[rec.branch] = { branch: rec.branch, jobs: 0, revenue: 0 };
      }
      dEntry.branches[rec.branch]!.jobs += 1;
      dEntry.branches[rec.branch]!.revenue += rec.amount;

      // Branch aggregation
      if (!branchMap[rec.branch]) {
        branchMap[rec.branch] = {
          branch: rec.branch,
          address: rec.branchAddress,
          revenue: 0,
          requests: 0,
          completed: 0,
          cashRevenue: 0,
          gcashRevenue: 0,
        };
      }
      const bEntry = branchMap[rec.branch]!;
      bEntry.requests += 1;
      if (rec.status === 'Completed') {
        bEntry.completed += 1;
        bEntry.revenue += rec.amount;
        if (rec.paymentMethod === 'GCash') bEntry.gcashRevenue += rec.amount;
        else bEntry.cashRevenue += rec.amount;
      }

      // Monthly aggregation
      if (!monthMap[rec.monthKey]) {
        monthMap[rec.monthKey] = {
          monthKey: rec.monthKey,
          monthLabel: rec.monthLabel,
          revenue: 0,
          requests: 0,
          completed: 0,
          branchSplits: {},
          deviceCounts: {},
        };
      }
      const mEntry = monthMap[rec.monthKey]!;
      mEntry.requests += 1;
      if (rec.status === 'Completed') {
        mEntry.completed += 1;
        mEntry.revenue += rec.amount;
      }
      if (!mEntry.branchSplits[rec.branch]) {
        mEntry.branchSplits[rec.branch] = { branch: rec.branch, revenue: 0, requests: 0, completed: 0 };
      }
      mEntry.branchSplits[rec.branch]!.requests += 1;
      if (rec.status === 'Completed') {
        mEntry.branchSplits[rec.branch]!.completed += 1;
        mEntry.branchSplits[rec.branch]!.revenue += rec.amount;
      }
      if (!mEntry.deviceCounts[rec.deviceName]) {
        mEntry.deviceCounts[rec.deviceName] = { name: rec.deviceName, count: 0 };
      }
      mEntry.deviceCounts[rec.deviceName]!.count += 1;
    }

    const devicesRepaired = Object.values(deviceMap)
      .sort((a, b) => b.totalRevenue - a.totalRevenue || b.jobCount - a.jobCount)
      .map((d, idx) => ({
        rank: idx + 1,
        deviceName: d.deviceName,
        jobCount: d.jobCount,
        completedCount: d.completedCount,
        totalRevenue: d.totalRevenue,
        avgCost: d.completedCount > 0 ? d.totalRevenue / d.completedCount : 0,
        percentageShare: totalRevenue > 0 ? Math.round((d.totalRevenue / totalRevenue) * 1000) / 10 : 0,
        branches: Object.values(d.branches).sort((a, b) => b.revenue - a.revenue || b.jobs - a.jobs),
      }));

    const branchBreakdown = Object.values(branchMap)
      .sort((a, b) => b.revenue - a.revenue || b.requests - a.requests)
      .map((b) => ({
        ...b,
        completionRate: b.requests > 0 ? Math.round((b.completed / b.requests) * 100) : 0,
        sharePercent: totalRevenue > 0 ? Math.round((b.revenue / totalRevenue) * 1000) / 10 : 0,
      }));

    const monthlyAnalytics = Object.values(monthMap)
      .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
      .map((m) => {
        const splits = Object.values(m.branchSplits).sort((a, b) => b.revenue - a.revenue || b.requests - a.requests);
        const topDev = Object.values(m.deviceCounts).sort((a, b) => b.count - a.count)[0];
        return {
          monthKey: m.monthKey,
          monthLabel: m.monthLabel,
          revenue: m.revenue,
          requests: m.requests,
          completed: m.completed,
          topBranch: splits[0]?.branch || targetBranch || assignedBranch,
          topDevice: topDev ? `${topDev.name} (${topDev.count})` : '—',
          branchSplits: splits,
        };
      });

    // Weekly breakdown when viewing a single month
    const weeklyBreakdown: Array<{ label: string; revenue: number; requests: number; completed: number }> = [];
    if (!isAllTime && dateFilter === 'month' && scopeStart && scopeEnd) {
      const daysInMonth = scopeEnd.getDate();
      const weeks = [
        { label: 'Week 1 (1–7)', startDay: 1, endDay: 7 },
        { label: 'Week 2 (8–14)', startDay: 8, endDay: 14 },
        { label: 'Week 3 (15–21)', startDay: 15, endDay: 21 },
        { label: 'Week 4 (22–28)', startDay: 22, endDay: 28 },
      ];
      if (daysInMonth > 28) {
        weeks.push({ label: `Week 5 (29–${daysInMonth})`, startDay: 29, endDay: daysInMonth });
      }
      weeks.forEach((w) => {
        let rev = 0;
        let reqs = 0;
        let comp = 0;
        for (const rec of allRecords) {
          const d = new Date(rec.createdAt).getDate();
          if (d >= w.startDay && d <= w.endDay) {
            reqs += 1;
            if (rec.status === 'Completed') {
              comp += 1;
              rev += rec.amount;
            }
          }
        }
        weeklyBreakdown.push({ label: w.label, revenue: rev, requests: reqs, completed: comp });
      });
    }

    // Apply record-level filters
    const filteredRecords = allRecords.filter((rec) => {
      if (statusFilter !== 'all' && rec.status.toLowerCase() !== statusFilter) {
        return false;
      }
      if (paymentMethodFilter !== 'all' && rec.paymentMethod.toLowerCase() !== paymentMethodFilter) {
        return false;
      }
      if (monthFilter !== 'all' && rec.monthKey !== monthFilter) {
        return false;
      }
      if (search) {
        const haystack = [
          rec.deviceName,
          rec.cause,
          rec.technician,
          rec.customerName,
          rec.referenceId,
          rec.branch,
          rec.status,
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    });

    const totalFiltered = filteredRecords.length;
    const totalPages = Math.max(1, Math.ceil(totalFiltered / limit));
    const safePage = Math.min(page, totalPages);
    const paginatedRecords = filteredRecords.slice((safePage - 1) * limit, safePage * limit);

    return NextResponse.json({
      meta: {
        scope,
        dateFilter,
        dateRangeLabel,
        effectiveBranch: targetBranch || 'All Branches',
        isSuperAdmin,
        assignedBranch,
        availableBranches: isSuperAdmin ? knownBranchNames : [assignedBranch],
        totalRevenue,
        totalRequests: allRecords.length,
        completedCount,
        activeCount,
        cancelledCount,
        cashRevenue,
        cashCount,
        gcashRevenue,
        gcashCount,
      },
      devicesRepaired,
      branchBreakdown,
      monthlyAnalytics,
      weeklyBreakdown,
      records: {
        items: paginatedRecords,
        page: safePage,
        limit,
        totalFiltered,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Error fetching repair breakdown:', error);
    return NextResponse.json({ error: 'Failed to fetch repair breakdown' }, { status: 500 });
  }
}

