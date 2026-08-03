import { NextResponse } from 'next/server';
import { prisma } from 'database';
import { getSession } from '../../../../../lib/session';
import { sendDownpaymentEmail } from '../../../../../lib/email';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'CASHIER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Missing purchase ID' }, { status: 400 });
    }

    const purchase = await prisma.purchase.findUnique({
      where: { id },
      include: {
        user: true,
        device: true
      }
    });

    if (!purchase) {
      return NextResponse.json({ error: 'Purchase record not found' }, { status: 404 });
    }

    const updatedPurchase = await prisma.purchase.update({
      where: { id },
      data: {
        remainingBalance: 0,
        isSettled: true
      },
      include: {
        user: true,
        device: true
      }
    });

    // Create system notification for customer
    await prisma.notification.create({
      data: {
        userId: purchase.userId,
        title: 'Downpayment Balance Settled',
        message: `Your remaining balance for "${purchase.device.name}" has been fully settled at the store POS desk. Thank you!`,
        type: 'PAYMENT'
      }
    });

    // Send email / SMS alert if user has email
    if (purchase.user && purchase.user.email) {
      await sendDownpaymentEmail(
        purchase.user.email,
        purchase.device.name,
        purchase.downpaymentAmount || purchase.amount || 0,
        0,
        true
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Downpayment remaining balance successfully settled',
      purchase: updatedPurchase
    });
  } catch (error: any) {
    console.error('Error settling downpayment balance:', error);
    return NextResponse.json({ error: error.message || 'Failed to settle balance' }, { status: 500 });
  }
}
