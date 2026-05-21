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

    const existingNotification = await prisma.notification.findUnique({
      where: { id: id, userId: session.userId }
    });

    if (!existingNotification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    let updateData: any = {};
    if (action === 'PAID') {
      updateData = { isRead: true, title: 'Paid Checkout Alert' };
    } else if (action === 'UNPAID') {
      // Keep cashier notification unread so buttons remain active, just send customer notification
      updateData = {};
    } else {
      updateData = { isRead: true };
    }

    const notification = await prisma.notification.update({
      where: { id: id, userId: session.userId },
      data: updateData
    });

    // Notify the customer if the action was PAID or UNPAID
    if (action === 'PAID' || action === 'UNPAID') {
      const message = existingNotification.message;
      const match = message.match(/^(.*?) just checked out via/);
      if (match && match[1]) {
        const customerName = match[1].trim();
        const customer = await prisma.user.findFirst({
          where: {
            OR: [
              { name: customerName },
              { email: customerName }
            ]
          }
        });

        if (customer) {
          let customerTitle = '';
          let customerMsg = '';
          if (action === 'PAID') {
            customerTitle = 'Payment Successful';
            customerMsg = 'Your checkout payment for the purchase has been successfully processed and verified as PAID by our staff. Thank you!';
          } else if (action === 'UNPAID') {
            customerTitle = 'Payment Pending / Unpaid';
            customerMsg = 'Your checkout payment for the purchase was marked as UNPAID by our staff. Please complete or verify your payment.';
          }

          if (customerTitle && customerMsg) {
            await prisma.notification.create({
              data: {
                userId: customer.id,
                title: customerTitle,
                message: customerMsg,
                type: 'SYSTEM'
              }
            });
          }
        }
      }
    }

    return NextResponse.json(notification, { status: 200 });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return NextResponse.json({ error: 'Failed to mark notification as read' }, { status: 500 });
  }
}
