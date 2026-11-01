import { NextResponse } from 'next/server';
import { prisma } from 'database';
import { getSession } from '../../../../lib/session';
import { formatDisplayInvoiceId, getBranchCode } from '../../../../lib/invoice';

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const purchaseId = searchParams.get('id');

    let purchase;
    const isLatestLookup = !purchaseId || purchaseId === 'latest' || purchaseId === 'undefined' || purchaseId === 'null';

    if (!isLatestLookup && purchaseId) {
      const cleanId = purchaseId.trim();
      const rawCode = cleanId.replace(/^#/, '').trim();
      const codeSuffix = rawCode.replace(/^CMTPQ/i, '').replace(/^GRPX-/i, '').trim();

      const orItems: any[] = [
        { id: cleanId },
        { id: rawCode },
        { referenceId: { equals: cleanId, mode: 'insensitive' } },
        { referenceId: { equals: `#${rawCode}`, mode: 'insensitive' } },
        { referenceId: { equals: rawCode, mode: 'insensitive' } }
      ];

      if (codeSuffix.length >= 2) {
        orItems.push({ id: { endsWith: codeSuffix, mode: 'insensitive' } });
        orItems.push({ referenceId: { contains: codeSuffix, mode: 'insensitive' } });
      }

      // 1. First look up purchase belonging to authenticated user
      purchase = await prisma.purchase.findFirst({
        where: { 
          OR: orItems,
          userId: session.userId 
        },
        include: {
          device: {
            select: { name: true, price: true, image: true }
          },
          user: {
            select: { name: true, email: true, phone: true }
          }
        }
      });

      // 2. If staff (ADMIN or CASHIER) is previewing the receipt by ID, allow lookup
      if (!purchase && (session.role === 'ADMIN' || session.role === 'CASHIER')) {
        purchase = await prisma.purchase.findFirst({
          where: { OR: orItems },
          include: {
            device: {
              select: { name: true, price: true, image: true }
            },
            user: {
              select: { name: true, email: true, phone: true }
            }
          }
        });
      }

      // 3. Fallback: If code did not match (e.g. from an old notification with unparsed ID),
      // gracefully retrieve customer's latest purchase instead of failing with 404
      if (!purchase) {
        purchase = await prisma.purchase.findFirst({
          where: { userId: session.userId },
          orderBy: { createdAt: 'desc' },
          include: {
            device: {
              select: { name: true, price: true, image: true }
            },
            user: {
              select: { name: true, email: true, phone: true }
            }
          }
        });
      }
    } else {
      purchase = await prisma.purchase.findFirst({
        where: { userId: session.userId },
        orderBy: { createdAt: 'desc' },
        include: {
          device: {
            select: { name: true, price: true, image: true }
          },
          user: {
            select: { name: true, email: true, phone: true }
          }
        }
      });
    }

    if (!purchase) {
      return NextResponse.json({ error: 'No purchase found' }, { status: 404 });
    }

    // Resolve exact unique sequence index for this purchase within its branch (GRPX-T-A1, GRPX-T-A2, ...)
    const cleanBranch = (purchase.branch || 'Tagoloan').replace(/\s*Branch$/i, '').trim();
    const bCode = getBranchCode(purchase.branch);
    let resolvedRefId = purchase.referenceId;
    const isStandard = typeof resolvedRefId === 'string' && resolvedRefId.replace(/^#/, '').match(/^GRPX-([TVJ]|[A-Z])-A\d+$/i);

    if (!isStandard) {
      try {
        const priorCount = await prisma.purchase.count({
          where: {
            branch: { contains: cleanBranch, mode: 'insensitive' },
            createdAt: { lt: purchase.createdAt }
          }
        });
        const seq = priorCount + 1;
        resolvedRefId = `#GRPX-${bCode}-A${seq}`;
      } catch (e) {
        resolvedRefId = `#GRPX-${bCode}-A1`;
      }
    }

    const formattedPurchase = {
      ...purchase,
      uniqueId: purchase.imei,
      referenceId: resolvedRefId ? (resolvedRefId.startsWith('#') ? resolvedRefId : `#${resolvedRefId}`) : `#GRPX-${bCode}-A1`
    };

    return NextResponse.json(formattedPurchase);
  } catch (error) {
    console.error('Error fetching latest purchase:', error);
    return NextResponse.json({ error: 'Failed to fetch purchase details' }, { status: 500 });
  }
}
