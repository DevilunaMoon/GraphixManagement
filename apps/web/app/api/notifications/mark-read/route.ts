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
    } else if (action === 'RELEASE_STOCK') {
      updateData = { isRead: true, title: 'Expired & Stock Released' };
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

    const message = existingNotification.message || '';

    // Extract purchase IDs if embedded in message
    const purchaseIdsMatch = message.match(/\[PurchaseIds?:\s*([^\]]+)\]/i);
    let purchaseIds: string[] = [];
    if (purchaseIdsMatch?.[1]) {
      purchaseIds = purchaseIdsMatch[1].split(',').map(s => s.trim()).filter(Boolean);
    }

    // Handle RELEASE_STOCK: Return reserved inventory stock and alert customer
    if (action === 'RELEASE_STOCK') {
      if (purchaseIds.length > 0) {
        for (const pId of purchaseIds) {
          const purchase = await prisma.purchase.findUnique({
            where: { id: pId },
            include: { device: true, user: true }
          });
          if (purchase && purchase.status !== 'Expired') {
            await prisma.device.update({
              where: { id: purchase.deviceId },
              data: {
                stock: { increment: purchase.quantity },
                sold: { decrement: Math.max(0, purchase.quantity) }
              }
            });
            await prisma.purchase.update({
              where: { id: purchase.id },
              data: { status: 'Expired', isSettled: false }
            });
            await prisma.notification.create({
              data: {
                userId: purchase.userId,
                title: 'Reservation Expired — Stock Released',
                message: `Your 8-hour store pickup reservation for "${purchase.device.name}" (Qty: ${purchase.quantity}) at GraphiX ${purchase.branch || 'store'} has expired. The reserved unit has been released back to store stock.`,
                branch: purchase.branch,
                type: 'SYSTEM'
              }
            });
          }
        }
      } else {
        // Fallback: match by CustomerId or name
        const customerIdMatch = message.match(/\[CustomerId:\s*([^\]]+)\]/i);
        const custId = customerIdMatch?.[1] ? customerIdMatch[1].trim() : null;
        if (custId) {
          const pendingPurchases = await prisma.purchase.findMany({
            where: { userId: custId, status: 'Pending Pickup' },
            include: { device: true }
          });
          for (const purchase of pendingPurchases) {
            await prisma.device.update({
              where: { id: purchase.deviceId },
              data: {
                stock: { increment: purchase.quantity },
                sold: { decrement: Math.max(0, purchase.quantity) }
              }
            });
            await prisma.purchase.update({
              where: { id: purchase.id },
              data: { status: 'Expired', isSettled: false }
            });
            await prisma.notification.create({
              data: {
                userId: purchase.userId,
                title: 'Reservation Expired — Stock Released',
                message: `Your 8-hour store pickup reservation for "${purchase.device.name}" at GraphiX ${purchase.branch || 'store'} has expired. The reserved unit has been released back to store stock.`,
                branch: purchase.branch,
                type: 'SYSTEM'
              }
            });
          }
        }
      }
    }

    // Handle PAID or UNPAID notifications
    if (action === 'PAID' || action === 'UNPAID') {
      if (action === 'PAID') {
        if (purchaseIds.length > 0) {
          for (const pId of purchaseIds) {
            await prisma.purchase.updateMany({
              where: { id: pId },
              data: { status: 'Paid', isSettled: true }
            });
          }
        }

        const claimCodeMatch = message.match(/\[ClaimCode:\s*([^\]]+)\]/i);
        if (claimCodeMatch?.[1]) {
          const cleanRef = claimCodeMatch[1].trim();
          await prisma.purchase.updateMany({
            where: {
              OR: [
                { referenceId: cleanRef },
                { referenceId: `#${cleanRef.replace(/^#/, '')}` },
                { referenceId: cleanRef.replace(/^#/, '') }
              ]
            },
            data: { status: 'Paid', isSettled: true }
          });
        }
      }

      const match = message.match(/^(.*?)\s+(?:just checked out via|reserved)/i);
      let customerUser: any = null;

      const customerIdMatch = message.match(/\[CustomerId:\s*([^\]]+)\]/i);
      if (customerIdMatch?.[1]) {
        customerUser = await prisma.user.findUnique({
          where: { id: customerIdMatch[1].trim() }
        });
      }

      if (!customerUser && match?.[1]) {
        const customerName = match[1].trim();
        customerUser = await prisma.user.findFirst({
          where: {
            OR: [
              { name: customerName },
              { email: customerName }
            ]
          }
        });
      }

      if (customerUser) {
        let customerTitle = '';
        let customerMsg = '';
        if (action === 'PAID') {
          customerTitle = 'Payment Verified & Official Receipt Unlocked';
          customerMsg = 'Your in-store cash payment has been verified as PAID by our staff. Your official 80mm PDF sales receipt is now unlocked!';
        } else if (action === 'UNPAID') {
          customerTitle = 'Payment Pending / Unpaid';
          customerMsg = 'Your checkout payment was marked as UNPAID by our staff. Please complete or verify your payment at the store.';
        }

        if (customerTitle && customerMsg) {
          await prisma.notification.create({
            data: {
              userId: customerUser.id,
              title: customerTitle,
              message: customerMsg,
              type: 'SYSTEM'
            }
          });
        }
      }
    }

    return NextResponse.json(notification, { status: 200 });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return NextResponse.json({ error: 'Failed to mark notification as read' }, { status: 500 });
  }
}
