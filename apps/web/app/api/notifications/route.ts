import { NextResponse } from 'next/server';
import { prisma } from 'database';
import { getSession } from '../../../lib/session';
import { syncStockAlertsForUser } from '../../../lib/stock-alerts';

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isSuperAdmin = session.role === 'SUPER_ADMIN';
    const isAdmin = session.role === 'ADMIN';
    const isCashier = session.role === 'CASHIER';

    // Auto-sync current stock alert state for staff/admin/cashier users
    if (isSuperAdmin || isAdmin || isCashier) {
      await syncStockAlertsForUser(session.userId, session.role, session.branch);
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const branchParam = searchParams.get('branch');
    const skip = (page - 1) * limit;

    const whereClause: any = {
      userId: session.userId,
    };

    // For Super Admin, Admin & Cashier, include restock alerts, stock warnings, repair requests, reservations, etc.
    if (isSuperAdmin || isAdmin || isCashier) {
      whereClause.type = { in: ['RESTOCK', 'STOCK_OUT', 'STOCK_LOW', 'REPAIR_REQUEST', 'REPAIR', 'SYSTEM', 'PAYMENT', 'ORDER', 'CASH_RESERVATION', 'REVIEW_REPLY'] };
    }

    // Branch filtering
    if (branchParam && branchParam.toLowerCase() !== 'all') {
      whereClause.branch = branchParam;
    } else if ((isAdmin || isCashier) && session.branch) {
      whereClause.branch = session.branch;
    }

    const [notifications, totalCount, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.notification.count({
        where: whereClause
      }),
      prisma.notification.count({
        where: { ...whereClause, isRead: false }
      })
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      notifications,
      totalCount,
      totalPages,
      unreadCount,
      page,
      limit
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}
