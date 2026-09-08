import { NextResponse } from 'next/server';
import { prisma } from 'database';
import { getSession } from '../../../../lib/session';

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const purchaseId = searchParams.get('id');

    let purchase;
    if (purchaseId) {
      purchase = await prisma.purchase.findFirst({
        where: { 
          id: purchaseId,
          userId: session.userId 
        },
        include: {
          device: {
            select: { name: true, price: true, image: true }
          },
          user: {
            select: { name: true, email: true, phone: true }
          }
        }
      });
    } else {
      purchase = await prisma.purchase.findFirst({
        where: { userId: session.userId },
        orderBy: { createdAt: 'desc' },
        include: {
          device: {
            select: { name: true, price: true, image: true }
          },
          user: {
            select: { name: true, email: true, phone: true }
          }
        }
      });
    }

    if (!purchase) {
      return NextResponse.json({ error: 'No purchase found' }, { status: 404 });
    }

    return NextResponse.json(purchase);
  } catch (error) {
    console.error('Error fetching latest purchase:', error);
    return NextResponse.json({ error: 'Failed to fetch purchase details' }, { status: 500 });
  }
}
