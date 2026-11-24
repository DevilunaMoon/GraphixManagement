import { NextResponse } from 'next/server';
import { prisma } from 'database';
import { getSession } from '../../../../lib/session';
import { computeAnalyticsDateRanges } from '../../../../lib/analyticsDateRange';
import { getBranchCode, formatRepairReceiptId, getRepairBranchCode } from '../../../../lib/invoice';

export const dynamic = 'force-dynamic';

const DEFAULT_BRANCHES = ['Tagoloan', 'Villanueva', 'Jasaan'];

function normalizeSource(source?: string | null): 'In-Store POS' | 'Online' {
  const s = (source || '').toLowerCase();
  if (s.includes('in-store') || s.includes('pos') || s.includes('walk-in') || s.includes('physical')) {
    return 'In-Store POS';
  }
  return 'Online';
}

function normalizePaymentMethod(paymentType?: string | null, source?: string | null): 'Cash' | 'GCash' {
  const pType = (paymentType || '').toLowerCase();
  const pSource = (source || '').toLowerCase();

  const isCash = pType.includes('cash') || pSource === 'in-store' || pSource === 'in-store pos';
  const isGcash =
    pType.includes('gcash') ||
    pType === 'full' ||
    pType === 'online' ||
    pType === 'buy now (full payment)' ||
    pSource === 'online';

  if (isCash && !pType.includes('gcash')) return 'Cash';
  if (isGcash && !pType.includes('cash')) return 'GCash';
  return pSource === 'in-store' || pSource === 'in-store pos' ? 'Cash' : 'GCash';
}

function parseRepairCost(cost?: string | null): number {
  if (!cost) return 0;
  const num = parseFloat(cost.replace(/[^0-9.]/g, ''));
  return isNaN(num) ? 0 : num;
}

function parseVariantLabel(variations?: string | null): string {
  if (!variations || variations.trim() === '') return 'Standard';
  try {
    const parsed = JSON.parse(variations);
    if (Array.isArray(parsed)) {
      const vals = parsed
        .map((v: any) => (typeof v === 'string' ? v : v?.name || v?.value || ''))
        .filter(Boolean);
      return vals.length > 0 ? vals.join(' / ') : 'Standard';
    }
    if (typeof parsed === 'object' && parsed !== null) {
      const vals = Object.values(parsed).filter(Boolean).map(String);
      return vals.length > 0 ? vals.join(' / ') : 'Standard';
    }
  } catch {
    // Plain text variation
  }
  return variations.trim();
}

interface UnifiedTransaction {
  id: string;
  referenceId: string;
  createdAt: string;
  monthKey: string;
  monthLabel: string;
  recordType: 'Product' | 'Repair';
  productId: string;
  productName: string;
  variation: string;
  condition: 'New' | 'Pre-Owned' | 'Service';
  image: string | null;
  quantity: number;
  amount: number;
  imei: string | null;
  customerName: string;
  customerEmail: string | null;
  branch: string;
  branchAddress: string;
  source: 'In-Store POS' | 'Online';
  paymentMethod: 'Cash' | 'GCash';
  paymentType: string;
  status: string;
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
    const scope = (searchParams.get('scope') || 'current') as 'current' | 'previous' | 'all_time';
    const dateFilter = searchParams.get('dateFilter') || 'month';
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const branchQuery = searchParams.get('branch');

    // Optional transaction-level filters
    const search = (searchParams.get('search') || '').trim().toLowerCase();
    const paymentMethodFilter = (searchParams.get('paymentMethod') || 'all').toLowerCase();
    const sourceFilter = (searchParams.get('source') || 'all').toLowerCase();
    const monthFilter = (searchParams.get('month') || 'all').trim(); // e.g., "2026-10"
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(100, Math.max(10, parseInt(searchParams.get('limit') || '25', 10) || 25));

    // Strict server-side RBAC branch scoping:
    // Non-SuperAdmin is ALWAYS locked to their assigned branch regardless of query params.
    let targetBranch: string | null = null;
    if (isSuperAdmin) {
      if (branchQuery && branchQuery !== 'all' && branchQuery !== 'All Branches') {
        targetBranch = branchQuery.trim();
      }
    } else {
      targetBranch = assignedBranch;
    }

    // Load branch directory for location/address metadata
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

    let scopeStart: Date | null = null;
    let scopeEnd: Date | null = null;
    let dateRangeLabel = 'All Time';

    if (scope === 'current') {
      scopeStart = ranges.filterStart;
      scopeEnd = ranges.filterEnd;
      dateRangeLabel = ranges.currentRangeLabel;
    } else if (scope === 'previous') {
      scopeStart = ranges.prevStart;
      scopeEnd = ranges.prevEnd;
      dateRangeLabel = ranges.prevRangeLabel;
    } else {
      dateRangeLabel = 'All-Time Records';
    }

    const branchWhere: any = targetBranch
      ? { branch: { equals: targetBranch, mode: 'insensitive' as const } }
      : {};

    const dateWhere: any =
      scopeStart && scopeEnd
        ? { createdAt: { gte: scopeStart, lte: scopeEnd } }
        : {};

    // Fetch purchases, completed repairs, and global sequence order in parallel
    const [purchases, repairs, allPurchasesAsc, allRepairsAsc] = await Promise.all([
      prisma.purchase.findMany({
        where: {
          ...branchWhere,
          ...dateWhere,
          status: { notIn: ['Cancelled', 'Voided', 'Failed', 'Unpaid', 'Pending Pickup'] },
        },
        select: {
          id: true,
          referenceId: true,
          amount: true,
          quantity: true,
          variations: true,
          paymentType: true,
          source: true,
          branch: true,
          status: true,
          imei: true,
          createdAt: true,
          deviceId: true,
          device: {
            select: {
              id: true,
              name: true,
              price: true,
              image: true,
              images: true,
              isPreOwned: true,
              type: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.repairRequest.findMany({
        where: {
          ...branchWhere,
          ...dateWhere,
          status: 'Completed',
        },
        select: {
          id: true,
          deviceName: true,
          ownerName: true,
          technician: true,
          repairCost: true,
          branch: true,
          status: true,
          createdAt: true,
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.purchase.findMany({
        select: { id: true, branch: true, createdAt: true, referenceId: true },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.repairRequest.findMany({
        select: { id: true, branch: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    // Build official branch-sequential Receipt IDs matching Order History (#GRPX-T-A...) and Repair Transactions (#GRPX-TAG-A...)
    const purchaseReceiptMap = new Map<string, string>();
    const purchaseCounters: Record<string, number> = {};
    for (const item of allPurchasesAsc) {
      const bCode = getBranchCode(item.branch);
      purchaseCounters[bCode] = (purchaseCounters[bCode] || 0) + 1;
      const ref = item.referenceId;
      const isStd = typeof ref === 'string' && ref.replace(/^#/, '').match(/^GRPX-([TVJ]|[A-Z])-A\d+$/i);
      if (isStd && ref) {
        purchaseReceiptMap.set(item.id, ref.startsWith('#') ? ref : `#${ref}`);
      } else {
        purchaseReceiptMap.set(item.id, `#GRPX-${bCode}-A${purchaseCounters[bCode]}`);
      }
    }

    const repairReceiptMap = new Map<string, string>();
    const repairCounters: Record<string, number> = {};
    for (const item of allRepairsAsc) {
      const code = getRepairBranchCode(item.branch);
      const count = (repairCounters[code] || 0) + 1;
      repairCounters[code] = count;
      repairReceiptMap.set(item.id, formatRepairReceiptId(item.branch, count));
    }

    // Build unified transaction records
    const allTransactions: UnifiedTransaction[] = [];

    for (const p of purchases) {
      const dt = new Date(p.createdAt);
      const branchName = canonicalBranchName(p.branch);
      const monthKey = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = dt.toLocaleDateString('en-PH', { month: 'short', year: 'numeric' });
      const src = normalizeSource(p.source);
      const pm = normalizePaymentMethod(p.paymentType, p.source);
      const variantLabel = parseVariantLabel(p.variations);
      const img = p.device?.image || (Array.isArray(p.device?.images) && p.device.images[0]) || null;

      allTransactions.push({
        id: p.id,
        referenceId:
          purchaseReceiptMap.get(p.id) ||
          (p.referenceId ? (p.referenceId.startsWith('#') ? p.referenceId : `#${p.referenceId}`) : `#GRPX-${getBranchCode(p.branch)}-A1`),
        createdAt: dt.toISOString(),
        monthKey,
        monthLabel,
        recordType: 'Product',
        productId: p.deviceId,
        productName: p.device?.name || 'Unknown Device',
        variation: variantLabel,
        condition: p.device?.isPreOwned ? 'Pre-Owned' : 'New',
        image: img,
        quantity: p.quantity || 1,
        amount: p.amount || 0,
        imei: p.imei || null,
        customerName: p.user?.name || p.user?.email || 'Walk-in Customer',
        customerEmail: p.user?.email || null,
        branch: branchName,
        branchAddress: branchAddressMap[branchName.toLowerCase()] || `${branchName} Branch`,
        source: src,
        paymentMethod: pm,
        paymentType: p.paymentType || pm,
        status: p.status || 'Completed',
      });
    }

    for (const r of repairs) {
      const amt = parseRepairCost(r.repairCost);
      if (amt <= 0) continue;
      const dt = new Date(r.createdAt);
      const branchName = canonicalBranchName(r.branch);
      const monthKey = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = dt.toLocaleDateString('en-PH', { month: 'short', year: 'numeric' });

      allTransactions.push({
        id: r.id,
        referenceId: repairReceiptMap.get(r.id) || formatRepairReceiptId(r.branch, 1),
        createdAt: dt.toISOString(),
        monthKey,
        monthLabel,
        recordType: 'Repair',
        productId: `repair-${r.deviceName.toLowerCase().replace(/\s+/g, '-')}`,
        productName: `Repair: ${r.deviceName}`,
        variation: r.technician ? `Tech: ${r.technician}` : 'Repair Service',
        condition: 'Service',
        image: null,
        quantity: 1,
        amount: amt,
        imei: null,
        customerName: r.ownerName || r.user?.name || 'Walk-in Customer',
        customerEmail: r.user?.email || null,
        branch: branchName,
        branchAddress: branchAddressMap[branchName.toLowerCase()] || `${branchName} Branch`,
        source: 'In-Store POS',
        paymentMethod: 'Cash',
        paymentType: 'Cash (Repair)',
        status: r.status || 'Completed',
      });
    }

    // Sort all transactions newest first
    allTransactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // 1. Aggregate Totals
    let totalRevenue = 0;
    let retailRevenue = 0;
    let repairRevenue = 0;
    let totalUnitsSold = 0;
    let inStoreCount = 0;
    let onlineCount = 0;
    let inStoreRevenue = 0;
    let onlineRevenue = 0;
    let cashRevenue = 0;
    let cashCount = 0;
    let gcashRevenue = 0;
    let gcashCount = 0;

    // 2. Aggregate Products Sold
    const productMap: Record<
      string,
      {
        key: string;
        productId: string;
        name: string;
        variant: string;
        condition: 'New' | 'Pre-Owned' | 'Service';
        recordType: 'Product' | 'Repair';
        image: string | null;
        quantitySold: number;
        totalRevenue: number;
        transactions: number;
        branches: Record<string, { branch: string; quantity: number; revenue: number }>;
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
        unitsSold: number;
        transactions: number;
        inStoreCount: number;
        onlineCount: number;
        inStoreRevenue: number;
        onlineRevenue: number;
        cashRevenue: number;
        gcashRevenue: number;
      }
    > = {};

    branchListToSeed.forEach((bName) => {
      branchMap[bName] = {
        branch: bName,
        address: branchAddressMap[bName.toLowerCase()] || `${bName} Branch`,
        revenue: 0,
        unitsSold: 0,
        transactions: 0,
        inStoreCount: 0,
        onlineCount: 0,
        inStoreRevenue: 0,
        onlineRevenue: 0,
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
        retailRevenue: number;
        repairRevenue: number;
        unitsSold: number;
        transactions: number;
        inStoreSales: number;
        onlineSales: number;
        inStoreCount: number;
        onlineCount: number;
        branchSplits: Record<string, { branch: string; revenue: number; unitsSold: number; transactions: number }>;
        productCounts: Record<string, { name: string; quantity: number }>;
      }
    > = {};

    for (const tx of allTransactions) {
      totalRevenue += tx.amount;
      if (tx.recordType === 'Product') {
        retailRevenue += tx.amount;
      } else {
        repairRevenue += tx.amount;
      }
      totalUnitsSold += tx.quantity;

      if (tx.source === 'In-Store POS') {
        inStoreCount += 1;
        inStoreRevenue += tx.amount;
      } else {
        onlineCount += 1;
        onlineRevenue += tx.amount;
      }

      if (tx.paymentMethod === 'Cash') {
        cashCount += 1;
        cashRevenue += tx.amount;
      } else {
        gcashCount += 1;
        gcashRevenue += tx.amount;
      }

      // Product aggregation
      const prodKey = `${tx.recordType}:${tx.productId}:${tx.variation}`;
      if (!productMap[prodKey]) {
        productMap[prodKey] = {
          key: prodKey,
          productId: tx.productId,
          name: tx.productName,
          variant: tx.variation,
          condition: tx.condition,
          recordType: tx.recordType,
          image: tx.image,
          quantitySold: 0,
          totalRevenue: 0,
          transactions: 0,
          branches: {},
        };
      }
      const pEntry = productMap[prodKey]!;
      pEntry.quantitySold += tx.quantity;
      pEntry.totalRevenue += tx.amount;
      pEntry.transactions += 1;
      if (!pEntry.branches[tx.branch]) {
        pEntry.branches[tx.branch] = { branch: tx.branch, quantity: 0, revenue: 0 };
      }
      pEntry.branches[tx.branch]!.quantity += tx.quantity;
      pEntry.branches[tx.branch]!.revenue += tx.amount;

      // Branch aggregation
      if (!branchMap[tx.branch]) {
        branchMap[tx.branch] = {
          branch: tx.branch,
          address: tx.branchAddress,
          revenue: 0,
          unitsSold: 0,
          transactions: 0,
          inStoreCount: 0,
          onlineCount: 0,
          inStoreRevenue: 0,
          onlineRevenue: 0,
          cashRevenue: 0,
          gcashRevenue: 0,
        };
      }
      const bEntry = branchMap[tx.branch]!;
      bEntry.revenue += tx.amount;
      bEntry.unitsSold += tx.quantity;
      bEntry.transactions += 1;
      if (tx.source === 'In-Store POS') {
        bEntry.inStoreCount += 1;
        bEntry.inStoreRevenue += tx.amount;
      } else {
        bEntry.onlineCount += 1;
        bEntry.onlineRevenue += tx.amount;
      }
      if (tx.paymentMethod === 'Cash') {
        bEntry.cashRevenue += tx.amount;
      } else {
        bEntry.gcashRevenue += tx.amount;
      }

      // Monthly aggregation
      if (!monthMap[tx.monthKey]) {
        monthMap[tx.monthKey] = {
          monthKey: tx.monthKey,
          monthLabel: tx.monthLabel,
          revenue: 0,
          retailRevenue: 0,
          repairRevenue: 0,
          unitsSold: 0,
          transactions: 0,
          inStoreSales: 0,
          onlineSales: 0,
          inStoreCount: 0,
          onlineCount: 0,
          branchSplits: {},
          productCounts: {},
        };
      }
      const mEntry = monthMap[tx.monthKey]!;
      mEntry.revenue += tx.amount;
      if (tx.recordType === 'Product') mEntry.retailRevenue += tx.amount;
      else mEntry.repairRevenue += tx.amount;
      mEntry.unitsSold += tx.quantity;
      mEntry.transactions += 1;
      if (tx.source === 'In-Store POS') {
        mEntry.inStoreSales += tx.amount;
        mEntry.inStoreCount += 1;
      } else {
        mEntry.onlineSales += tx.amount;
        mEntry.onlineCount += 1;
      }
      if (!mEntry.branchSplits[tx.branch]) {
        mEntry.branchSplits[tx.branch] = { branch: tx.branch, revenue: 0, unitsSold: 0, transactions: 0 };
      }
      mEntry.branchSplits[tx.branch]!.revenue += tx.amount;
      mEntry.branchSplits[tx.branch]!.unitsSold += tx.quantity;
      mEntry.branchSplits[tx.branch]!.transactions += 1;

      if (!mEntry.productCounts[tx.productName]) {
        mEntry.productCounts[tx.productName] = { name: tx.productName, quantity: 0 };
      }
      mEntry.productCounts[tx.productName]!.quantity += tx.quantity;
    }

    const productsSold = Object.values(productMap)
      .sort((a, b) => b.totalRevenue - a.totalRevenue || b.quantitySold - a.quantitySold)
      .map((p, idx) => ({
        rank: idx + 1,
        productId: p.productId,
        name: p.name,
        variant: p.variant,
        condition: p.condition,
        recordType: p.recordType,
        image: p.image,
        quantitySold: p.quantitySold,
        totalRevenue: p.totalRevenue,
        avgUnitPrice: p.quantitySold > 0 ? p.totalRevenue / p.quantitySold : 0,
        transactions: p.transactions,
        percentageShare: totalRevenue > 0 ? Math.round((p.totalRevenue / totalRevenue) * 1000) / 10 : 0,
        branches: Object.values(p.branches).sort((a, b) => b.revenue - a.revenue),
      }));

    const branchBreakdown = Object.values(branchMap)
      .sort((a, b) => b.revenue - a.revenue)
      .map((b) => ({
        ...b,
        sharePercent: totalRevenue > 0 ? Math.round((b.revenue / totalRevenue) * 1000) / 10 : 0,
      }));

    const monthlyAnalytics = Object.values(monthMap)
      .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
      .map((m) => {
        const splits = Object.values(m.branchSplits).sort((a, b) => b.revenue - a.revenue);
        const topProd = Object.values(m.productCounts).sort((a, b) => b.quantity - a.quantity)[0];
        return {
          monthKey: m.monthKey,
          monthLabel: m.monthLabel,
          revenue: m.revenue,
          retailRevenue: m.retailRevenue,
          repairRevenue: m.repairRevenue,
          unitsSold: m.unitsSold,
          transactions: m.transactions,
          inStoreSales: m.inStoreSales,
          onlineSales: m.onlineSales,
          inStoreCount: m.inStoreCount,
          onlineCount: m.onlineCount,
          topBranch: splits[0]?.branch || (targetBranch || assignedBranch),
          topProduct: topProd ? `${topProd.name} (${topProd.quantity})` : '—',
          branchSplits: splits,
        };
      });

    // Weekly breakdown when viewing a single month (This Month / Last Month)
    const weeklyBreakdown: Array<{
      label: string;
      revenue: number;
      unitsSold: number;
      transactions: number;
    }> = [];
    if (dateFilter === 'month' && (scope === 'current' || scope === 'previous') && scopeStart && scopeEnd) {
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
        let qty = 0;
        let cnt = 0;
        for (const tx of allTransactions) {
          const d = new Date(tx.createdAt).getDate();
          if (d >= w.startDay && d <= w.endDay) {
            rev += tx.amount;
            qty += tx.quantity;
            cnt += 1;
          }
        }
        weeklyBreakdown.push({ label: w.label, revenue: rev, unitsSold: qty, transactions: cnt });
      });
    }

    // Apply transaction-level filters for the Transactions tab
    const filteredTransactions = allTransactions.filter((tx) => {
      if (paymentMethodFilter !== 'all' && tx.paymentMethod.toLowerCase() !== paymentMethodFilter) {
        return false;
      }
      if (sourceFilter === 'in-store' && tx.source !== 'In-Store POS') {
        return false;
      }
      if (sourceFilter === 'online' && tx.source !== 'Online') {
        return false;
      }
      if (monthFilter !== 'all' && tx.monthKey !== monthFilter) {
        return false;
      }
      if (search) {
        const haystack = [
          tx.productName,
          tx.variation,
          tx.customerName,
          tx.referenceId,
          tx.branch,
          tx.imei || '',
          tx.paymentType,
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    });

    const totalFiltered = filteredTransactions.length;
    const totalPages = Math.max(1, Math.ceil(totalFiltered / limit));
    const safePage = Math.min(page, totalPages);
    const paginatedTransactions = filteredTransactions.slice((safePage - 1) * limit, safePage * limit);

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
        retailRevenue,
        repairRevenue,
        totalUnitsSold,
        totalTransactions: allTransactions.length,
        inStoreCount,
        onlineCount,
        inStoreRevenue,
        onlineRevenue,
        cashRevenue,
        cashCount,
        gcashRevenue,
        gcashCount,
      },
      productsSold,
      branchBreakdown,
      monthlyAnalytics,
      weeklyBreakdown,
      transactions: {
        items: paginatedTransactions,
        page: safePage,
        limit,
        totalFiltered,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Error fetching sales breakdown:', error);
    return NextResponse.json({ error: 'Failed to fetch sales breakdown' }, { status: 500 });
  }
}

