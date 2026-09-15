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
      return NextResponse.json({ error: 'Permission denied. Only Admins can transfer inventory.' }, { status: 403 });
    }

    const {
      deviceId,
      variationId,
      productId,
      fromBranch,
      toBranch,
      quantity,
      notes
    } = await req.json();

    const transferQty = parseInt(quantity, 10);
    if (!fromBranch || !toBranch || isNaN(transferQty) || transferQty <= 0) {
      return NextResponse.json({ error: 'Invalid transfer details. Source branch, destination branch, and positive quantity required.' }, { status: 400 });
    }

    if (fromBranch.toLowerCase() === toBranch.toLowerCase()) {
      return NextResponse.json({ error: 'Source and destination branches cannot be the same.' }, { status: 400 });
    }

    // Branch Admin can only transfer FROM their own branch
    if (!isSuperAdmin && session.branch && session.branch.toLowerCase() !== fromBranch.toLowerCase()) {
      return NextResponse.json({ error: `You can only transfer stock originating from your branch (${session.branch}).` }, { status: 403 });
    }

    // Execute atomic transfer in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Locate Device & Variation
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

      // 2. Check source branch stock
      const sourceStock = await tx.branchStock.findFirst({
        where: {
          deviceId,
          variationId: variationId || null,
          branch: fromBranch
        }
      });

      const currentFromStock = sourceStock ? sourceStock.stock : 0;
      if (currentFromStock < transferQty) {
        throw new Error(`Insufficient stock in ${fromBranch} branch for ${targetName}. Current stock: ${currentFromStock}, requested: ${transferQty}.`);
      }

      // 3. Decrement source branch
      const updatedSource = await tx.branchStock.update({
        where: { id: sourceStock!.id },
        data: {
          stock: { decrement: transferQty }
        }
      });

      // 4. Increment destination branch (upsert)
      const destStock = await tx.branchStock.findFirst({
        where: {
          deviceId,
          variationId: variationId || null,
          branch: toBranch
        }
      });

      let updatedDest;
      if (destStock) {
        updatedDest = await tx.branchStock.update({
          where: { id: destStock.id },
          data: {
            stock: { increment: transferQty }
          }
        });
      } else {
        updatedDest = await tx.branchStock.create({
          data: {
            deviceId,
            variationId: variationId || null,
            branch: toBranch,
            productId: targetProdId,
            stock: transferQty,
            sold: 0
          }
        });
      }

      // 5. Update any available physical units to the new branch if available
      const availableUnits = await tx.deviceUnit.findMany({
        where: {
          deviceId,
          variationId: variationId || undefined,
          branch: fromBranch,
          status: 'Available'
        },
        take: transferQty
      });

      for (const u of availableUnits) {
        await tx.deviceUnit.update({
          where: { id: u.id },
          data: {
            branch: toBranch,
            notes: `Transferred from ${fromBranch} to ${toBranch} on ${new Date().toLocaleDateString()}`
          }
        });
      }

      // 6. Record StockMovement
      const movement = await tx.stockMovement.create({
        data: {
          type: 'TRANSFER',
          deviceId,
          variationId: variationId || null,
          productId: targetProdId,
          productName: targetName,
          fromBranch,
          toBranch,
          branch: toBranch,
          quantity: transferQty,
          previousStock: currentFromStock,
          newStock: updatedSource.stock,
          notes: notes || `Stock transferred from ${fromBranch} to ${toBranch}`,
          performedBy: session.name || session.email || 'Admin',
          userRole: session.role
        }
      });

      return {
        success: true,
        movement,
        sourceStock: updatedSource.stock,
        destStock: updatedDest.stock
      };
    });

    await logActivity({
      action: 'TRANSFER_STOCK',
      description: `Transferred ${quantity} units of '${result.movement.productName}' (${result.movement.productId}) from ${fromBranch} to ${toBranch}`,
      branch: fromBranch,
      userId: session.userId,
      userRole: session.role
    });

    await triggerStockAlert({ deviceId });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error transferring stock:', error);
    return NextResponse.json({ error: error.message || 'Failed to transfer stock' }, { status: 400 });
  }
}
