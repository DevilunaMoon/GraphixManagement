import { NextResponse } from 'next/server';
import { prisma } from 'database';
import { checkOrderAvailabilityAcrossBranches, cleanBranchName } from '../../../../lib/branch-availability';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { items: directItems, cartItemIds } = body;

    // 1. Fetch active branches
    const dbBranches = await prisma.branch.findMany({
      where: { status: 'Active' },
      orderBy: { name: 'asc' }
    });

    const fallbackBranches = [
      { id: 'tagoloan', name: 'Tagoloan Branch' },
      { id: 'villanueva', name: 'Villanueva Branch' },
      { id: 'jasaan', name: 'Jasaan Branch' }
    ];

    const branchList = dbBranches.length > 0 ? dbBranches : fallbackBranches;

    // 2. Prepare items for stock check
    let resolvedItems: Array<{
      deviceId: string;
      deviceName?: string;
      quantity: number;
      variations?: any[] | null;
      device?: any;
    }> = [];

    if (cartItemIds && Array.isArray(cartItemIds) && cartItemIds.length > 0) {
      const cartItems = await prisma.cartItem.findMany({
        where: { id: { in: cartItemIds } },
        include: {
          device: {
            include: {
              branchStocks: true,
              variations: {
                include: {
                  branchStocks: true
                }
              }
            }
          }
        }
      });

      resolvedItems = cartItems.map(ci => {
        let parsedVars: any[] = [];
        if (ci.variations) {
          try {
            parsedVars = typeof ci.variations === 'string' ? JSON.parse(ci.variations) : ci.variations;
          } catch (e) {}
        }

        return {
          deviceId: ci.deviceId,
          deviceName: ci.device?.name || 'Item',
          quantity: ci.quantity,
          variations: parsedVars,
          device: ci.device
        };
      });
    } else if (directItems && Array.isArray(directItems) && directItems.length > 0) {
      const deviceIds = directItems.map((i: any) => i.deviceId).filter(Boolean);
      const devices = await prisma.device.findMany({
        where: { id: { in: deviceIds } },
        include: {
          branchStocks: true,
          variations: {
            include: {
              branchStocks: true
            }
          }
        }
      });

      const deviceMap = new Map(devices.map(d => [d.id, d]));

      resolvedItems = directItems.map((i: any) => {
        const dev = deviceMap.get(i.deviceId);
        let parsedVars: any[] = [];
        if (i.variations) {
          try {
            parsedVars = typeof i.variations === 'string' ? JSON.parse(i.variations) : i.variations;
          } catch (e) {}
        } else if (i.variationIds && dev?.variations) {
          const vIds = Array.isArray(i.variationIds) ? i.variationIds : String(i.variationIds).split(',');
          parsedVars = dev.variations.filter((v: any) => vIds.includes(v.id));
        }

        return {
          deviceId: i.deviceId,
          deviceName: dev?.name || i.deviceName || 'Item',
          quantity: Math.max(1, i.quantity || 1),
          variations: parsedVars,
          device: dev || null
        };
      });
    }

    if (resolvedItems.length === 0) {
      // If no items passed, return all active branches as available
      return NextResponse.json({
        branches: branchList.map(b => ({
          branchId: b.id,
          branchName: b.name.includes('Branch') ? b.name : `${b.name} Branch`,
          displayName: cleanBranchName(b.name),
          isAvailable: true,
          reason: null,
          itemBreakdown: []
        })),
        hasAvailableBranch: true,
        firstAvailableBranch: branchList[0]?.name || 'Tagoloan Branch'
      });
    }

    // 3. Compute availability across all branches
    const availabilityResult = checkOrderAvailabilityAcrossBranches(resolvedItems, branchList);

    return NextResponse.json(availabilityResult, { status: 200 });
  } catch (error: any) {
    console.error('Error checking branch availability:', error);
    return NextResponse.json({ error: 'Failed to verify branch availability' }, { status: 500 });
  }
}
