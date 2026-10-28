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

    // Store-wide (branch-wide) continuous progression:
    // 1. Query all existing units registered in this branch across all brands & models
    const existingUnits = await prisma.deviceUnit.findMany({
      where: {
        branch: { equals: branch, mode: 'insensitive' }
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

    // 2. Also check total physical branch stock & sold counts across all products in this branch
    const branchStockAgg = await prisma.branchStock.aggregate({
      where: {
        branch: { equals: branch, mode: 'insensitive' }
      },
      _sum: {
        stock: true,
        sold: true
      }
    });
    const totalBranchStock = (branchStockAgg._sum.stock || 0) + (branchStockAgg._sum.sold || 0);

    // Baseline index is the highest sequence number found in this branch (or total units / branch stock)
    const baseline = Math.max(maxIndex, existingUnits.length, totalBranchStock);
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
