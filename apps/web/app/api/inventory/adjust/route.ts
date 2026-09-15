import { NextResponse } from 'next/server';
import { prisma } from 'database';
import { getSession } from '../../../../lib/session';
import { logActivity } from '../../../../lib/logger';
import { triggerStockAlert } from '../../../../lib/stock-alerts';

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isSuperAdmin = session.role === 'SUPER_ADMIN';
    if (!isSuperAdmin && session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Permission denied. Only Admins can adjust inventory.' }, { status: 403 });
    }

    const {
      deviceId,
      variationId,
      productId,
      branch,
      newStock,
      adjustmentType, // "SET" | "ADD"
      notes
    } = await req.json();

    if (!deviceId || !branch) {
      return NextResponse.json({ error: 'Missing required parameters: deviceId, branch.' }, { status: 400 });
    }

    const targetBranch = branch.trim();
    if (!isSuperAdmin && session.branch && session.branch.toLowerCase() !== targetBranch.toLowerCase()) {
      return NextResponse.json({ error: `Permission denied. You can only adjust stock for your assigned branch (${session.branch}).` }, { status: 403 });
    }

    const parsedQty = parseInt(newStock, 10);
    if (isNaN(parsedQty) || parsedQty < 0) {
      return NextResponse.json({ error: 'Stock quantity must be a non-negative number.' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const device = await tx.device.findUnique({
        where: { id: deviceId },
        include: { variations: true }
      });

      if (!device) {
        throw new Error('Device not found');
      }

      const variation = variationId ? device.variations.find(v => v.id === variationId) : null;
      const targetProdId = productId || variation?.productId || `${device.name}-STD`;
      const targetName = variation ? `${device.name} (${variation.name})` : device.name;

      const existingStock = await tx.branchStock.findFirst({
        where: {
          deviceId,
          variationId: variationId || null,
          branch: targetBranch
        }
      });

      const prevStock = existingStock ? existingStock.stock : 0;
      const calculatedStock = adjustmentType === 'ADD' ? (prevStock + parsedQty) : parsedQty;
      const diff = calculatedStock - prevStock;

      let updatedBs;
      if (existingStock) {
        updatedBs = await tx.branchStock.update({
          where: { id: existingStock.id },
          data: {
            stock: calculatedStock,
            productId: targetProdId
          }
        });
      } else {
        updatedBs = await tx.branchStock.create({
          data: {
            deviceId,
            variationId: variationId || null,
            branch: targetBranch,
            productId: targetProdId,
            stock: calculatedStock,
            sold: 0
          }
        });
      }

      // Also update aggregate device stock
      const allBranchStocks = await tx.branchStock.findMany({
        where: { deviceId }
      });
      const totalAggStock = allBranchStocks.reduce((sum, s) => sum + (s.id === updatedBs.id ? calculatedStock : s.stock), 0);
      await tx.device.update({
        where: { id: deviceId },
        data: { stock: totalAggStock }
      });

      const moveType = diff >= 0 ? (adjustmentType === 'ADD' ? 'RESTOCK' : 'ADJUSTMENT') : 'ADJUSTMENT';

      const movement = await tx.stockMovement.create({
        data: {
          type: moveType,
          deviceId,
          variationId: variationId || null,
          productId: targetProdId,
          productName: targetName,
          branch: targetBranch,
          quantity: Math.abs(diff),
          previousStock: prevStock,
          newStock: calculatedStock,
          notes: notes || `${moveType === 'RESTOCK' ? 'Restocked' : 'Adjusted'} in ${targetBranch}`,
          performedBy: session.name || session.email || 'Admin',
          userRole: session.role
        }
      });

      return {
        success: true,
        movement,
        branchStock: updatedBs
      };
    });

    await logActivity({
      action: 'ADJUST_STOCK',
      description: `Updated stock for '${result.movement.productName}' (${result.movement.productId}) in ${targetBranch} from ${result.movement.previousStock} to ${result.movement.newStock}`,
      branch: targetBranch,
      userId: session.userId,
      userRole: session.role
    });

    await triggerStockAlert({ deviceId });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error adjusting stock:', error);
    return NextResponse.json({ error: error.message || 'Failed to adjust stock' }, { status: 400 });
  }
}
