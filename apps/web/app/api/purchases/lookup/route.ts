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

    let purchases: any[] = [];

    if (query) {
      const cleanRef = query.replace(/^#/, '').trim();
      const codeSuffix = cleanRef.replace(/^CMTPQ/i, '').trim();

      const orConditions: any[] = [
        { referenceId: { contains: query, mode: 'insensitive' } },
        { referenceId: { contains: cleanRef, mode: 'insensitive' } },
        { id: { contains: query, mode: 'insensitive' } },
        { id: { contains: cleanRef, mode: 'insensitive' } },
        { imei: { contains: query, mode: 'insensitive' } },
        { user: { name: { contains: query, mode: 'insensitive' } } },
        { user: { phone: { contains: query, mode: 'insensitive' } } },
        { user: { email: { contains: query, mode: 'insensitive' } } },
        { device: { name: { contains: query, mode: 'insensitive' } } }
      ];

      // If search query contains or looks like a claim code (e.g. #CMTPQHH38G or HH38G)
      if (codeSuffix.length >= 2) {
        orConditions.push({ id: { endsWith: codeSuffix, mode: 'insensitive' } });
        orConditions.push({ id: { contains: codeSuffix, mode: 'insensitive' } });
        orConditions.push({ referenceId: { contains: codeSuffix, mode: 'insensitive' } });
      }

      // 1. Search within the cashier's branch first
      purchases = await prisma.purchase.findMany({
        where: {
          branch: { contains: cleanBranch, mode: 'insensitive' },
          OR: orConditions
        },
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

      // 2. If nothing found in this branch, fallback across all branches
      if (purchases.length === 0) {
        purchases = await prisma.purchase.findMany({
          where: { OR: orConditions },
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
      }
    } else {
      // Default: show reservations pending pickup or active from the last 48 hours for this branch
      const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
      purchases = await prisma.purchase.findMany({
        where: {
          branch: { contains: cleanBranch, mode: 'insensitive' },
          createdAt: { gte: twoDaysAgo }
        },
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
    }

    const now = Date.now();
    const formatted = purchases.map(p => {
      const createdAtMs = new Date(p.createdAt).getTime();
      const expiresAtMs = createdAtMs + 8 * 60 * 60 * 1000;
      const isExpired = now >= expiresAtMs && p.status !== 'Paid';
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
