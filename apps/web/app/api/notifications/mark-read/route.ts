import { NextResponse } from 'next/server';
import { prisma } from 'database';
import { getSession } from '../../../../lib/session';

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, action, all } = await req.json();

    if (all) {
      await prisma.notification.updateMany({
        where: { userId: session.userId, isRead: false },
        data: { isRead: true }
      });
      return NextResponse.json({ success: true }, { status: 200 });
    }

    if (!id) {
      return NextResponse.json({ error: 'Missing notification ID' }, { status: 400 });
    }

    let updateData: any = { isRead: true };
    if (action === 'PAID') {
      updateData.title = 'Paid Checkout Alert';
    } else if (action === 'UNPAID') {
      updateData.title = 'Unpaid Checkout Alert';
    }

    const notification = await prisma.notification.update({
      where: { id: id, userId: session.userId },
      data: updateData
    });

    return NextResponse.json(notification, { status: 200 });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return NextResponse.json({ error: 'Failed to mark notification as read' }, { status: 500 });
  }
}
