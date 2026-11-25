import { NextResponse } from 'next/server';
import { prisma } from 'database';
import { getSession } from '../../../../lib/session';

export const dynamic = 'force-dynamic';

interface BranchInventoryRow {
  branch: string;
  stock: number;
  soldAllTime: number;
  salesWindow: number;
  reservations: number;
  productId: string | null;
}

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isSuperAdmin = session.role === 'SUPER_ADMIN';
    if (!isSuperAdmin && session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const requestedBranch = searchParams.get('branch') || (isSuperAdmin ? 'all' : (session.branch || 'Tagoloan'));
    const minStockRaw = parseInt(searchParams.get('minStock') || '3', 10);
    const minStock = Number.isFinite(minStockRaw) ? Math.min(50, Math.max(1, minStockRaw)) : 3;
    const daysRaw = parseInt(searchParams.get('days') || '30', 10);
    const salesWindowDays = Number.isFinite(daysRaw) ? Math.min(90, Math.max(7, daysRaw)) : 30;

    const effectiveScopeBranch = isSuperAdmin ? requestedBranch : (session.branch || 'Tagoloan');
    const windowStart = new Date(Date.now() - salesWindowDays * 24 * 60 * 60 * 1000);

    const [branchesDb, devices, recentPurchases] = await Promise.all([
      prisma.branch.findMany({
        where: { status: 'Active' },
        orderBy: { name: 'asc' },
        select: { name: true },
      }),
      prisma.device.findMany({
        include: {
          category: { select: { name: true } },
          variations: true,
          branchStocks: true,
        },
        orderBy: { name: 'asc' },
      }),
      prisma.purchase.findMany({
        where: {
          createdAt: { gte: windowStart },
          status: { notIn: ['Cancelled', 'Refunded'] },
        },
        select: {
          deviceId: true,
          branch: true,
          quantity: true,
          status: true,
          isSettled: true,
          variations: true,
        },
      }),
    ]);

    const activeBranches = branchesDb.length > 0
      ? branchesDb.map((b) => b.name)
      : ['Tagoloan', 'Villanueva', 'Jasaan'];

    // Map sales velocity & active reservations per (deviceId, branch)
    const salesMap = new Map<string, number>();
    const reservationMap = new Map<string, number>();

    for (const p of recentPurchases) {
      const bKey = (p.branch || 'Tagoloan').toLowerCase();
      const key = `${p.deviceId}::${bKey}`;
      const qty = p.quantity || 1;
      salesMap.set(key, (salesMap.get(key) || 0) + qty);

      const st = (p.status || '').toLowerCase();
      if (!p.isSettled || st.includes('pending') || st.includes('reserved') || st.includes('pickup')) {
        reservationMap.set(key, (reservationMap.get(key) || 0) + qty);
      }
    }

    const transfers: any[] = [];
    const restocks: any[] = [];
    const overstocks: any[] = [];
    let totalAnalyzed = 0;

    for (const device of devices) {
      const hasVariations = device.variations && device.variations.length > 0;
      const skuTargets = hasVariations
        ? device.variations.map((v) => ({
            variationId: v.id,
            variationName: v.name,
            productId: v.productId || null,
          }))
        : [{ variationId: null as string | null, variationName: null as string | null, productId: null as string | null }];

      for (const sku of skuTargets) {
        totalAnalyzed++;
        const branchRows: BranchInventoryRow[] = activeBranches.map((branchName) => {
          const matchedStock = device.branchStocks.find(
            (bs) =>
              bs.branch.toLowerCase() === branchName.toLowerCase() &&
              (sku.variationId ? bs.variationId === sku.variationId : !bs.variationId)
          );
          const salesKey = `${device.id}::${branchName.toLowerCase()}`;
          return {
            branch: branchName,
            stock: matchedStock ? matchedStock.stock : 0,
            soldAllTime: matchedStock ? matchedStock.sold : 0,
            salesWindow: salesMap.get(salesKey) || 0,
            reservations: reservationMap.get(salesKey) || 0,
            productId: matchedStock?.productId || sku.productId,
          };
        });

        // Skip items that have 0 stock and 0 sales across every branch (not stocked anywhere yet)
        const totalStockAcrossAll = branchRows.reduce((s, r) => s + r.stock, 0);
        const totalSalesAcrossAll = branchRows.reduce((s, r) => s + r.salesWindow + r.soldAllTime, 0);
        if (totalStockAcrossAll === 0 && totalSalesAcrossAll === 0) {
          continue;
        }

        // Identify surplus donor branches (strictly above minStock + 1 so donor stays safe)
        const donors = branchRows
          .filter((r) => r.stock >= minStock + 2)
          .sort((a, b) => {
            // Prefer donor with lower recent sales velocity, then higher stock
            if (a.salesWindow !== b.salesWindow) return a.salesWindow - b.salesWindow;
            return b.stock - a.stock;
          });

        for (const row of branchRows) {
          const inScope =
            effectiveScopeBranch === 'all' ||
            row.branch.toLowerCase() === effectiveScopeBranch.toLowerCase();

          // Check overstock / slow-moving
          if (inScope && row.stock >= minStock * 3 && row.salesWindow === 0) {
            overstocks.push({
              id: `over-${device.id}-${sku.variationId || 'std'}-${row.branch}`,
              deviceId: device.id,
              variationId: sku.variationId,
              productName: device.name,
              variationName: sku.variationName,
              category: device.category?.name || 'Uncategorized',
              branch: row.branch,
              currentStock: row.stock,
              sales30d: row.salesWindow,
              reason: `${row.branch} holds ${row.stock} units with 0 sales in the last ${salesWindowDays} days. Avoid reordering until stock moves or transfer to a higher-demand branch.`,
            });
          }

          // Check low stock / out of stock
          if (row.stock <= minStock) {
            const bestDonor = donors.find(
              (d) =>
                d.branch.toLowerCase() !== row.branch.toLowerCase() &&
                d.stock - minStock >= 1 &&
                (d.salesWindow <= row.salesWindow || d.stock >= minStock + 3)
            );

            if (bestDonor) {
              const donorSafeSurplus = Math.max(1, bestDonor.stock - minStock);
              const targetNeeded = Math.max(1, minStock + 1 - row.stock);
              const recommendedQty = Math.min(donorSafeSurplus, targetNeeded);

              // Show transfer if either destination OR donor is in the admin's scope
              const transferInScope =
                inScope ||
                bestDonor.branch.toLowerCase() === effectiveScopeBranch.toLowerCase();

              if (transferInScope) {
                const canExecute =
                  isSuperAdmin ||
                  bestDonor.branch.toLowerCase() === (session.branch || '').toLowerCase();

                transfers.push({
                  id: `tr-${device.id}-${sku.variationId || 'std'}-${bestDonor.branch}-${row.branch}`,
                  deviceId: device.id,
                  variationId: sku.variationId,
                  productId: bestDonor.productId || row.productId,
                  productName: device.name,
                  variationName: sku.variationName,
                  category: device.category?.name || 'Uncategorized',
                  fromBranch: bestDonor.branch,
                  toBranch: row.branch,
                  fromStock: bestDonor.stock,
                  toStock: row.stock,
                  fromSales30d: bestDonor.salesWindow,
                  toSales30d: row.salesWindow,
                  recommendedQty,
                  priority: row.stock === 0 ? 'CRITICAL' : 'HIGH',
                  canExecute,
                  reason: `${row.branch} has ${row.stock} unit${row.stock === 1 ? '' : 's'} left (${row.salesWindow} sold in ${salesWindowDays}d), while ${bestDonor.branch} has ${bestDonor.stock} units (${bestDonor.salesWindow} sold in ${salesWindowDays}d). Recommend transferring ${recommendedQty} unit${recommendedQty === 1 ? '' : 's'} from ${bestDonor.branch} to ${row.branch}.`,
                });
              }
            } else if (inScope) {
              const recommendedQty = Math.max(minStock * 2 - row.stock, row.salesWindow || minStock);
              restocks.push({
                id: `rs-${device.id}-${sku.variationId || 'std'}-${row.branch}`,
                deviceId: device.id,
                variationId: sku.variationId,
                productId: row.productId,
                productName: device.name,
                variationName: sku.variationName,
                category: device.category?.name || 'Uncategorized',
                branch: row.branch,
                currentStock: row.stock,
                sales30d: row.salesWindow,
                activeReservations: row.reservations,
                recommendedQty,
                priority: row.stock === 0 ? 'CRITICAL' : 'HIGH',
                reason: `${row.branch} has ${row.stock} unit${row.stock === 1 ? '' : 's'} left (threshold: ${minStock}) and no other branch has safe surplus to transfer. Recommend restocking ${recommendedQty} units.`,
              });
            }
          }
        }
      }
    }

    // Sort critical first, then by lowest destination stock
    const priorityRank = (p: string) => (p === 'CRITICAL' ? 0 : p === 'HIGH' ? 1 : 2);
    transfers.sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority) || a.toStock - b.toStock);
    restocks.sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority) || a.currentStock - b.currentStock);
    overstocks.sort((a, b) => b.currentStock - a.currentStock);

    return NextResponse.json({
      summary: {
        transferCount: transfers.length,
        restockCount: restocks.length,
        overstockCount: overstocks.length,
        totalAnalyzed,
        minStock,
        salesWindowDays,
        activeBranches,
        scopeBranch: effectiveScopeBranch,
      },
      transfers,
      restocks,
      overstocks,
    });
  } catch (error) {
    console.error('Error computing DSS inventory recommendations:', error);
    return NextResponse.json({ error: 'Failed to compute inventory recommendations' }, { status: 500 });
  }
}

