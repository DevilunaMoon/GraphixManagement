import { NextResponse } from 'next/server';
import { prisma } from 'database';
import { getSession } from '../../../lib/session';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const branch = searchParams.get('branch');

    const whereClause: any = {
      role: 'TECHNICIAN',
      status: 'Active'
    };

    if (branch && branch !== 'all') {
      whereClause.branch = { equals: branch, mode: 'insensitive' };
    }

    const technicians = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        branch: true,
        image: true,
        status: true
      },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json(technicians);
  } catch (error) {
    console.error('Error fetching technicians:', error);
    return NextResponse.json({ error: 'Failed to fetch technicians' }, { status: 500 });
  }
}
