import { NextResponse } from 'next/server';
import { prisma } from 'database';
import { getSession } from '../../../lib/session';

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { deviceId, amount, quantity, variations } = await req.json();

    if (!deviceId) {
      return NextResponse.json({ error: 'Missing deviceId' }, { status: 400 });
    }

    const purchase = await prisma.purchase.create({
      data: {
        userId: session.userId,
        deviceId: deviceId,
        amount: amount || 0,
        quantity: quantity || 1,
        variations: variations || null
      }
    });

    return NextResponse.json(purchase, { status: 201 });
  } catch (error) {
    console.error('Error recording purchase:', error);
    return NextResponse.json({ error: 'Failed to record purchase' }, { status: 500 });
  }
}
