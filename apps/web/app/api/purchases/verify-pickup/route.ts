import { NextResponse } from 'next/server';
import { prisma } from 'database';
import { getSession } from '../../../../lib/session';

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'CASHIER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { purchaseId, referenceId, amountTendered } = await req.json();

    if (!purchaseId && !referenceId) {
      return NextResponse.json({ error: 'Missing purchase identifier' }, { status: 400 });
    }

    // Locate the purchase
    const whereCondition: any = {};
    if (purchaseId) {
      whereCondition.id = purchaseId;
    } else if (referenceId) {
      const cleanRef = referenceId.trim();
      whereCondition.OR = [
        { referenceId: cleanRef },
        { referenceId: `#${cleanRef.replace(/^#/, '')}` },
        { referenceId: cleanRef.replace(/^#/, '') }
      ];
    }

    const purchase = await prisma.purchase.findFirst({
      where: whereCondition,
      include: {
        device: true,
        user: true
      }
    });

    if (!purchase) {
      return NextResponse.json({ error: 'Order reservation not found' }, { status: 404 });
    }

    // Branch check: ensure staff branch matches order branch (unless super admin)
    if (session.branch && purchase.branch && session.branch.toLowerCase() !== purchase.branch.toLowerCase()) {
      return NextResponse.json({ 
        error: `This reservation belongs to ${purchase.branch} Branch. You are logged into ${session.branch} Branch.` 
      }, { status: 403 });
    }

    if (purchase.status === 'Paid') {
      return NextResponse.json({ 
        success: true, 
        message: 'This order has already been verified and paid.',
        purchase 
      });
    }

    // Update purchase status to Paid and settled
    const updatedPurchase = await prisma.purchase.update({
      where: { id: purchase.id },
      data: {
        status: 'Paid',
        isSettled: true
      },
      include: {
        device: true,
        user: true
      }
    });

    // Mark any related cashier notifications as Paid and read
    try {
      const notifications = await prisma.notification.findMany({
        where: {
          branch: purchase.branch,
          message: { contains: purchase.id }
        }
      });
      if (notifications.length > 0) {
        await prisma.notification.updateMany({
          where: { id: { in: notifications.map(n => n.id) } },
          data: {
            isRead: true,
            title: 'Paid Checkout Alert'
          }
        });
      }
    } catch (e) {
      console.error('Error updating cashier notifications:', e);
    }

    // Dispatch automated confirmation notification to the customer
    if (purchase.userId) {
      await prisma.notification.create({
        data: {
          userId: purchase.userId,
          title: 'Payment Verified & Official Receipt Unlocked',
          message: `Your in-store cash payment for "${purchase.device.name}" at GraphiX ${purchase.branch || 'store'} has been verified as PAID! Your official 80mm PDF sales receipt is now unlocked.`,
          branch: purchase.branch,
          type: 'PAYMENT'
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: `Payment verified for ${purchase.device.name}. Customer's official PDF receipt is now unlocked!`,
      purchase: updatedPurchase
    });
  } catch (error: any) {
    console.error('Error verifying pickup:', error);
    return NextResponse.json({ error: error.message || 'Failed to verify pickup' }, { status: 500 });
  }
}
