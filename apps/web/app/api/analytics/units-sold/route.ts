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

    const whereClause: any = {
      status: { notIn: ['Cancelled', 'Voided', 'Failed', 'Unpaid', 'Pending Pickup'] }
    };
    if (targetBranch) {
      whereClause.branch = { equals: targetBranch, mode: 'insensitive' as const };
    }

    const now = new Date();
    const fiveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    whereClause.createdAt = { gte: fiveMonthsAgo };

    const purchases = await prisma.purchase.findMany({
      where: whereClause,
      select: {
        quantity: true,
        createdAt: true
      }
    });

    const monthlyUnits: Record<string, number> = {};

    purchases.forEach(p => {
      const date = new Date(p.createdAt);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      monthlyUnits[key] = (monthlyUnits[key] || 0) + (p.quantity || 1);
    });

    const lastMonths: { key: string; monthName: string; units: number }[] = [];

    for (let i = 0; i < 5; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const monthName = d.toLocaleString('default', { month: 'long' });

      lastMonths.push({
        key,
        monthName,
        units: monthlyUnits[key] || 0
      });
    }

    const result = lastMonths.slice(0, 4).map((m, i) => {
      let trendStr = "—";
      let trendUp: boolean | null = null;

      const prevMonthUnits = lastMonths[i + 1]?.units || 0;
      if (prevMonthUnits > 0) {
        const diff = m.units - prevMonthUnits;
        if (diff === 0) {
          trendStr = "0%";
          trendUp = true;
        } else {
          const percent = Math.round((Math.abs(diff) / prevMonthUnits) * 100);
          trendStr = `${percent}%`;
          trendUp = diff > 0;
        }
      } else if (m.units > 0) {
        trendStr = "100%";
        trendUp = true;
      } else {
        trendStr = "—";
        trendUp = null;
      }

      return {
        month: m.monthName,
        units: m.units.toString(),
        trend: trendStr,
        trendUp
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to fetch units sold per month:', error);
    return NextResponse.json({ error: 'Failed to fetch units sold' }, { status: 500 });
  }
}

