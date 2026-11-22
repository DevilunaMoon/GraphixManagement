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
    const cleanBranch = branchParam.replace(/\s*Branch$/i, '').trim();
    const dateParam = searchParams.get('date')?.trim() || '';

    let dateFilter: any = undefined;
    if (dateParam) {
      const [year, month, day] = dateParam.split('-').map(Number);
      if (year && month && day) {
        // Wide window covering day across UTC and UTC+8
        const start = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
        start.setUTCHours(start.getUTCHours() - 14);
        const end = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
        end.setUTCHours(end.getUTCHours() + 14);
        dateFilter = {
          gte: start,
          lte: end
        };
      }
    }

    const branchCondition = cleanBranch && cleanBranch.toLowerCase() !== 'all'
      ? { branch: { contains: cleanBranch, mode: 'insensitive' as const } }
      : {};

    let purchases: any[] = [];

    if (query) {
      const cleanRef = query.replace(/^#/, '').trim();
      const codeSuffix = cleanRef.replace(/^CMTPQ/i, '').trim();

      const orConditions: any[] = [
        { referenceId: { contains: query, mode: 'insensitive' as const } },
        { referenceId: { contains: cleanRef, mode: 'insensitive' as const } },
        { id: { contains: query, mode: 'insensitive' as const } },
        { id: { contains: cleanRef, mode: 'insensitive' as const } },
        { imei: { contains: query, mode: 'insensitive' as const } },
        { user: { name: { contains: query, mode: 'insensitive' as const } } },
        { user: { phone: { contains: query, mode: 'insensitive' as const } } },
        { user: { email: { contains: query, mode: 'insensitive' as const } } },
        { device: { name: { contains: query, mode: 'insensitive' as const } } }
      ];

      // If search query contains or looks like a claim code (e.g. #CMTPQHH38G or HH38G)
      if (codeSuffix.length >= 2) {
        orConditions.push({ id: { endsWith: codeSuffix, mode: 'insensitive' as const } });
        orConditions.push({ id: { contains: codeSuffix, mode: 'insensitive' as const } });
        orConditions.push({ referenceId: { contains: codeSuffix, mode: 'insensitive' as const } });
      }

      // Strictly search within the cashier's active branch
      purchases = await prisma.purchase.findMany({
        where: {
          ...branchCondition,
          ...(dateFilter ? { createdAt: dateFilter } : {}),
          status: { not: 'Rejected' },
          OR: orConditions
        },
        take: 50,
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
    } else {
      // Default or date-filtered view
      const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
      purchases = await prisma.purchase.findMany({
        where: {
          ...branchCondition,
          ...(dateFilter ? { createdAt: dateFilter } : { createdAt: { gte: twoDaysAgo } }),
          status: { not: 'Rejected' }
        },
        take: 50,
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
    }

    const now = Date.now();
    const formatted = purchases.map(p => {
      const createdAtMs = new Date(p.createdAt).getTime();
      const expiresAtMs = createdAtMs + 8 * 60 * 60 * 1000;
      const isExpired = now >= expiresAtMs && p.status !== 'Paid' && p.status !== 'Completed';
      const remainingMs = Math.max(0, expiresAtMs - now);

      return {
        id: p.id,
        referenceId: p.referenceId || `#CMTPQ${p.id.slice(-5).toUpperCase()}`,
        imei: p.imei || null,
        amount: p.amount,
        quantity: p.quantity,
        variations: p.variations,
        paymentType: p.paymentType,
        branch: p.branch,
        status: (p.status === 'For Verification' || p.status === 'Paid' || p.status === 'Completed' || p.status === 'Rejected') ? p.status : (isExpired ? 'Expired' : p.status),
        isSettled: p.isSettled,
        receiptUrl: p.receiptUrl || null,
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
