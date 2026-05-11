import { NextResponse } from 'next/server';
import { prisma } from 'database';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    if (!id) return NextResponse.json({ error: 'Missing transaction ID' }, { status: 400 });

    const purchase = await prisma.purchase.findUnique({ where: { id } });
    if (!purchase) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });

    if (purchase.status === 'Cancelled') {
      return NextResponse.json({ error: 'Transaction is already cancelled' }, { status: 400 });
    }

    // Cancel the transaction and restore stock
    const updatedPurchase = await prisma.$transaction([
      prisma.purchase.update({
        where: { id },
        data: { status: 'Cancelled' }
      }),
      prisma.device.update({
        where: { id: purchase.deviceId },
        data: { stock: { increment: purchase.quantity } }
      })
    ]);

    return NextResponse.json({ success: true, purchase: updatedPurchase[0] });
  } catch (error) {
    console.error('Error cancelling transaction:', error);
    return NextResponse.json({ error: 'Failed to cancel transaction' }, { status: 500 });
  }
}
