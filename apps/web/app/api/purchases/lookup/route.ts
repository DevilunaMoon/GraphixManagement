import { NextResponse } from 'next/server';
import { prisma } from 'database';
import { getSession } from '../../../../lib/session';

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'CASHIER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query')?.trim() || '';
    const branchParam = searchParams.get('branch')?.trim() || session.branch || 'Tagoloan';

    const whereClause: any = {
      branch: { equals: branchParam, mode: 'insensitive' }
    };

    if (query) {
      const cleanRef = query.replace(/^#/, '');
      whereClause.OR = [
        { referenceId: { contains: cleanRef, mode: 'insensitive' } },
        { id: { contains: query, mode: 'insensitive' } },
        { user: { name: { contains: query, mode: 'insensitive' } } },
        { user: { phone: { contains: query, mode: 'insensitive' } } },
        { user: { email: { contains: query, mode: 'insensitive' } } },
        { device: { name: { contains: query, mode: 'insensitive' } } }
      ];
    } else {
      // Default: show reservations pending pickup or active from the last 24 hours
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      whereClause.createdAt = { gte: oneDayAgo };
    }

    const purchases = await prisma.purchase.findMany({
      where: whereClause,
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: {
        device: {
          select: { name: true, price: true, image: true, stock: true }
        },
        user: {
          select: { id: true, name: true, email: true, phone: true }
        }
      }
    });

    const now = Date.now();
    const formatted = purchases.map(p => {
      const createdAtMs = new Date(p.createdAt).getTime();
      const expiresAtMs = createdAtMs + 8 * 60 * 60 * 1000;
      const isExpired = now >= expiresAtMs && p.status !== 'Paid';
      const remainingMs = Math.max(0, expiresAtMs - now);

      return {
        id: p.id,
        referenceId: p.referenceId || `#CMTPQ${p.id.slice(-5).toUpperCase()}`,
        amount: p.amount,
        quantity: p.quantity,
        variations: p.variations,
        paymentType: p.paymentType,
        branch: p.branch,
        status: isExpired ? 'Expired' : p.status,
        isSettled: p.isSettled,
        createdAt: p.createdAt,
        expiresAt: new Date(expiresAtMs).toISOString(),
        isExpired,
        remainingMinutes: Math.floor(remainingMs / (1000 * 60)),
        device: p.device,
        user: p.user
      };
    });

    return NextResponse.json({ success: true, purchases: formatted });
  } catch (error: any) {
    console.error('Error looking up purchases:', error);
    return NextResponse.json({ error: error.message || 'Failed to lookup purchases' }, { status: 500 });
  }
}
