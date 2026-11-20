import { NextResponse } from 'next/server';
import { prisma } from 'database';
import { getSession } from '../../../../lib/session';
import { logActivity } from '../../../../lib/logger';
import { generateUniqueDeviceId, extractSequenceIndexFromId } from '../../../../lib/unique-id';

export const dynamic = 'force-dynamic';

function resolveUnitFields(unit: any) {
  const isNumericImei = /^\d{14,16}$/.test(unit.imei || '');
  let resolvedUniqueId = '';

  if (unit.notes && unit.notes.includes('UID:')) {
    resolvedUniqueId = unit.notes.split('UID:')[1]?.split(';')[0]?.trim() || '';
  }

  if (!resolvedUniqueId) {
    if (!isNumericImei && unit.imei) {
      resolvedUniqueId = unit.imei;
    } else {
      resolvedUniqueId = unit.notes || `DEV-${unit.id.slice(-6).toUpperCase()}`;
    }
  }

  return {
    ...unit,
    uniqueId: resolvedUniqueId,
    realImei: isNumericImei ? unit.imei : '',
    hasRealImei: isNumericImei
  };
}

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
    const variationId = searchParams.get('variationId');
    const search = searchParams.get('search');
    const autoCreateSlots = searchParams.get('autoCreateSlots') !== 'false';
    const pageStr = searchParams.get('page') || '1';
    const limitStr = searchParams.get('limit') || '50';

    const page = Math.max(1, parseInt(pageStr, 10));
    const limit = Math.max(1, parseInt(limitStr, 10));
    const skip = (page - 1) * limit;

    const targetBranch = isSuperAdmin ? (branchParam || 'Tagoloan') : (session.branch || 'Tagoloan');

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

    if (variationId) {
      where.variationId = variationId;
    }

    if (search) {
      where.OR = [
        { imei: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
        { productId: { contains: search, mode: 'insensitive' } },
        { device: { name: { contains: search, mode: 'insensitive' } } }
      ];
    }

    // Auto-provision placeholder units if specific variant and device are requested
    if (deviceId && variationId && autoCreateSlots && targetBranch && targetBranch !== 'all') {
      try {
        const [branchStock, device] = await Promise.all([
          prisma.branchStock.findFirst({
            where: {
              deviceId,
              variationId,
              branch: { equals: targetBranch, mode: 'insensitive' }
            }
          }),
          prisma.device.findUnique({
            where: { id: deviceId },
            include: { variations: { where: { id: variationId } } }
          })
        ]);

        if (branchStock && branchStock.stock > 0 && device) {
          const existingAvailableCount = await prisma.deviceUnit.count({
            where: {
              deviceId,
              variationId,
              branch: { equals: targetBranch, mode: 'insensitive' },
              status: 'Available'
            }
          });

          const missingSlots = branchStock.stock - existingAvailableCount;
          if (missingSlots > 0) {
            const branchUnits = await prisma.deviceUnit.findMany({
              where: { branch: { equals: targetBranch, mode: 'insensitive' } },
              select: { imei: true, notes: true }
            });

            let branchMaxSeq = 0;
            for (const bu of branchUnits) {
              const s1 = extractSequenceIndexFromId(bu.notes || '');
              const s2 = extractSequenceIndexFromId(bu.imei || '');
              const s = Math.max(s1, s2);
              if (s > branchMaxSeq) branchMaxSeq = s;
            }
            let nextSeq = Math.max(branchMaxSeq, branchUnits.length);

            const variation = device.variations[0];
            const prodId = variation?.productId || device.id;

            for (let i = 0; i < missingSlots; i++) {
              nextSeq++;
              let placeholderId = generateUniqueDeviceId(device.name, targetBranch, nextSeq);
              let probe = nextSeq;
              while (await prisma.deviceUnit.findUnique({ where: { imei: placeholderId } })) {
                probe++;
                placeholderId = generateUniqueDeviceId(device.name, targetBranch, probe);
              }
              nextSeq = probe;

              await prisma.deviceUnit.create({
                data: {
                  deviceId,
                  variationId,
                  productId: prodId,
                  branch: targetBranch,
                  imei: placeholderId,
                  notes: `UID:${placeholderId}`,
                  status: 'Available'
                }
              }).catch(() => {});
            }
          }
        }
      } catch (autoErr) {
        console.warn('Auto-provisioning units warning:', autoErr);
      }
    }

    const [total, rawUnits] = await Promise.all([
      prisma.deviceUnit.count({ where }),
      prisma.deviceUnit.findMany({
        where,
        include: {
          device: { select: { id: true, name: true, image: true, type: true, isPreOwned: true } },
          variation: { select: { id: true, name: true, productId: true, price: true } }
        },
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit
      })
    ]);

    const units = rawUnits.map(resolveUnitFields);

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

    const { imei, deviceId, variationId, productId, branch, notes, uniqueId } = await req.json();

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

    const resolvedNotes = uniqueId ? `UID:${uniqueId}${notes ? `; ${notes}` : ''}` : (notes || null);

    const unit = await prisma.deviceUnit.create({
      data: {
        imei: cleanImei,
        deviceId,
        variationId: variationId || null,
        productId: productId || null,
        branch: targetBranch,
        status: 'Available',
        notes: resolvedNotes
      }
    });

    await logActivity({
      action: 'REGISTER_DEVICE_UNIT',
      description: `Registered device unit IMEI ${cleanImei} in ${targetBranch}`,
      branch: targetBranch,
      userId: session.userId,
      userRole: session.role
    });

    return NextResponse.json(resolveUnitFields(unit), { status: 201 });
  } catch (error: any) {
    console.error('Error registering device unit:', error);
    return NextResponse.json({ error: error.message || 'Failed to register unit' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isSuperAdmin = session.role === 'SUPER_ADMIN';
    if (!isSuperAdmin && session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Permission denied. Admins only.' }, { status: 403 });
    }

    const { unitId, imei, uniqueId } = await req.json();

    if (!unitId || !imei) {
      return NextResponse.json({ error: 'Missing unitId or IMEI.' }, { status: 400 });
    }

    const cleanImei = String(imei).trim();
    if (!/^\d{14,16}$/.test(cleanImei)) {
      return NextResponse.json({ error: 'IMEI must be 14-16 numeric digits.' }, { status: 400 });
    }

    const unit = await prisma.deviceUnit.findUnique({
      where: { id: unitId },
      include: { device: true, variation: true }
    });

    if (!unit) {
      return NextResponse.json({ error: 'Device unit not found.' }, { status: 404 });
    }

    if (!isSuperAdmin && session.branch && unit.branch.toLowerCase() !== session.branch.toLowerCase()) {
      return NextResponse.json({ error: `Permission denied for ${unit.branch} branch.` }, { status: 403 });
    }

    // Check duplicate IMEI on another unit
    const duplicate = await prisma.deviceUnit.findFirst({
      where: {
        imei: cleanImei,
        id: { not: unitId }
      }
    });

    if (duplicate) {
      return NextResponse.json({
        error: `IMEI ${cleanImei} is already assigned to another unit (${duplicate.branch} branch).`
      }, { status: 400 });
    }

    // Preserve or determine Unique ID
    let currentUid = uniqueId;
    if (!currentUid) {
      if (unit.notes?.includes('UID:')) {
        currentUid = unit.notes.split('UID:')[1]?.split(';')[0]?.trim();
      } else if (!/^\d{14,16}$/.test(unit.imei)) {
        currentUid = unit.imei;
      }
    }
    const updatedNotes = currentUid ? `UID:${currentUid}` : (unit.notes || null);

    const updated = await prisma.deviceUnit.update({
      where: { id: unitId },
      data: {
        imei: cleanImei,
        notes: updatedNotes
      },
      include: {
        device: { select: { id: true, name: true } },
        variation: { select: { id: true, name: true, productId: true } }
      }
    });

    await logActivity({
      action: 'UPDATE_DEVICE_IMEI',
      description: `Updated IMEI for ${unit.device?.name || 'Device'} (${currentUid || unitId}) to ${cleanImei} in ${unit.branch}`,
      branch: unit.branch,
      userId: session.userId,
      userRole: session.role
    });

    return NextResponse.json({
      success: true,
      unit: resolveUnitFields(updated)
    });
  } catch (error: any) {
    console.error('Error updating device unit IMEI:', error);
    return NextResponse.json({ error: error.message || 'Failed to update IMEI' }, { status: 500 });
  }
}
