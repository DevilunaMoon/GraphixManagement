import { NextResponse } from 'next/server';
import { prisma } from 'database';
import { getSession } from '../../../../lib/session';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isSuperAdmin = session.role === 'SUPER_ADMIN';
    const { searchParams } = new URL(req.url);
    const branchParam = searchParams.get('branch');
    const status = searchParams.get('status');
    const productId = searchParams.get('productId');
    const deviceId = searchParams.get('deviceId');
    const search = searchParams.get('search');
    const pageStr = searchParams.get('page') || '1';
    const limitStr = searchParams.get('limit') || '25';

    const page = Math.max(1, parseInt(pageStr, 10));
    const limit = Math.max(1, parseInt(limitStr, 10));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (isSuperAdmin) {
      if (branchParam && branchParam !== 'all') {
        where.branch = { equals: branchParam, mode: 'insensitive' };
      }
    } else {
      where.branch = { equals: session.branch || 'Tagoloan', mode: 'insensitive' };
    }

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (productId) {
      where.productId = productId;
    }

    if (deviceId) {
      where.deviceId = deviceId;
    }

    if (search) {
      where.OR = [
        { imei: { contains: search, mode: 'insensitive' } },
        { productId: { contains: search, mode: 'insensitive' } },
        { device: { name: { contains: search, mode: 'insensitive' } } }
      ];
    }

    const [total, units] = await Promise.all([
      prisma.deviceUnit.count({ where }),
      prisma.deviceUnit.findMany({
        where,
        include: {
          device: { select: { id: true, name: true, image: true, type: true, isPreOwned: true } },
          variation: { select: { id: true, name: true, productId: true, price: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      })
    ]);

    return NextResponse.json({
      units,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error: any) {
    console.error('Error fetching device units:', error);
    return NextResponse.json({ error: 'Failed to fetch device units' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isSuperAdmin = session.role === 'SUPER_ADMIN';
    if (!isSuperAdmin && session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Permission denied.' }, { status: 403 });
    }

    const { imei, deviceId, variationId, productId, branch, notes } = await req.json();

    if (!imei || !deviceId) {
      return NextResponse.json({ error: 'Missing IMEI or deviceId' }, { status: 400 });
    }

    const cleanImei = String(imei).trim();
    if (!/^\d{14,16}$/.test(cleanImei)) {
      return NextResponse.json({ error: 'IMEI must be 14-16 numeric digits.' }, { status: 400 });
    }

    const targetBranch = isSuperAdmin ? (branch || 'Tagoloan') : (session.branch || 'Tagoloan');

    const existing = await prisma.deviceUnit.findUnique({
      where: { imei: cleanImei }
    });
    if (existing) {
      return NextResponse.json({ error: `A device unit with IMEI ${cleanImei} is already registered.` }, { status: 400 });
    }

    const unit = await prisma.deviceUnit.create({
      data: {
        imei: cleanImei,
        deviceId,
        variationId: variationId || null,
        productId: productId || null,
        branch: targetBranch,
        status: 'Available',
        notes: notes || null
      }
    });

    return NextResponse.json(unit, { status: 201 });
  } catch (error: any) {
    console.error('Error registering device unit:', error);
    return NextResponse.json({ error: error.message || 'Failed to register unit' }, { status: 500 });
  }
}
