import { NextResponse } from 'next/server';
import { prisma } from 'database';
import { getSession } from '../../../../lib/session';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isSuperAdmin = session.role === 'SUPER_ADMIN';
    const { searchParams } = new URL(req.url);
    const branchParam = searchParams.get('branch');
    const type = searchParams.get('type');
    const search = searchParams.get('search');
    const pageStr = searchParams.get('page') || '1';
    const limitStr = searchParams.get('limit') || '20';

    const page = Math.max(1, parseInt(pageStr, 10));
    const limit = Math.max(1, parseInt(limitStr, 10));
    const skip = (page - 1) * limit;

    const where: any = {};

    // Branch scoping
    if (isSuperAdmin) {
      if (branchParam && branchParam !== 'all') {
        where.OR = [
          { branch: { equals: branchParam, mode: 'insensitive' } },
          { fromBranch: { equals: branchParam, mode: 'insensitive' } },
          { toBranch: { equals: branchParam, mode: 'insensitive' } }
        ];
      }
    } else {
      const userBranch = session.branch || 'Tagoloan';
      where.OR = [
        { branch: { equals: userBranch, mode: 'insensitive' } },
        { fromBranch: { equals: userBranch, mode: 'insensitive' } },
        { toBranch: { equals: userBranch, mode: 'insensitive' } }
      ];
    }

    if (type && type !== 'ALL') {
      where.type = type;
    }

    if (search) {
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { productName: { contains: search, mode: 'insensitive' } },
            { productId: { contains: search, mode: 'insensitive' } },
            { notes: { contains: search, mode: 'insensitive' } },
            { performedBy: { contains: search, mode: 'insensitive' } }
          ]
        }
      ];
    }

    const [total, movements] = await Promise.all([
      prisma.stockMovement.count({ where }),
      prisma.stockMovement.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      })
    ]);

    return NextResponse.json({
      movements,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error: any) {
    console.error('Error fetching inventory history:', error);
    return NextResponse.json({ error: 'Failed to fetch inventory history' }, { status: 500 });
  }
}
