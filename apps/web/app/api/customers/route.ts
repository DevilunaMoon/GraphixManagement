import { NextResponse } from 'next/server';
import { prisma } from 'database';
import { getSession } from '../../../lib/session';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'CASHIER' && session.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query')?.trim() || searchParams.get('search')?.trim() || '';

    if (!query || query.length < 1) {
      return NextResponse.json({ customers: [] });
    }

    const customers = await prisma.user.findMany({
      where: {
        role: 'CUSTOMER',
        OR: [
          { email: { contains: query, mode: 'insensitive' } },
          { name: { contains: query, mode: 'insensitive' } },
          { phone: { contains: query, mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        branch: true
      },
      take: 8,
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ customers });
  } catch (error: any) {
    console.error('Error searching customers:', error);
    return NextResponse.json({ error: error.message || 'Failed to search customers' }, { status: 500 });
  }
}
