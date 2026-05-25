import { NextResponse } from 'next/server';
import { prisma } from 'database';
import { getSession } from '../../../lib/session';

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { deviceId, amount, quantity, variations, cartItemIds, paymentType, phoneNumber, staffMessage } = await req.json();

    if (phoneNumber) {
      await prisma.user.update({
        where: { id: session.userId },
        data: { phone: phoneNumber }
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { name: true, email: true }
    });
    const userName = user?.name || user?.email || 'A customer';

    async function notifyCashiers(paymentLabel: string) {
      const cashiers = await prisma.user.findMany({
        where: { role: 'CASHIER' },
        select: { id: true }
      });
      if (cashiers.length > 0) {
        let msg = `${userName} just checked out via ${paymentLabel}.`;
        if (phoneNumber) {
          msg += ` Cash: ${phoneNumber}.`;
        }
        if (staffMessage) {
          msg += ` Msg: "${staffMessage}".`;
        }

        const notifications = cashiers.map(c => ({
          userId: c.id,
          title: 'New Checkout Alert',
          message: msg,
          type: 'PAYMENT'
        }));
        await prisma.notification.createMany({ data: notifications });
      }
    }

    if (cartItemIds && Array.isArray(cartItemIds)) {
      const result = await prisma.$transaction(async (tx) => {
        // Fetch cart items to get their details
        const cartItems = await tx.cartItem.findMany({
          where: { id: { in: cartItemIds }, userId: session.userId }
        });

        if (cartItems.length === 0) {
          throw new Error('No items found in your cart to purchase');
        }

        // Fetch all target devices to verify stock
        const deviceIds = cartItems.map(item => item.deviceId);
        const devices = await tx.device.findMany({
          where: { id: { in: deviceIds } }
        });

        const deviceMap = new Map(devices.map(d => [d.id, d]));

        // Validate stock for all items
        for (const item of cartItems) {
          const device = deviceMap.get(item.deviceId);
          if (!device) {
            throw new Error('Product not found in inventory');
          }
          if (device.stock < item.quantity) {
            throw new Error(`Insufficient stock for "${device.name}". Only ${device.stock} left in stock.`);
          }
        }

        // Decrement stock for all target devices
        for (const item of cartItems) {
          await tx.device.update({
            where: { id: item.deviceId },
            data: {
              stock: { decrement: item.quantity },
              sold: { increment: item.quantity }
            }
          });
        }

        // Create purchases
        const purchaseData = cartItems.map(item => {
          const vars = item.variations ? JSON.parse(item.variations) : [];
          const price = vars.length > 0 ? vars.reduce((sum: number, v: any) => sum + (v.price || 0), 0) : 0;
          return {
            userId: session.userId,
            deviceId: item.deviceId,
            amount: price * item.quantity,
            quantity: item.quantity,
            variations: item.variations,
            paymentType: paymentType || 'Full'
          };
        });

        await tx.purchase.createMany({
          data: purchaseData
        });

        // Delete from cart
        await tx.cartItem.deleteMany({
          where: { id: { in: cartItemIds }, userId: session.userId }
        });

        return { success: true };
      });

      if (result.success) {
        const pTypeLabel = paymentType === 'Downpayment' ? 'Downpayment' : 'Buy Now (Full Payment)';
        await notifyCashiers(pTypeLabel);
        return NextResponse.json({ success: true, message: 'Cart items purchased' }, { status: 201 });
      }
    }

    if (!deviceId) {
      return NextResponse.json({ error: 'Missing deviceId' }, { status: 400 });
    }

    const purchase = await prisma.$transaction(async (tx) => {
      // Fetch target device to verify stock
      const device = await tx.device.findUnique({
        where: { id: deviceId }
      });

      if (!device) {
        throw new Error('Device not found in inventory');
      }

      const reqQty = quantity || 1;
      if (device.stock < reqQty) {
        throw new Error(`Insufficient stock for "${device.name}". Only ${device.stock} left in stock.`);
      }

      // Decrement stock atomically
      await tx.device.update({
        where: { id: deviceId },
        data: {
          stock: { decrement: reqQty },
          sold: { increment: reqQty }
        }
      });

      // Record the purchase
      return await tx.purchase.create({
        data: {
          userId: session.userId,
          deviceId: deviceId,
          amount: amount || 0,
          quantity: reqQty,
          variations: variations || null,
          paymentType: paymentType || 'Full'
        }
      });
    });

    const singlePTypeLabel = paymentType === 'Downpayment' ? 'Downpayment' : 'Buy Now (Full Payment)';
    await notifyCashiers(singlePTypeLabel);

    return NextResponse.json(purchase, { status: 201 });
  } catch (error: any) {
    console.error('Error recording purchase:', error);
    return NextResponse.json({ error: error.message || 'Failed to record purchase' }, { status: 400 });
  }
}

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const pageStr = searchParams.get('page');
    const limitStr = searchParams.get('limit');

    const sort = searchParams.get('sort') || 'desc';
    const orderByDir: 'asc' | 'desc' = sort === 'asc' ? 'asc' : 'desc';

    if (pageStr) {
      const page = Math.max(1, parseInt(pageStr, 10) || 1);
      const limit = Math.max(1, parseInt(limitStr || '8', 10) || 8);
      const skip = (page - 1) * limit;

      const [purchases, total] = await Promise.all([
        prisma.purchase.findMany({
          where: { userId: session.userId },
          skip,
          take: limit,
          include: {
            device: true
          },
          orderBy: {
            createdAt: orderByDir
          }
        }),
        prisma.purchase.count({
          where: { userId: session.userId }
        })
      ]);

      return NextResponse.json({
        purchases,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      });
    }

    const purchases = await prisma.purchase.findMany({
      where: { userId: session.userId },
      include: {
        device: true
      },
      orderBy: {
        createdAt: orderByDir
      }
    });

    return NextResponse.json(purchases);
  } catch (error: any) {
    console.error('Error fetching customer purchases:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch purchases' }, { status: 500 });
  }
}
