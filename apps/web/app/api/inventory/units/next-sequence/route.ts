import { NextResponse } from 'next/server';
import { prisma } from 'database';
import { getSession } from '../../../../../lib/session';
import { getModelAcronym, getBranchCode, getSequenceSuffix, extractSequenceIndexFromId } from '../../../../../lib/unique-id';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const modelName = searchParams.get('model') || '';
    const branchParam = searchParams.get('branch');
    const deviceId = searchParams.get('deviceId');

    const branch = branchParam || session.branch || 'Tagoloan';
    const acronym = getModelAcronym(modelName);
    const branchCode = getBranchCode(branch);
    const prefix = `${acronym}-${branchCode}-`;

    // Query all existing units matching prefix or deviceId in this branch
    const existingUnits = await prisma.deviceUnit.findMany({
      where: {
        branch: { equals: branch, mode: 'insensitive' },
        OR: [
          { imei: { startsWith: prefix, mode: 'insensitive' } },
          ...(deviceId ? [{ deviceId }] : [])
        ]
      },
      select: { imei: true }
    });

    let maxIndex = 0;
    for (const unit of existingUnits) {
      const idx = extractSequenceIndexFromId(unit.imei);
      if (idx > maxIndex) {
        maxIndex = idx;
      }
    }

    // Also check existing Device & Variation stock count in this branch for this model
    let existingDeviceStock = 0;
    if (modelName && modelName.trim() && modelName.trim().toUpperCase() !== 'MODEL') {
      const matchingDevices = await prisma.device.findMany({
        where: {
          name: { equals: modelName.trim(), mode: 'insensitive' }
        },
        include: {
          variations: {
            include: {
              branchStocks: {
                where: { branch: { equals: branch, mode: 'insensitive' } }
              }
            }
          },
          branchStocks: {
            where: { branch: { equals: branch, mode: 'insensitive' } }
          }
        }
      });

      for (const d of matchingDevices) {
        if (d.variations && d.variations.length > 0) {
          for (const v of d.variations) {
            const bStock = v.branchStocks?.[0]?.stock || 0;
            existingDeviceStock += bStock;
          }
        } else {
          const bStock = d.branchStocks?.[0]?.stock || d.stock || 0;
          existingDeviceStock += bStock;
        }
      }
    }

    // Baseline index is the highest sequence number found (or unit count, or total stock)
    const baseline = Math.max(maxIndex, existingUnits.length, existingDeviceStock);
    const nextIndex = baseline + 1;
    const nextSuffix = getSequenceSuffix(nextIndex);
    const nextId = `${acronym}-${branchCode}-${nextSuffix}`;

    return NextResponse.json({
      modelName,
      branch,
      acronym,
      branchCode,
      existingCount: existingUnits.length,
      highestExistingIndex: maxIndex,
      nextIndex,
      nextSuffix,
      nextId
    });
  } catch (error: any) {
    console.error('Error determining next unit sequence:', error);
    return NextResponse.json({ error: error.message || 'Failed to determine next sequence' }, { status: 500 });
  }
}
