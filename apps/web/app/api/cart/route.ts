import { NextResponse } from 'next/server';
import { prisma } from 'database';
import { getSession } from '../../../lib/session';

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cartItems = await prisma.cartItem.findMany({
      where: { userId: session.userId },
      include: {
        device: {
          select: {
            id: true,
            name: true,
            price: true,
            stock: true,
            image: true,
            images: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(cartItems, { status: 200 });
  } catch (error) {
    console.error('Error fetching cart:', error);
    return NextResponse.json({ error: 'Failed to fetch cart' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { deviceId, quantity, variations } = await req.json();

    if (!deviceId) {
      return NextResponse.json({ error: 'Missing deviceId' }, { status: 400 });
    }

    // Check if item already exists with exact same variations
    const existingItem = await prisma.cartItem.findFirst({
      where: {
        userId: session.userId,
        deviceId: deviceId,
        variations: variations || null
      }
    });

    if (existingItem) {
      // Just increase quantity
      const updated = await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: existingItem.quantity + (quantity || 1) }
      });
      return NextResponse.json(updated, { status: 200 });
    } else {
      // Create new cart item
      const newItem = await prisma.cartItem.create({
        data: {
          userId: session.userId,
          deviceId: deviceId,
          quantity: quantity || 1,
          variations: variations || null
        }
      });
      return NextResponse.json(newItem, { status: 201 });
    }
  } catch (error) {
    console.error('Error adding to cart:', error);
    return NextResponse.json({ error: 'Failed to add to cart' }, { status: 500 });
  }
}
