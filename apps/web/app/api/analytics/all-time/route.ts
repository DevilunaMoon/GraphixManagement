import { NextResponse } from 'next/server';
import { prisma } from 'database';
import { getSession } from '../../../../lib/session';
import { calculateBranchBestSellers } from '../../../../lib/analyticsBestSellers';

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
    const dateFilter = searchParams.get('dateFilter') || 'year'; // 'today' | 'week' | 'month' | 'year' | 'custom' | 'all'
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    // Strict branch scoping:
    // Super Admin can view specific branch or 'all'.
    // Branch Admin and Cashier are strictly locked to their authenticated assigned branch.
    let targetBranch: string | null = null;
    const allowedBranches: string[] = isSuperAdmin 
      ? ['Tagoloan', 'Villanueva', 'Jasaan'] 
      : [(session.branch || 'Tagoloan').trim()];

    if (isSuperAdmin) {
      if (branchQuery && branchQuery !== 'all') {
        targetBranch = branchQuery.trim();
      }
    } else {
      targetBranch = (session.branch || 'Tagoloan').trim();
    }

    const branchWhere: any = isSuperAdmin 
      ? (targetBranch ? { branch: { equals: targetBranch, mode: 'insensitive' } } : {})
      : { branch: { equals: targetBranch, mode: 'insensitive' } };

    const now = new Date();
    
    // Fixed calendar boundaries for stats
    const currentYearStart = new Date(now.getFullYear(), 0, 1);
    const lastYearStart = new Date(now.getFullYear() - 1, 0, 1);
    const lastYearEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);

    // Calculate dynamic filter boundaries for Payment Methods, Branch Performance, etc.
    let filterStart: Date | null = null;
    let filterEnd: Date | null = null;

    if (dateFilter === 'today') {
      filterStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      filterEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (dateFilter === 'week') {
      const dayOfWeek = now.getDay(); // 0 = Sunday
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

    // Previous period boundaries for dynamic comparative metrics
    let prevStart: Date | null = null;
    let prevEnd: Date | null = null;

    if (dateFilter === 'today') {
      prevStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
      prevEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
    } else if (dateFilter === 'week') {
      prevStart = new Date((filterStart || now).getTime() - 7 * 24 * 60 * 60 * 1000);
      prevEnd = new Date((filterEnd || now).getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (dateFilter === 'month') {
      prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    } else if (dateFilter === 'year') {
      prevStart = new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0, 0);
      prevEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
    } else if (dateFilter === 'custom' && filterStart && filterEnd) {
      const diff = filterEnd.getTime() - filterStart.getTime();
      prevEnd = new Date(filterStart.getTime() - 1);
      prevStart = new Date(prevEnd.getTime() - diff);
    }

    const dateWhere: any = {};
    if (filterStart && filterEnd) {
      dateWhere.createdAt = {
        gte: filterStart,
        lte: filterEnd
      };
    } else if (filterStart) {
      dateWhere.createdAt = { gte: filterStart };
    }

    // Only count completed/successful/paid transactions (exclude cancelled/voided/unpaid)
    const validPurchasesWhere: any = {
      ...(isSuperAdmin ? {} : branchWhere),
      status: { notIn: ['Cancelled', 'Voided', 'Failed', 'Unpaid', 'Pending Pickup'] }
    };

    // Fetch all successful purchases for general stats
    const allSystemPurchases = await prisma.purchase.findMany({
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
        variations: true,
        paymentType: true,
        device: {
          select: {
            id: true,
            name: true,
            price: true,
            image: true,
            images: true,
            isPreOwned: true,
            type: true
          }
        }
      }
    });

    // Fetch filtered purchases for date-specific metrics
    const filteredPurchasesWhere: any = {
      ...validPurchasesWhere,
      ...dateWhere
    };

    const allFilteredPurchases = await prisma.purchase.findMany({
      where: filteredPurchasesWhere,
      select: {
        id: true,
        amount: true,
        createdAt: true,
        source: true,
        deviceId: true,
        quantity: true,
        branch: true,
        status: true,
        variations: true,
        paymentType: true,
        device: {
          select: {
            id: true,
            name: true,
            price: true,
            image: true,
            images: true,
            isPreOwned: true,
            type: true
          }
        }
      }
    });

    const activeFilteredPurchases = targetBranch 
      ? allFilteredPurchases.filter(p => (p.branch || 'Tagoloan').toLowerCase() === targetBranch?.toLowerCase())
      : allFilteredPurchases;

    // Fetch completed repairs
    const repairsWhere: any = {
      ...(isSuperAdmin ? {} : branchWhere),
      status: 'Completed'
    };

    const allRepairs = await prisma.repairRequest.findMany({
      where: repairsWhere
    });

    const filteredRepairs = await prisma.repairRequest.findMany({
      where: {
        ...repairsWhere,
        ...dateWhere
      }
    });

    const activeFilteredRepairs = targetBranch 
      ? filteredRepairs.filter(r => (r.branch || 'Tagoloan').toLowerCase() === targetBranch?.toLowerCase())
      : filteredRepairs;

    // Workload
    const activeRepairs = await prisma.repairRequest.findMany({
      where: { ...(isSuperAdmin ? (targetBranch ? { branch: targetBranch } : {}) : branchWhere), status: { not: 'Completed' } }
    });

    const pendingRepairs = activeRepairs.length;
    const activeTechnicians = new Set(
      activeRepairs
        .map(r => r.technician)
        .filter(t => t && t.trim() !== '')
    ).size;

    // 1. Calculate general & dynamic period Sales
    let periodSales = 0;
    let previousPeriodSales = 0;
    let thisYearSales = 0;
    let lastYearSales = 0;
    let allTimeSales = 0;
    let totalRetail = 0;
    let totalRepair = 0;

    let onlineCount = 0;
    let physicalCount = 0;

    const currentYear = now.getFullYear();
    const chartYears = [currentYear - 4, currentYear - 3, currentYear - 2, currentYear - 1, currentYear];
    const yearlySales: Record<string, number> = {};
    chartYears.forEach(y => {
      yearlySales[y.toString()] = 0;
    });

    // Dynamic Chart Buckets based on dateFilter
    let chartBuckets: { label: string; start: Date; end: Date; value: number }[] = [];

    if (dateFilter === 'today') {
      const slots = [
        { label: '6 AM', h: 6 },
        { label: '8 AM', h: 8 },
        { label: '10 AM', h: 10 },
        { label: '12 PM', h: 12 },
        { label: '2 PM', h: 14 },
        { label: '4 PM', h: 16 },
        { label: '6 PM', h: 18 },
        { label: '8 PM', h: 20 },
        { label: '10 PM', h: 22 },
      ];
      chartBuckets = slots.map((s, idx) => {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), s.h, 0, 0, 0);
        const nextHour = idx === slots.length - 1 ? 24 : slots[idx + 1].h;
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), nextHour - 1, 59, 59, 999);
        return { label: s.label, start, end, value: 0 };
      });
    } else if (dateFilter === 'week') {
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const baseStart = filterStart || new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
      for (let i = 0; i < 7; i++) {
        const d = new Date(baseStart.getTime() + i * 24 * 60 * 60 * 1000);
        const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
        const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
        chartBuckets.push({ label: dayNames[d.getDay()], start, end, value: 0 });
      }
    } else if (dateFilter === 'month') {
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const weekRanges = [
        { label: 'Week 1', startDay: 1, endDay: 7 },
        { label: 'Week 2', startDay: 8, endDay: 14 },
        { label: 'Week 3', startDay: 15, endDay: 21 },
        { label: 'Week 4', startDay: 22, endDay: 28 },
      ];
      if (daysInMonth > 28) {
        weekRanges.push({ label: 'Week 5', startDay: 29, endDay: daysInMonth });
      }
      chartBuckets = weekRanges.map(w => {
        const start = new Date(now.getFullYear(), now.getMonth(), w.startDay, 0, 0, 0, 0);
        const end = new Date(now.getFullYear(), now.getMonth(), Math.min(w.endDay, daysInMonth), 23, 59, 59, 999);
        return { label: w.label, start, end, value: 0 };
      });
    } else if (dateFilter === 'year') {
      chartBuckets = chartYears.map(y => {
        const start = new Date(y, 0, 1, 0, 0, 0, 0);
        const end = new Date(y, 11, 31, 23, 59, 59, 999);
        return { label: y.toString(), start, end, value: 0 };
      });
    } else if (dateFilter === 'custom' && filterStart && filterEnd) {
      const daysDiff = Math.max(1, Math.ceil((filterEnd.getTime() - filterStart.getTime()) / (1000 * 60 * 60 * 24)));
      if (daysDiff <= 14) {
        for (let i = 0; i < daysDiff; i++) {
          const d = new Date(filterStart.getTime() + i * 24 * 60 * 60 * 1000);
          const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
          const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
          const label = `${d.getMonth() + 1}/${d.getDate()}`;
          chartBuckets.push({ label, start, end, value: 0 });
        }
      } else {
        const step = (filterEnd.getTime() - filterStart.getTime()) / 6;
        for (let i = 0; i < 6; i++) {
          const start = new Date(filterStart.getTime() + i * step);
          const end = new Date(filterStart.getTime() + (i + 1) * step);
          const label = `${start.getMonth() + 1}/${start.getDate()}`;
          chartBuckets.push({ label, start, end, value: 0 });
        }
      }
    }

    const activeAllPurchases = targetBranch 
      ? allSystemPurchases.filter(p => (p.branch || 'Tagoloan').toLowerCase() === targetBranch?.toLowerCase())
      : allSystemPurchases;

    const activeAllRepairs = targetBranch 
      ? allRepairs.filter(r => (r.branch || 'Tagoloan').toLowerCase() === targetBranch?.toLowerCase())
      : allRepairs;

    activeAllPurchases.forEach(p => {
      const amt = p.amount || 0;
      totalRetail += amt;
      allTimeSales += amt;
      
      const createdAt = new Date(p.createdAt);
      if (createdAt >= currentYearStart) {
        thisYearSales += amt;
      } else if (createdAt >= lastYearStart && createdAt <= lastYearEnd) {
        lastYearSales += amt;
      }

      if (filterStart && filterEnd && createdAt >= filterStart && createdAt <= filterEnd) {
        periodSales += amt;
      }
      if (prevStart && prevEnd && createdAt >= prevStart && createdAt <= prevEnd) {
        previousPeriodSales += amt;
      }

      for (const b of chartBuckets) {
        if (createdAt >= b.start && createdAt <= b.end) {
          b.value += amt;
          break;
        }
      }

      const purchaseYear = createdAt.getFullYear().toString();
      if (yearlySales[purchaseYear] !== undefined) {
        yearlySales[purchaseYear] += amt;
      }

      if ((p as any).source === 'In-Store') {
        physicalCount++;
      } else {
        onlineCount++;
      }
    });

    activeAllRepairs.forEach(r => {
      if (r.repairCost) {
        const num = parseFloat(r.repairCost.replace(/[^0-9.]/g, ''));
        if (!isNaN(num)) {
          totalRepair += num;
          allTimeSales += num;
          
          const createdAt = new Date(r.createdAt);
          if (createdAt >= currentYearStart) {
            thisYearSales += num;
          } else if (createdAt >= lastYearStart && createdAt <= lastYearEnd) {
            lastYearSales += num;
          }

          if (filterStart && filterEnd && createdAt >= filterStart && createdAt <= filterEnd) {
            periodSales += num;
          }
          if (prevStart && prevEnd && createdAt >= prevStart && createdAt <= prevEnd) {
            previousPeriodSales += num;
          }

          for (const b of chartBuckets) {
            if (createdAt >= b.start && createdAt <= b.end) {
              b.value += num;
              break;
            }
          }

          const repairYear = createdAt.getFullYear().toString();
          if (yearlySales[repairYear] !== undefined) {
            yearlySales[repairYear] += num;
          }
        }
      }
    });

    const chartData = chartBuckets.map(b => ({
      label: b.label,
      value: b.value
    }));

    // 2. Calculate Payment Methods for the filtered timeframe
    let cashAmount = 0;
    let cashCount = 0;
    let gcashAmount = 0;
    let gcashCount = 0;

    activeFilteredPurchases.forEach(p => {
      const amt = p.amount || 0;
      const pType = (p.paymentType || '').toLowerCase();
      const pSource = (p.source || '').toLowerCase();

      const isCash = pType.includes('cash') || pSource === 'in-store' || pSource === 'in-store pos';
      const isGcash = pType.includes('gcash') || pType === 'full' || pType === 'online' || pType === 'buy now (full payment)' || pSource === 'online';

      if (isCash && !pType.includes('gcash')) {
        cashAmount += amt;
        cashCount += 1;
      } else if (isGcash && !pType.includes('cash')) {
        gcashAmount += amt;
        gcashCount += 1;
      } else {
        if (pSource === 'in-store' || pSource === 'in-store pos') {
          cashAmount += amt;
          cashCount += 1;
        } else {
          gcashAmount += amt;
          gcashCount += 1;
        }
      }
    });

    activeFilteredRepairs.forEach(r => {
      if (r.repairCost) {
        const num = parseFloat(r.repairCost.replace(/[^0-9.]/g, ''));
        if (!isNaN(num)) {
          cashAmount += num;
          cashCount += 1;
        }
      }
    });

    // 3. Calculate Branch Performance
    const systemBranches = ['Tagoloan', 'Villanueva', 'Jasaan'];
    let branchPerformance: Array<{ branch: string; revenue: number; orders: number }> = [];

    if (isSuperAdmin) {
      if (targetBranch) {
        const branchPurchases = allFilteredPurchases.filter(p => (p.branch || 'Tagoloan').toLowerCase() === targetBranch?.toLowerCase());
        const branchRepairs = filteredRepairs.filter(r => (r.branch || 'Tagoloan').toLowerCase() === targetBranch?.toLowerCase());

        let rev = branchPurchases.reduce((sum, p) => sum + (p.amount || 0), 0);
        rev += branchRepairs.reduce((sum, r) => {
          const num = parseFloat((r.repairCost || '').replace(/[^0-9.]/g, ''));
          return sum + (isNaN(num) ? 0 : num);
        }, 0);

        branchPerformance = [{
          branch: targetBranch,
          revenue: rev,
          orders: branchPurchases.length + branchRepairs.length
        }];
      } else {
        branchPerformance = systemBranches.map(bName => {
          const bPurchases = allFilteredPurchases.filter(p => (p.branch || 'Tagoloan').toLowerCase() === bName.toLowerCase());
          const bRepairs = filteredRepairs.filter(r => (r.branch || 'Tagoloan').toLowerCase() === bName.toLowerCase());

          let rev = bPurchases.reduce((sum, p) => sum + (p.amount || 0), 0);
          rev += bRepairs.reduce((sum, r) => {
            const num = parseFloat((r.repairCost || '').replace(/[^0-9.]/g, ''));
            return sum + (isNaN(num) ? 0 : num);
          }, 0);

          return {
            branch: bName,
            revenue: rev,
            orders: bPurchases.length + bRepairs.length
          };
        });
      }
    } else {
      const assignedBranch = (session.branch || 'Tagoloan').trim();
      const branchPurchases = allFilteredPurchases.filter(p => (p.branch || 'Tagoloan').toLowerCase() === assignedBranch.toLowerCase());
      const branchRepairs = filteredRepairs.filter(r => (r.branch || 'Tagoloan').toLowerCase() === assignedBranch.toLowerCase());

      let rev = branchPurchases.reduce((sum, p) => sum + (p.amount || 0), 0);
      rev += branchRepairs.reduce((sum, r) => {
        const num = parseFloat((r.repairCost || '').replace(/[^0-9.]/g, ''));
        return sum + (isNaN(num) ? 0 : num);
      }, 0);

      branchPerformance = [{
        branch: assignedBranch,
        revenue: rev,
        orders: branchPurchases.length + branchRepairs.length
      }];
    }

    // 4. Calculate Branch-Specific Best Sellers for the current filter timeframe
    const branchBestSellers = calculateBranchBestSellers(allFilteredPurchases, allowedBranches);

    // Legacy fallback topProductsThisYear
    let topProductsThisYear: Array<{ name: string; sold: number }> = [];
    const targetBranchSummary = targetBranch ? branchBestSellers[targetBranch] : undefined;
    if (targetBranchSummary) {
      topProductsThisYear = targetBranchSummary.products.slice(0, 5).map(p => ({
        name: p.productModel,
        sold: p.unitsSold
      }));
    } else {
      const combinedMap: Record<string, { name: string; sold: number }> = {};
      Object.values(branchBestSellers).forEach(bSummary => {
        bSummary.products.forEach(p => {
          const existing = combinedMap[p.productId];
          if (!existing) {
            combinedMap[p.productId] = { name: p.productModel, sold: p.unitsSold };
          } else {
            existing.sold += p.unitsSold;
          }
        });
      });
      topProductsThisYear = Object.values(combinedMap).sort((a, b) => b.sold - a.sold).slice(0, 5);
    }

    return NextResponse.json({
      sales: {
        periodSales,
        previousPeriodSales,
        thisYear: thisYearSales,
        lastYear: lastYearSales,
        allTime: allTimeSales,
        yearlySales,
        chartData
      },
      paymentMethods: {
        cash: {
          totalAmount: cashAmount,
          transactionCount: cashCount
        },
        gcash: {
          totalAmount: gcashAmount,
          transactionCount: gcashCount
        },
        totalAmount: cashAmount + gcashAmount,
        totalTransactions: cashCount + gcashCount
      },
      branchPerformance,
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
      topProductsThisYear,
      branchBestSellers,
      isSuperAdmin,
      assignedBranch: session.branch || 'Tagoloan'
    });
  } catch (error) {
    console.error('Error fetching all-time analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch all-time analytics' }, { status: 500 });
  }
}

