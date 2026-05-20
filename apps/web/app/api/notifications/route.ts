import { NextResponse } from 'next/server';
import { prisma } from 'database';
import { getSession } from '../../../lib/session';

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const skip = (page - 1) * limit;

    const [notifications, totalCount, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: session.userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.notification.count({
        where: { userId: session.userId }
      }),
      prisma.notification.count({
        where: { userId: session.userId, isRead: false }
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
