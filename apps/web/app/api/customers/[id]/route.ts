import { NextResponse } from 'next/server';
import { prisma } from 'database';
import { getSession } from '../../../../lib/session';
import { formatDisplayInvoiceId, getBranchCode } from '../../../../lib/invoice';
import { isIPhoneProduct } from '../../../../lib/imei';

export const dynamic = 'force-dynamic';

function calculateAge(dobString: string | null | undefined): number | null {
  if (!dobString) return null;
  const birthDate = new Date(dobString);
  if (isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age >= 0 ? age : null;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'SUPER_ADMIN' && session.role !== 'CASHIER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const customerIdentifier = decodeURIComponent(resolvedParams.id || '').trim();
    if (!customerIdentifier) {
      return NextResponse.json({ error: 'Customer identifier is required' }, { status: 400 });
    }

    const isSuperAdmin = session.role === 'SUPER_ADMIN';
    const staffBranch = session.branch || 'Tagoloan';

    // Find customer by ID, email, or exact name
    const customer = await prisma.user.findFirst({
      where: {
        OR: [
          { id: customerIdentifier },
          { email: { equals: customerIdentifier, mode: 'insensitive' } },
          { name: { equals: customerIdentifier, mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        dateOfBirth: true,
        gender: true,
        image: true,
        branch: true,
        role: true,
        status: true,
        authProvider: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Build branch-scoped filter for transactions & repairs
    const purchaseWhere: any = { userId: customer.id };
    const repairWhere: any = {
      OR: [
        { userId: customer.id },
        { ownerName: { equals: customer.name || '', mode: 'insensitive' } }
      ]
    };

    if (!isSuperAdmin) {
      purchaseWhere.branch = staffBranch;
      repairWhere.branch = staffBranch;
    }

    // Build branch sequence lookup map across all purchases ordered by createdAt ascending
    const branchSeqMap = new Map<string, string>();
    try {
      const allPurchasesAsc = await prisma.purchase.findMany({
        select: { id: true, branch: true, createdAt: true, referenceId: true },
        orderBy: { createdAt: 'asc' }
      });

      const branchCounters: Record<string, number> = {};
      for (const p of allPurchasesAsc) {
        const bCode = getBranchCode(p.branch);
        branchCounters[bCode] = (branchCounters[bCode] || 0) + 1;
        let ref = p.referenceId;
        const isStd = typeof ref === 'string' && ref.replace(/^#/, '').match(/^GRPX-([TVJ]|[A-Z])-A\d+$/i);
        if (isStd && ref) {
          branchSeqMap.set(p.id, ref.startsWith('#') ? ref : `#${ref}`);
        } else {
          branchSeqMap.set(p.id, `#GRPX-${bCode}-A${branchCounters[bCode]}`);
        }
      }
    } catch (seqErr) {
      console.warn("Could not build global sequence map:", seqErr);
    }

    // Parallel fetch customer-related data
    const [purchases, repairRequests, reviews] = await Promise.all([
      prisma.purchase.findMany({
        where: purchaseWhere,
        include: {
          device: {
            select: {
              id: true,
              name: true,
              price: true,
              image: true,
              isPreOwned: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.repairRequest.findMany({
        where: repairWhere,
        include: {
          timeline: {
            orderBy: { createdAt: 'asc' }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.review.findMany({
        where: { userId: customer.id },
        include: {
          device: {
            select: {
              id: true,
              name: true,
              image: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    // Process purchases with accurate display reference IDs and IMEI status
    const processedPurchases = purchases.map((tx: any) => {
      const hasAssignedImei = Boolean(
        tx.imei && 
        tx.imei.trim() !== '' && 
        tx.imei !== 'Pending Pickup' && 
        tx.imei !== 'null' && 
        tx.imei !== 'undefined'
      );
      const isPendingPickup = !hasAssignedImei && isIPhoneProduct(tx.device?.name || '');

      return {
        ...tx,
        referenceId: branchSeqMap.get(tx.id) || formatDisplayInvoiceId(tx.referenceId || tx.id, tx.branch),
        hasAssignedImei,
        isPendingPickup,
        imeiDisplayStatus: hasAssignedImei ? `IMEI: ${tx.imei}` : (isPendingPickup ? 'IMEI: Pending Pickup' : null)
      };
    });

    // Purchased devices list (specifically devices with tracked IMEI or physical unit history)
    const purchasedDevices = processedPurchases.map((tx: any) => ({
      purchaseId: tx.id,
      referenceId: tx.referenceId,
      deviceName: tx.device?.name || 'Unknown Device',
      deviceImage: tx.device?.image || null,
      variations: tx.variations,
      quantity: tx.quantity,
      branch: tx.branch,
      purchaseDate: tx.createdAt,
      imei: tx.imei || null,
      hasAssignedImei: tx.hasAssignedImei,
      isPendingPickup: tx.isPendingPickup,
      status: tx.status
    }));

    // Calculate dynamic age
    const dynamicAge = calculateAge(customer.dateOfBirth);

    // Compute Summary Stats
    const totalPurchases = processedPurchases.length;
    const totalSpent = processedPurchases.reduce((acc, curr) => acc + (curr.amount || 0), 0);
    const pendingPickupCount = processedPurchases.filter(p => p.isPendingPickup).length;
    const assignedImeiCount = processedPurchases.filter(p => p.hasAssignedImei).length;
    const totalRepairs = repairRequests.length;
    const completedRepairs = repairRequests.filter(r => (r.progress || '').toLowerCase() === 'completed' || (r.status || '').toLowerCase() === 'completed').length;
    const totalReviews = reviews.length;

    return NextResponse.json({
      customer: {
        ...customer,
        age: dynamicAge
      },
      stats: {
        totalPurchases,
        totalSpent,
        pendingPickupCount,
        assignedImeiCount,
        totalRepairs,
        completedRepairs,
        totalReviews
      },
      purchases: processedPurchases,
      purchasedDevices,
      repairRequests,
      reviews
    });
  } catch (error) {
    console.error('Error fetching customer details:', error);
    return NextResponse.json({ error: 'Failed to fetch customer details' }, { status: 500 });
  }
}
