import { NextResponse } from 'next/server';
import { prisma } from 'database';
import { getSession } from '../../../../lib/session';

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { quantity } = await req.json();

    if (quantity === undefined || quantity < 1) {
      return NextResponse.json({ error: 'Invalid quantity' }, { status: 400 });
    }

    const cartItem = await prisma.cartItem.findFirst({
      where: {
        id: params.id,
        userId: session.userId
      },
      include: {
        device: true
      }
    });

    if (!cartItem) {
      return NextResponse.json({ error: 'Cart item not found or unauthorized' }, { status: 404 });
    }

    let maxStock = cartItem.device.stock;
    if (cartItem.variations) {
      try {
        const parsed = JSON.parse(cartItem.variations);
        if (Array.isArray(parsed) && parsed.length > 0) {
          maxStock = Math.min(...parsed.map((v: any) => (v.stock !== undefined ? v.stock : cartItem.device.stock)));
        }
      } catch (e) {}
    }

    const validQty = Math.max(1, Math.min(quantity, Math.max(1, maxStock)));

    await prisma.cartItem.update({
      where: { id: cartItem.id },
      data: { quantity: validQty }
    });

    return NextResponse.json({ success: true, quantity: validQty }, { status: 200 });
  } catch (error) {
    console.error('Error updating cart item:', error);
    return NextResponse.json({ error: 'Failed to update cart item' }, { status: 500 });
  }
}

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const deleted = await prisma.cartItem.deleteMany({
      where: {
        id: params.id,
        userId: session.userId // Ensure user owns the cart item
      }
    });

    if (deleted.count === 0) {
      return NextResponse.json({ error: 'Cart item not found or unauthorized' }, { status: 404 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting cart item:', error);
    return NextResponse.json({ error: 'Failed to delete cart item' }, { status: 500 });
  }
}
