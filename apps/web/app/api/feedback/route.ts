import { NextResponse } from 'next/server';
import { prisma } from 'database';
import { getSession } from '../../../lib/session';

export const dynamic = 'force-dynamic';

function cleanBranchName(b: string | null | undefined): string {
  if (!b) return 'Tagoloan';
  const lower = b.toLowerCase();
  if (lower.includes('villa')) return 'Villanueva';
  if (lower.includes('jasaan')) return 'Jasaan';
  if (lower.includes('tago')) return 'Tagoloan';
  return b.replace(/\s*Branch$/i, '').trim() || 'Tagoloan';
}

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'SUPER_ADMIN' && session.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isSuperAdmin = session.role === 'SUPER_ADMIN';
    const { searchParams } = new URL(req.url);
    const branchParam = searchParams.get('branch');
    const search = searchParams.get('search')?.trim().toLowerCase() || '';
    const date = searchParams.get('date') || '';
    const pageStr = searchParams.get('page');
    const limitStr = searchParams.get('limit');

    // 1. Determine active branch filter constraint
    let branchFilter: string | null = null;
    if (isSuperAdmin) {
      if (branchParam && branchParam.toLowerCase() !== 'all') {
        branchFilter = cleanBranchName(branchParam);
      }
    } else {
      branchFilter = cleanBranchName(session.branch || 'Tagoloan');
    }

    // 2. Fetch all customer product reviews with user & device details
    const reviews = await prisma.review.findMany({
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true, phone: true }
        },
        device: {
          select: { id: true, name: true, image: true, images: true, price: true, specs: true, branch: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (reviews.length === 0) {
      return NextResponse.json({
        feedbacks: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    }

    // 3. Resolve customer purchase branch for each review
    const userIds = Array.from(new Set(reviews.map(r => r.userId).filter(Boolean)));
    const deviceIds = Array.from(new Set(reviews.map(r => r.deviceId).filter(Boolean)));

    let purchases: { userId: string; deviceId: string; branch: string; createdAt: Date }[] = [];
    try {
      purchases = await prisma.purchase.findMany({
        where: {
          userId: { in: userIds },
          deviceId: { in: deviceIds }
        },
        select: {
          userId: true,
          deviceId: true,
          branch: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' }
      });
    } catch (pErr) {
      console.warn("Could not query purchases for review branch mapping:", pErr);
    }

    const purchaseBranchMap = new Map<string, string>();
    for (const p of purchases) {
      const key = `${p.userId}_${p.deviceId}`;
      if (!purchaseBranchMap.has(key)) {
        purchaseBranchMap.set(key, cleanBranchName(p.branch));
      }
    }

    // 4. Map reviews into formatted Customer Feedback objects with branch attribution
    const allFeedbacks = reviews.map(r => {
      const branchFromPurchase = purchaseBranchMap.get(`${r.userId}_${r.deviceId}`);
      const branchFromDevice = cleanBranchName(r.device?.branch);
      const resolvedBranch = branchFromPurchase || branchFromDevice || 'Tagoloan';

      const deviceImage = (r.device?.images && r.device.images.length > 0)
        ? r.device.images[0]
        : (r.device?.image || null);

      return {
        id: r.id,
        customerName: r.user?.name || r.user?.email || 'Anonymous Customer',
        customerEmail: r.user?.email || '',
        customerImage: r.user?.image || null,
        productName: r.device?.name || 'Unknown Product',
        productImage: deviceImage,
        productPrice: r.device?.price || 0,
        feedbackText: r.text || '',
        branch: `${resolvedBranch} Branch`,
        rawBranch: resolvedBranch,
        createdAt: r.createdAt.toISOString(),
      };
    });

    // 5. Filter by Branch (strictly enforced for Branch Admin, selectable for Super Admin)
    let filtered = allFeedbacks;
    if (branchFilter) {
      filtered = filtered.filter(f => f.rawBranch.toLowerCase() === branchFilter.toLowerCase());
    }

    // 6. Filter by Search Query (customer name, email, product name, feedback text)
    if (search) {
      filtered = filtered.filter(f => 
        f.customerName.toLowerCase().includes(search) ||
        f.customerEmail.toLowerCase().includes(search) ||
        f.productName.toLowerCase().includes(search) ||
        f.feedbackText.toLowerCase().includes(search) ||
        f.branch.toLowerCase().includes(search)
      );
    }

    // 7. Filter by Date
    if (date) {
      const filterDateStr = new Date(date).toDateString();
      filtered = filtered.filter(f => {
        const itemDateStr = new Date(f.createdAt).toDateString();
        return itemDateStr === filterDateStr;
      });
    }

    // 8. Pagination
    const total = filtered.length;
    const page = Math.max(1, parseInt(pageStr || '1', 10) || 1);
    const limit = Math.max(1, parseInt(limitStr || '10', 10) || 10);
    const skip = (page - 1) * limit;
    const paginatedFeedbacks = filtered.slice(skip, skip + limit);

    return NextResponse.json({
      feedbacks: paginatedFeedbacks,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (error) {
    console.error('Error in /api/feedback:', error);
    return NextResponse.json({ error: 'Failed to fetch customer feedback' }, { status: 500 });
  }
}
