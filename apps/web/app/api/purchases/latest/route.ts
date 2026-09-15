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
    if (purchaseId) {
      const cleanId = purchaseId.trim();
      const codeSuffix = cleanId.replace(/^#/, '').replace(/^CMTPQ/i, '').trim();

      const orItems: any[] = [
        { id: cleanId },
        { referenceId: cleanId },
        { referenceId: `#${cleanId.replace(/^#/, '')}` },
        { referenceId: cleanId.replace(/^#/, '') }
      ];

      if (codeSuffix.length >= 2) {
        orItems.push({ id: { endsWith: codeSuffix, mode: 'insensitive' } });
        orItems.push({ referenceId: { contains: codeSuffix, mode: 'insensitive' } });
      }

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
      referenceId: resolvedRefId ? (resolvedRefId.startsWith('#') ? resolvedRefId : `#${resolvedRefId}`) : `#GRPX-${bCode}-A1`
    };

    return NextResponse.json(formattedPurchase);
  } catch (error) {
    console.error('Error fetching latest purchase:', error);
    return NextResponse.json({ error: 'Failed to fetch purchase details' }, { status: 500 });
  }
}
